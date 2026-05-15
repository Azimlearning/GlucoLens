"""
Agent 8 — Misinformation Debunker

Job: Verify a health claim (or shared URL) against authoritative medical evidence,
     classify a verdict, and explain it in plain language. Patient-specific drug-food
     or clinical risks ALWAYS force a "harmful_for_you" verdict regardless of evidence.

Inputs from state:
  - event_type == "misinformation_query"
  - raw_query: str
  - patient_id

Outputs to state:
  - verdict: str
  - verdict_explanation: str
  - disclaimer: str
  - evidence_sources: list[dict]
  - logged_for_dietitian: bool
"""
from __future__ import annotations

import httpx
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from uuid import uuid4

from backend.models.state import GlucoLensState
from backend.tools import openai_tools, tavily_tools, firebase_tools
from backend.tools.drug_food_interactions import lookup_med_interactions
from backend.tools.normalize import extract_urls, normalize_food_name, now_iso
from backend.tools.prompts import (
    CLAIM_EXTRACTION_PROMPT,
    VERDICT_CLASSIFICATION_PROMPT,
    EXPLANATION_PROMPT,
    DISCLAIMER_TEXT,
)
from backend.utils.cache import patient_profile_cache
from backend.utils.logging import agent_logger

log = agent_logger("misinfo")


# === Constants ===

URL_FETCH_TIMEOUT_S = 5
URL_FETCH_MAX_CHARS = 4000

# Authoritative sources, by tier
PUBMED_DOMAINS       = ["pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov"]
COCHRANE_DOMAINS     = ["cochranelibrary.com", "cochrane.org"]
MOH_DOMAINS          = ["moh.gov.my", "myhealth.gov.my"]
WHO_DOMAINS          = ["who.int"]
ASSOCIATION_DOMAINS  = [
    "diabetes.org",                # ADA
    "idf.org",                     # International Diabetes Federation
    "diabetesmalaysia.com.my",     # Persatuan Diabetes Malaysia
    "easd.org",                    # European Assoc for Study of Diabetes
]

# Junk sources we never want as evidence
EXCLUDED_DOMAINS = [
    "facebook.com", "twitter.com", "x.com",
    "tiktok.com", "instagram.com",
    "reddit.com", "quora.com",
    "naturalnews.com", "mercola.com",
]


# === Tools ===

def extract_claim(raw_input: str) -> dict:
    """Pull a structured claim from raw user input (may include a URL)."""
    fallback = {
        "claim": raw_input[:200],
        "claim_type": "other",
        "entities": [],
        "urls_present": bool(extract_urls(raw_input)),
    }
    result = openai_tools.chat_json(
        system="You extract structured claims. Output strict JSON only.",
        user=CLAIM_EXTRACTION_PROMPT.format(input=raw_input),
        fallback=fallback,
    )
    if not isinstance(result, dict):
        return fallback
    # Defensive defaults
    result.setdefault("claim", fallback["claim"])
    result.setdefault("claim_type", "other")
    result.setdefault("entities", [])
    result.setdefault("urls_present", fallback["urls_present"])
    if not isinstance(result["entities"], list):
        result["entities"] = []
    return result


def fetch_url_content(url: str) -> str:
    """Fetch a URL and return cleaned text (capped at URL_FETCH_MAX_CHARS)."""
    try:
        with httpx.Client(
            timeout=URL_FETCH_TIMEOUT_S,
            follow_redirects=True,
            headers={"User-Agent": "GlucoLens/1.0 (clinical-decision-support)"},
        ) as client:
            r = client.get(url)
            r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "noscript", "nav", "footer", "header"]):
            tag.decompose()
        text = " ".join(soup.get_text(separator=" ").split())
        return text[:URL_FETCH_MAX_CHARS]
    except Exception as e:  # noqa: BLE001
        log.warning("url_fetch_failed", url=url, error=str(e))
        return ""


def search_pubmed(query: str) -> list[dict]:
    return tavily_tools.tavily_search(
        query=query, depth="advanced", max_results=3,
        include_domains=PUBMED_DOMAINS,
    )


def search_cochrane(query: str) -> list[dict]:
    return tavily_tools.tavily_search(
        query=query, depth="basic", max_results=2,
        include_domains=COCHRANE_DOMAINS,
    )


def search_moh_guidelines(query: str) -> list[dict]:
    return tavily_tools.tavily_search(
        query=f"{query} MOH Malaysia diabetes guideline",
        depth="basic", max_results=2,
        include_domains=MOH_DOMAINS,
    )


def search_who_guidelines(query: str) -> list[dict]:
    return tavily_tools.tavily_search(
        query=f"{query} WHO diabetes guideline",
        depth="basic", max_results=2,
        include_domains=WHO_DOMAINS,
    )


def search_diabetes_associations(query: str) -> list[dict]:
    return tavily_tools.tavily_search(
        query=f"{query} diabetes type 2 evidence",
        depth="basic", max_results=3,
        include_domains=ASSOCIATION_DOMAINS,
    )


def check_against_patient_profile(claim_entities: list[str], profile: dict) -> dict:
    """Check whether any entity in the claim triggers a patient-specific risk.

    Returns:
        {
          "has_risk":     bool,
          "risk_type":    "drug_interaction" | "allergen" | "contraindication" | "",
          "risk_details": list[dict]  # Each: {kind, entity, medication?, severity, note}
        }
    """
    if not claim_entities or not profile:
        return {"has_risk": False, "risk_type": "", "risk_details": []}

    risks: list[dict] = []
    normalized_entities = [normalize_food_name(e) for e in claim_entities if e]

    # 1. Drug-food interactions against the patient's medications
    medications = profile.get("medications", []) or []
    for med in medications:
        med_name = med if isinstance(med, str) else med.get("name", "")
        interactions = lookup_med_interactions(med_name)
        for inter in interactions:
            food_norm = normalize_food_name(inter["food"])
            for ent in normalized_entities:
                if not ent or not food_norm:
                    continue
                if food_norm in ent or ent in food_norm:
                    risks.append({
                        "kind":       "drug_interaction",
                        "entity":     inter["food"],
                        "medication": med_name,
                        "severity":   inter["severity"],
                        "note":       inter["note"],
                    })

    # 2. Allergen check
    allergens = [normalize_food_name(a) for a in profile.get("allergens", [])]
    for ent in normalized_entities:
        for a in allergens:
            if a and (a in ent or ent in a):
                risks.append({
                    "kind":     "allergen",
                    "entity":   ent,
                    "severity": "high",
                    "note":     f"Patient is allergic to {a}.",
                })

    # 3. Contraindicated suggestions ("stop taking your medication", etc.)
    contraindication_terms = (
        "stop_medication", "replace_metformin", "stop_insulin", "stop_gliclazide",
        "skip_medication", "discontinue_medication",
    )
    joined = " ".join(normalized_entities)
    for term in contraindication_terms:
        if term in joined:
            risks.append({
                "kind":     "contraindication",
                "entity":   term,
                "severity": "high",
                "note":     "Claim suggests stopping/replacing prescribed therapy.",
            })

    if not risks:
        return {"has_risk": False, "risk_type": "", "risk_details": []}

    # Pick the most severe risk type for the headline label
    primary = "drug_interaction" if any(r["kind"] == "drug_interaction" for r in risks) else \
              "contraindication" if any(r["kind"] == "contraindication" for r in risks) else \
              "allergen"

    return {"has_risk": True, "risk_type": primary, "risk_details": risks}


def classify_verdict(claim: str, evidence: dict, patient_risk: dict) -> dict:
    """Classify the verdict given evidence + patient risk.

    Patient-specific risk ALWAYS overrides evidence — the claim becomes
    'harmful_for_you' regardless of how supported it may be in general.
    """
    if patient_risk.get("has_risk"):
        return {
            "verdict":    "harmful_for_you",
            "confidence": 0.95,
            "reasoning":  f"Patient-specific {patient_risk['risk_type']} detected.",
        }

    def _join(items: list[dict]) -> str:
        if not items:
            return "no results"
        return "; ".join(f"{i.get('title', '')}: {i.get('content', '')[:200]}" for i in items[:3])

    fallback = {"verdict": "mixed", "confidence": 0.3, "reasoning": "Insufficient evidence."}
    result = openai_tools.chat_json(
        system="You output strict JSON only.",
        user=VERDICT_CLASSIFICATION_PROMPT.format(
            claim=claim,
            pubmed=_join(evidence.get("pubmed", [])),
            cochrane=_join(evidence.get("cochrane", [])),
            moh=_join(evidence.get("moh", [])),
            who=_join(evidence.get("who", [])),
            associations=_join(evidence.get("associations", [])),
            patient_risks="none",
        ),
        fallback=fallback,
    )
    if not isinstance(result, dict) or "verdict" not in result:
        return fallback
    if result["verdict"] not in ("supported", "mixed", "contradicted", "harmful_for_you"):
        result["verdict"] = "mixed"
    return result


def generate_explanation(claim: str, verdict: str, top_evidence: list[dict],
                         patient_risk: dict) -> str:
    """Plain-language 3-5 sentence explanation."""
    fallback = (
        "We weren't able to fully verify this claim against authoritative sources. "
        "Please discuss it with your dietitian or doctor before changing your routine."
    )

    snippets = "\n".join(
        f"- {e.get('title', '?')}: {e.get('content', '')[:250]}"
        for e in (top_evidence or [])[:3]
    ) or "(no high-quality evidence retrieved)"

    risk_summary = "none"
    if patient_risk.get("has_risk"):
        details = patient_risk.get("risk_details", [])
        if details:
            first = details[0]
            if first["kind"] == "drug_interaction":
                risk_summary = (
                    f"{first['entity']} interacts with your medication "
                    f"{first.get('medication', '?')} — {first['note']}"
                )
            else:
                risk_summary = first["note"]

    try:
        text = openai_tools.chat_completion(
            system="You write plain-language clinical explanations. Plain text only.",
            user=EXPLANATION_PROMPT.format(
                verdict=verdict,
                claim=claim,
                top_evidence=snippets,
                patient_risk=risk_summary,
            ),
        )
        text = (text or "").strip().strip('"').strip("`")
        return text if text else fallback
    except Exception:  # noqa: BLE001
        log.exception("explanation_generation_failed")
        return fallback


def append_disclaimer(explanation: str) -> str:
    """Always append the MOH-compliant disclaimer. Never omit."""
    if DISCLAIMER_TEXT in explanation:
        return explanation
    return f"{explanation}\n\n{DISCLAIMER_TEXT}"


def log_query_for_dietitian(patient_id: str, payload: dict) -> str:
    """Persist the query so the dietitian sees it in their misinfo feed."""
    query_id = uuid4().hex
    firebase_tools.write_misinfo_log(patient_id, query_id, {**payload, "id": query_id})
    return query_id


# === Internal helpers ===

def _gather_evidence_parallel(claim: str) -> dict[str, list[dict]]:
    """Fire all evidence searches in parallel and collect results."""
    searches = {
        "pubmed":       (search_pubmed, claim),
        "cochrane":     (search_cochrane, claim),
        "moh":          (search_moh_guidelines, claim),
        "who":          (search_who_guidelines, claim),
        "associations": (search_diabetes_associations, claim),
    }
    results: dict[str, list[dict]] = {k: [] for k in searches}

    with ThreadPoolExecutor(max_workers=5) as pool:
        future_to_key = {
            pool.submit(fn, q): key for key, (fn, q) in searches.items()
        }
        for future in as_completed(future_to_key, timeout=15):
            key = future_to_key[future]
            try:
                results[key] = future.result() or []
            except Exception as e:  # noqa: BLE001
                log.warning("evidence_search_failed", source=key, error=str(e))
                results[key] = []
    return results


def _flatten_evidence(evidence: dict[str, list[dict]]) -> list[dict]:
    """Flatten evidence dict into a single sources list with tier labels."""
    tier_rank = {"pubmed": 1, "cochrane": 1, "moh": 2, "who": 2, "associations": 3}
    flat: list[dict] = []
    for source, items in evidence.items():
        for r in items:
            url = r.get("url", "")
            if any(bad in url for bad in EXCLUDED_DOMAINS):
                continue
            flat.append({
                "title":  r.get("title", ""),
                "url":    url,
                "snippet": (r.get("content", "") or "")[:300],
                "source": source,
                "tier":   tier_rank.get(source, 4),
                "score":  r.get("score", 0.0),
            })
    flat.sort(key=lambda x: (x["tier"], -x["score"]))
    return flat[:8]


# === Node entry ===

def node(state: GlucoLensState) -> dict:
    if state.get("event_type") != "misinformation_query":
        return {}

    raw_query = (state.get("raw_query") or "").strip()
    if not raw_query:
        return {
            "verdict": "error",
            "verdict_explanation": "No query provided.",
            "disclaimer": DISCLAIMER_TEXT,
            "evidence_sources": [],
            "logged_for_dietitian": False,
        }

    log.info("misinfo_entering", patient_id=state.get("patient_id"),
             query_preview=raw_query[:80])

    try:
        # 1. Extract structured claim
        extracted = extract_claim(raw_query)
        claim = extracted.get("claim", raw_query[:200])

        # 2. If URLs present, pull article content to enrich the claim
        for url in extract_urls(raw_query)[:1]:
            url_content = fetch_url_content(url)
            if url_content:
                # Re-run extraction with article text appended
                enriched = extract_claim(f"{raw_query}\n\nArticle content: {url_content[:2000]}")
                if enriched.get("claim"):
                    claim = enriched["claim"]
                    # Merge entities (dedup, normalized)
                    merged = set(extracted.get("entities", []) + enriched.get("entities", []))
                    extracted["entities"] = list(merged)
                break

        # 3. Gather evidence in parallel
        evidence = _gather_evidence_parallel(claim)
        sources = _flatten_evidence(evidence)

        # 4. Patient-specific risk check
        profile = patient_profile_cache.get(state.get("patient_id", "")) or \
                  firebase_tools.fetch_patient_profile(state.get("patient_id", "")) or {}
        if profile:
            patient_profile_cache.set(state.get("patient_id", ""), profile)
        patient_risk = check_against_patient_profile(
            extracted.get("entities", []), profile,
        )

        # 5. Verdict + explanation
        verdict_obj = classify_verdict(claim, evidence, patient_risk)
        verdict = verdict_obj["verdict"]
        explanation = generate_explanation(claim, verdict, sources[:3], patient_risk)
        explanation_with_disclaimer = append_disclaimer(explanation)

        # 6. Log for dietitian
        log_query_for_dietitian(state.get("patient_id", ""), {
            "raw_query":    raw_query,
            "claim":        claim,
            "claim_type":   extracted.get("claim_type", "other"),
            "entities":     extracted.get("entities", []),
            "verdict":      verdict,
            "confidence":   verdict_obj.get("confidence", 0.0),
            "patient_risk": patient_risk,
            "sources":      sources,
            "timestamp":    now_iso(),
            "session_id":   state.get("session_id", ""),
            "seen":         False,
        })

        log.info("misinfo_done", verdict=verdict, sources=len(sources),
                 patient_risk=patient_risk.get("has_risk"))

        return {
            "verdict":               verdict,
            "verdict_explanation":   explanation_with_disclaimer,
            "disclaimer":            DISCLAIMER_TEXT,
            "evidence_sources":      sources,
            "logged_for_dietitian":  True,
        }

    except Exception as e:  # noqa: BLE001
        log.exception("misinfo_failure")
        return {
            "verdict": "error",
            "verdict_explanation": (
                "We couldn't verify this claim right now. "
                "Please discuss it with your dietitian or doctor.\n\n" + DISCLAIMER_TEXT
            ),
            "disclaimer": DISCLAIMER_TEXT,
            "evidence_sources": [],
            "logged_for_dietitian": False,
            "errors": (state.get("errors") or []) + [{"agent": "misinfo", "error": str(e)}],
        }
