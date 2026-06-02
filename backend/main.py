import os
import json
import base64
import hashlib
import hmac
import re
import secrets
import time
import uuid
from fastapi import FastAPI, HTTPException, Body, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import google.generativeai as genai
from pymongo import MongoClient
import certifi

from rag_engine import RAGEngine
from agent_workflow import run_admission_counselor

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
AUTH_SECRET = os.getenv("AUTH_SECRET", "dev-only-change-me")
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3001,http://127.0.0.1:3001").split(",")
    if origin.strip()
]

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ap_admission_counselor")
_mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
_db = _mongo_client[MONGO_DB_NAME]

# Collections (one per data type)
col_users = _db["users"]
col_profiles = _db["profiles"]
col_chats = _db["chats"]
col_recommendations = _db["recommendations"]
col_saved_colleges = _db["saved_colleges"]

# Ensure unique index on users.uid (deferred to startup event)


# Initialize FastAPI
app = FastAPI(title="AI Admission Counselor API", version="1.0.0")

# CORS middleware for React frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def create_indexes():
    try:
        col_users.create_index("uid", unique=True)
        col_users.create_index("email", unique=True)
    except Exception as e:
        print(f"Warning: Could not create indexes: {e}")

# Initialize RAG Engine
rag_engine = RAGEngine()
rag_engine.build_or_load_vector_db()


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 210_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        _, salt, expected = stored_hash.split("$", 2)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 210_000).hex()
        return hmac.compare_digest(digest, expected)
    except Exception:
        return False

def create_access_token(user: Dict[str, Any]) -> str:
    payload = {
        "uid": user["uid"],
        "email": user["email"],
        "exp": int(time.time()) + 60 * 60 * 24 * 7,
    }
    payload_raw = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(AUTH_SECRET.encode(), payload_raw.encode(), hashlib.sha256).digest()
    return f"{payload_raw}.{_b64url_encode(signature)}"

def verify_access_token(token: str) -> Dict[str, Any]:
    try:
        payload_raw, signature_raw = token.split(".", 1)
        expected_signature = hmac.new(AUTH_SECRET.encode(), payload_raw.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url_decode(signature_raw), expected_signature):
            raise ValueError("Bad signature")
        payload = json.loads(_b64url_decode(payload_raw))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("Expired token")
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

def public_user(user: Dict[str, Any]) -> Dict[str, str]:
    return {
        "uid": user["uid"],
        "email": user["email"],
        "displayName": user.get("displayName") or user["email"].split("@")[0],
    }

def get_current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")

    token = authorization.replace("Bearer ", "", 1).strip()
    payload = verify_access_token(token)
    user = col_users.find_one({"uid": payload["uid"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return public_user(user)

def require_matching_user(user_id: str, current_user: Dict[str, Any]):
    if user_id != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="You cannot access another user's data")

# Data Schemas
class AuthRequest(BaseModel):
    email: str
    password: str

class StudentProfile(BaseModel):
    userId: str
    name: str
    stream: str
    percentage: float
    mathMarks: float
    physicsMarks: float
    chemistryMarks: float
    rank: int
    interests: List[str]
    preferred_branch: str
    budget: float
    gov_preference: str
    hostel_required: bool
    category: str
    family_income: float

class ChatMessage(BaseModel):
    userId: str
    message: str
    history: List[Dict[str, str]] = []

class CollegeCompareRequest(BaseModel):
    collegeNames: List[str]
    preferredBranch: str

# Endpoints
@app.get("/")
def read_root():
    return {"status": "running", "rag_mode": "mock" if rag_engine.is_mock else "chroma_gemini"}

@app.post("/api/auth/register")
def register_user(req: AuthRequest):
    email = req.email.strip().lower()
    password = req.password

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    if col_users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="User already exists. Please sign in.")

    uid = f"user_{uuid.uuid4().hex}"
    col_users.insert_one({
        "uid": uid,
        "email": email,
        "displayName": email.split("@")[0],
        "passwordHash": hash_password(password),
        "createdAt": int(time.time()),
    })

    return {"status": "success", "message": "Account created successfully."}

@app.post("/api/auth/login")
def login_user(req: AuthRequest):
    email = req.email.strip().lower()
    user = col_users.find_one({"email": email}, {"_id": 0})

    if not user or not verify_password(req.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user(user),
    }

@app.get("/api/auth/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return current_user

@app.post("/api/profile/save")
def save_profile(profile: StudentProfile, current_user: Dict[str, Any] = Depends(get_current_user)):
    require_matching_user(profile.userId, current_user)
    col_profiles.update_one(
        {"userId": profile.userId},
        {"$set": profile.dict()},
        upsert=True
    )
    return {"status": "success", "message": "Profile saved successfully."}

@app.get("/api/profile/{userId}")
def get_profile(userId: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    require_matching_user(userId, current_user)
    profile = col_profiles.find_one({"userId": userId}, {"_id": 0})
    if profile:
        return profile
    raise HTTPException(status_code=404, detail="Profile not found")

@app.post("/api/counselor/recommend")
def recommend_colleges(profile: Dict[str, Any] = Body(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        userId = profile.get("userId") or current_user["uid"]
        require_matching_user(userId, current_user)
        profile_data = profile
        if userId:
            saved_profile = col_profiles.find_one({"userId": userId}, {"_id": 0})
            if saved_profile:
                profile_data = saved_profile

        result = run_admission_counselor(profile_data)

        col_recommendations.update_one(
            {"_userId": userId},
            {"$set": {"_userId": userId, **result}},
            upsert=True
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/counselor/compare")
def compare_colleges(req: CollegeCompareRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        from generate_kb import colleges as RAW_COLLEGES
        
        comparison_list = []
        selected_colleges = []
        
        for name in req.collegeNames:
            matched = None
            name_lower = name.lower().strip()
            # 1. Exact substring match
            for col in RAW_COLLEGES:
                if name_lower in col["name"].lower() or col["name"].lower() in name_lower:
                    matched = col
                    break
            # 2. Word-based match — pick the BEST scoring college, not the first
            if not matched:
                stop = {"college", "university", "institute", "engineering",
                        "technology", "sciences", "andhra", "pradesh", "deemed",
                        "research", "science"}
                name_words = set(w for w in name_lower.replace("'", "").split()
                                 if len(w) > 3 and w not in stop)
                # Include short acronyms (srm, vit, kl, vfstr etc.)
                short_words = set(w for w in name_lower.split()
                                  if len(w) <= 5 and w.isalpha()
                                  and w not in {"and", "for", "the", "of", "to", "ap"})
                name_words.update(short_words)
                best_score = 0
                for col in RAW_COLLEGES:
                    col_lower = col["name"].lower().replace("'", "")
                    score = sum(1 for w in name_words if w in col_lower)
                    if score > best_score:
                        best_score = score
                        matched = col
            if matched and matched not in selected_colleges:
                selected_colleges.append(matched)
        
        if not selected_colleges:
            raise HTTPException(status_code=404, detail="No matching colleges found.")
            
        # Compile side-by-side attributes
        for col in selected_colleges:
            # Cutoff estimation
            cutoff_val = "N/A"
            parts = col["cutoffs"].split(",")
            for p in parts:
                if req.preferredBranch.lower() in p.lower():
                    cutoff_val = p.strip()
                    
            comparison_list.append({
                "name": col["name"],
                "location": col["location"],
                "accreditation": col["accreditation"],
                "naac": col["naac"],
                "nirf": col.get("nirf", "N/A"),
                "fees": col["fees"],
                "hostel_fee": col["hostel_fee"],
                "placements_avg": col["placements_avg"],
                "placements_highest": col["placements_highest"],
                "placements_pct": col["placements_pct"],
                "cutoff": cutoff_val,
                "scholarships": col["scholarships"]
            })
            
        # Generate AI Comparison Summary
        ai_summary = ""
        col_names_str = " vs ".join([c["name"].split("(")[0].strip() for c in selected_colleges])
        
        if GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                prompt = (
                    f"Compare the following colleges for a student wanting '{req.preferredBranch}':\n"
                    f"{json.dumps(comparison_list, indent=2)}\n\n"
                    "Provide a brief, professional comparison (2-3 paragraphs). "
                    "Highlight which offers better affordability, which offers stronger placement opportunities, "
                    "and give a summary conclusion on who should choose which college based on their priorities."
                )
                response = model.generate_content(prompt)
                ai_summary = response.text
            except Exception as e:
                print(f"Gemini comparison failed: {e}")
                
        if not ai_summary:
            # High quality fallback summary rules
            col1 = comparison_list[0]
            col2 = comparison_list[1] if len(comparison_list) > 1 else None
            
            p1_name = col1["name"].split("(")[0].strip()
            p2_name = col2["name"].split("(")[0].strip() if col2 else ""
            
            if col2:
                ai_summary = (
                    f"### AI Comparison: {p1_name} vs {p2_name}\n\n"
                    f"**1. Fee & Budget Evaluation:**\n"
                    f"- **{p1_name}** lists annual tuition fees as `{col1['fees']}` with hostel charges at `{col1['hostel_fee']}`.\n"
                    f"- **{p2_name}** lists annual tuition fees as `{col2['fees']}` with hostel charges at `{col2['hostel_fee']}`.\n"
                    f"Check which matches your budget category. Government colleges are generally significantly cheaper.\n\n"
                    f"**2. Academic Quality & Placements:**\n"
                    f"- **{p1_name}** boasts an average package of `{col1['placements_avg']}` (Highest: `{col1['placements_highest']}`) and is rated `{col1['naac']}`.\n"
                    f"- **{p2_name}** boasts an average package of `{col2['placements_avg']}` (Highest: `{col2['placements_highest']}`) and is rated `{col2['naac']}`.\n\n"
                    f"**Summary Guidance:**\n"
                    f"If you prioritize placement packages and modern corporate networks, choose the one with the higher average package. "
                    f"If affordability is your core priority, select the option with lower tuition fees and higher scholarship eligibility (e.g., JVD reimbursement)."
                )
            else:
                ai_summary = f"College evaluation for {p1_name}: Offers average placement package of {col1['placements_avg']} and NAAC rating of {col1['naac']}. Fees are {col1['fees']}."
                
        return {
            "comparison": comparison_list,
            "ai_summary": ai_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/counselor/scholarships")
def check_scholarships(req: Dict[str, Any] = Body(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    income = float(req.get("family_income", 300000))
    percentage = float(req.get("percentage", 75))
    category = req.get("category", "OC").upper()
    
    eligible = []
    
    # 1. Jagananna Vidya Deevena (JVD) - Tuition Fee reimbursement
    # Criteria: Income < 2.5 Lakhs (or 2.5 LPA) and studying in AP under Convenor Quota
    if income <= 250000:
        eligible.append({
            "name": "Jagananna Vidya Deevena (JVD)",
            "type": "Government Scheme",
            "benefit": "100% Tuition Fee Reimbursement paid directly to colleges quarterly.",
            "description": "Applicable for all students (SC, ST, BC, EBC, Kapu, Minority) with family income below ₹2.5 Lakhs per annum pursuing B.Tech under convenor quota."
        })
        
        # 2. Jagananna Vasathi Deevena - Hostel/Mess support
        eligible.append({
            "name": "Jagananna Vasathi Deevena",
            "type": "Government Scheme",
            "benefit": "₹20,000 per year for boarding and lodging expenses.",
            "description": "Paid in two installments of ₹10,000 each directly to the mother's bank account for hostel and mess support."
        })
    
    # 3. State Merit Scholarships
    if percentage >= 85:
        eligible.append({
            "name": "AP State Merit Scholarship",
            "type": "Academic Merit",
            "benefit": "₹10,000 to ₹15,000 per annum cash award.",
            "description": "For students scoring above 85% in Board of Intermediate Education AP (BIEAP)."
        })
        
    # 4. Minority Scholarship
    if category in ["BC-E", "MINORITY"] and income <= 200000:
        eligible.append({
            "name": "Post-Matric Scholarship for Minorities",
            "type": "Government Minority Scheme",
            "benefit": "Tuition fee waiver and maintenance allowance of ₹500/month.",
            "description": "National and state-funded scholarship for religious minorities with income under ₹2 Lakhs per annum."
        })
        
    # 5. Central Sector Scheme of Scholarship (CSSS)
    if percentage >= 90:
        eligible.append({
            "name": "Central Sector Scholarship Scheme",
            "type": "Central Government",
            "benefit": "₹12,000 per year for graduation level.",
            "description": "For top 20th percentile students of the intermediate board exam."
        })

    if not eligible:
        eligible.append({
            "name": "Institution Specific Merit Scholarships",
            "type": "Private Institutional Aid",
            "benefit": "25% to 50% tuition fee waiver.",
            "description": "Many private and deemed universities (VIT-AP, SRM-AP, KL, GITAM) offer institutional scholarships for rankers below 10,000 in EAPCET or 90%+ in Intermediate."
        })
        
    return {"eligible_scholarships": eligible}

@app.post("/api/counselor/chat")
def chat_bot(msg: ChatMessage, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = msg.userId
    require_matching_user(user_id, current_user)
    query = msg.message.strip()
    
    # 1. Search RAG database for chunks
    retrieved_chunks = rag_engine.query(query, limit=3)
    context = "\n---\n".join(retrieved_chunks)
    
    response_text = ""

    ql = query.lower()

    def extract_field(chunks, field_labels):
        labels = field_labels if isinstance(field_labels, list) else [field_labels]
        for chunk in chunks:
            for line in chunk.split("\n"):
                lower_line = line.lower()
                for label in labels:
                    if label.lower() in lower_line:
                        return line.strip()
        return None

    def get_college_names(chunks):
        names = []
        for chunk in chunks:
            if "College Name:" in chunk:
                name = chunk.split("College Name:")[1].split("\n")[0].strip()
                if name and name not in names:
                    names.append(name)
        return names

    def clean_college_name(name):
        return name.split("(")[0].strip()

    def normalize_tokens(text):
        stop_words = {
            "college", "engineering", "institute", "technology", "technological",
            "science", "sciences", "university", "and", "of", "for", "the",
            "ap", "andhra", "pradesh", "deemed", "autonomous"
        }
        return [
            token for token in re.findall(r"[a-z0-9]+", text.lower())
            if token not in stop_words and len(token) > 1
        ]

    def find_mentioned_college(names):
        query_tokens = set(normalize_tokens(query))
        query_norm = " ".join(re.findall(r"[a-z0-9]+", query.lower()))
        distinctive_short_tokens = {
            "au", "bec", "gitam", "jntua", "jntuk", "kl", "mits", "pace",
            "qis", "rvr", "srkr", "srm", "svu", "vit", "vvit"
        }
        for name in names:
            base = clean_college_name(name)
            base_norm = " ".join(re.findall(r"[a-z0-9]+", base.lower()))
            tokens = normalize_tokens(base)
            token_hits = sum(1 for token in tokens if token in query_tokens)
            acronym = "".join(part[0] for part in re.findall(r"[A-Za-z]+", base) if part[0].isalpha()).lower()
            if (
                base_norm and base_norm in query_norm
                or tokens and token_hits >= min(2, len(tokens))
                or acronym and len(acronym) >= 3 and acronym in query_tokens
                or any(token in query_tokens for token in tokens if token in distinctive_short_tokens)
                or any(token in query_tokens for token in tokens if len(token) >= 4)
            ):
                return name
        return None

    def chunks_for_college(name):
        base = clean_college_name(name).lower()
        return [chunk for chunk in retrieved_chunks if base in chunk.lower()] or retrieved_chunks

    college_names = get_college_names(retrieved_chunks)
    mentioned_college = find_mentioned_college(college_names)

    # Prefer exact, deterministic answers for common intents. This prevents dumping
    # all retrieved college data when the user asked for one field.
    if any(w in ql for w in ["fee", "fees", "cost", "tuition", "hostel", "charges"]):
        if not mentioned_college and len(college_names) > 1:
            response_text = "Which college fees do you want to know? Please mention the college name."
        else:
            name = mentioned_college or (college_names[0] if college_names else "the college")
            focused_chunks = chunks_for_college(name)
            fee_line = extract_field(focused_chunks, ["Branch-wise Fees", "Fees"])
            hostel_line = extract_field(focused_chunks, "Hostel")
            response_text = f"**{clean_college_name(name)} Fees:**\n"
            if fee_line:
                response_text += f"- Tuition: {fee_line.split(':', 1)[-1].strip()}\n"
            if hostel_line:
                hostel_value = hostel_line.split("Hostel:", 1)[-1].strip() if "Hostel:" in hostel_line else hostel_line.split(":", 1)[-1].strip()
                response_text += f"- Hostel: {hostel_value}\n"
            if not fee_line:
                response_text += "Fee details not found. Please mention the college and branch if you need exact fees."

    elif any(w in ql for w in ["placement", "package", "salary", "lpa", "recruiter", "job"]):
        if not mentioned_college and len(college_names) > 1:
            response_text = "Which college placements do you want to know? Please mention the college name."
        else:
            name = mentioned_college or (college_names[0] if college_names else "the college")
            focused_chunks = chunks_for_college(name)
            avg = extract_field(focused_chunks, ["Average Package", "Placements"])
            high = extract_field(focused_chunks, "Highest Package")
            pct = extract_field(focused_chunks, "Placement %")
            rec = extract_field(focused_chunks, ["Top Recruiters", "Recruiters"])
            parts = []
            if avg:
                value = avg.split("Placements:", 1)[-1].strip() if "Placements:" in avg else avg.split(":", 1)[-1].strip()
                parts.append(value)
            if high:
                parts.append(f"Highest: {high.split(':', 1)[-1].strip()}")
            if pct:
                parts.append(f"Placed: {pct.split(':', 1)[-1].strip()}")
            response_text = f"**{clean_college_name(name)} Placements:** {' | '.join(parts) if parts else 'Data not available.'}"
            if rec:
                response_text += f"\n**Recruiters:** {rec.split(':', 1)[-1].strip()}"

    elif (
        any(w in ql for w in ["cutoff", "cut off", "rank", "eapcet", "eamcet", "can i get", "eligible"])
        and not any(w in ql for w in ["scholarship", "jvd", "deevena", "financial", "waiver", "concession"])
    ):
        if not mentioned_college and any(w in ql for w in ["cutoff", "cut off"]):
            response_text = "Which college cutoff do you want to know? Please mention the college name and branch."
        else:
            name = mentioned_college or (college_names[0] if college_names else "the college")
            focused_chunks = chunks_for_college(name)
            cutoff_line = extract_field(focused_chunks, ["Cutoff", "Cutoffs"])
            if cutoff_line and mentioned_college:
                response_text = f"**{clean_college_name(name)} Cutoffs:** {cutoff_line.split(':', 1)[-1].strip()}"
            else:
                response_text = "Please mention a college and branch for an exact cutoff. For rank-based college suggestions, use the College Advisor tab."

    elif any(w in ql for w in ["scholarship", "jvd", "deevena", "financial", "waiver", "concession"]):
        if mentioned_college:
            focused_chunks = chunks_for_college(mentioned_college)
            schol_line = extract_field(focused_chunks, "Scholarships")
            if schol_line:
                response_text = f"**{clean_college_name(mentioned_college)} Scholarships:** {schol_line.split(':', 1)[-1].strip()}"
        if not response_text:
            response_text = (
                "Key AP scholarships: JVD covers eligible tuition reimbursement, Vasathi Deevena supports hostel/mess expenses, and many private universities offer merit waivers based on EAPCET rank."
            )

    # 2. Query LLM only for open-ended questions if key is configured.
    if GEMINI_API_KEY:
        try:
            if not response_text:
                model = genai.GenerativeModel('gemini-2.5-flash')
                prompt = (
                    "You are a concise AI Admission Counselor for Andhra Pradesh engineering students.\n"
                    "Answer only the specific detail the user asked for. Do not add unrelated college data, filler, or unasked comparisons.\n"
                    "If the user asks for fees, placements, cutoffs, or scholarships, return only that requested field.\n"
                    "If the context does not contain the requested fact, say exactly which college detail is missing.\n"
                    "Use no more than 3 short sentences unless the user explicitly requests a list or comparison.\n\n"
                    f"Relevant Context:\n{context}\n\n"
                    f"User Question: {query}\n"
                    "Answer:"
                )
                response = model.generate_content(
                    prompt,
                    generation_config={"temperature": 0.2, "max_output_tokens": 220}
                )
                response_text = response.text.strip()
        except Exception as e:
            print(f"Gemini chat failed: {e}")
            
    if not response_text:
        # COMPARE intent
        if any(w in ql for w in ["compare", "vs", "better", "best between", "which is better", "which is best"]):
            if len(college_names) >= 2:
                c1_chunks = [c for c in retrieved_chunks if college_names[0].split("(")[0].strip().lower() in c.lower()]
                c2_chunks = [c for c in retrieved_chunks if college_names[1].split("(")[0].strip().lower() in c.lower()]

                def get_val(chunks, key):
                    for c in chunks:
                        for line in c.split("\n"):
                            if key.lower() in line.lower():
                                return line.split(":", 1)[-1].strip() if ":" in line else line.strip()
                    return "N/A"

                n1 = college_names[0].split("(")[0].strip()
                n2 = college_names[1].split("(")[0].strip()
                avg1 = get_val(c1_chunks, "Average Package")
                avg2 = get_val(c2_chunks, "Average Package")
                fee1 = get_val(c1_chunks, "Branch-wise Fees")
                fee2 = get_val(c2_chunks, "Branch-wise Fees")
                naac1 = get_val(c1_chunks, "NAAC")
                naac2 = get_val(c2_chunks, "NAAC")
                nirf1 = get_val(c1_chunks, "Rank:")
                nirf2 = get_val(c2_chunks, "Rank:")

                # Determine winner
                def parse_pkg(s):
                    import re
                    nums = re.findall(r"[\d.]+", s.replace(",", ""))
                    return float(nums[0]) if nums else 0

                winner = n1 if parse_pkg(avg1) >= parse_pkg(avg2) else n2
                loser = n2 if winner == n1 else n1

                response_text = (
                    f"**{winner}** is the better choice overall.\n\n"
                    f"**Placements:** {n1} avg {avg1} vs {n2} avg {avg2}.\n"
                    f"**Fees:** {n1} — {fee1[:60] if fee1 != 'N/A' else 'N/A'} | {n2} — {fee2[:60] if fee2 != 'N/A' else 'N/A'}.\n"
                    f"**NAAC:** {n1} {naac1} | {n2} {naac2}.\n\n"
                    f"Choose **{winner}** for stronger placements and ranking. Choose **{loser}** if budget is a constraint."
                )
            else:
                response_text = "Please use the **Compare Dash** tab to compare colleges side by side with full details."

        # FEE intent
        elif any(w in ql for w in ["fee", "fees", "cost", "tuition", "hostel", "charges"]):
            fee_line = extract_field(retrieved_chunks, "Branch-wise Fees") or extract_field(retrieved_chunks, "Fees")
            hostel_line = extract_field(retrieved_chunks, "Hostel")
            name = college_names[0] if college_names else "the college"
            response_text = f"**{name.split('(')[0].strip()} Fees:**\n"
            if fee_line:
                response_text += f"- Tuition: {fee_line.split(':', 1)[-1].strip()}\n"
            if hostel_line:
                response_text += f"- Hostel: {hostel_line.split(':', 1)[-1].strip()}\n"
            if not fee_line:
                response_text += "Fee details not found. Please visit the college website."

        # PLACEMENT intent
        elif any(w in ql for w in ["placement", "package", "salary", "lpa", "recruiter", "job"]):
            avg = extract_field(retrieved_chunks, "Average Package")
            high = extract_field(retrieved_chunks, "Highest Package")
            pct = extract_field(retrieved_chunks, "Placement %")
            rec = extract_field(retrieved_chunks, "Top Recruiters")
            name = college_names[0] if college_names else "the college"
            parts = []
            if avg: parts.append(f"Avg: {avg.split(':', 1)[-1].strip()}")
            if high: parts.append(f"Highest: {high.split(':', 1)[-1].strip()}")
            if pct: parts.append(f"Placed: {pct.split(':', 1)[-1].strip()}")
            response_text = f"**{name.split('(')[0].strip()} Placements:** {' | '.join(parts) if parts else 'Data not available.'}"
            if rec:
                response_text += f"\n**Recruiters:** {rec.split(':', 1)[-1].strip()}"

        # CUTOFF / RANK intent
        elif any(w in ql for w in ["cutoff", "rank", "eapcet", "eamcet", "can i get", "eligible"]):
            cutoff_line = extract_field(retrieved_chunks, "Cutoff")
            name = college_names[0] if college_names else "the college"
            if cutoff_line:
                response_text = f"**{name.split('(')[0].strip()} Cutoffs:** {cutoff_line.split(':', 1)[-1].strip()}"
            else:
                response_text = "Cutoff data not found. Please check the College Recommendations tab for rank-based suggestions."

        # SCHOLARSHIP intent
        elif any(w in ql for w in ["scholarship", "jvd", "deevena", "financial", "waiver", "concession"]):
            schol_line = extract_field(retrieved_chunks, "Scholarships")
            name = college_names[0] if college_names else "the college"
            if schol_line:
                response_text = f"**{name.split('(')[0].strip()} Scholarships:** {schol_line.split(':', 1)[-1].strip()}"
            else:
                response_text = (
                    "Key AP scholarships:\n"
                    "- **JVD:** 100% fee reimbursement for family income < ₹2.5L\n"
                    "- **Vasathi Deevena:** ₹20,000/year for hostel\n"
                    "- **Merit:** Top private universities offer 25–100% waivers based on EAPCET rank"
                )

        # GENERAL / OVERVIEW intent
        else:
            if college_names:
                name = college_names[0].split("(")[0].strip()
                avg = extract_field(retrieved_chunks, "Average Package")
                fee = extract_field(retrieved_chunks, "Branch-wise Fees")
                naac = extract_field(retrieved_chunks, "NAAC")
                response_text = f"**{name}**"
                if naac: response_text += f" — {naac.split(':', 1)[-1].strip()}"
                if avg: response_text += f"\nPlacements: avg {avg.split(':', 1)[-1].strip()}"
                if fee: response_text += f"\nFees: {fee.split(':', 1)[-1].strip()[:80]}"
            else:
                response_text = "I couldn't find specific information for that query. Try asking about a specific college, fee, cutoff, or placement."
            
    # Save chat history in MongoDB
    col_chats.update_one(
        {"userId": user_id},
        {"$push": {"messages": {"$each": [
            {"sender": "user", "text": query},
            {"sender": "counselor", "text": response_text}
        ]}}},
        upsert=True
    )
    
    return {"response": response_text}

@app.get("/api/chat/history/{userId}")
def get_chat_history(userId: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    require_matching_user(userId, current_user)
    doc = col_chats.find_one({"userId": userId}, {"_id": 0})
    if doc:
        return doc.get("messages", [])
    return []

@app.post("/api/colleges/save")
def save_college(
    userId: str = Body(...),
    collegeName: str = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    require_matching_user(userId, current_user)
    col_saved_colleges.update_one(
        {"userId": userId},
        {"$addToSet": {"colleges": collegeName}},
        upsert=True
    )
    doc = col_saved_colleges.find_one({"userId": userId}, {"_id": 0})
    return {"status": "success", "saved": doc.get("colleges", [])}

@app.get("/api/colleges/saved/{userId}")
def get_saved_colleges(userId: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    require_matching_user(userId, current_user)
    doc = col_saved_colleges.find_one({"userId": userId}, {"_id": 0})
    if doc:
        return doc.get("colleges", [])
    return []

@app.delete("/api/colleges/saved/{userId}/{collegeName}")
def delete_saved_college(userId: str, collegeName: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    require_matching_user(userId, current_user)
    col_saved_colleges.update_one(
        {"userId": userId},
        {"$pull": {"colleges": collegeName}}
    )
    doc = col_saved_colleges.find_one({"userId": userId}, {"_id": 0})
    return {"status": "success", "saved": doc.get("colleges", []) if doc else []}
