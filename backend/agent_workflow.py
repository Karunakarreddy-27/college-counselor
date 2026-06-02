import os
from typing import Dict, Any, List, TypedDict
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
import google.generativeai as genai
from rag_engine import RAGEngine

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Define State Structure
class CounselorState(TypedDict):
    profile: Dict[str, Any]
    branch_suggestions: List[Dict[str, str]]
    preferred_branch_analysis: Dict[str, Any]
    reality_check: Dict[str, Any]
    recommendations: Dict[str, List[Dict[str, Any]]]
    roadmap: Dict[str, Any]

# Ingest raw colleges from generate_kb
try:
    from generate_kb import colleges as ALL_COLLEGES
except ImportError:
    ALL_COLLEGES = []

# Initialize RAG Engine
rag = RAGEngine()
rag.build_or_load_vector_db()

# Step 1: Analyze Profile (Stream, scores, rank, preferences)
def understand_profile_node(state: CounselorState) -> Dict[str, Any]:
    profile = state["profile"]
    # Ensure standard formats
    rank = int(profile.get("rank", 50000))
    stream = profile.get("stream", "MPC").upper()
    interests = profile.get("interests", [])
    budget = float(profile.get("budget", 300000))
    gov_pref = profile.get("gov_preference", "Any") # Government, Private, Any
    hostel = profile.get("hostel_required", False)
    
    # We update the state with normalized variables
    profile["rank"] = rank
    profile["stream"] = stream
    profile["interests"] = interests
    profile["budget"] = budget
    profile["gov_preference"] = gov_pref
    profile["hostel_required"] = hostel
    
    return {"profile": profile}

# Step 2: Interest-based branch mapping
def suggest_branches_node(state: CounselorState) -> Dict[str, Any]:
    profile = state["profile"]
    stream = profile["stream"]
    interests = profile["interests"]
    
    branch_suggestions = []
    
    # Mapping based on Stream
    if stream == "BiPC":
        # Biotech, Agriculture, Food Tech, Pharmacy
        if "Technology & Coding" in interests or "Research" in interests or "Biology" in interests:
            branch_suggestions.append({
                "branch": "Bio-Technology",
                "reason": "Aligns with your biological sciences background and research interest in technology application."
            })
        if "Agriculture" in interests or "Biology" in interests:
            branch_suggestions.append({
                "branch": "Agricultural Engineering",
                "reason": "Excellent match for your agriculture interest. Leverages your science foundation."
            })
        branch_suggestions.append({
            "branch": "Food Technology",
            "reason": "Strong placement paths in processing industries, aligning with MEC/BiPC streams."
        })
    else: # MPC or others (primarily engineering focus)
        has_tech = any(x in interests for x in ["Technology & Coding", "Artificial Intelligence", "Data Science"])
        if has_tech or not interests:
            branch_suggestions.append({
                "branch": "CSE (Computer Science & Engineering)",
                "reason": "Top alignment with your interest in technology, coding, and software development."
            })
        if "Artificial Intelligence" in interests or "Data Science" in interests:
            branch_suggestions.append({
                "branch": "AI & ML / Data Science",
                "reason": "Specifically tailored to intelligence models, analytics, and robotics algorithms."
            })
        if "Electronics" in interests or "Robotics" in interests:
            branch_suggestions.append({
                "branch": "ECE (Electronics & Communication Engineering)",
                "reason": "Allows you to work with hardware components, chips, and communication tech, matching robotics."
            })
        if "Core Engineering" in interests or "Robotics" in interests:
            branch_suggestions.append({
                "branch": "ME (Mechanical Engineering)",
                "reason": "Fundamental core engineering discipline matching heavy machinery, design, and robotics."
            })
            branch_suggestions.append({
                "branch": "CE (Civil Engineering)",
                "reason": "Ideal for infrastructure development and structural design."
            })
        if "Electronics" in interests or "Core Engineering" in interests:
            branch_suggestions.append({
                "branch": "EEE (Electrical & Electronics Engineering)",
                "reason": "Core division focusing on power grids, electronic networks, and heavy transmission systems."
            })
            
    if not branch_suggestions:
        # Default options
        branch_suggestions.append({
            "branch": "CSE",
            "reason": "Highly versatile branch with strong job demand and diverse opportunities."
        })
        branch_suggestions.append({
            "branch": "ECE",
            "reason": "Versatile combination of software skills and hardware engineering principles."
        })
        
    return {"branch_suggestions": branch_suggestions}

# Step 3 & 4: Evaluate colleges & admission chances
def evaluate_admission_node(state: CounselorState) -> Dict[str, Any]:
    profile = state["profile"]
    rank = int(profile["rank"])
    pref_branch = profile.get("preferred_branch", "CSE")
    budget = float(profile["budget"])
    gov_pref = profile["gov_preference"]
    
    # Helper to parse cutoff rank for preferred branch
    def get_branch_cutoff(college_cutoffs_str, branch):
        # E.g., "CSE: 850 (Gen), ECE: 2200 (Gen)..."
        try:
            parts = college_cutoffs_str.split(",")
            for p in parts:
                if branch.lower() in p.lower() or ("aiml" in branch.lower() and "ai" in p.lower()):
                    # extract the number
                    num_str = "".join([c for c in p if c.isdigit()])
                    if num_str:
                        return int(num_str)
        except Exception:
            pass
        return 50000 # default fallback
        
    # Helper to parse fees
    def get_yearly_fee(fee_str, branch):
        try:
            # Extract number after ₹
            if "₹" in fee_str:
                num_part = fee_str.split("₹")[1]
                num_str = "".join([c for c in num_part.split("/")[0] if c.isdigit() or c == "."])
                # check if it is e.g. "2,01,000" or similar
                num_str = num_str.replace(",", "")
                return float(num_str)
        except Exception:
            pass
        return 70000 # average convenience quota fee

    # Filter and score all colleges based on rank, budget, preference
    preferred_colleges = []
    management_quota_colleges = []

    # Management quota fee is typically 1.5x–2.5x the convenor fee
    # We use a separate budget check for management quota (allow up to 2x budget)
    mgmt_budget = budget * 2.5

    for col in ALL_COLLEGES:
        fee = get_yearly_fee(col["fees"], pref_branch)
        is_gov = col["type"].lower() == "government"

        # Skip government colleges for management quota (they don't have B-category)
        # Skip if gov preference is Government only
        if gov_pref == "Government" and not is_gov:
            continue
        if gov_pref == "Private" and is_gov:
            continue

        cutoff = get_branch_cutoff(col["cutoffs"], pref_branch)

        col_summary = {
            "name": col["name"],
            "location": col["location"],
            "website": col["website"],
            "naac": col["naac"],
            "nirf": col.get("nirf", "N/A"),
            "fees": col["fees"],
            "hostel_fee": col["hostel_fee"],
            "average_package": col["placements_avg"],
            "highest_package": col["placements_highest"],
            "placement_pct": col["placements_pct"],
            "scholarships": col["scholarships"],
            "cutoff_rank": cutoff,
            "explain_why": ""
        }

        # Convenor quota: within budget and rank within 3x cutoff
        if fee <= budget and rank <= cutoff * 3:
            preferred_colleges.append(col_summary)
        # Management quota: private colleges only, relaxed budget, no rank restriction
        elif not is_gov and fee <= mgmt_budget:
            mgmt_col = dict(col_summary)
            mgmt_fee = int(fee * 1.8)  # Estimate B-category fee as ~1.8x convenor fee
            mgmt_col["mgmt_fee_estimate"] = f"₹{mgmt_fee:,}/year (B-Category estimate)"
            management_quota_colleges.append(mgmt_col)

    # Sort preferred by placement package descending
    preferred_colleges.sort(
        key=lambda x: float(x["average_package"].replace("₹", "").replace("LPA", "").strip())
        if "LPA" in x["average_package"] else 0.0,
        reverse=True
    )

    # Sort management quota by placement package descending
    management_quota_colleges.sort(
        key=lambda x: float(x["average_package"].replace("₹", "").replace("LPA", "").strip())
        if "LPA" in x["average_package"] else 0.0,
        reverse=True
    )

    # Cap lists
    preferred_colleges = preferred_colleges[:9]
    management_quota_colleges = management_quota_colleges[:6]

    # Add explain_why for preferred
    for col in preferred_colleges:
        col["explain_why"] = (
            f"Good fit for your profile. Cutoff rank ({col['cutoff_rank']:,}) aligns with your rank ({rank:,}). "
            f"Offers average placement of {col['average_package']} (Highest: {col['highest_package']}) "
            f"with {col['naac']} accreditation."
        )

    # Add explain_why for management quota
    for col in management_quota_colleges:
        col["explain_why"] = (
            f"Available under Management Quota (B-Category) — no rank restriction. "
            f"Direct admission through college management. "
            f"Offers average placement of {col['average_package']} (Highest: {col['highest_package']}) "
            f"with {col['naac']} accreditation. Fee is higher than convenor quota."
        )

    # If no preferred colleges found at all, promote top management quota as preferred
    if not preferred_colleges and management_quota_colleges:
        preferred_colleges = management_quota_colleges[:3]
        management_quota_colleges = management_quota_colleges[3:]

    recommendations = {
        "preferred": preferred_colleges,
        "management_quota": management_quota_colleges
    }

    return {"recommendations": recommendations}

# Step 5: Reality Check Node (analyzes unrealistic combinations)
def reality_check_node(state: CounselorState) -> Dict[str, Any]:
    profile = state["profile"]
    recommendations = state["recommendations"]
    rank = int(profile["rank"])
    pref_branch = profile.get("preferred_branch", "CSE")
    gov_pref = profile.get("gov_preference", "Any")
    
    has_limitations = False
    limitations = []
    suggestions = []
    
    # Rule 1: High rank trying to get CSE in Top Government Colleges
    if rank > 20000 and pref_branch.upper() in ["CSE", "CSE-AIML", "CSE-DS"]:
        gov_colleges_requested = gov_pref == "Government" or len(recommendations.get("preferred", [])) == 0
        if gov_colleges_requested:
            has_limitations = True
            limitations.append(f"Your rank ({rank:,}) is above recent cutoff ranges for CSE branches in top-tier Government Colleges.")
            limitations.append("High competition for Computer Science leaves very limited seat availability for ranks above 15,000.")
            
            suggestions.append(f"Keep {pref_branch} as a target, but prioritize adding Private Autonomous colleges on your web options.")
            suggestions.append("Explore related specializations like AI & ML, Data Science, or Information Technology (IT) which typically have slightly higher rank cutoffs.")
            suggestions.append("Consider newer branches or local region colleges where cutoff ranks are more relaxed.")
            
    # Rule 2: Extremely high rank (above 50,000)
    if rank > 50000:
        has_limitations = True
        limitations.append(f"At a rank of {rank:,}, securing seats in top-20 colleges for core branches via Convenor Quota is highly competitive.")
        suggestions.append("We recommend listing 25+ colleges in your web options list during counseling to avoid missing out on seat allocation.")
        suggestions.append("Include colleges in tier-3 cities or newer colleges in your options list (e.g. Santhiram, Anantha Lakshmi).")
        suggestions.append("Look into branches like ECE, EEE, or Mech which have cutoffs extending beyond 40,000-60,000.")
        suggestions.append("Explore management quota (B-Category seats) options if your budget allows (typically ₹1.5L to ₹2.5L per year).")
        
    return {
        "reality_check": {
            "has_limitations": has_limitations,
            "limitations": limitations,
            "suggestions": suggestions
        }
    }

# Step 6: Build Personalized Counseling Roadmap
def build_roadmap_node(state: CounselorState) -> Dict[str, Any]:
    profile = state["profile"]
    
    # State-specific counselling documents list
    required_documents = [
        "AP EAPCET / EAMCET Hall Ticket",
        "AP EAPCET / EAMCET Rank Card",
        "Intermediate Marks Memo (10+2 Certificate)",
        "SSC Marks Memo (10th Certificate)",
        "Study Certificates (Class 6 to Intermediate for Local status)",
        "Aadhaar Card",
        "Income Certificate (issued after Jan 1st of current year for fee reimbursement)",
        "Caste/Category Certificate (if applicable for reservation)"
    ]
    
    if profile.get("category", "OC").upper() != "OC":
        required_documents.append("Integrated Community Certificate (Caste Certificate)")
        
    next_steps = [
        {"step": 1, "title": "Counseling Registration", "description": "Pay processing fee online on the APSCHE EAPCET website once the official schedule is released."},
        {"step": 2, "title": "Certificate Verification", "description": "Verification of uploaded documents online. Visit helpline centers only if discrepancies are flagged."},
        {"step": 3, "title": "Web Option Entry", "description": "Log in to the counseling portal and enter college-branch codes. Put all 'Dream' options first, followed by 'Target', and then 'Safe' backups."},
        {"step": 4, "title": "Seat Allotment", "description": "Review the allotted college based on rank and reservation rules. You can opt for 'Self-Reporting' while participating in Phase 2."},
        {"step": 5, "title": "Physical Reporting", "description": "Visit the allotted college with original certificates, allotment order, and join within the specified timeline."}
    ]
    
    return {
        "roadmap": {
            "required_documents": required_documents,
            "next_steps": next_steps
        }
    }

# Compile LangGraph Workflow
workflow = StateGraph(CounselorState)

workflow.add_node("understand_profile", understand_profile_node)
workflow.add_node("suggest_branches", suggest_branches_node)
workflow.add_node("evaluate_admission", evaluate_admission_node)
workflow.add_node("reality_check", reality_check_node)
workflow.add_node("build_roadmap", build_roadmap_node)

workflow.set_entry_point("understand_profile")
workflow.add_edge("understand_profile", "suggest_branches")
workflow.add_edge("suggest_branches", "evaluate_admission")
workflow.add_edge("evaluate_admission", "reality_check")
workflow.add_edge("reality_check", "build_roadmap")
workflow.add_edge("build_roadmap", END)

counselor_app = workflow.compile()

def run_admission_counselor(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Runs the LangGraph state machine workflow with student profile parameters."""
    initial_state = {
        "profile": profile_data,
        "branch_suggestions": [],
        "preferred_branch_analysis": {},
        "reality_check": {},
        "recommendations": {},
        "roadmap": {}
    }
    output = counselor_app.invoke(initial_state)
    return output

if __name__ == "__main__":
    test_profile = {
        "rank": 95000,
        "stream": "MPC",
        "interests": ["Technology & Coding", "Artificial Intelligence"],
        "preferred_branch": "CSE",
        "budget": 150000,
        "gov_preference": "Government",
        "hostel_required": True,
        "category": "BC-B"
    }
    res = run_admission_counselor(test_profile)
    print("Agent Reality Check Output:")
    print(res["reality_check"])
