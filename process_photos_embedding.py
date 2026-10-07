import sys
import os
import json
import base64
import numpy as np
import cv2

# Set base directory for insightface models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ["INSIGHTFACE_HOME"] = BASE_DIR

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Supabase config
SUPABASE_URL = "https://crujjurupavknjwdjjmj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydWpqdXJ1cGF2a25qd2Rqam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjI0MTAsImV4cCI6MjA4NjUzODQxMH0.MdQDrEHOyQ0mI6HGX986lNMw5cpj5pfUCnKFh88pnzw"

def normalize(vec):
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm

def init_analyzer():
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(
        name="buffalo_s",
        root=BASE_DIR,
        providers=["CPUExecutionProvider"],
        allowed_modules=['detection', 'recognition']
    )
    app.prepare(ctx_id=0, det_size=(320, 320), det_thresh=0.35)
    return app

def decode_base64_image(b64_str):
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def process_photos(emp_code, photos, save_supabase=True):
    logs = []
    if not photos or len(photos) == 0:
        return {
            "success": False,
            "error": "No photos provided.",
            "logs": ["Error: 0 photos provided."]
        }

    try:
        app = init_analyzer()
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to initialize InsightFace: {str(e)}",
            "logs": [f"Error initializing model: {str(e)}"]
        }

    valid_embeddings = []
    det_scores = []

    for idx, photo_b64 in enumerate(photos):
        try:
            img = decode_base64_image(photo_b64)
            if img is None:
                logs.append(f"Photo #{idx + 1}: Failed to decode image → skipped")
                continue

            # Run face detection and recognition
            faces = app.get(img)

            if len(faces) == 0:
                logs.append(f"Photo #{idx + 1}: No face detected in photo → skipped")
                continue

            # Pick highest confidence face
            face = max(faces, key=lambda f: f.det_score)
            if face.det_score < 0.35:
                logs.append(f"Photo #{idx + 1}: Face confidence low ({face.det_score:.2f}) → skipped")
                continue

            emb = face.embedding
            emb_norm = normalize(emb)

            if emb_norm.shape != (512,):
                logs.append(f"Photo #{idx + 1}: Unexpected embedding dimension {emb_norm.shape} → skipped")
                continue

            valid_embeddings.append(emb_norm)
            det_scores.append(float(face.det_score))
            logs.append(f"Photo #{idx + 1}: Face detected (conf: {face.det_score * 100:.1f}%) → 512-d ArcFace vector extracted ✓")

        except Exception as err:
            logs.append(f"Photo #{idx + 1}: Processing error: {str(err)} → skipped")

    if not valid_embeddings:
        return {
            "success": False,
            "error": "No valid faces could be detected in the provided photos. Please upload clearer front-facing photos.",
            "logs": logs
        }

    # Compute mean normalized embedding
    emb_stack = np.array(valid_embeddings)
    mean_emb = np.mean(emb_stack, axis=0)
    mean_emb_norm = normalize(mean_emb)

    # Convert to base64 string of float32 bytes
    float32_bytes = mean_emb_norm.astype(np.float32).tobytes()
    b64_output = base64.b64encode(float32_bytes).decode('utf-8')

    logs.append(f"Normalized mean 512-d ArcFace embedding created from {len(valid_embeddings)} photo(s) ({len(b64_output)} chars) ✓")

    # Optional: Save directly to Supabase
    if save_supabase and emp_code:
        try:
            from supabase import create_client
            sb = create_client(SUPABASE_URL, SUPABASE_KEY)
            sb.table("face_embeddings").upsert({
                "emp_code": emp_code,
                "embedding_base64": b64_output
            }).execute()
            logs.append(f"Synced 512-d biometric vector for '{emp_code}' to Supabase table 'face_embeddings' ✓")
        except Exception as sb_err:
            logs.append(f"Warning saving to Supabase: {str(sb_err)}")

    return {
        "success": True,
        "emp_code": emp_code,
        "embedding_base64": b64_output,
        "photos_processed": len(photos),
        "valid_faces_count": len(valid_embeddings),
        "det_scores": det_scores,
        "logs": logs
    }

def main():
    # Read payload from stdin or argument
    try:
        if len(sys.argv) > 1 and sys.argv[1] == "--file":
            filepath = sys.argv[2]
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            raw_input = sys.stdin.read().strip()
            if not raw_input:
                print(json.dumps({"success": False, "error": "No input payload provided."}))
                return
            data = json.loads(raw_input)

        emp_code = data.get("emp_code", "")
        photos = data.get("photos", [])
        save_supabase = data.get("save_supabase", True)

        result = process_photos(emp_code, photos, save_supabase=save_supabase)
        print("---RESULT_JSON_START---")
        print(json.dumps(result))
        print("---RESULT_JSON_END---")

    except Exception as e:
        print("---RESULT_JSON_START---")
        print(json.dumps({"success": False, "error": str(e), "logs": [f"Fatal error: {str(e)}"]}))
        print("---RESULT_JSON_END---")

if __name__ == "__main__":
    main()
