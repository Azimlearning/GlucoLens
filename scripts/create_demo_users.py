import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.seed_firestore import seed_users

if __name__ == "__main__":
    seed_users()
    print("Demo users creation completed.")
