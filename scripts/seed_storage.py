"""Upload sample meal images to Firebase Storage for demo."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.config import settings  # noqa
from backend.tools.firebase_tools import storage_bucket

SAMPLE_IMAGES = {
    "meals/uid_rahman/nasi_lemak.jpg": "frontend/public/seeds/nasi_lemak_rahman.jpg",
}

def seed_storage():
    bucket = storage_bucket()
    for dest_path, src_path in SAMPLE_IMAGES.items():
        abs_src = os.path.join(os.path.dirname(__file__), "..", src_path)
        if not os.path.exists(abs_src):
            print(f"  skipping {src_path} (file not found locally)")
            continue
        blob = bucket.blob(dest_path)
        blob.upload_from_filename(abs_src, content_type="image/jpeg")
        print(f"✓ Uploaded {dest_path}")
    print("\n✅ Storage seed complete")

if __name__ == "__main__":
    seed_storage()
