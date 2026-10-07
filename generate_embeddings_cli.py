"""
Bulk and Interactive InsightFace Embedding Generator & Supabase Sync Tool
--------------------------------------------------------------------------
Use this tool to generate real 512-dimensional ArcFace embeddings for employees.

Usage:
  python generate_embeddings_cli.py --help
  python generate_embeddings_cli.py --emp 002 --photos path/to/photo1.jpg path/to/photo2.jpg
  python generate_embeddings_cli.py --folder data/dataset
"""

import sys
import os
import argparse
import base64
import numpy as np
import cv2
from supabase import create_client

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ["INSIGHTFACE_HOME"] = BASE_DIR

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://crujjurupavknjwdjjmj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydWpqdXJ1cGF2a25qd2Rqam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjI0MTAsImV4cCI6MjA4NjUzODQxMH0.MdQDrEHOyQ0mI6HGX986lNMw5cpj5pfUCnKFh88pnzw"

def normalize(vec):
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm

def get_face_app():
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(
        name="buffalo_s",
        root=BASE_DIR,
        providers=["CPUExecutionProvider"],
        allowed_modules=['detection', 'recognition']
    )
    app.prepare(ctx_id=0, det_size=(320, 320), det_thresh=0.35)
    return app

def process_image_files(app, image_paths):
    valid_embeddings = []
    for path in image_paths:
        if not os.path.isfile(path):
            print(f"  ❌ File not found: {path}")
            continue
        img = cv2.imread(path)
        if img is None:
            print(f"  ❌ Failed to read image: {path}")
            continue
        faces = app.get(img)
        if len(faces) == 0:
            print(f"  ⚠️ No face found in: {path}")
            continue
        face = max(faces, key=lambda f: f.det_score)
        if face.det_score < 0.35:
            print(f"  ⚠️ Low confidence ({face.det_score:.2f}) in: {path}")
            continue
        emb = normalize(face.embedding)
        if emb.shape == (512,):
            valid_embeddings.append(emb)
            print(f"  ✓ Valid face detected ({face.det_score*100:.1f}%) in: {os.path.basename(path)}")

    if not valid_embeddings:
        return None

    mean_emb = normalize(np.mean(np.array(valid_embeddings), axis=0))
    b64_str = base64.b64encode(mean_emb.astype(np.float32).tobytes()).decode('utf-8')
    return b64_str

def save_to_supabase(sb, emp_code, b64_str):
    try:
        sb.table("face_embeddings").upsert({
            "emp_code": emp_code,
            "embedding_base64": b64_str
        }).execute()
        print(f"  🌟 Successfully saved 512-d biometric embedding for '{emp_code}' to Supabase!")
        return True
    except Exception as e:
        print(f"  ❌ Supabase save error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="InsightFace Embedding Sync Tool")
    parser.add_argument("--emp", type=str, help="Employee code (e.g. EMP-001 or 007)")
    parser.add_argument("--photos", nargs="+", help="Paths to photo files")
    parser.add_argument("--folder", type=str, help="Folder containing subfolders named by emp_code")
    parser.add_argument("--list", action="store_true", help="List all employees and their embedding status in Supabase")

    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    if args.list:
        print("\n=== Supabase Employee Biometric Status ===")
        emps = sb.table("employees").select("emp_code, full_name, department").execute().data or []
        embs = sb.table("face_embeddings").select("emp_code").execute().data or []
        emb_set = set(r["emp_code"] for r in embs)

        for e in emps:
            code = e["emp_code"]
            status = "🟢 ACTIVE (512-d)" if code in emb_set else "🔴 NO EMBEDDING"
            print(f"  [{status}] {code} - {e.get('full_name', '')} ({e.get('department', '')})")
        return

    app = get_face_app()

    if args.emp and args.photos:
        print(f"\nProcessing {len(args.photos)} photo(s) for employee: {args.emp}...")
        b64 = process_image_files(app, args.photos)
        if b64:
            save_to_supabase(sb, args.emp, b64)
        else:
            print("❌ Could not generate valid embedding from the provided photos.")

    elif args.folder:
        if not os.path.isdir(args.folder):
            print(f"Directory not found: {args.folder}")
            return
        print(f"\nScanning folder: {args.folder}...")
        for entry in os.listdir(args.folder):
            subpath = os.path.join(args.folder, entry)
            if os.path.isdir(subpath):
                emp_code = entry
                image_files = [
                    os.path.join(subpath, f)
                    for f in os.listdir(subpath)
                    if f.lower().endswith((".jpg", ".jpeg", ".png"))
                ]
                if image_files:
                    print(f"\nProcessing '{emp_code}' ({len(image_files)} photos)...")
                    b64 = process_image_files(app, image_files)
                    if b64:
                        save_to_supabase(sb, emp_code, b64)

    else:
        # Interactive mode
        print("\n=== Interactive Face Biometric Enrollment ===")
        emp_code = input("Enter Employee Code (e.g. EMP-101): ").strip()
        if not emp_code:
            print("Employee code cannot be empty.")
            return
        photo_input = input("Enter photo file paths (comma-separated): ").strip()
        photos = [p.strip().strip('"').strip("'") for p in photo_input.split(",") if p.strip()]
        if photos:
            b64 = process_image_files(app, photos)
            if b64:
                save_to_supabase(sb, emp_code, b64)
        else:
            print("No photos entered.")

if __name__ == "__main__":
    main()
