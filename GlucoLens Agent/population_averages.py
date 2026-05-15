"""
Population glucose-response averages used by Agent 4 (Glucose Correlation).

Format per dish: average 2-hour post-meal glucose delta (mmol/L), stddev, and sample size.
Data is illustrative/demo-grade — sourced from a synthesised mix of published values for
typical Malaysian T2DM populations. Production should swap for clinical-trial-grade datasets.
"""

POPULATION_AVERAGES: dict[str, dict] = {
    "nasi_lemak":         {"avg_delta_mmol": 2.8, "stddev": 0.9, "n": 1240},
    "char_kuey_teow":     {"avg_delta_mmol": 3.1, "stddev": 1.0, "n": 980},
    "roti_canai_plain":   {"avg_delta_mmol": 2.9, "stddev": 0.8, "n": 1120},
    "roti_canai_telur":   {"avg_delta_mmol": 2.7, "stddev": 0.9, "n": 760},
    "nasi_goreng_kampung":{"avg_delta_mmol": 2.6, "stddev": 0.7, "n": 880},
    "mee_goreng_mamak":   {"avg_delta_mmol": 2.5, "stddev": 0.8, "n": 720},
    "laksa_penang":       {"avg_delta_mmol": 1.6, "stddev": 0.6, "n": 540},
    "laksa_sarawak":      {"avg_delta_mmol": 2.0, "stddev": 0.7, "n": 320},
    "satay_chicken":      {"avg_delta_mmol": 0.9, "stddev": 0.5, "n": 410},
    "curry_mee":          {"avg_delta_mmol": 2.2, "stddev": 0.8, "n": 510},
    "hokkien_mee":        {"avg_delta_mmol": 2.4, "stddev": 0.7, "n": 480},
    "wantan_mee":         {"avg_delta_mmol": 2.3, "stddev": 0.7, "n": 520},
    "chicken_rice":       {"avg_delta_mmol": 2.7, "stddev": 0.8, "n": 1050},
    "mixed_rice_avg":     {"avg_delta_mmol": 2.4, "stddev": 0.9, "n": 1380},
    "economy_rice_avg":   {"avg_delta_mmol": 2.4, "stddev": 0.9, "n": 1290},
    "kuih_lapis":         {"avg_delta_mmol": 2.1, "stddev": 0.7, "n": 290},
    "kuih_seri_muka":     {"avg_delta_mmol": 2.0, "stddev": 0.6, "n": 240},
    "teh_tarik":          {"avg_delta_mmol": 1.3, "stddev": 0.5, "n": 1410},
    "milo_ais":           {"avg_delta_mmol": 1.5, "stddev": 0.6, "n": 1180},
    "rendang":            {"avg_delta_mmol": 1.0, "stddev": 0.5, "n": 420},
    "ayam_masak_merah":   {"avg_delta_mmol": 1.2, "stddev": 0.5, "n": 380},
    "ikan_bakar":         {"avg_delta_mmol": 0.7, "stddev": 0.4, "n": 360},
    "pisang_goreng":      {"avg_delta_mmol": 2.5, "stddev": 0.8, "n": 690},
    "popiah":             {"avg_delta_mmol": 1.4, "stddev": 0.6, "n": 320},
    "cendol":             {"avg_delta_mmol": 2.6, "stddev": 0.8, "n": 460},
    "ais_kacang":         {"avg_delta_mmol": 2.8, "stddev": 0.9, "n": 410},
    "bak_kut_teh":        {"avg_delta_mmol": 0.8, "stddev": 0.4, "n": 380},
    "dim_sum_avg":        {"avg_delta_mmol": 1.9, "stddev": 0.7, "n": 540},
    "tom_yam_chicken":    {"avg_delta_mmol": 0.9, "stddev": 0.5, "n": 320},
    "nasi_briyani":       {"avg_delta_mmol": 2.5, "stddev": 0.8, "n": 480},
}
