import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, BookOpen, User, Coins, Scale, MessageSquare, 
  LogOut, CheckCircle2, Compass, Bookmark, ExternalLink, 
  Sparkles, Clock, ArrowRight, UserCheck, Plus, Trash2, Home, Check, Info, 
  ChevronRight, RefreshCw, Send, HelpCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const AUTH_TOKEN_KEY = 'ap_counselor_auth_token';

// Initial College List for Local Calculations (Offline Fallback)
const LOCAL_COLLEGES = [
  { name: "Andhra University College of Engineering (Autonomous)", type: "Government", cutoff: 850, fee: 15000, avg_pkg: "7.5 LPA", high_pkg: "32.0 LPA", location: "Visakhapatnam", naac: "A++", website: "https://www.andhrauniversity.edu.in" },
  { name: "JNTUK College of Engineering Kakinada", type: "Government", cutoff: 1200, fee: 10000, avg_pkg: "6.8 LPA", high_pkg: "28.0 LPA", location: "Kakinada", naac: "A+", website: "https://www.jntukucek.ac.in" },
  { name: "JNTUA College of Engineering Anantapur", type: "Government", cutoff: 2800, fee: 10000, avg_pkg: "5.5 LPA", high_pkg: "18.0 LPA", location: "Anantapur", naac: "A", website: "https://www.jntuaceam.ac.in" },
  { name: "Sri Venkateswara University College of Engineering (SVUCE)", type: "Government", cutoff: 2000, fee: 15000, avg_pkg: "6.2 LPA", high_pkg: "22.0 LPA", location: "Tirupati", naac: "A++", website: "https://www.svuce.edu.in" },
  { name: "Velagapudi Ramakrishna Siddhartha Engineering College (VRSEC)", type: "Private Autonomous", cutoff: 4200, fee: 70000, avg_pkg: "5.8 LPA", high_pkg: "44.0 LPA", location: "Vijayawada", naac: "A+", website: "https://www.vrsiddhartha.ac.in" },
  { name: "Gayatri Vidya Parishad College of Engineering (GVP)", type: "Private Autonomous", cutoff: 3500, fee: 69000, avg_pkg: "6.0 LPA", high_pkg: "30.0 LPA", location: "Visakhapatnam", naac: "A", website: "https://www.gvpce.ac.in" },
  { name: "VIT-AP University Amaravati", type: "Private University", cutoff: 8000, fee: 201000, avg_pkg: "8.0 LPA", high_pkg: "63.0 LPA", location: "Amaravati", naac: "A+", website: "https://vitap.ac.in" },
  { name: "SRM University AP Amaravati", type: "Private University", cutoff: 10000, fee: 250000, avg_pkg: "7.8 LPA", high_pkg: "50.0 LPA", location: "Amaravati", naac: "A+", website: "https://srmap.edu.in" },
  { name: "Koneru Lakshmaiah Education Foundation (KL University)", type: "Private Deemed University", cutoff: 12000, fee: 260000, avg_pkg: "6.6 LPA", high_pkg: "58.0 LPA", location: "Guntur", naac: "A++", website: "https://www.kluniversity.in" },
  { name: "GITAM Deemed to be University", type: "Private Deemed University", cutoff: 15000, fee: 280000, avg_pkg: "6.4 LPA", high_pkg: "46.5 LPA", location: "Visakhapatnam", naac: "A+", website: "https://www.gitam.edu" },
  { name: "RVR & JC College of Engineering", type: "Private Autonomous", cutoff: 5200, fee: 68000, avg_pkg: "5.2 LPA", high_pkg: "24.0 LPA", location: "Guntur", naac: "A+", website: "https://www.rvrjcce.ac.in" },
  { name: "Anil Neerukonda Institute of Technology & Sciences (ANITS)", type: "Private Autonomous", cutoff: 5800, fee: 66000, avg_pkg: "4.8 LPA", high_pkg: "20.0 LPA", location: "Visakhapatnam", naac: "A", website: "https://www.anits.edu.in" },
  { name: "Madanapalle Institute of Technology & Science (MITS)", type: "Private Autonomous", cutoff: 12000, fee: 70000, avg_pkg: "4.6 LPA", high_pkg: "24.0 LPA", location: "Chittoor", naac: "A+", website: "https://www.mits.ac.in" },
  { name: "Prasad V. Potluri Siddhartha Institute of Technology (PVPSIT)", type: "Private Autonomous", cutoff: 6500, fee: 67000, avg_pkg: "4.9 LPA", high_pkg: "22.0 LPA", location: "Vijayawada", naac: "A+", website: "http://www.pvpsiddhartha.ac.in" },
  { name: "Sree Vidyanikethan Engineering College", type: "Private Autonomous", cutoff: 8500, fee: 70000, avg_pkg: "5.0 LPA", high_pkg: "25.0 LPA", location: "Tirupati", naac: "A", website: "https://svec.education" },
  { name: "Vasireddy Venkatadri Institute of Technology (VVIT)", type: "Private Autonomous", cutoff: 7500, fee: 60000, avg_pkg: "4.7 LPA", high_pkg: "18.0 LPA", location: "Guntur", naac: "A", website: "https://www.vvitguntur.com" },
  { name: "Laki Reddy Bali Reddy College of Engineering (LBRCE)", type: "Private Autonomous", cutoff: 9500, fee: 65000, avg_pkg: "4.5 LPA", high_pkg: "16.0 LPA", location: "Krishna", naac: "A", website: "https://www.lbrce.ac.in" },
  { name: "Maharaj Vijayaram Gajapathi Raj (MVGR) College", type: "Private Autonomous", cutoff: 8200, fee: 67000, avg_pkg: "4.8 LPA", high_pkg: "21.0 LPA", location: "Vizianagaram", naac: "A", website: "https://www.mvgrce.edu.in" },
  { name: "Aditya Engineering College", type: "Private Autonomous", cutoff: 10500, fee: 65000, avg_pkg: "4.5 LPA", high_pkg: "31.3 LPA", location: "Surampalem", naac: "A+", website: "https://www.aec.edu.in" },
  { name: "SRKR Engineering College", type: "Private Autonomous", cutoff: 5000, fee: 70000, avg_pkg: "5.3 LPA", high_pkg: "28.0 LPA", location: "Bhimavaram", naac: "A", website: "https://www.srkrengg.in" },
  { name: "Vishnu Institute of Technology (VITB)", type: "Private Autonomous", cutoff: 5800, fee: 70000, avg_pkg: "5.5 LPA", high_pkg: "41.0 LPA", location: "Bhimavaram", naac: "A+", website: "https://vishnu.edu.in" },
  { name: "Shri Vishnu Engineering College for Women (SVECW)", type: "Private Autonomous (Women)", cutoff: 5200, fee: 70000, avg_pkg: "5.6 LPA", high_pkg: "41.0 LPA", location: "Bhimavaram", naac: "A+", website: "https://www.svecw.edu.in" },
  { name: "Vignan's Foundation for Science, Technology and Research (VFSTR)", type: "Private Deemed University", cutoff: 10000, fee: 220000, avg_pkg: "5.6 LPA", high_pkg: "44.0 LPA", location: "Guntur", naac: "A+", website: "https://www.vignan.ac.in" },
  { name: "Raghu Engineering College", type: "Private Autonomous", cutoff: 12200, fee: 62000, avg_pkg: "4.1 LPA", high_pkg: "16.0 LPA", location: "Visakhapatnam", naac: "A+", website: "https://www.raghuenggcollege.com" },
  { name: "Vignan's Institute of Information Technology (VIIT)", type: "Private Autonomous", cutoff: 9800, fee: 63000, avg_pkg: "4.5 LPA", high_pkg: "22.0 LPA", location: "Visakhapatnam", naac: "A+", website: "https://vignaniit.edu.in" },
  { name: "Bapatla Engineering College (BEC)", type: "Private Autonomous", cutoff: 12000, fee: 65000, avg_pkg: "4.2 LPA", high_pkg: "15.0 LPA", location: "Bapatla", naac: "A", website: "http://www.becbapatla.ac.in" },
  { name: "QIS College of Engineering and Technology", type: "Private Autonomous", cutoff: 15000, fee: 55000, avg_pkg: "3.8 LPA", high_pkg: "12.0 LPA", location: "Ongole", naac: "A", website: "https://www.qiscet.edu.in" },
  { name: "PACE Institute of Technology and Sciences", type: "Private Autonomous", cutoff: 18000, fee: 58000, avg_pkg: "3.9 LPA", high_pkg: "14.0 LPA", location: "Ongole", naac: "A+", website: "https://www.pace.ac.in" },
  { name: "Santhiram Engineering College", type: "Private", cutoff: 25000, fee: 45000, avg_pkg: "3.5 LPA", high_pkg: "8.0 LPA", location: "Nandyal", naac: "A", website: "https://www.srec.ac.in" },
  { name: "Anantha Lakshmi Institute of Technology", type: "Private", cutoff: 35000, fee: 40000, avg_pkg: "3.2 LPA", high_pkg: "7.0 LPA", location: "Anantapur", naac: "B+", website: "http://www.alits.ac.in" },
  { name: "Srinivasa Ramanujan Institute of Technology", type: "Private Autonomous", cutoff: 20000, fee: 55000, avg_pkg: "3.9 LPA", high_pkg: "12.0 LPA", location: "Anantapur", naac: "A", website: "https://www.srit.ac.in" },
  { name: "JNTUA College of Engineering Pulivendula", type: "Government", cutoff: 5000, fee: 10000, avg_pkg: "4.8 LPA", high_pkg: "14.0 LPA", location: "Pulivendula", naac: "A", website: "https://www.jntuacep.ac.in" },
  { name: "JNTUK College of Engineering Vizianagaram", type: "Government", cutoff: 3000, fee: 10000, avg_pkg: "5.0 LPA", high_pkg: "16.0 LPA", location: "Vizianagaram", naac: "A", website: "https://www.jntukucev.ac.in" }
];

export default function App() {
  // Authentication & Session State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login, register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  
  // App Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, branch, colleges, reality, scholarships, compare, chatbot
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);

  // Profile Collection Wizard State
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [profileStep, setProfileStep] = useState(1);
  const [profileData, setProfileData] = useState({
    name: '',
    stream: 'MPC',
    percentage: '',
    mathMarks: '',
    physicsMarks: '',
    chemistryMarks: '',
    rank: '',
    interests: [],
    preferred_branch: 'CSE',
    budget: 150000,
    gov_preference: 'Any',
    hostel_required: false,
    category: 'OC',
    family_income: 300000
  });

  // Business Logic States
  const [recommendations, setRecommendations] = useState(null);
  const [branchSuggestions, setBranchSuggestions] = useState([]);
  const [realityCheck, setRealityCheck] = useState(null);
  const [eligibleScholarships, setEligibleScholarships] = useState([]);
  const [savedColleges, setSavedColleges] = useState([]);

  // Recently viewed comparisons (persisted)
  const [recentComparisons, setRecentComparisons] = useState([]);

  // Comparison Panel States
  const [compareList, setCompareList] = useState([]);
  const [compareResult, setCompareResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Chatbot State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'counselor', text: 'Namaste! I am your AI Admission Counselor. How can I help you choose the right college, branch, or navigate the AP counseling process today?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // List of interests for multi-select
  const INTEREST_OPTIONS = [
    "Technology & Coding", "Artificial Intelligence", "Data Science", "Electronics", 
    "Robotics", "Core Engineering", "Business", "Finance", "Healthcare", 
    "Biology", "Agriculture", "Government Jobs", "Research", "Entrepreneurship", 
    "Design", "Law", "Media & Communication"
  ];

  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be signed in to continue.');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Restore backend-authenticated session
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setAuthLoading(false);
        return;
      }

      setAuthError('');
      try {
        const meRes = await authFetch(`${API_BASE}/auth/me`);
        if (!meRes.ok) {
          throw new Error('Saved session expired.');
        }
        const appUser = await meRes.json();
        setUser(appUser);
        setIsAuthenticated(true);

        const profileRes = await authFetch(`${API_BASE}/profile/${appUser.uid}`);
        if (profileRes.ok) {
          const savedProfile = await profileRes.json();
          setProfileData(savedProfile);
          setHasCompletedProfile(true);
          computeAllInsights(savedProfile, appUser.uid);
        } else {
          const cachedProfile = localStorage.getItem(`ap_counselor_profile_${appUser.uid}`);
          if (cachedProfile) {
            const prof = JSON.parse(cachedProfile);
            setProfileData(prof);
            setHasCompletedProfile(true);
            computeAllInsights(prof, appUser.uid);
          }
        }
      } catch (err) {
        console.warn(err);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Fetch Saved Colleges
  useEffect(() => {
    if (isAuthenticated && user) {
      authFetch(`${API_BASE}/colleges/saved/${user.uid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSavedColleges(data);
        })
        .catch(() => {
          // Fallback to localstorage
          const localSaved = JSON.parse(localStorage.getItem(`saved_colleges_${user.uid}`)) || [];
          setSavedColleges(localSaved);
        });
    }
  }, [isAuthenticated, user]);

  // Main Logic Evaluator (Calls API if running, else performs local rule heuristics)
  const computeAllInsights = async (prof, uid) => {
    try {
      // 1. Recommendation API
      const recRes = await authFetch(`${API_BASE}/counselor/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prof, userId: uid })
      });
      const recData = await recRes.json();
      setRecommendations(recData.recommendations);
      setBranchSuggestions(recData.branch_suggestions);
      setRealityCheck(recData.reality_check);
      
      // 2. Scholarship API
      const scholRes = await authFetch(`${API_BASE}/counselor/scholarships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prof)
      });
      const scholData = await scholRes.json();
      setEligibleScholarships(scholData.eligible_scholarships);
    } catch (err) {
      console.log("FastAPI backend connection refused. Using localized heuristic rules engine.");
      calculateHeuristicsLocally(prof);
    }
  };

  // Local Offline Heuristics Engine
  const calculateHeuristicsLocally = (prof) => {
    const rank = parseInt(prof.rank) || 50000;
    const stream = prof.stream;
    const interests = prof.interests;
    const budget = parseFloat(prof.budget) || 300000;
    const govPref = prof.gov_preference;
    const category = prof.category;
    const income = parseFloat(prof.family_income) || 300000;

    // 1. Branch Suggestions
    const branches = [];
    if (stream === 'BiPC') {
      branches.push({ branch: "Bio-Technology", reason: "Aligns with your science stream and interest in applications." });
      branches.push({ branch: "Agricultural Engineering", reason: "Great match for agricultural science and technical design." });
    } else {
      if (interests.includes("Technology & Coding") || interests.includes("Artificial Intelligence") || !interests.length) {
        branches.push({ branch: "CSE", reason: "Directly matches your interest in coding, web dev, and software systems." });
      }
      if (interests.includes("Artificial Intelligence") || interests.includes("Data Science")) {
        branches.push({ branch: "AI & ML", reason: "Tailor-made for predictive modeling and machine neural logic." });
      }
      if (interests.includes("Electronics") || interests.includes("Robotics")) {
        branches.push({ branch: "ECE", reason: "Perfect mix of signal processing, VLSI design, and chip integration." });
      }
      if (interests.includes("Core Engineering") || interests.includes("Robotics")) {
        branches.push({ branch: "ME", reason: "Fundamental discipline covering physics dynamics and material designs." });
        branches.push({ branch: "CE", reason: "Structural focus for construction management and design projects." });
      }
    }
    setBranchSuggestions(branches);

    // 2. Recommended Colleges — single preferred list sorted by placement
    const preferred = [];

    LOCAL_COLLEGES.forEach(c => {
      if (c.fee > budget) return;
      if (govPref === 'Government' && c.type !== 'Government') return;
      if (govPref === 'Private' && c.type === 'Government') return;

      // Include colleges where student has a realistic chance (rank within 3x cutoff)
      if (rank > c.cutoff * 3) return;

      preferred.push({
        name: c.name,
        location: c.location,
        website: c.website,
        naac: c.naac,
        nirf: c.nirf || "Ranked",
        fees: `₹${c.fee.toLocaleString()}/year`,
        hostel_fee: `₹60,000/year`,
        average_package: c.avg_pkg,
        highest_package: c.high_pkg,
        cutoff_rank: c.cutoff,
        explain_why: `Good fit for your profile. Cutoff rank (${c.cutoff.toLocaleString()}) aligns with your rank (${rank.toLocaleString()}). Offers average placement of ${c.avg_pkg} (Highest: ${c.high_pkg}) with NAAC ${c.naac} accreditation.`
      });
    });

    // Sort by average package descending
    preferred.sort((a, b) => {
      const pa = parseFloat(a.average_package) || 0;
      const pb = parseFloat(b.average_package) || 0;
      return pb - pa;
    });

    // Management quota: private colleges, no rank restriction, higher budget
    const mgmtQuota = [];
    LOCAL_COLLEGES.forEach(c => {
      if (c.type === 'Government') return;
      if (govPref === 'Government') return;
      // Already in preferred list — skip
      if (preferred.find(p => p.name === c.name)) return;
      // Budget check: allow up to 2.5x budget for management quota
      if (c.fee > budget * 2.5) return;

      const mgmtFee = Math.round(c.fee * 1.8);
      mgmtQuota.push({
        name: c.name,
        location: c.location,
        website: c.website,
        naac: c.naac,
        fees: `₹${c.fee.toLocaleString()}/year`,
        hostel_fee: `₹60,000/year`,
        average_package: c.avg_pkg,
        highest_package: c.high_pkg,
        cutoff_rank: c.cutoff,
        mgmt_fee_estimate: `₹${mgmtFee.toLocaleString()}/year (B-Category estimate)`,
        explain_why: `Available under Management Quota (B-Category) — no rank restriction. Direct admission through college management. Offers average placement of ${c.avg_pkg} (Highest: ${c.high_pkg}) with NAAC ${c.naac} accreditation. Fee is higher than convenor quota.`
      });
    });

    mgmtQuota.sort((a, b) => (parseFloat(b.average_package) || 0) - (parseFloat(a.average_package) || 0));

    setRecommendations({ preferred: preferred.slice(0, 9), management_quota: mgmtQuota.slice(0, 6) });

    // 3. Reality Check logic
    let hasLim = false;
    const lims = [];
    const sugs = [];

    if (rank > 20000 && prof.preferred_branch === 'CSE' && (govPref === 'Government' || target.length === 0)) {
      hasLim = true;
      lims.push(`Your rank (${rank.toLocaleString()}) exceeds standard thresholds for CSE branches in top government institutions.`);
      sugs.push("Add Private Autonomous colleges (like GVP, VRSEC) which offer high placements with flexible cutoffs.");
      sugs.push("Explore branches like AI & ML, Data Science, or ECE where cutoff brackets are typically wider.");
    }
    if (rank > 50000) {
      hasLim = true;
      lims.push(`Securing tier-1 computer science seats via state convenor quota is highly competitive at ${rank.toLocaleString()} rank.`);
      sugs.push("Fill 25+ choices on your web options list during counseling verification to prevent blank allocations.");
      sugs.push("Incorporate regional private colleges (like Srinivasa Ramanujan, Santhiram) or explore management (B-category) seats.");
    }

    setRealityCheck({
      has_limitations: hasLim,
      limitations: lims,
      suggestions: sugs
    });

    // 4. Scholarship eligibility rules
    const schols = [];
    if (income <= 250000) {
      schols.push({
        name: "Jagananna Vidya Deevena (JVD)",
        type: "Government Scheme",
        benefit: "100% Tuition Fee Reimbursement.",
        description: "Covers complete tuition fee for qualified students via direct quarterly college payments."
      });
      schols.push({
        name: "Jagananna Vasathi Deevena",
        type: "Government Scheme",
        benefit: "₹20,000 allowance per year.",
        description: "Paid directly to mother's account in two payments for hostel mess and stay expenditures."
      });
    }
    if (parseFloat(prof.percentage) >= 85) {
      schols.push({
        name: "AP State Merit Scholarship",
        type: "Academic Merit",
        benefit: "₹10,000/year award.",
        description: "Reward for outstanding scores in Intermediate examinations."
      });
    }
    if (schols.length === 0) {
      schols.push({
        name: "Institution Specific Merit Schemes",
        type: "Private Grant",
        benefit: "25% to 50% Tuition concessions.",
        description: "Deemed universities (VIT, SRM) yield scholarship slabs for EAMCET ranks < 15,000."
      });
    }
    setEligibleScholarships(schols);

  };

  // Saved College Actions
  const handleSaveCollege = async (collegeName) => {
    if (savedColleges.includes(collegeName)) return;
    try {
      const res = await authFetch(`${API_BASE}/colleges/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, collegeName })
      });
      const data = await res.json();
      setSavedColleges(data.saved);
    } catch {
      const updated = [...savedColleges, collegeName];
      setSavedColleges(updated);
      localStorage.setItem(`saved_colleges_${user.uid}`, JSON.stringify(updated));
    }
  };

  const handleRemoveCollege = async (collegeName) => {
    try {
      const res = await authFetch(`${API_BASE}/colleges/saved/${user.uid}/${collegeName}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      setSavedColleges(data.saved);
    } catch {
      const updated = savedColleges.filter(c => c !== collegeName);
      setSavedColleges(updated);
      localStorage.setItem(`saved_colleges_${user.uid}`, JSON.stringify(updated));
    }
  };

  // College Comparison Function
  const triggerComparison = async (names) => {
    if (names.length < 2) return;
    setIsComparing(true);

    const buildLocalResult = (names) => {
      const list = LOCAL_COLLEGES
        .filter(col => names.some(n => col.name.includes(n.split('(')[0].trim()) || n.includes(col.name.split('(')[0].trim())))
        .map(c => ({
          name: c.name,
          location: c.location,
          accreditation: "AICTE, NBA Accredited",
          naac: `NAAC ${c.naac} Grade`,
          nirf: c.nirf || "Ranked",
          fees: `₹${c.fee.toLocaleString()}/year`,
          hostel_fee: `₹60,000/year`,
          placements_avg: c.avg_pkg,
          placements_highest: c.high_pkg,
          cutoff: `Cutoff Rank: ${c.cutoff}`,
          scholarships: "Eligible for standard state JVD reimbursement benefits."
        }));

      if (list.length < 2) return null;

      const summary =
        `**${list[0].name.split('(')[0].trim()} vs ${list[1].name.split('(')[0].trim()}**\n\n` +
        `**Placements:** ${list[0].name.split('(')[0].trim()} offers avg ${list[0].placements_avg} (Highest: ${list[0].placements_highest}) vs ${list[1].name.split('(')[0].trim()} avg ${list[1].placements_avg} (Highest: ${list[1].placements_highest}).\n\n` +
        `**Fees:** ${list[0].name.split('(')[0].trim()} charges ${list[0].fees}/year vs ${list[1].name.split('(')[0].trim()} at ${list[1].fees}/year.\n\n` +
        `**Accreditation:** ${list[0].naac} vs ${list[1].naac}.\n\n` +
        `**Recommendation:** Choose based on your priorities — lower fees favour government/convenor quota colleges, while higher placement packages are typically seen in top private universities.`;

      return { comparison: list, ai_summary: summary };
    };

    try {
      const res = await authFetch(`${API_BASE}/counselor/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeNames: names,
          preferredBranch: profileData.preferred_branch || 'CSE'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Compare failed');
      setCompareResult(data);
      // record recent comparison for quick access
      try { addRecentComparison(data); } catch (e) { /* ignore */ }
    } catch {
      // Fallback to local comparison
      const local = buildLocalResult(names);
      if (local) {
        setCompareResult(local);
        try { addRecentComparison(local); } catch (e) { /* ignore */ }
      }
    } finally {
      setIsComparing(false);
    }
  };

  // Persist/load recent comparisons (use localStorage key scoped by user if available)
  useEffect(() => {
    try {
      const key = `recent_compares_${(user && user.uid) ? user.uid : 'anon'}`;
      const raw = localStorage.getItem(key);
      if (raw) setRecentComparisons(JSON.parse(raw));
    } catch (e) {
      setRecentComparisons([]);
    }
  }, [user]);

  useEffect(() => {
    try {
      const key = `recent_compares_${(user && user.uid) ? user.uid : 'anon'}`;
      localStorage.setItem(key, JSON.stringify(recentComparisons));
    } catch (e) {
      // ignore storage errors
    }
  }, [recentComparisons, user]);

  const addRecentComparison = (compareData) => {
    if (!compareData || !compareData.comparison || !compareData.comparison.length) return;
    const pairNames = compareData.comparison.slice(0,2).map(c => c.name.split('(')[0].trim());
    const id = pairNames.join('::');
    const item = {
      id,
      names: pairNames,
      preview: compareData.comparison.slice(0,2).map(c => ({ name: c.name, fees: c.fees || c.fee || c.fee_estimate || '', average_package: c.placements_avg || c.average_package || '' })),
      ts: Date.now()
    };

    setRecentComparisons(prev => {
      const filtered = prev.filter(p => p.id !== id);
      const next = [item, ...filtered].slice(0, 6);
      return next;
    });
  };

  // Chatbot Submissions
  const handleChatSend = async (textToSend = chatMessage) => {
    if (!textToSend.trim()) return;
    
    const newMsg = { sender: 'user', text: textToSend };
    const updatedHistory = [...chatHistory, newMsg];
    setChatHistory(updatedHistory);
    setChatMessage('');
    setChatLoading(true);

    try {
      const res = await authFetch(`${API_BASE}/counselor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          message: textToSend,
          history: updatedHistory.slice(-8)
        })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'counselor', text: data.response }]);
    } catch {
      // Local Heuristic QA Fallback
      setTimeout(() => {
        let answer = "I have checked the Andhra Pradesh college files. Can you specify the branch or college you are looking for?";
        const txt = textToSend.toLowerCase();
        
        if (txt.includes("compare") || txt.includes("vs")) {
          answer = "Please use the **Comparison** tab to compare those colleges side by side.";
        } else if (txt.includes("scholarship") || txt.includes("jvd")) {
          answer = "Use the **Scholarship Eligibility Checker** tab for your exact eligibility. Main options include JVD tuition support and Vasathi Deevena hostel/mess support.";
        } else if (txt.includes("can i get") || txt.includes("cutoff") || txt.includes("rank")) {
          answer = `For rank **${profileData.rank ? parseInt(profileData.rank).toLocaleString() : '50,000'}**, check the **College Advisor** tab for matching colleges and cutoffs.`;
        }
        
        setChatHistory(prev => [...prev, { sender: 'counselor', text: answer }]);
      }, 800);
    } finally {
      setChatLoading(false);
    }
  };

  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('Email and Password are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid email or password.');
      }
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('Email and Password are required.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Could not create account.');
      }
      // Auto-login after successful registration
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        // Registration succeeded but auto-login failed — fall back to login screen
        setAuthMode('login');
        setAuthError('Account created! Please sign in.');
        return;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, loginData.access_token);
      setUser(loginData.user);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsAuthenticated(false);
    setUser(null);
    setHasCompletedProfile(false);
    setProfileStep(1);
    setRecommendations(null);
    setRealityCheck(null);
    setCompareList([]);
    setCompareResult(null);
    setChatHistory([{ sender: 'counselor', text: 'Welcome back! Ask me any counseling question.' }]);
  };

  // Profile Wizard Submit
  const saveProfileWizard = async (e) => {
    e.preventDefault();
    if (!user) return;

    const profileToSave = { ...profileData, userId: user.uid };
    localStorage.setItem(`ap_counselor_profile_${user.uid}`, JSON.stringify(profileToSave));

    try {
      await authFetch(`${API_BASE}/profile/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileToSave),
      });
    } catch (err) {
      setAuthError('Profile saved locally, but the backend did not accept it yet.');
      console.warn(err);
    }

    setHasCompletedProfile(true);
    computeAllInsights(profileToSave, user.uid);
    setActiveTab('dashboard');
  };

  // Interest Selection helper
  const toggleInterest = (interest) => {
    const active = [...profileData.interests];
    if (active.includes(interest)) {
      setProfileData({ ...profileData, interests: active.filter(i => i !== interest) });
    } else {
      setProfileData({ ...profileData, interests: [...active, interest] });
    }
  };


  return (
    <div className="min-h-screen font-sans flex flex-col bg-slate-950">
      
      {/* Background glow animations */}
      <div className="glow-spot bg-brand-600 w-[500px] h-[500px] top-[-10%] left-[-10%]" />
      <div className="glow-spot bg-accent-600 w-[500px] h-[500px] bottom-[-10%] right-[-10%]" />

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-brand-500 to-accent-500 p-2.5 rounded-xl shadow-md">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans tracking-tight">AP Admission Counselor</h1>
            <p className="text-xs text-slate-400">Agentic AI + RAG-Powered Portal</p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-200">{user.displayName || user.email}</span>
              <span className="text-xs text-brand-400 font-medium">Rank: {profileData.rank ? parseInt(profileData.rank).toLocaleString() : 'Not Set'}</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* AUTHENTICATION OR APP LAYOUT */}
        {authLoading ? (
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="glass-panel border-slate-800 p-6 text-sm text-slate-300">
              Checking your secure session...
            </div>
          </main>
        ) : !isAuthenticated ? (
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full glass-panel p-10 shadow-glass border-slate-800">
              {showAuthForm ? (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex bg-brand-500/10 p-4 rounded-2xl mb-3 text-brand-400">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight">{authMode === 'login' ? 'Sign In' : 'Register'}</h2>
                    <p className="text-sm text-slate-400 mt-1">To continue, sign in or create an account for personalized college guidance.</p>
                  </div>

                  {authError && (
                    <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3 text-sm text-rose-300 mb-4 text-center">
                      {authError}
                    </div>
                  )}
                  {authMode === 'login' ? (
                      <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                          <input 
                            type="email" 
                            placeholder="student@example.com" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                          <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>
                        <button type="submit" className="w-full gradient-btn">
                          Sign In with Email
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                          <input 
                        type="email" 
                        placeholder="student@example.com" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                    <button type="submit" className="w-full gradient-btn">
                      Sign Up with Email
                    </button>
                  </form>
                )}
                <div className="text-center mt-4">
                  {authMode === 'login' ? (
                    <span className="text-sm text-slate-400">Don't have an account? <button className="text-brand-400 underline" onClick={() => setAuthMode('register')}>Register</button></span>
                  ) : (
                    <span className="text-sm text-slate-400">Already have an account? <button className="text-brand-400 underline" onClick={() => setAuthMode('login')}>Sign In</button></span>
                  )}
                </div>
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowAuthForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >Back to info</button>
                </div>
              </>
              ) : (
                <div className="text-center">
                  <div className="inline-flex bg-brand-500/10 p-4 rounded-2xl mb-5 text-brand-400">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-100">Confused about which college to join?</h2>
                  <p className="text-sm text-slate-400 mt-4 max-w-xl mx-auto">
                    Many students struggle to decide between colleges after EAPCET. This portal helps you compare fees, placements, cutoffs, and scholarships so you can choose the best fit for your profile.
                  </p>
                  <div className="mt-8 grid gap-4 text-left">
                    <div className="rounded-3xl p-4 border border-slate-800 bg-slate-950/80">
                      <p className="text-sm text-slate-400">• Compare realistic college choices for your rank.</p>
                    </div>
                    <div className="rounded-3xl p-4 border border-slate-800 bg-slate-950/80">
                      <p className="text-sm text-slate-400">• See fees, placements, and eligibility without confusion.</p>
                    </div>
                    <div className="rounded-3xl p-4 border border-slate-800 bg-slate-950/80">
                      <p className="text-sm text-slate-400">• Get personalized recommendations for AP counseling and branch guidance.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="mt-8 inline-flex items-center justify-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-slate-950 hover:bg-brand-400 transition-colors"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </main>
        ) : !hasCompletedProfile ? (
          
          /* PROFILE SETUP WIZARD */
          <main className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-2xl w-full glass-panel p-8 shadow-glass border-slate-800">
              
              {/* Wizard Steps indicator */}
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold font-sans">Build Your Student Profile</h2>
                  <p className="text-xs text-slate-400 mt-1">This helps the Agentic AI evaluate your cutoff chances and recommend branches.</p>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map(step => (
                    <span 
                      key={step} 
                      className={`h-2.5 w-8 rounded-full transition-all ${profileStep === step ? 'bg-brand-500' : 'bg-slate-800'}`} 
                    />
                  ))}
                </div>
              </div>

              <form onSubmit={saveProfileWizard} className="space-y-6">
                
                {/* STEP 1: Academic Scores */}
                {profileStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-2">1. Academic Performance</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={profileData.name}
                          onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                          placeholder="e.g. Ramesh Kumar"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Intermediate Stream</label>
                        <select 
                          value={profileData.stream}
                          onChange={e => setProfileData({ ...profileData, stream: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        >
                          <option value="MPC">MPC (Mathematics, Physics, Chemistry)</option>
                          <option value="BiPC">BiPC (Biology, Physics, Chemistry)</option>
                          <option value="MEC">MEC (Maths, Economics, Commerce)</option>
                          <option value="CEC">CEC (Civics, Economics, Commerce)</option>
                          <option value="HEC">HEC (History, Economics, Civics)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Board Percentage</label>
                        <input 
                          type="number" 
                          required
                          min="35"
                          max="100"
                          value={profileData.percentage}
                          onChange={e => setProfileData({ ...profileData, percentage: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                          placeholder="85%"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Maths Marks (%)</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          max="100"
                          value={profileData.mathMarks}
                          onChange={e => setProfileData({ ...profileData, mathMarks: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                          placeholder="92"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Physics Marks (%)</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          max="100"
                          value={profileData.physicsMarks}
                          onChange={e => setProfileData({ ...profileData, physicsMarks: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                          placeholder="88"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Chemistry Marks (%)</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          max="100"
                          value={profileData.chemistryMarks}
                          onChange={e => setProfileData({ ...profileData, chemistryMarks: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                          placeholder="90"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">AP EAPCET / EAMCET Rank</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        max="250000"
                        value={profileData.rank}
                        onChange={e => setProfileData({ ...profileData, rank: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        placeholder="e.g. 15420"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button 
                        type="button" 
                        onClick={() => setProfileStep(2)}
                        disabled={!profileData.name || !profileData.rank || !profileData.percentage}
                        className="gradient-btn flex items-center gap-2"
                      >
                        Next Step <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Interests Cards */}
                {profileStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-2">2. Career & Branch Interests</h3>
                    <p className="text-xs text-slate-400">Select multiple options that resonate with your long term aspirations. The agent maps these to suitable branches.</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {INTEREST_OPTIONS.map(interest => {
                        const selected = profileData.interests.includes(interest);
                        return (
                          <button
                            type="button"
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            className={`p-3 text-left text-xs rounded-xl border font-medium flex items-center justify-between transition-all ${
                              selected 
                              ? 'bg-brand-500/10 border-brand-500/60 text-brand-300' 
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {interest}
                            {selected && <Check className="w-3.5 h-3.5 text-brand-400" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-800/80">
                      <button 
                        type="button" 
                        onClick={() => setProfileStep(1)}
                        className="gradient-btn-outline"
                      >
                        Back
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setProfileStep(3)}
                        className="gradient-btn flex items-center gap-2"
                      >
                        Next Step <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Preferences & Budget */}
                {profileStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-2">3. Counseling Preferences & Family Background</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Preferred Engineering Branch</label>
                        <select 
                          value={profileData.preferred_branch}
                          onChange={e => setProfileData({ ...profileData, preferred_branch: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        >
                          <option value="CSE">CSE (Computer Science)</option>
                          <option value="AI & ML">AI & ML / Specializations</option>
                          <option value="ECE">ECE (Electronics)</option>
                          <option value="EEE">EEE (Electrical)</option>
                          <option value="ME">Mech (Mechanical)</option>
                          <option value="CE">Civil (Civil Engineering)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Caste/Reservation Category</label>
                        <select 
                          value={profileData.category}
                          onChange={e => setProfileData({ ...profileData, category: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        >
                          <option value="OC">OC (General Quota)</option>
                          <option value="BC-A">BC-A</option>
                          <option value="BC-B">BC-B</option>
                          <option value="BC-D">BC-D</option>
                          <option value="BC-E">BC-E / Minority</option>
                          <option value="SC">SC (Scheduled Caste)</option>
                          <option value="ST">ST (Scheduled Tribe)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Yearly Fee Budget Limit</label>
                        <select 
                          value={profileData.budget}
                          onChange={e => setProfileData({ ...profileData, budget: parseFloat(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        >
                          <option value="35000">Under ₹35,000/year (Govt Regular)</option>
                          <option value="75000">Under ₹75,000/year (Standard Convenor)</option>
                          <option value="150000">Under ₹1.5 Lakhs/year</option>
                          <option value="300000">Under ₹3 Lakhs/year (Private Universities)</option>
                          <option value="999999">No Budget Limit</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Annual Family Income</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          value={profileData.family_income}
                          onChange={e => setProfileData({ ...profileData, family_income: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                          placeholder="e.g. 200000 (Required for scholarship evaluation)"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">College Ownership Preference</label>
                        <select 
                          value={profileData.gov_preference}
                          onChange={e => setProfileData({ ...profileData, gov_preference: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                        >
                          <option value="Any">Any College Type</option>
                          <option value="Government">Government Universities Only</option>
                          <option value="Private">Private / Autonomous Only</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3 pt-6">
                        <input 
                          type="checkbox" 
                          id="hostel_req"
                          checked={profileData.hostel_required}
                          onChange={e => setProfileData({ ...profileData, hostel_required: e.target.checked })}
                          className="w-4.5 h-4.5 rounded text-brand-500 focus:ring-brand-500 bg-slate-950 border-slate-800"
                        />
                        <label htmlFor="hostel_req" className="text-sm font-medium text-slate-300">Hostel Accommodation Required</label>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-800/80">
                      <button 
                        type="button" 
                        onClick={() => setProfileStep(2)}
                        className="gradient-btn-outline"
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        className="gradient-btn flex items-center gap-2"
                      >
                        Compute Recommendations <Sparkles className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </main>
        ) : (
          
          /* ACTIVE USER DASHBOARD LAYOUT */
          <>
            {/* SIDEBAR NAVIGATION */}
            <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
              
              {/* Profile Card Summary */}
              {isSidebarOpen ? (
                <div className="p-5 border-b border-slate-800/60 bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center font-bold text-brand-400">
                      {profileData.name[0] || 'S'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold truncate max-w-[150px]">{profileData.name}</h3>
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold mt-1">EAMCET Rank: {parseInt(profileData.rank).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 border-b border-slate-800/60 flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center font-bold text-brand-400">
                    {profileData.name[0] || 'S'}
                  </div>
                </div>
              )}

              {/* Sidebar Menu Options */}
              <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                <button 
                  onClick={() => setActiveTab('dashboard')} 
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'dashboard' ? 'bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Home className="w-4.5 h-4.5" />
                  {isSidebarOpen && <span>Dashboard Overview</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('branch')} 
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'branch' ? 'bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Compass className="w-4.5 h-4.5" />
                  {isSidebarOpen && <span>Branch Guidance</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('colleges')} 
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'colleges' ? 'bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <GraduationCap className="w-4.5 h-4.5" />
                  {isSidebarOpen && <span>College Recommendations</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('scholarships')} 
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'scholarships' ? 'bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Coins className="w-4.5 h-4.5" />
                  {isSidebarOpen && <span>Scholarships Eligibility</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('compare')} 
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'compare' ? 'bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Scale className="w-4.5 h-4.5" />
                  {isSidebarOpen && <span>Compare Dash</span>}
                </button>


                <button 
                  onClick={() => setActiveTab('chatbot')} 
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === 'chatbot' ? 'bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <MessageSquare className="w-4.5 h-4.5" />
                  {isSidebarOpen && <span>Counselor Chatbot</span>}
                </button>
              </nav>

              {/* Edit Profile button */}
              <div className="p-3 border-t border-slate-800 pb-5">
                <button 
                  onClick={() => setHasCompletedProfile(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-300 hover:bg-slate-800 transition-colors ${!isSidebarOpen && 'justify-center'}`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isSidebarOpen && <span>Modify Profile</span>}
                </button>
              </div>
            </aside>

            {/* CONTENT VIEWPORT */}
            <main className="flex-1 p-6 overflow-y-auto space-y-6">

              {/* VIEW: DASHBOARD OVERVIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Top Welcome grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass-panel p-6 bg-gradient-to-br from-slate-900/80 to-slate-900/30 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">AP EAPCET COUNSELING CORE</span>
                        <h2 className="text-2xl font-extrabold mt-1 text-slate-100 tracking-tight">Namaste, {profileData.name}!</h2>
                        <p className="text-sm text-slate-400 mt-2">
                          Your profile has been processed. We have mapped your interest in <span className="font-semibold text-slate-200">{profileData.interests.slice(0, 3).join(', ') || 'General Engineering'}</span> to suggestions matching your cutoff rank of <span className="font-bold text-brand-400">{parseInt(profileData.rank).toLocaleString()}</span>.
                        </p>
                      </div>

                      {/* Brief statistics */}
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-800 mt-6 pt-5">
                        <div>
                          <span className="block text-xs text-slate-400">Preferred Course</span>
                          <span className="text-base font-bold text-slate-200">{profileData.preferred_branch}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-400">Total Bookmarked</span>
                          <span className="text-base font-bold text-slate-200">{savedColleges.length} Colleges</span>
                        </div>
                      </div>
                    </div>

                    {/* Chatbot Quick card */}
                    <div className="glass-panel p-6 border-brand-500/20 bg-brand-950/10 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="bg-brand-500/20 p-2.5 rounded-xl inline-block text-brand-400">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold">Ask the AI Counselor</h3>
                        <p className="text-xs text-slate-400">Have a question regarding placements, hosteling, or specific college comparisons? Ask our RAG-enabled chatbot.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('chatbot')}
                        className="mt-6 gradient-btn text-xs w-full flex items-center justify-center gap-2"
                      >
                        Launch AI Assistant <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Recommendations and Saved Colleges side-by-side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Brief Recommendations preview */}
                    <div className="glass-panel p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="text-base font-bold flex items-center gap-2"><Clock className="w-4.5 h-4.5 text-brand-400" /> Recently viewed</h3>
                        <button onClick={() => setActiveTab('colleges')} className="text-xs text-brand-400 hover:text-brand-300 font-semibold">{recentComparisons && recentComparisons.length > 0 ? `View All (${recentComparisons.length})` : 'View All'}</button>
                      </div>
                      
                      {recentComparisons && recentComparisons.length > 0 ? (
                        <div className="space-y-3">
                          {recentComparisons[0].preview.map((col, index) => (
                            <div key={index} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-slate-200 truncate max-w-[280px]">{col.name}</h4>
                                <p className="text-xs text-slate-400 mt-1">Average Pkg: {col.average_package} | Fees: {col.fees}</p>
                              </div>
                              <button 
                                onClick={() => handleSaveCollege(col.name)}
                                className={`p-2 rounded-lg border transition-all ${
                                  savedColleges.includes(col.name) 
                                  ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' 
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3.5 text-sm text-slate-400">No recently viewed colleges yet. <button onClick={() => setActiveTab('colleges')} className="text-brand-400 hover:underline">Browse colleges</button></div>
                      )}
                    </div>

                    {/* Bookmarked Colleges */}
                    <div className="glass-panel p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 className="text-base font-bold flex items-center gap-2"><Bookmark className="w-4.5 h-4.5 text-amber-500" /> Bookmarked Options</h3>
                        <span className="text-xs text-slate-400 font-medium">Convenor list</span>
                      </div>

                      {savedColleges.length > 0 ? (
                        <div className="space-y-3">
                          {savedColleges.map((colName, index) => (
                            <div key={index} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-300 truncate max-w-[300px]">{colName.split('(')[0]}</span>
                              <button 
                                onClick={() => handleRemoveCollege(colName)}
                                className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-slate-950/30 border border-dashed border-slate-800/60 rounded-xl">
                          <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">No colleges bookmarked yet.</p>
                          <p className="text-[10px] text-slate-500 mt-1">Bookmark colleges in the Recommendations tab to plan your options list.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: INTEREST BRANCH GUIDANCE */}
              {activeTab === 'branch' && (
                <div className="glass-panel p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">Branch Guidance Matrix</h2>
                    <p className="text-xs text-slate-400 mt-1">AP counselor logic matching your high school intermediate stream & chosen interests to optimal career branches.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {branchSuggestions.map((item, idx) => (
                      <div key={idx} className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500" />
                        <h3 className="text-base font-bold text-slate-100">{item.branch}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.reason}</p>
                      </div>
                    ))}
                  </div>

                  {/* EAPCET statistics notice */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3 text-xs text-slate-400">
                    <Info className="w-4.5 h-4.5 text-brand-400 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-300 block mb-0.5">Note on Specializations</span>
                      Computer Science branches in Andhra Pradesh colleges are highly competitive. Exploring spec sub-divisions (like AI & ML, Cyber Security, or DS) typically widens admission chance probabilities for rank margins of 10,000 to 25,000.
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: COLLEGE RECOMMENDATIONS */}
              {activeTab === 'colleges' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">Best Preferred Colleges</h2>
                    <p className="text-xs text-slate-400 mt-1">Personalized college picks based on your rank, budget, and preferences — sorted by placement performance.</p>
                  </div>

                  {recommendations ? (
                    <div className="space-y-8">
                      {/* Preferred Colleges */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {recommendations.preferred && recommendations.preferred.length > 0 ? (
                            recommendations.preferred.map((col, idx) => (
                              <div key={idx} className="glass-panel p-5 border-slate-800/80 hover:border-slate-700/60 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-bold text-slate-200 leading-tight">{col.name.split('(')[0]}</h4>
                                    <button 
                                      onClick={() => handleSaveCollege(col.name)}
                                      className={`p-1.5 rounded-lg border flex-shrink-0 transition-all ${
                                        savedColleges.includes(col.name) 
                                        ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' 
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      <Bookmark className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <span className="inline-block text-[10px] text-slate-400 font-medium mt-1">{col.location} | NAAC: {col.naac}</span>
                                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">{col.explain_why}</p>
                                </div>

                                <div className="mt-5 border-t border-slate-800/80 pt-4 space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Average Pkg:</span>
                                    <span className="font-bold text-emerald-400">{col.average_package}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Tuition Fee:</span>
                                    <span className="font-semibold text-slate-300">{col.fees}</span>
                                  </div>
                                  {col.website && (
                                    <a 
                                      href={col.website} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[10px] text-brand-400 hover:underline flex items-center gap-1 mt-2"
                                    >
                                      Visit Website <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-3 p-6 bg-slate-900/20 text-center text-xs text-slate-500 border border-slate-800 rounded-xl">
                              No colleges match your current profile filters. Check the Management Quota options below.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Management Quota Section */}
                      {recommendations.management_quota && recommendations.management_quota.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Management Quota (B-Category)</h3>
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">No Rank Required</span>
                          </div>
                          <p className="text-xs text-slate-400">These colleges offer direct admission through management quota regardless of your EAPCET rank. Fees are higher than convenor quota.</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {recommendations.management_quota.map((col, idx) => (
                              <div key={idx} className="glass-panel p-5 border-amber-900/30 hover:border-amber-800/40 flex flex-col justify-between bg-amber-950/5">
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-bold text-slate-200 leading-tight">{col.name.split('(')[0]}</h4>
                                    <button 
                                      onClick={() => handleSaveCollege(col.name)}
                                      className={`p-1.5 rounded-lg border flex-shrink-0 transition-all ${
                                        savedColleges.includes(col.name) 
                                        ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' 
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      <Bookmark className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <span className="inline-block text-[10px] text-slate-400 font-medium mt-1">{col.location} | NAAC: {col.naac}</span>
                                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">{col.explain_why}</p>
                                </div>

                                <div className="mt-5 border-t border-amber-900/30 pt-4 space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Average Pkg:</span>
                                    <span className="font-bold text-emerald-400">{col.average_package}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">B-Category Fee:</span>
                                    <span className="font-semibold text-amber-400">{col.mgmt_fee_estimate || 'Contact college'}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Convenor Fee:</span>
                                    <span className="font-semibold text-slate-300">{col.fees}</span>
                                  </div>
                                  {col.website && (
                                    <a 
                                      href={col.website} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[10px] text-brand-400 hover:underline flex items-center gap-1 mt-2"
                                    >
                                      Visit Website <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Fetching counselor database recommendations...</p>
                  )}
                </div>
              )}

              {/* VIEW: SCHOLARSHIP CHECKER */}
              {activeTab === 'scholarships' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">State & Merit Scholarship Calculator</h2>
                    <p className="text-xs text-slate-400 mt-1">Calculates eligibility for state-funded schemes (JVD) and private deemed concessions based on family income.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {eligibleScholarships.map((schol, index) => (
                      <div key={index} className="glass-panel p-5 border-slate-800/80 flex flex-col justify-between bg-gradient-to-br from-slate-900/60 to-slate-900/20">
                        <div className="space-y-2">
                          <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 font-semibold">{schol.type}</span>
                          <h3 className="text-base font-bold text-slate-200">{schol.name}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{schol.description}</p>
                        </div>
                        
                        <div className="mt-5 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
                          <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Benefit details</span>
                          <span className="text-xs font-semibold text-emerald-400 mt-0.5 block">{schol.benefit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW: COLLEGE COMPARISON */}
              {activeTab === 'compare' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">College Comparison Dashboard</h2>
                    <p className="text-xs text-slate-400 mt-1">Select multiple Andhra Pradesh colleges to evaluate side-by-side on placements, NAAC standards, and budgets.</p>
                  </div>

                  {/* Selector panel */}
                  <div className="glass-panel p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Choose Colleges to Compare (select 2–3)</h3>
                      {compareList.length > 0 && (
                        <span className="text-xs text-brand-400 font-semibold">{compareList.length} selected</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {LOCAL_COLLEGES.map(c => {
                        const isAdded = compareList.includes(c.name);
                        return (
                          <button
                            key={c.name}
                            onClick={() => {
                              if (isAdded) {
                                setCompareList(compareList.filter(x => x !== c.name));
                              } else {
                                if (compareList.length >= 3) return;
                                setCompareList([...compareList, c.name]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                              isAdded 
                              ? 'bg-brand-500/20 border-brand-500/60 text-brand-300' 
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {c.name.split('(')[0].trim()}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                      {compareList.length > 0 && (
                        <button
                          onClick={() => { setCompareList([]); setCompareResult(null); }}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-all"
                        >
                          Clear selection
                        </button>
                      )}
                      <button
                        onClick={() => triggerComparison(compareList)}
                        disabled={compareList.length < 2 || isComparing}
                        className={`ml-auto gradient-btn text-xs flex items-center gap-2 ${compareList.length < 2 ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {isComparing ? 'Comparing...' : `Compare ${compareList.length > 0 ? `(${compareList.length})` : ''}`} <Scale className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Comparison output results */}
                  {compareResult && (
                    <div className="space-y-6">
                      <div className="overflow-x-auto glass-panel border-slate-800/80">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                              <th className="p-4 font-semibold uppercase tracking-wider">Metrics</th>
                              {compareResult.comparison.map((c, idx) => (
                                <th key={idx} className="p-4 font-bold text-slate-200 border-l border-slate-800">{c.name.split('(')[0]}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            <tr>
                              <td className="p-4 font-medium text-slate-400">Location</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 text-slate-300 border-l border-slate-800">{c.location}</td>
                              ))}
                            </tr>
                            <tr className="bg-slate-900/20">
                              <td className="p-4 font-medium text-slate-400">Accreditation</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 text-slate-300 border-l border-slate-800">{c.accreditation} | {c.naac}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="p-4 font-medium text-slate-400">NIRF rank</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 text-slate-300 border-l border-slate-800">{c.nirf}</td>
                              ))}
                            </tr>
                            <tr className="bg-slate-900/20">
                              <td className="p-4 font-medium text-slate-400">Yearly tuition Fee</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 font-bold text-emerald-400 border-l border-slate-800">{c.fees}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="p-4 font-medium text-slate-400">Hostel Fee</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 text-slate-300 border-l border-slate-800">{c.hostel_fee}</td>
                              ))}
                            </tr>
                            <tr className="bg-slate-900/20">
                              <td className="p-4 font-medium text-slate-400">Average Placement</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 font-bold text-slate-200 border-l border-slate-800">{c.placements_avg}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="p-4 font-medium text-slate-400">Highest Placement</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 text-slate-300 border-l border-slate-800">{c.placements_highest}</td>
                              ))}
                            </tr>
                            <tr className="bg-slate-900/20">
                              <td className="p-4 font-medium text-slate-400">EAMCET Cutoff estimation</td>
                              {compareResult.comparison.map((c, idx) => (
                                <td key={idx} className="p-4 text-slate-300 border-l border-slate-800 font-semibold">{c.cutoff}</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* AI comparison wrap-up text */}
                      <div className="glass-panel p-6 border-brand-500/20 bg-brand-950/5 space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-1.5 text-brand-400"><Sparkles className="w-4 h-4" /> AI Counselor Summary</h3>
                        <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {compareResult.ai_summary}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* VIEW: CHATBOT */}
              {activeTab === 'chatbot' && (
                <div className="glass-panel flex flex-col h-[75vh] border-slate-800/80 overflow-hidden">
                  
                  {/* Chat header */}
                  <div className="bg-slate-900/60 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-200">AI Counselor RAG Core</h3>
                        <span className="text-[10px] text-slate-400">Trained on 45 Andhra Pradesh College PDF sheets</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setChatHistory([{ sender: 'counselor', text: 'Namaste! I am your AI Admission Counselor. How can I help you choose the right college, branch, or navigate the AP counseling process today?' }])}
                      className="text-[10px] text-rose-400 font-semibold hover:underline"
                    >
                      Clear History
                    </button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    {chatHistory.map((h, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${h.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                          h.sender === 'user' 
                          ? 'bg-brand-600 text-white rounded-br-none' 
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none whitespace-pre-line'
                        }`}>
                          {h.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none p-4 text-xs text-slate-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-150" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-300" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chip prompts */}
                  <div className="px-5 py-2.5 bg-slate-950/40 border-t border-slate-800/60 flex gap-2 overflow-x-auto scrollbar-none">
                    {[
                      "Can I get CSE with 25k rank?",
                      "Compare VIT AP vs SRM AP",
                      "Eligible scholarships",
                      "Required certificates for EAPCET"
                    ].map(chip => (
                      <button
                        key={chip}
                        onClick={() => handleChatSend(chip)}
                        className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-slate-300 text-[10px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Text Input area */}
                  <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Ask the counselor..."
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleChatSend(); }}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors text-slate-200"
                    />
                    <button 
                      onClick={() => handleChatSend()}
                      disabled={!chatMessage.trim() || chatLoading}
                      className="gradient-btn px-4 py-2 rounded-xl flex items-center justify-center flex-shrink-0"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
