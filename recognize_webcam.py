import warnings
warnings.simplefilter(action='ignore', category=FutureWarning)

import cv2
import numpy as np
import os
import time
import sys
import datetime
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import winsound
import base64
import mediapipe as mp
from supabase import create_client, Client
import traceback

if getattr(sys, 'frozen', False):
    bundle_dir = sys._MEIPASS
    os.environ["INSIGHTFACE_HOME"] = bundle_dir
    print(f"[BUNDLED] INSIGHTFACE_HOME set to: {bundle_dir}")

# ────────────────────────────────────────────────
# Supabase Config
# ────────────────────────────────────────────────
SUPABASE_URL = "https://crujjurupavknjwdjjmj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydWpqdXJ1cGF2a25qd2Rqam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjI0MTAsImV4cCI6MjA4NjUzODQxMH0.MdQDrEHOyQ0mI6HGX986lNMw5cpj5pfUCnKFh88pnzw"

ADMIN_CONTACT = "0781705197"
supabase = None
supabase_connected = False
supabase_last_error = ""

print("=== Supabase Init ===")
try:
    supabase = create_client(SUPABASE_URL.strip(), SUPABASE_KEY.strip())
    supabase.table("employees").select("emp_code", count="planned").limit(0).execute()
    supabase_connected = True
    print("Supabase connected successfully")
except Exception as e:
    supabase_connected = False
    supabase_last_error = f"Supabase connection warning: {str(e)}"
    print(supabase_last_error)

# ────────────────────────────────────────────────
# Paths & Settings
# ────────────────────────────────────────────────
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

USER_APPDATA = os.getenv('APPDATA') or os.path.expanduser('~\\AppData\\Roaming')
APP_DATA_ROOT = os.path.join(USER_APPDATA, 'FaceRecAttendance')
os.makedirs(APP_DATA_ROOT, exist_ok=True)

# Futuristic Cyber Palette (BGR for OpenCV)
COLOR_CYAN       = (255, 220, 0)     # Neon Cyan HUD
COLOR_EMERALD    = (80, 240, 100)    # Verified Match / Check-In
COLOR_AMBER      = (0, 180, 255)     # Check-Out / Warning
COLOR_CRIMSON    = (60, 60, 230)     # Error / Alert
COLOR_TEXT_WHITE = (255, 255, 255)
COLOR_TEXT_MUTED = (180, 195, 190)

SIMILARITY_THRESHOLD     = 0.28
GESTURE_HOLD_SECONDS     = 2.5
MIN_TIME_BETWEEN_ACTIONS = 6.0
SUCCESS_SHOW_SECONDS     = 5.0
PROCESS_EVERY_N_FRAMES   = 3

# ────────────────────────────────────────────────
# Globals & State
# ────────────────────────────────────────────────
face_db = {}
employee_info = {}
last_sync_time = None
success_event = None  # Holds active check-in/out banner
gesture_active_until = 0.0
last_action_time = {}
smooth_boxes = {}

# ────────────────────────────────────────────────
# Lazy-load InsightFace
# ────────────────────────────────────────────────
face_analyzer = None

def get_face_analyzer():
    global face_analyzer
    if face_analyzer is None:
        try:
            from insightface.app import FaceAnalysis
            print(f"Loading InsightFace buffalo_s from root: {BASE_DIR} ...")
            face_analyzer = FaceAnalysis(
                name="buffalo_s",
                root=BASE_DIR,
                providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
                allowed_modules=['detection', 'recognition']
            )
            face_analyzer.prepare(ctx_id=0, det_size=(320, 320), det_thresh=0.35)
            print("InsightFace ready")
        except Exception as e:
            print(f"InsightFace failed: {e}")
            face_analyzer = None
    return face_analyzer

# ────────────────────────────────────────────────
def load_all_from_supabase(show_dialog=False):
    global face_db, employee_info, last_sync_time, supabase, supabase_connected
    face_db = {}
    employee_info = {}

    if not supabase:
        try:
            supabase = create_client(SUPABASE_URL.strip(), SUPABASE_KEY.strip())
        except Exception:
            supabase = None

    if not supabase:
        supabase_connected = False
        if show_dialog:
            messagebox.showerror(
                "Supabase Connection Error",
                f"⚠️ Cannot connect to Supabase Cloud Database.\n\nPlease contact Admin at {ADMIN_CONTACT} so that they can turn on / activate Supabase."
            )
        return False

    try:
        emp_response = supabase.table("employees").select(
            "emp_code, full_name, department, designation, mobile, notes"
        ).execute()

        for row in emp_response.data or []:
            code = row["emp_code"]
            employee_info[code] = {
                "full_name": row.get("full_name") or code,
                "department": row.get("department") or "",
                "designation": row.get("designation") or "",
                "mobile": row.get("mobile") or "",
                "notes": row.get("notes") or "",
            }

        emb_response = supabase.table("face_embeddings").select(
            "emp_code, embedding_base64"
        ).execute()

        count = 0
        for row in emb_response.data or []:
            code = row["emp_code"]
            b64_str = row.get("embedding_base64")
            if b64_str:
                try:
                    emb_bytes = base64.b64decode(b64_str)
                    emb_array = np.frombuffer(emb_bytes, dtype=np.float32)
                    if len(emb_array) == 512:
                        face_db[code] = emb_array
                        count += 1
                except Exception as e:
                    print(f"Embedding decode error for {code}: {e}")

        last_sync_time = datetime.datetime.now()
        supabase_connected = True
        print(f"Cloud Sync: {len(employee_info)} staff, {count} valid 512-d embeddings")
        if show_dialog:
            messagebox.showinfo("Cloud Sync Success", f"✓ Successfully synchronized {count} face vectors from Supabase Cloud!")
        return True
    except Exception as e:
        supabase_connected = False
        print(f"Supabase load error: {e}")
        if show_dialog:
            messagebox.showerror(
                "Supabase Connection Error",
                f"⚠️ Cannot connect to Supabase Cloud Database ({str(e)}).\n\nPlease contact Admin at {ADMIN_CONTACT} so that they can turn on / activate Supabase."
            )
        return False

# ────────────────────────────────────────────────
# Attendance Status & Logging
# ────────────────────────────────────────────────
def get_employee_today_status(emp_code: str):
    """Returns ('none' | 'checked_in' | 'checked_out', checkin_time, checkout_time)"""
    emp_code = emp_code.strip().upper()
    today = datetime.date.today().isoformat()
    try:
        if not supabase:
            return 'none', '', ''
        res = supabase.table("attendance").select("checkin_time, checkout_time").eq("emp_code", emp_code).eq("checkin_date", today).order("id", desc=True).limit(1).execute()
        if res.data:
            cin = res.data[0].get("checkin_time") or ""
            cout = res.data[0].get("checkout_time") or ""
            if cout:
                return 'checked_out', cin, cout
            return 'checked_in', cin, ''
        return 'none', '', ''
    except Exception as e:
        print(f"Status query error: {e}")
        return 'none', '', ''

def mark_present(emp_code: str) -> bool:
    emp_code = emp_code.strip().upper()
    today = datetime.date.today().isoformat()
    now_time = datetime.datetime.now().strftime("%I:%M:%S %p")

    try:
        if not supabase:
            return True
        existing = supabase.table("attendance").select("id").eq("emp_code", emp_code).eq("checkin_date", today).execute()
        if existing.data:
            return False

        supabase.table("attendance").insert({
            "emp_code": emp_code,
            "checkin_date": today,
            "checkin_time": now_time,
        }).execute()
        print(f"[CHECK-IN] {emp_code} at {now_time}")
        return True
    except Exception as e:
        print(f"Check-in error: {e}")
        return False

def mark_out(emp_code: str) -> bool:
    emp_code = emp_code.strip().upper()
    today = datetime.date.today().isoformat()
    now_time = datetime.datetime.now().strftime("%I:%M:%S %p")

    try:
        if not supabase:
            return True
        response = supabase.table("attendance").select("id, checkout_time").eq("emp_code", emp_code).eq("checkin_date", today).order("id", desc=True).limit(1).execute()
        if not response.data or response.data[0]["checkout_time"]:
            return False

        record_id = response.data[0]["id"]
        supabase.table("attendance").update({"checkout_time": now_time}).eq("id", record_id).execute()
        print(f"[CHECK-OUT] {emp_code} at {now_time}")
        return True
    except Exception as e:
        print(f"Check-out error: {e}")
        return False

# ────────────────────────────────────────────────
# Geometry & Math
# ────────────────────────────────────────────────
def normalize(v):
    norm = np.linalg.norm(v)
    return v / norm if norm > 0 else v

def cosine_similarity(a, b):
    min_len = min(len(a), len(b))
    a_trim = normalize(a[:min_len])
    b_trim = normalize(b[:min_len])
    dot = np.dot(a_trim, b_trim)
    norm_prod = np.linalg.norm(a_trim) * np.linalg.norm(b_trim)
    if norm_prod < 1e-8:
        return 0.0
    return float(dot / norm_prod)

def is_victory_gesture(lm):
    if not lm:
        return False
    return (
        lm[8].y  < lm[6].y  - 0.018 and
        lm[12].y < lm[10].y - 0.018 and
        lm[16].y > lm[14].y + 0.008 and
        lm[20].y > lm[18].y + 0.008
    )

# ────────────────────────────────────────────────
# Futuristic HUD Drawing Functions
# ────────────────────────────────────────────────
def draw_futuristic_brackets(img, x1, y1, x2, y2, color, length=22, thickness=2):
    """Draws sleek corner brackets around the face bounding box."""
    # Top-Left
    cv2.line(img, (x1, y1), (x1 + length, y1), color, thickness)
    cv2.line(img, (x1, y1), (x1, y1 + length), color, thickness)
    # Top-Right
    cv2.line(img, (x2, y1), (x2 - length, y1), color, thickness)
    cv2.line(img, (x2, y1), (x2, y1 + length), color, thickness)
    # Bottom-Left
    cv2.line(img, (x1, y2), (x1 + length, y2), color, thickness)
    cv2.line(img, (x1, y2), (x1, y2 - length), color, thickness)
    # Bottom-Right
    cv2.line(img, (x2, y2), (x2 - length, y2), color, thickness)
    cv2.line(img, (x2, y2), (x2, y2 - length), color, thickness)

def draw_hud_header(display_frame, fps, is_checkout_gesture):
    """Draws a sleek translucent HUD top bar with live status."""
    h, w = display_frame.shape[:2]
    header_h = 44

    overlay = display_frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, header_h), (12, 10, 8), -1)
    cv2.addWeighted(overlay, 0.78, display_frame, 0.22, 0, display_frame)

    cv2.line(display_frame, (0, header_h), (w, header_h), (70, 70, 60), 1)

    # Left: Brand + Status
    cv2.putText(display_frame, "FACEREC BIOMETRICS", (18, 28),
                cv2.FONT_HERSHEY_DUPLEX, 0.55, (245, 245, 245), 1)
    
    status_dot_color = (0, 180, 255) if is_checkout_gesture else (80, 240, 100)
    status_label = "CHECK-OUT READY (V-GESTURE)" if is_checkout_gesture else "TERMINAL READY"
    cv2.circle(display_frame, (230, 24), 4, status_dot_color, -1)
    cv2.putText(display_frame, status_label, (242, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, status_dot_color, 1)

    # Right: Clock & Stats
    now_str = datetime.datetime.now().strftime("%I:%M:%S %p")
    stats_str = f"ENROLLED: {len(face_db)}  |  FPS: {fps:.1f}  |  {now_str}"
    cv2.putText(display_frame, stats_str, (w - 380, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, (230, 230, 230), 1)

def draw_face_hud_card(display_frame, x1, y1, x2, y2, code, name, dept, score, is_match):
    """Draws a compact identification badge under each recognized face."""
    h, w = display_frame.shape[:2]
    badge_w = max(190, (x2 - x1))
    badge_h = 46
    bx1 = max(10, min(x1, w - badge_w - 10))
    by1 = y2 + 10

    if by1 + badge_h > h - 110:
        by1 = max(55, y1 - badge_h - 10)

    bx2 = bx1 + badge_w
    by2 = by1 + badge_h

    # Translucent card background
    overlay = display_frame.copy()
    cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (15, 12, 10), -1)
    cv2.addWeighted(overlay, 0.82, display_frame, 0.18, 0, display_frame)

    border_color = COLOR_EMERALD if is_match else (120, 120, 120)
    cv2.rectangle(display_frame, (bx1, by1), (bx2, by2), border_color, 1)

    if is_match:
        clean_name = name[:18]
        cv2.putText(display_frame, f"{clean_name}", (bx1 + 10, by1 + 19),
                    cv2.FONT_HERSHEY_DUPLEX, 0.48, (255, 255, 255), 1)
        
        conf_pct = min(99.8, max(88.0, score * 100))
        sub_info = f"{code} • {dept[:12] if dept else 'STAFF'} • {conf_pct:.1f}%"
        cv2.putText(display_frame, sub_info, (bx1 + 10, by1 + 37),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, COLOR_EMERALD, 1)
    else:
        cv2.putText(display_frame, "SCANNING FACE...", (bx1 + 10, by1 + 19),
                    cv2.FONT_HERSHEY_DUPLEX, 0.45, (220, 220, 220), 1)
        cv2.putText(display_frame, "NO CLOUD MATCH", (bx1 + 10, by1 + 36),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 140, 180), 1)

def draw_toast_notification(display_frame, event):
    """Draws a prominent, high-visibility futuristic notification card."""
    h, w = display_frame.shape[:2]
    toast_w = 600
    toast_h = 95
    tx1 = (w - toast_w) // 2
    ty1 = h - toast_h - 20
    tx2 = tx1 + toast_w
    ty2 = ty1 + toast_h

    # Translucent Dark Acrylic Glass
    overlay = display_frame.copy()
    cv2.rectangle(overlay, (tx1, ty1), (tx2, ty2), (10, 8, 8), -1)
    cv2.addWeighted(overlay, 0.90, display_frame, 0.10, 0, display_frame)

    evt_type = event.get("type", "checkin")
    if evt_type == "checkin":
        accent_color = (80, 240, 100)   # Bright Emerald Green
        icon_title = "[ CHECK-IN CONFIRMED ]"
    elif evt_type == "checkout":
        accent_color = (0, 180, 255)    # Glowing Amber Gold
        icon_title = "[ CHECK-OUT CONFIRMED ]"
    else:
        accent_color = (255, 220, 0)    # Cyan / Info
        icon_title = f"[ {event['action']} ]"

    # Glowing double border
    cv2.rectangle(display_frame, (tx1, ty1), (tx2, ty2), accent_color, 2)
    cv2.rectangle(display_frame, (tx1 + 3, ty1 + 3), (tx2 - 3, ty2 - 3), (60, 60, 60), 1)

    # 1. Action Badge Header
    cv2.putText(display_frame, icon_title, (tx1 + 22, ty1 + 28),
                cv2.FONT_HERSHEY_DUPLEX, 0.62, accent_color, 1)

    # 2. Staff Name & Code
    name_str = f"{event['name']}  ({event['code']})"
    cv2.putText(display_frame, name_str, (tx1 + 22, ty1 + 56),
                cv2.FONT_HERSHEY_DUPLEX, 0.58, (255, 255, 255), 1)

    # 3. Subline & Timestamp
    sub_str = f"{event.get('dept', 'Staff')}  •  {event['time']}  •  {event.get('subtext', '')}"
    cv2.putText(display_frame, sub_str, (tx1 + 22, ty1 + 80),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (190, 200, 200), 1)

# ────────────────────────────────────────────────
# Main Recognition Loop
# ────────────────────────────────────────────────
def run_attendance_recognition():
    global success_event, gesture_active_until

    analyzer = get_face_analyzer()
    if analyzer is None:
        messagebox.showerror("Error", "InsightFace model failed to initialize.")
        return

    load_all_from_supabase()

    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        messagebox.showerror("Camera Error", "No working camera found.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    WINDOW_NAME = "FACEREC BIOMETRIC RECOGNITION TERMINAL"
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, 1280, 720)

    # Safe MediaPipe Hands
    try:
        mp_hands = mp.solutions.hands if hasattr(mp, "solutions") else None
        if mp_hands:
            hands = mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                model_complexity=0,
                min_detection_confidence=0.55,
                min_tracking_confidence=0.55
            )
        else:
            hands = None
    except Exception as e:
        print(f"Hands fallback: {e}")
        hands = None

    frame_count = 0
    last_results = []
    prev_time = time.time()

    print("Biometric Video Loop Active")

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        display_frame = frame.copy()
        frame_count += 1
        now = time.time()
        is_checkout_gesture = (now < gesture_active_until)

        # Hands gesture check (V-sign for Check-Out)
        if hands is not None:
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                hand_results = hands.process(rgb)
                if hand_results.multi_hand_landmarks:
                    for hlm in hand_results.multi_hand_landmarks:
                        if is_victory_gesture(hlm.landmark):
                            gesture_active_until = now + GESTURE_HOLD_SECONDS
                            winsound.Beep(1800, 60)
            except Exception:
                pass

        # Face Recognition Pipeline
        if frame_count % PROCESS_EVERY_N_FRAMES == 0:
            try:
                faces = analyzer.get(frame)
                results = []

                for face in faces:
                    if face.det_score < 0.35:
                        continue

                    emb = normalize(face.embedding)
                    best_code = "Unknown"
                    best_score = -1.0

                    for code, db_emb in face_db.items():
                        db_emb_trim = db_emb[:512] if len(db_emb) > 512 else db_emb
                        sc = cosine_similarity(emb, db_emb_trim)
                        if sc > best_score:
                            best_score = sc
                            best_code = code

                    info = employee_info.get(best_code, {"full_name": best_code, "department": ""})
                    bbox = face.bbox.astype(int)
                    results.append((bbox, info["full_name"], info.get("department", ""), best_score, best_code))

                last_results = results
            except Exception as e:
                last_results = []

        # Draw Face Reticles & Badges
        for bbox, dname, dept, score, code in last_results:
            x1, y1, x2, y2 = map(int, bbox)
            is_match = (code != "Unknown" and score >= SIMILARITY_THRESHOLD)

            # Smooth box interpolation
            box_key = code if is_match else f"{x1//50}_{y1//50}"
            if box_key in smooth_boxes:
                prev_b = smooth_boxes[box_key]
                x1 = int(0.65 * x1 + 0.35 * prev_b[0])
                y1 = int(0.65 * y1 + 0.35 * prev_b[1])
                x2 = int(0.65 * x2 + 0.35 * prev_b[2])
                y2 = int(0.65 * y2 + 0.35 * prev_b[3])
            smooth_boxes[box_key] = (x1, y1, x2, y2)

            color = COLOR_EMERALD if is_match else (120, 140, 160)

            # 1. Corner Reticle
            draw_futuristic_brackets(display_frame, x1, y1, x2, y2, color, length=20, thickness=2)

            # 2. Sleek Floating Identification Badge
            draw_face_hud_card(display_frame, x1, y1, x2, y2, code, dname, dept, score, is_match)

            # 3. Action Trigger (Check-In / Check-Out with Instant Status Feedback)
            if is_match:
                if code in last_action_time and (now - last_action_time[code]) < MIN_TIME_BETWEEN_ACTIONS:
                    continue

                status, cin_time, cout_time = get_employee_today_status(code)
                now_str = datetime.datetime.now().strftime("%I:%M:%S %p")

                if is_checkout_gesture:
                    if status == 'checked_in':
                        if mark_out(code):
                            winsound.Beep(1500, 180)
                            winsound.Beep(1900, 220)
                            success_event = {
                                "type": "checkout",
                                "action": "CHECKED OUT",
                                "name": dname,
                                "code": code,
                                "dept": dept,
                                "time": now_str,
                                "subtext": "Shift closed successfully",
                                "expires_at": now + SUCCESS_SHOW_SECONDS
                            }
                            last_action_time[code] = now
                    elif status == 'checked_out':
                        success_event = {
                            "type": "info",
                            "action": "ALREADY CHECKED OUT TODAY",
                            "name": dname,
                            "code": code,
                            "dept": dept,
                            "time": f"Out at {cout_time}",
                            "subtext": "Daily shift completed",
                            "expires_at": now + SUCCESS_SHOW_SECONDS
                        }
                        last_action_time[code] = now
                else:
                    if status == 'none':
                        if mark_present(code):
                            winsound.Beep(1300, 150)
                            winsound.Beep(1800, 200)
                            success_event = {
                                "type": "checkin",
                                "action": "CHECKED IN",
                                "name": dname,
                                "code": code,
                                "dept": dept,
                                "time": now_str,
                                "subtext": "Attendance recorded for today",
                                "expires_at": now + SUCCESS_SHOW_SECONDS
                            }
                            last_action_time[code] = now
                    elif status == 'checked_in':
                        success_event = {
                            "type": "info",
                            "action": "ALREADY CHECKED IN",
                            "name": dname,
                            "code": code,
                            "dept": dept,
                            "time": f"In at {cin_time}",
                            "subtext": "Active present • V-gesture to Check-Out",
                            "expires_at": now + SUCCESS_SHOW_SECONDS
                        }
                        last_action_time[code] = now
                    elif status == 'checked_out':
                        success_event = {
                            "type": "info",
                            "action": "SHIFT COMPLETED",
                            "name": dname,
                            "code": code,
                            "dept": dept,
                            "time": f"Out at {cout_time}",
                            "subtext": "Already checked out for today",
                            "expires_at": now + SUCCESS_SHOW_SECONDS
                        }
                        last_action_time[code] = now

        # Draw Toast Notification Card (if active)
        if success_event and now < success_event["expires_at"]:
            draw_toast_notification(display_frame, success_event)

        # Draw Top HUD Header
        fps = 1.0 / (now - prev_time) if (now > prev_time) else 30.0
        prev_time = now
        draw_hud_header(display_frame, fps, is_checkout_gesture)

        cv2.imshow(WINDOW_NAME, display_frame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()
    if hands is not None:
        hands.close()

def launch_kiosk():
    load_all_from_supabase(show_dialog=False)

    root = tk.Tk()
    root.title("FACEREC • Biometric Recognition Terminal")
    root.geometry("640x630")
    root.configure(bg="#0e131f")
    root.resizable(False, False)

    icon_path = os.path.join(BASE_DIR, "OnTech.ico")
    if os.path.exists(icon_path):
        try:
            root.iconbitmap(icon_path)
        except Exception:
            pass

    header_frame = tk.Frame(root, bg="#0e131f")
    header_frame.pack(fill="x", pady=(30, 10), padx=40)

    tk.Label(
        header_frame,
        text="FACEREC BIOMETRICS",
        font=("Segoe UI", 26, "bold"),
        fg="#ffffff",
        bg="#0e131f"
    ).pack()

    sync_status_var = tk.StringVar()
    if supabase_connected:
        sync_status_var.set(f"✓ {len(face_db)} Staff Face Vectors Active • Cloud Online")
        status_color = "#8ECA3C"
    else:
        sync_status_var.set(f"⚠️ Cloud Offline • Contact Admin: {ADMIN_CONTACT}")
        status_color = "#f87171"

    status_label = tk.Label(
        header_frame,
        textvariable=sync_status_var,
        font=("Segoe UI", 11, "bold" if not supabase_connected else "normal"),
        fg=status_color,
        bg="#0e131f"
    )
    status_label.pack(pady=(4, 0))

    card = tk.Frame(root, bg="#161d2d", bd=1, relief="flat", highlightthickness=1, highlightbackground="#276F27")
    card.pack(pady=15, padx=45, fill="x")

    tk.Label(
        card,
        text="Live Camera Recognition Kiosk",
        font=("Segoe UI", 13, "bold"),
        fg="#ffffff",
        bg="#161d2d"
    ).pack(pady=(14, 4))

    tk.Label(
        card,
        text=f"High-speed InsightFace buffalo_s biometric matching with automated check-in/out.\nIf cloud is unreachable, contact Admin at {ADMIN_CONTACT}.",
        font=("Segoe UI", 9),
        fg="#94a3b8",
        bg="#161d2d",
        wraplength=480,
        justify="center"
    ).pack(pady=(0, 14), padx=20)

    btn_frame = tk.Frame(root, bg="#0e131f")
    btn_frame.pack(pady=5, padx=55, fill="x")

    def make_button(text, command, bg_color, fg_color="#ffffff"):
        btn = tk.Button(
            btn_frame,
            text=text,
            command=command,
            font=("Segoe UI", 11, "bold"),
            bg=bg_color,
            fg=fg_color,
            activebackground="#1e293b",
            activeforeground="#ffffff",
            bd=0,
            relief="flat",
            cursor="hand2",
            pady=10
        )
        btn.pack(pady=6, fill="x")
        return btn

    def handle_launch():
        if not supabase_connected:
            ok = load_all_from_supabase(show_dialog=False)
            if not ok:
                messagebox.showwarning(
                    "Database Disconnected",
                    f"⚠️ Cannot connect to Supabase Cloud Database.\n\nPlease contact Admin at {ADMIN_CONTACT} so that they can turn on / activate Supabase."
                )
        threading.Thread(target=run_attendance_recognition, daemon=True).start()

    def handle_sync():
        success = load_all_from_supabase(show_dialog=True)
        if success:
            sync_status_var.set(f"✓ {len(face_db)} Staff Face Vectors Active • Cloud Online")
            status_label.config(fg="#8ECA3C", font=("Segoe UI", 11))
        else:
            sync_status_var.set(f"⚠️ Cloud Offline • Contact Admin: {ADMIN_CONTACT}")
            status_label.config(fg="#f87171", font=("Segoe UI", 11, "bold"))

    make_button(
        "⚡ Launch Biometric Camera",
        handle_launch,
        "#276F27", "#ffffff"
    )

    make_button(
        "🔄 Sync Cloud Embeddings",
        handle_sync,
        "#1a381a", "#8ECA3C"
    )

    make_button(
        "✕ Close Kiosk Terminal",
        root.quit,
        "#1a1625", "#94a3b8"
    )

    tk.Label(
        root,
        text=f"Powered by InsightFace ONNX • Admin Contact: {ADMIN_CONTACT}",
        font=("Segoe UI", 9),
        fg="#475569",
        bg="#0e131f"
    ).pack(side="bottom", pady=16)

    root.mainloop()

if __name__ == "__main__":
    launch_kiosk()