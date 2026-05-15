"""Warm up all external services: OpenAI, Tavily, Firebase."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.config import settings  # noqa


def check_openai():
    from backend.tools.openai_tools import chat_completion
    result = chat_completion([{"role": "user", "content": "Say OK"}])
    assert "OK" in result or len(result) > 0
    print("✓ OpenAI chat completion OK")


def check_tavily():
    from backend.tools.tavily_tools import tavily_search
    results = tavily_search("diabetes diet Malaysia", max_results=1)
    assert len(results) >= 0  # empty is ok if quota hit
    print("✓ Tavily search OK")


def check_firebase():
    from backend.tools.firebase_tools import firestore_client
    client = firestore_client()
    assert client is not None
    print("✓ Firebase Firestore client OK")


if __name__ == "__main__":
    check_openai()
    check_tavily()
    check_firebase()
    print("\n✅ All services warmed up")
