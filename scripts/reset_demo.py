"""Reset dynamic demo data (meals, glucose, alerts, misinfo) while keeping profile."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.config import settings  # noqa
from backend.tools.firebase_tools import firestore_client


def clear_subcollection(path: str):
    db = firestore_client()
    parts = path.split("/")
    ref = db
    for i, part in enumerate(parts):
        if i % 2 == 0:
            ref = ref.collection(part)
        else:
            ref = ref.document(part)
    docs = ref.stream()
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
    print(f"✓ Cleared {count} docs from {path}")


if __name__ == "__main__":
    clear_subcollection("patients/uid_rahman/meals")
    clear_subcollection("patients/uid_rahman/glucose")
    clear_subcollection("patients/uid_rahman/alerts")
    clear_subcollection("patients/uid_rahman/misinfo_queries")
    print("\n✅ Demo reset complete (profile preserved)")
