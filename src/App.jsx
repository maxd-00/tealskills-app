import React, { useEffect, useMemo, useState, useContext, createContext } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
// (Point 3) — import inutilisé supprimé : createClient
// import { createClient } from "@supabase/supabase-js";

import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { LogOut, Settings } from "lucide-react";





/**
 * ==============================
 *  SUPABASE – client + helpers
 * ==============================
 * 1) Crée un projet sur https://supabase.com
 * 2) Récupère VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (Project Settings → API)
 * 3) Ajoute-les dans .env.local à la racine :
 *    VITE_SUPABASE_URL=... 
 *    VITE_SUPABASE_ANON_KEY=...
 */


/**
 * ==============================
 *  AUTH CONTEXT
 * ==============================
 */
const AuthCtx = createContext(null);

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) navigate("/");
      else navigate("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={{ session }}>{children}</AuthCtx.Provider>;
}

function useAuth() {
  return useContext(AuthCtx);
}

/** ==============================
 *  TOAST CONTEXT (global)
 * ============================== */
const ToastCtx = createContext({ toast: "", setToast: () => {} });
function useToast() {
  return useContext(ToastCtx);
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { session } = useAuth();
  const [role, setRole] = useState(null);

  useEffect(() => {
    (async () => {
      if (!session) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single(); // (Point 6a) on attend 1 ligne exactement
      if (!error && data) setRole(data.role);
    })();
  }, [session]);

  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && role !== "admin") return <Navigate to="/" replace />;
  return children;
}

/**
 * ==============================
 *  CONSTANTES / UI
 * ==============================
 */
const STATUS_TO_SCORE = { rouge: 20, orange: 60, vert: 100 };
const STATUS_LABELS = [
  { key: "rouge", label: "Rouge" },
  { key: "orange", label: "Orange" },
  { key: "vert", label: "Vert" },
];
const STATUS_TO_HEX = {
  rouge:  "#ef4444", // red-500
  orange: "#f59e0b", // amber-500
  vert:   "#22c55e", // green-500
};
const COLORS = { Company: "#0ea5e9", Client: "#22c55e", Myself: "#f97316" };
const STATUS_EN = ["red","orange","green"];
const STATUS_TO_LABEL_EN = { red: "Red", orange: "Orange", green: "Green" };
const STATUS_TO_HEX_EN = { red:"#ef4444", orange:"#f59e0b", green:"#22c55e" };

const monthsFr = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];

// --- Roles / Categories (ordre imposé) ---

const CATEGORY_ORDER = ["Company", "Myself", "Client"];
const CATEGORY_INDEX = Object.fromEntries(CATEGORY_ORDER.map((c, i) => [c, i]));
// === Roles categories (nouveau + compat. legacy) ===
const ROLES_CATEGORIES_NEW = ["Behavioral","Technical","Business impact"];
const ROLES_CATEGORIES_LEGACY = ["Company","Myself","Client"];
const ROLES_LEGACY_TO_NEW = {
  Company: "Business impact",
  Myself: "Behavioral",
  Client: "Technical",
};
const ROLES_CATEGORY_INDEX = Object.fromEntries(
  ROLES_CATEGORIES_NEW.map((c, i) => [c, i])
);


function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();

  const isLogin = location.pathname === "/login";

  // Vérifier si admin
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.user?.id) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (!cancelled) setIsAdmin(!error && data?.role === "admin");
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  // Style des liens NAV : texte teal + hover clair
  const navLinkClass = ({ isActive }) =>
    `rounded-md transition-colors
     px-2 py-1 text-sm font-medium
     ${isActive
        ? "bg-[#057e7f] text-white"
        : "text-[#057e7f] hover:bg-[#057e7f]/10"}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!isLogin && (
        <div
          id="app-navbar"
          className="
            fixed top-0 left-0 right-0 z-[9999]
            border-b border-slate-200 bg-white
            pt-[env(safe-area-inset-top)]
            h-14 md:h-16
          "
        >
          <div className="flex items-center justify-between h-full px-3 sm:px-4">
            {/* Gauche : logo + liens */}
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
              <NavLink
                to="/"
                className="font-bold text-[#057e7f] text-base sm:text-lg md:text-xl"
              >
                TealSkills
              </NavLink>
              <NavLink className={navLinkClass} to="/okr">
                OKR
              </NavLink>
              <NavLink className={navLinkClass} to="/role">
                Role
              </NavLink>
              <NavLink className={navLinkClass} to="/global">
                Global
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="p-2 rounded-md text-[#057e7f] hover:bg-[#057e7f]/10"
                  aria-label="Admin"
                >
                  {/* Icône engrenage */}
                  <svg xmlns="http://www.w3.org/2000/svg"
                       viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" strokeWidth="2"
                       className="w-5 h-5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.31-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.46.46 1.12.6 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c0 .7.4 1.31 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.2.61.81 1.01 1.51 1.01H21a2 2 0 0 1 0 4h-.09c-.7 0-1.31.4-1.51 1z" />
                  </svg>
                </NavLink>
              )}
            </div>

            {/* Droite : icône logout */}
            <div className="flex items-center">
              <button
                onClick={logout}
                className="p-2 rounded-md text-[#057e7f] hover:bg-[#057e7f]/10"
                aria-label="Logout"
              >
                {/* Icône porte */}
                <svg xmlns="http://www.w3.org/2000/svg"
                     viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2"
                     className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className={`
          max-w-6xl mx-auto px-3 sm:px-4 pb-10
          ${isLogin ? "" : "pt-14 md:pt-16"}
        `}
      >
        {children}
      </main>
    </div>
  );
}




function navClass({ isActive }) {
  return `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
    isActive
      ? "bg-[#057e7f] text-white"         // actif : fond teal, texte blanc
      : "bg-white text-[#057e7f] hover:bg-[#057e7f]/10" // inactif : fond blanc, texte teal
  }`;
}


/**
 * ==============================
 *  LOGIN PAGE (email + password)
 * ==============================
 */
function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setError(""); setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // La redirection se fera via onAuthStateChange dans AuthProvider
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md bg-white p-6 rounded-2xl shadow grid gap-5">
      {/* Toggle Sign in / Create account */}
<div className="flex items-center justify-center gap-2 bg-slate-100 rounded-full p-1">
  <button
    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
      mode === "signin"
        ? "bg-[#057e7f] text-white shadow font-medium"
        : "bg-white text-[#057e7f]"
    }`}
    onClick={() => setMode("signin")}
    type="button"
    aria-pressed={mode === "signin"}
  >
    Sign in
  </button>
  <button
    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
      mode === "signup"
        ? "bg-[#057e7f] text-white shadow font-medium"
        : "bg-white text-[#057e7f]"
    }`}
    onClick={() => setMode("signup")}
    type="button"
    aria-pressed={mode === "signup"}
  >
    Create account
  </button>
</div>



      <div>
        <h1 className="text-2xl font-semibold text-center text-[#057e7f]">TealSkills</h1>
        <p className="text-sm text-slate-600 text-center">
          {mode === "signin" ? "Welcome back. Please sign in." : "Use your work email to create an account."}
        </p>
      </div>

      <form className="grid gap-3" onSubmit={submit}>
        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <input
            type="email"
            className="border p-2 rounded-md bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            autoComplete={mode === "signin" ? "username" : "email"}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Password</span>
          <div className="flex items-stretch border rounded-md overflow-hidden border-[#057e7f] focus-within:ring-2 focus-within:ring-[#057e7f] focus-within:border-[#057e7f] bg-white">
            <input
              type={showPw ? "text" : "password"}
              className="p-2 flex-1 outline-none bg-white text-black"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <button
  type="button"
  onClick={() => setShowPw(s => !s)}
  aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
  className="px-2.5 bg-[#057e7f] text-white hover:opacity-90 flex items-center justify-center"
  style={{ width: 36, height: 36 }} // 36px: confortable & visible
>
  {showPw ? (
    // œil barré
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a3 3 0 004.24 4.24" />
      <path d="M9.88 5.09A9.77 9.77 0 0112 5c7 0 10 7 10 7a13.37 13.37 0 01-3.16 4.45" />
      <path d="M6.12 6.12A13.37 13.37 0 002 12s3 7 10 7a9.77 9.77 0 003.09-.49" />
    </svg>
  ) : (
    // œil
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )}
</button>

          </div>
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button disabled={loading} className="mt-1 px-4 py-2 rounded-full bg-[#057e7f] text-white">
          {loading ? "…" : (mode === "signin" ? "Sign in" : "Create account")}
        </button>
      </form>

      {mode === "signin" ? (
        <p className="text-xs text-slate-500 text-center">
          No account yet?{" "}
          <button type="button" className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#057e7f] text-white" onClick={()=>setMode("signup")}>
            Create one
          </button>
        </p>
      ) : (
        <p className="text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <button type="button" className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#057e7f] text-white" onClick={()=>setMode("signin")}>
            Sign in
          </button>
        </p>
      )}
    </section>
  );
}

// --- Helper to aggregate statuses ---
function aggregateStatus(answerStatuses) {
  // answerStatuses = array of "red"/"orange"/"green"
  if (answerStatuses.includes("red")) return "red";
  if (answerStatuses.includes("orange")) return "orange";
  return "green";
}

/**
 * ==============================
 *  HOME – PieChart basé sur OKR courants
 * ==============================
 */
function Home() {
  const { session } = useAuth();
  const email = session?.user?.email || "";

  // Extract first name from email
  const firstName = useMemo(() => {
    if (!email) return "";
    const local = email.split("@")[0];
    const raw = local.split(".")[0] || local;
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "";
  }, [email]);

  return (
    <section className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#057e7f]">
        Welcome{firstName && ` ${firstName},`}
      </h1>

      <div className="bg-white rounded-2xl shadow p-5 leading-relaxed text-slate-800">
        <p>
          This application is designed to help you track your professional objectives through different metrics.
        </p>

        <ul className="list-disc pl-6 mt-3 space-y-2">
          <li>
            In the <strong>OKR</strong> tab, you can fill in and update your objectives across three axes
            (<em>Client, Myself, Company</em>) and visualize your aggregated progress.
          </li>
          <li>
            In the <strong>Role</strong> tab, you can explore the competencies expected for your assigned role,
            as well as for other positions.
          </li>
          <li>
            In the <strong>Global</strong> tab, you can track the group’s objective by visualizing the evolution
            of the number of billable days compared to the target.
          </li>
        </ul>

        <div className="mt-5 space-y-1 text-sm text-slate-700">
          <p>
            For questions related to the <strong>content</strong>, please contact{" "}
            <strong>Fabrice Mahieu</strong> —{" "}
            <a className="text-[#057e7f] underline" href="mailto:fabrice.mahieu@teals.eu">
              fabrice.mahieu@teals.eu
            </a>
          </p>
          <p>
            For questions related to the <strong>application</strong>, please contact{" "}
            <strong>Maxime Dehu</strong> —{" "}
            <a className="text-[#057e7f] underline" href="mailto:maxime.dehu@teals.eu">
              maxime.dehu@teals.eu
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}








/**
 * ==============================
 *  OKR – CRUD (par employé)
 *  Table: okr_entries(user_id, category, notes, status)
 * ==============================
 */
function OKR() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  // Catégories (avec "Global")
  const CATS = ["Global", "Client", "Myself", "Company"];
  const [category, setCategory] = useState("Global");

  // Versions propres à l'utilisateur
  const [versions, setVersions] = useState([]);
  const [versionId, setVersionId] = useState("");
  const isActiveSelected = useMemo(() => {
    const v = versions.find(v => v.id === versionId);
    return !!v?.is_active;
  }, [versions, versionId]);

  // Données OKR & réponses
  const [items, setItems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal "Add OKR"
  const [showAdd, setShowAdd] = useState(false);
  const [newOKR, setNewOKR] = useState("");

  const { setToast } = useToast();

  // ===== Helpers pour le piechart "Global" façon Role =====
  const rgba = (hex, a) => {
    const h = hex.replace("#", "");
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  };
  const polarToXY = (cx, cy, r, angleDeg) => {
    const rad = angleDeg * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (cx, cy, r, startAngle, endAngle, sweep = 1) => {
    // Recharts utilise des angles horaires → inverser pour l'espace SVG
    const start = polarToXY(cx, cy, r, -startAngle);
    const end = polarToXY(cx, cy, r, -endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };
  // Libellé courbé sur l'anneau (comme Role). On "retourne" le texte pour "Myself" pour lisibilité.
  const renderCategoryCurvedLabel = (props) => {
    const { cx, cy, innerRadius, startAngle, endAngle, name, index } = props;
    const LABEL_OFFSET = 30; // distance depuis le bord intérieur
    const rLabel = innerRadius + LABEL_OFFSET;

    const PAD_DEG = 6;
    const s = startAngle - PAD_DEG;
    const e = endAngle + PAD_DEG;

    const forceReverse = name === "Myself";
    const d = forceReverse
      ? arcPath(cx, cy, rLabel, e, s, 0)  // inversé
      : arcPath(cx, cy, rLabel, s, e, 1); // normal

    const id = `okr-global-arc-${index}-${Math.round(s)}-${Math.round(e)}-${forceReverse ? "rev" : "fwd"}`;

    return (
      <>
        <defs>
          <path id={id} d={d} />
        </defs>
        <text fill="#ffffff" fontWeight="700" fontSize="16">
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {name}
          </textPath>
        </text>
      </>
    );
  };

  // ===== Chargement des versions (par utilisateur) =====
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("okr_versions")
        .select("id,label,is_active,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        alert(`Load versions failed: ${error.message}`);
        return;
      }
      setVersions(data || []);
      const active = (data || []).find(v => v.is_active);
      setVersionId(active ? active.id : data?.[0]?.id || "");
    })();
  }, [userId]);

  // ===== Chargement OKRs+answers pour la catégorie (sauf Global) =====
  useEffect(() => {
    if (!userId || !versionId) return;
    if (category === "Global") { setItems([]); setAnswers({}); return; }
    loadOKRs();
  }, [userId, versionId, category]);

  async function loadOKRs() {
    setLoading(true);
    try {
      const { data: okrs, error: err1 } = await supabase
        .from("okr_items")
        .select("id, title, description")
        .eq("version_id", versionId)
        .eq("assigned_user_id", userId)
        .eq("category", category)
        .order("order_index", { ascending: true });
      if (err1) throw err1;

      const { data: userAnswers, error: err2 } = await supabase
        .from("user_okr_answers")
        .select("item_id,status,notes")
        .eq("version_id", versionId)
        .eq("user_id", userId);
      if (err2) throw err2;

      const map = {};
      (userAnswers || []).forEach(a => { map[a.item_id] = { status: a.status, notes: a.notes || "" }; });

      setItems(okrs || []);
      setAnswers(map);
    } catch (e) {
      console.error(e);
      alert(`Load OKRs failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(itemId, field, value) {
    setAnswers(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  }

  async function saveChanges() {
    if (!versionId) return;
    for (const it of items) {
      const ans = answers[it.id] || { status: "orange", notes: "" };
      await supabase.from("user_okr_answers").upsert({
        user_id: userId,
        version_id: versionId,
        item_id: it.id,
        status: ans.status || "orange",
        notes: ans.notes || ""
      });
    }
    setToast("Changes saved!");
    setTimeout(() => setToast(""), 2000);
  }

  // Ajout OKR via modal
  async function confirmAddOKR() {
    const raw = newOKR.trim();
    if (!raw) return;
    if (category === "Global") {
      alert("Select a specific category (Client/Myself/Company) to add an OKR.");
      return;
    }
    const autoTitle = raw.split("\n")[0].slice(0, 80);
    const payload = {
      version_id: versionId,
      assigned_user_id: userId,
      category,
      title: autoTitle,
      description: raw,
      order_index: (items?.length || 0) + 1,
    };
    try {
      const { error } = await supabase.from("okr_items").insert(payload);
      if (error) throw error;
      setShowAdd(false);
      setNewOKR("");
      await loadOKRs();
      setToast("OKR added");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      alert(`Add OKR failed: ${e.message}`);
    }
  }

  // Suppression OKR
  async function deleteItem(id) {
    if (!isActiveSelected) return;
    try {
      const { error } = await supabase.from("okr_items").delete().eq("id", id);
      if (error) throw error;
      await loadOKRs();
      setToast("OKR deleted");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      alert(`Delete OKR failed: ${e.message}`);
    }
  }

  // ===== Global — Piechart façon Role (pas d'animation, pas de tooltip) =====
  const [globalPie, setGlobalPie] = useState([]);
  useEffect(() => {
    if (!userId || !versionId) { setGlobalPie([]); return; }
    if (category !== "Global") return;
    (async () => {
      try {
        const { data: okrs, error: e1 } = await supabase
          .from("okr_items")
          .select("id,category")
          .eq("version_id", versionId)
          .eq("assigned_user_id", userId);
        if (e1) throw e1;

        const { data: ans, error: e2 } = await supabase
          .from("user_okr_answers")
          .select("item_id,status")
          .eq("version_id", versionId)
          .eq("user_id", userId);
        if (e2) throw e2;

        const cats = ["Client","Myself","Company"];
        const byCat = { Client: [], Myself: [], Company: [] };
        (ans || []).forEach(a => {
          const it = (okrs || []).find(i => i.id === a.item_id);
          if (it && cats.includes(it.category)) byCat[it.category].push(a.status);
        });
        const agg = (arr) => (arr.includes("red") ? "red" : arr.includes("orange") ? "orange" : arr.length ? "green" : "gray");
        const colorFor = (k) =>
          k === "green" ? "#22c55e" : k === "orange" ? "#f59e0b" : k === "red" ? "#ef4444" : "#cbd5e1";

        const pie = cats.map(cat => {
          const level = agg(byCat[cat]);
          return { name: cat, value: 1, fill: colorFor(level), level };
        });
        setGlobalPie(pie);
      } catch (e) {
        console.error(e);
        setGlobalPie([]);
      }
    })();
  }, [category, userId, versionId]);

  const goToCat = (name) => setCategory(name);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-[#057e7f]">My OKRs</h1>

      {/* Year (versions, propres à l'utilisateur) */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Year</span>
        <select
          className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
        >
          {versions.map(v => (
            <option key={v.id} value={v.id}>
              {v.label}{v.is_active ? " (active)" : ""}
            </option>
          ))}
        </select>

        {!isActiveSelected && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            Read-only: inactive year
          </span>
        )}
      </div>

      {/* Category Tabs (avec Global) */}
      <div className="flex gap-2 bg-slate-100 rounded-full p-1 w-fit">
        {CATS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              category === cat ? "bg-[#057e7f] text-white shadow font-medium" : "bg-white text-[#057e7f]"
            }`}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GLOBAL: Piechart façon Role (pas d’animation / pas de tooltip) */}
      {category === "Global" && (
        <>
          {globalPie.length > 0 ? (
            <div className="relative bg-white rounded-2xl shadow p-4 h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={globalPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={135}
                    startAngle={90}
                    endAngle={-270}
                    label={renderCategoryCurvedLabel}
                    labelLine={false}
                    isAnimationActive={false} // ⛔ pas d’animation
                    onClick={(slice) => slice?.name && goToCat(slice.name)} // clic → onglet catégorie
                  >
                    {globalPie.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} cursor="pointer" />
                    ))}
                  </Pie>
                  {/* ⛔ Pas de Tooltip */}
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-slate-500">No OKR data for this year.</div>
          )}
        </>
      )}

      {/* LISTE OKRs (pour Client/Myself/Company) */}
      {category !== "Global" && (
        <>
          {loading ? (
            <div className="text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-slate-500">No OKRs for this category.</div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div
                  key={item.id}
                  className="relative bg-white p-4 rounded-xl shadow space-y-2"
                >
                  {/* ❌ Croix rouge sur fond blanc en haut à droite */}
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    disabled={!isActiveSelected}
                    title={!isActiveSelected ? "Read-only (inactive year)" : "Delete OKR"}
                    className={`absolute right-2 top-2 w-7 h-7 rounded-full 
                                flex items-center justify-center border
                                bg-white ${isActiveSelected ? "hover:bg-slate-50" : "opacity-50 cursor-not-allowed"}`}
                  >
                    <span className="text-red-600 text-lg leading-none">×</span>
                  </button>

                  <div className="font-medium text-slate-800">{item.title || "—"}</div>

                  {/* Sélecteur couleur (statut) */}
                  <div className="flex gap-3">
                    {["green", "orange", "red"].map(color => {
                      const selected = answers[item.id]?.status === color;
                      const base =
                        color === "green"
                          ? selected ? "bg-green-500 border-green-700" : "bg-slate-200 border-slate-400"
                          : color === "orange"
                          ? selected ? "bg-orange-400 border-orange-600" : "bg-slate-200 border-slate-400"
                          : selected ? "bg-red-500 border-red-700" : "bg-slate-200 border-slate-400";
                      return (
                        <button
                          key={color}
                          onClick={() => isActiveSelected && updateAnswer(item.id, "status", color)}
                          disabled={!isActiveSelected}
                          className={`w-6 h-6 rounded-full border-2 ${base} ${!isActiveSelected ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={!isActiveSelected ? "Read-only (inactive year)" : undefined}
                          type="button"
                        />
                      );
                    })}
                  </div>

                  {/* Notes */}
                  <textarea
                    className={`border rounded-md p-2 w-full ${isActiveSelected ? "bg-white" : "bg-slate-50"} text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f] ${!isActiveSelected ? "opacity-70" : ""}`}
                    rows={2}
                    placeholder="Add your notes..."
                    value={answers[item.id]?.notes || ""}
                    onChange={e => isActiveSelected && updateAnswer(item.id, "notes", e.target.value)}
                    disabled={!isActiveSelected}
                    readOnly={!isActiveSelected}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions (Add OKR + Save) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              disabled={!isActiveSelected || category === "Global"}
              className={`px-4 py-2 rounded-full ${isActiveSelected && category !== "Global" ? "bg-[#057e7f] text-white hover:opacity-90" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
              type="button"
            >
              Add OKR
            </button>
            <button
              onClick={saveChanges}
              disabled={!isActiveSelected}
              className={`px-4 py-2 rounded-full ${isActiveSelected ? "bg-[#057e7f] text-white hover:opacity-90" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
              type="button"
            >
              Save Changes
            </button>
          </div>
        </>
      )}

      {/* MODAL Add OKR (bords fenêtre & input en teal, croix rouge sur fond blanc) */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 border-2 border-[#057e7f]">
<div className="mb-2">
  <h3 className="text-lg font-semibold text-[#057e7f]">New OKR — {category}</h3>
</div>

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Description (max 3 lines)</span>
              <textarea
                className="border border-[#057e7f] rounded-md p-2 h-24 bg-white text-black focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
                rows={3}
                value={newOKR}
                onChange={(e) => {
                  const lines = e.target.value.split("\n").slice(0, 3);
                  setNewOKR(lines.join("\n"));
                }}
                placeholder="Write the OKR text here..."
              />
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-full bg-white text-[#057e7f] border border-[#057e7f] hover:bg-slate-50">Cancel</button>
              <button onClick={confirmAddOKR} className="px-4 py-2 rounded-full bg-[#057e7f] text-white hover:opacity-90">Add</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}





function StatusPicker({ value, onChange }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Traffic light">
      {STATUS_EN.map((k) => {
        const selected = value === k;
        const color = k === "red" ? "bg-red-500 border-red-600" : k === "orange" ? "bg-orange-400 border-orange-500" : "bg-green-500 border-green-600";
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`w-8 h-8 rounded-full border-2 transition-transform ${selected ? "scale-105" : "opacity-70 hover:opacity-100"} ${color}`}
            title={STATUS_TO_LABEL_EN[k]}
            aria-checked={selected}
            type="button"
          />
        );
      })}
    </div>
  );
}


/**
 * ==============================
 *  GLOBAL – progression sur 1 an + target
 *  Tables: global_months(user_id, year, month, days), global_targets(user_id, year, target)
 * ==============================
 */
function Global() {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [yearMeta, setYearMeta] = useState({ year: new Date().getFullYear(), target: 0, last_year: 0 });
  const [rawMonths, setRawMonths] = useState([]);
  const CAL = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const idx = useMemo(() => Object.fromEntries(CAL.map((m,i)=>[m,i])), []);

  // Charger les années
useEffect(() => {
  (async () => {
    const { data, error } = await supabase
      .from("global_years")
      .select("id,year,target,last_year,is_active")
      .order("year", { ascending: false });
    if (error) {
      console.error(error);
      alert(`Load years failed: ${error.message}`);
      return;
    }
    setYears(data || []);
    const active = (data || []).find(y => y.is_active);
    setYearId(active ? active.id : data?.[0]?.id || "");
  })();
}, []);


  // Charger meta + mois
  useEffect(() => {
    if (!yearId) return;
    (async () => {
      const { data: y, error: ey } = await supabase
        .from("global_years")
        .select("id,year,target,last_year")
        .eq("id", yearId)
        .single();
      if (ey) { console.error(ey); alert(`Load year failed: ${ey.message}`); return; }
      setYearMeta({ year: y.year, target: y.target ?? 0, last_year: y.last_year ?? 0 });

      const { data: m, error: em } = await supabase
        .from("global_months")
        .select("month,value")
        .eq("year_id", yearId);
      if (em) { console.error(em); alert(`Load months failed: ${em.message}`); return; }
      setRawMonths(m || []);
    })();
  }, [yearId]);

  // Données cumulées
  const chartData = useMemo(() => {
    const sorted = (rawMonths || []).slice().sort((a,b) => idx[a.month] - idx[b.month]);
    let run = 0;
    return CAL.map(month => {
      const rec = sorted.find(r => r.month === month);
      if (rec) run += Number(rec.value || 0);
      return { month, value: run };
    });
  }, [rawMonths, idx]);

  const yearTitle = `01/01/${yearMeta.year} - 31/12/${yearMeta.year}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#057e7f]">Global</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Year</span>
<select
  className="rounded-md p-2 bg-white text-black border-0 focus:ring-2 focus:ring-[#057e7f]"
  value={yearId}
  onChange={(e) => setYearId(e.target.value)}
>
  {years.map((y) => (
    <option key={y.id} value={y.id}>
      {y.year}{y.is_active ? " (active)" : ""}
    </option>
  ))}
</select>

        </div>
      </div>

      <div className="text-slate-600">{yearTitle}</div>

      <div className="bg-white rounded-2xl shadow p-4 h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" ticks={CAL} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            {/* Courbe cumulée en bleu */}
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={true} />
            {/* Ligne Target en rouge */}
<ReferenceLine
  y={Number(yearMeta.target || 0)}
  stroke="red"
  strokeDasharray="4 4"
/>
<ReferenceLine
  y={Number(yearMeta.last_year || 0)}
  stroke="green"
  strokeDasharray="4 4"
/>

          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Légende */}
      <div className="flex gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <span className="w-4 h-1 bg-[#2563eb] inline-block"></span> Cumulative Value
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-1 bg-red-500 inline-block"></span> Target
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-1 bg-green-500 inline-block"></span> Last Year
        </div>
      </div>
    </section>
  );
}



function Admin() {
  const [tab, setTab] = useState("okr"); // okr | global | roles | employee
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-[#057e7f]">Admin</h1>

      {/* Top-level tabs */}
      <div className="flex gap-2 bg-slate-100 rounded-full p-1 w-fit">
        {[
          { key: "okr", label: "OKR Management" },
          { key: "global", label: "Global Objectives" },
          { key: "roles", label: "Roles" },
          { key: "employee", label: "Employees" }, // ← NOUVEAU
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              tab === t.key ? "bg-[#057e7f] text-white shadow" : "bg-white text-[#057e7f]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "okr" && <AdminOKR />}
      {tab === "global" && <AdminGlobal />}
      {tab === "roles" && <AdminRoles />}
      {tab === "employee" && <AdminEmployees />}{/* ← NOUVEAU */}
    </section>
  );
}


/* =============================
 * OKR Management — Versions / Employee OKRs
 * ============================= */
function AdminOKR() {
  const [subTab, setSubTab] = useState("versions"); // versions | employee | visualization
  return (
    <div className="grid gap-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-slate-100 rounded-full p-1 w-fit">
        {[
          { key: "versions", label: "Versions" },
          { key: "employee", label: "Employee OKRs" },
          { key: "visualization", label: "Visualization" }, // ← ajouté ici
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            type="button"
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              subTab === t.key
                ? "bg-[#057e7f] text-white shadow font-medium"
                : "bg-white text-[#057e7f]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "versions" && <AdminOKR_Versions />}
      {subTab === "employee" && <AdminOKR_Employee />}
      {subTab === "visualization" && <AdminOKR_Visualization />}{/* ← nouveau */}
    </div>
  );
}


function AdminOKR_Versions() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [versions, setVersions] = useState([]);
  const [newVersion, setNewVersion] = useState("");
  const { setToast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: u, error: eu } = await supabase
        .from("profiles")
        .select("id,email")
        .order("email", { ascending: true });
      if (eu) { alert(`Load users failed: ${eu.message}`); return; }
      setUsers(u || []);
      setUserId(u?.[0]?.id || "");
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  async function load() {
    try {
      const { data, error } = await supabase
        .from("okr_versions")
        .select("id,label,is_active,created_at,user_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVersions(data || []);
    } catch (e) {
      console.error("Load versions failed:", e);
      alert(`Load versions failed: ${e.message}`);
    }
  }

  async function addVersion() {
    const label = newVersion.trim();
    if (!label || !userId) return;
    try {
      const isFirst = (versions?.length || 0) === 0;
      const { error } = await supabase
        .from("okr_versions")
        .insert({ label, is_active: isFirst, user_id: userId });
      if (error) throw error;
      setNewVersion("");
      await load();
      setToast("Version added");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      alert(`Add version failed: ${e.message}`);
    }
  }

  async function setActive(id) {
    try {
      // Désactive les autres versions du même user
      await supabase.from("okr_versions").update({ is_active: false }).eq("user_id", userId).neq("id", id);
      await supabase.from("okr_versions").update({ is_active: true }).eq("id", id).eq("user_id", userId);
      await load();
      setToast("Active version updated");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      alert(`Set active failed: ${e.message}`);
    }
  }

  async function deleteVersion(id) {
    if (!confirm("Delete this version? This will remove its OKRs.")) return;
    try {
      const { error } = await supabase.from("okr_versions").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      await load();
      setToast("Version deleted");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      alert(`Delete version failed: ${e.message}`);
    }
  }

  return (
    <div className="grid gap-4">
      {/* Sélecteur de consultant */}
      <div className="bg-white p-4 rounded-xl shadow grid gap-2">
        <label className="grid gap-1 max-w-sm">
          <span className="text-sm text-slate-600">Employee</span>
          <select
            className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
        </label>
      </div>

      {/* Création de version (pour le consultant sélectionné) */}
      <div className="bg-white p-4 rounded-xl shadow grid gap-2">
        <div className="font-medium">Create a version for this employee</div>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
            placeholder="e.g., Q4 2025"
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
          />
          <button
            onClick={addVersion}
            disabled={!userId}
            className={`px-4 py-2 rounded-full ${userId ? "bg-[#057e7f] text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
          >
            Add Version
          </button>
        </div>
      </div>

      {/* Liste des versions (du consultant sélectionné) */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2">Label</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
                <th className="text-left p-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="p-2">{v.label}</td>
                  <td className="p-2">
                    {v.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        active
                      </span>
                    ) : ("")}
                  </td>
                  <td className="p-2">
                    {!v.is_active && (
                      <button
                        className="text-xs px-2 py-1 rounded-full bg-slate-100"
                        onClick={() => setActive(v.id)}
                      >
                        Set active
                      </button>
                    )}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => deleteVersion(v.id)}
                      className="text-red-600 bg-white rounded-full px-2 hover:bg-slate-50"
                      title="Delete version"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td className="p-2 text-slate-500" colSpan={4}>
                    No versions yet for this employee.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function AdminOKR_Employee() {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");

  const [versions, setVersions] = useState([]);
  const [versionId, setVersionId] = useState("");

  const [items, setItems] = useState([]);
  const [answersMap, setAnswersMap] = useState({});

  // Charger les employés
  useEffect(() => {
    (async () => {
      try {
        const { data: u, error: eu } = await supabase
          .from("profiles")
          .select("id,email")
          .order("email", { ascending: true });
        if (eu) throw eu;
        setEmployees(u || []);
        setEmployeeId(u?.[0]?.id || "");
      } catch (e) {
        console.error(e);
        alert(`Load employees failed: ${e.message}`);
      }
    })();
  }, []);

  // Charger les versions de l’employé sélectionné
  useEffect(() => {
    if (!employeeId) return;
    (async () => {
      try {
        const { data: v, error: ev } = await supabase
          .from("okr_versions")
          .select("id,label,is_active,created_at,user_id")
          .eq("user_id", employeeId)
          .order("created_at", { ascending: false });
        if (ev) throw ev;
        setVersions(v || []);
        const active = (v || []).find(x => x.is_active);
        setVersionId(active ? active.id : v?.[0]?.id || "");
      } catch (e) {
        console.error(e);
        alert(`Load versions failed: ${e.message}`);
      }
    })();
  }, [employeeId]);

  // Charger TOUS les OKRs + réponses pour l’employé/version (plus de filtre par catégorie)
  useEffect(() => {
    if (!employeeId || !versionId) {
      setItems([]);
      setAnswersMap({});
      return;
    }
    (async () => {
      try {
        const { data: okrs, error: e1 } = await supabase
          .from("okr_items")
          .select("id, title, description, category, order_index")
          .eq("version_id", versionId)
          .eq("assigned_user_id", employeeId)
          .order("category", { ascending: true })
          .order("order_index", { ascending: true });
        if (e1) throw e1;

        const { data: ans, error: e2 } = await supabase
          .from("user_okr_answers")
          .select("item_id, status, notes")
          .eq("version_id", versionId)
          .eq("user_id", employeeId);
        if (e2) throw e2;

        const map = {};
        (ans || []).forEach(a => {
          map[a.item_id] = { status: a.status, notes: a.notes || "" };
        });

        setItems(okrs || []);
        setAnswersMap(map);
      } catch (e) {
        console.error(e);
        alert(`Load data failed: ${e.message}`);
      }
    })();
  }, [employeeId, versionId]);

  const badge = (status) => {
    if (!status) return <span className="inline-block px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">—</span>;
    const color =
      status === "green" ? "bg-green-500" :
      status === "orange" ? "bg-orange-400" :
      status === "red" ? "bg-red-500" : "bg-slate-400";
    const label =
      status === "green" ? "Completed" :
      status === "orange" ? "In progress" :
      status === "red" ? "Not completed" : status;
    return <span className={`inline-block px-2 py-0.5 rounded-full text-white ${color}`}>{label}</span>;
  };

  // Regrouper côté JS pour l’affichage (ordre fixe des catégories)
  const categories = ["Client", "Myself", "Company"];
  const grouped = categories.map(cat => ({
    cat,
    rows: (items || []).filter(it => it.category === cat)
  }));
  const allEmpty = grouped.every(g => g.rows.length === 0);

  return (
    <div className="grid gap-4">
      {/* Filtres */}
      <div className="grid md:grid-cols-3 gap-2 items-end">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Employee</span>
          <select
            className="border rounded-md p-2 bg-white text-black"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Version</span>
          <select
            className="border rounded-md p-2 bg-white text-black"
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}{v.is_active ? " (active)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Visualisation */}
      <div className="overflow-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2 w-44">Category</th>
              <th className="text-left p-2">Description</th>
              <th className="text-left p-2 w-40">Status</th>
              <th className="text-left p-2 w-72">Notes</th>
            </tr>
          </thead>
          <tbody>
            {allEmpty && (
              <tr>
                <td className="p-2 text-slate-500" colSpan={4}>
                  No OKRs for this selection.
                </td>
              </tr>
            )}

            {!allEmpty && grouped.map(section => (
              <React.Fragment key={section.cat}>
                {/* séparateur de section si la catégorie a des lignes */}
                {section.rows.length > 0 && (
                  <tr className="bg-slate-50/70">
                    <td className="p-2 font-semibold text-slate-700" colSpan={4}>
                      {section.cat}
                    </td>
                  </tr>
                )}
                {section.rows.map((it) => {
                  const ans = answersMap[it.id] || {};
                  return (
                    <tr key={it.id} className="border-t align-top">
                      <td className="p-2">{it.category}</td>
                      <td className="p-2 whitespace-pre-wrap text-slate-800">
                        {it.description || it.title}
                      </td>
                      <td className="p-2">{badge(ans.status)}</td>
                      <td className="p-2 whitespace-pre-wrap text-slate-700">{ans.notes || "—"}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function AdminOKR_Visualization() {
  const [users, setUsers] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // 1) Tous les users
        const { data: u, error: eu } = await supabase
          .from("profiles")
          .select("id,email")
          .order("email");
        if (eu) throw eu;
        setUsers(u || []);

        // 2) Versions ACTIVES par utilisateur (nécessite okr_versions.user_id)
        const { data: vers, error: ev } = await supabase
          .from("okr_versions")
          .select("id,user_id,is_active")
          .eq("is_active", true);
        if (ev) throw ev;

        const activeByUser = new Map((vers || []).map(v => [v.user_id, v.id]));
        const activeVersionIds = Array.from(activeByUser.values());
        if (activeVersionIds.length === 0) {
          setRows([]);
          return;
        }

        // 3) OKR items et answers, uniquement pour les versions actives
        const { data: items, error: ei } = await supabase
          .from("okr_items")
          .select("id,category,assigned_user_id,version_id")
          .in("version_id", activeVersionIds);
        if (ei) throw ei;

        const { data: answers, error: ea } = await supabase
          .from("user_okr_answers")
          .select("user_id,item_id,status,version_id")
          .in("version_id", activeVersionIds);
        if (ea) throw ea;

        // 4) Agrégation par user → catégories
        const itemsById = new Map((items || []).map(i => [i.id, i]));
        const userMap   = new Map((u || []).map(x => [x.id, x.email]));
        const perUser   = new Map(); // userEmail -> { Client:[], Myself:[], Company:[] }

        for (const a of (answers || [])) {
          const it = itemsById.get(a.item_id);
          if (!it) continue;
          // on NE prend que si la version de la réponse est la version active du user
          const activeVid = activeByUser.get(a.user_id);
          if (!activeVid || activeVid !== a.version_id) continue;

          const email = userMap.get(a.user_id) || a.user_id;
          if (!perUser.has(email)) {
            perUser.set(email, { Client: [], Myself: [], Company: [] });
          }
          perUser.get(email)[it.category]?.push(a.status || "orange");
        }

        const agg = (arr) =>
          arr.includes("red") ? "red" :
          arr.includes("orange") ? "orange" :
          arr.length ? "green" : "-";

        const out = (u || []).map(user => {
          const cats = perUser.get(user.email) || { Client: [], Myself: [], Company: [] };
          return {
            email: user.email,
            client:  agg(cats.Client),
            myself:  agg(cats.Myself),
            company: agg(cats.Company),
          };
        });

        out.sort((a, b) => a.email.localeCompare(b.email));
        setRows(out);
      } catch (e) {
        console.error(e);
        alert(`Load visualization failed: ${e.message}`);
      }
    })();
  }, []);

  return (
    <div className="grid gap-4">
      {/* Pas de selector de version ici : on affiche UNIQUEMENT la version active de chacun */}
      <div className="overflow-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Myself</th>
              <th className="text-left p-3">Company</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{r.email}</td>
                <td className="p-3">{renderBadge(r.client)}</td>
                <td className="p-3">{renderBadge(r.myself)}</td>
                <td className="p-3">{renderBadge(r.company)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-slate-500">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-slate-500">
        Legend: <Badge status="green" /> — <Badge status="orange" /> — <Badge status="red" /> — <Badge status="-" />
      </div>
    </div>
  );
}



/* =============================
 * Global Objectives — New / Data
 * ============================= */
function AdminGlobal() {
  const [subTab, setSubTab] = useState("new"); // new | data
  return (
    <div className="grid gap-6">
      <div className="flex gap-2 bg-slate-100 rounded-full p-1 w-fit">
  {[
    { key: "new", label: "New" },
    { key: "data", label: "Data" },
  ].map((t) => (
    <button
      key={t.key}
      onClick={() => setSubTab(t.key)}
      type="button"
      className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
        subTab === t.key
          ? "bg-[#057e7f] text-white shadow font-medium" // sélectionné
          : "bg-white text-[#057e7f]"                    // non sélectionné
      }`}
    >
      {t.label}
    </button>
  ))}
</div>


      {subTab === "new" ? <AdminGlobal_New /> : <AdminGlobal_Data />}
    </div>
  );
}

function AdminGlobal_New() {
  const [years, setYears] = useState([]);
  const [newYear, setNewYear] = useState({ year: "", target: "", last_year: "" });

  useEffect(() => {
    loadYears();
  }, []);

async function loadYears() {
  try {
    const { data, error } = await supabase
      .from("global_years")
      .select("id,year,target,last_year,is_active")
      .order("year", { ascending: false });
    if (error) throw error;
    setYears(data || []);
  } catch (e) {
    console.error(e);
    alert(`Load years failed: ${e.message}`);
  }
}


  async function addYear() {
  if (!newYear.year) return;

  const isFirst = (years?.length || 0) === 0;
  const payload = {
    year: Number(newYear.year),
    target: Number(newYear.target || 0),
    last_year: Number(newYear.last_year || 0),
    is_active: isFirst, // première année => active
  };

  try {
    const { data, error } = await supabase
      .from("global_years")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    await supabase
      .from("global_months")
      .insert(MONTHS.map((m) => ({ year_id: data.id, month: m, value: 0 })));

    setNewYear({ year: "", target: "", last_year: "" });
    loadYears();
  } catch (e) {
    alert(`Add year failed: ${e.message}`);
  }
}


  async function deleteYear(id) {
    if (!confirm("Delete this year? This will remove its monthly data.")) return;
    try {
      const { error } = await supabase.from("global_years").delete().eq("id", id);
      if (error) throw error;
      loadYears();
    } catch (e) {
      alert(`Delete year failed: ${e.message}`);
    }
  }

  async function setActiveYear(id) {
  try {
    await supabase.from("global_years").update({ is_active: false }).neq("id", id);
    await supabase.from("global_years").update({ is_active: true }).eq("id", id);
    loadYears();
  } catch (e) {
    alert(`Set active year failed: ${e.message}`);
  }
}


  return (
    <div className="grid gap-4">
      <div className="bg-white p-4 rounded-xl shadow grid md:grid-cols-4 gap-2">
        <input
          className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
          placeholder="Year (e.g. 2025)"
          value={newYear.year}
          onChange={(e) => setNewYear((s) => ({ ...s, year: e.target.value }))}
        />
        <input
          className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
          placeholder="Target"
          value={newYear.target}
          onChange={(e) => setNewYear((s) => ({ ...s, target: e.target.value }))}
        />
        <input
          className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
          placeholder="Last Year"
          value={newYear.last_year}
          onChange={(e) =>
            setNewYear((s) => ({ ...s, last_year: e.target.value }))
          }
        />
        <button
          onClick={addYear}
          className="px-4 py-2 rounded-full bg-[#057e7f] text-white hover:opacity-90"
        >
          Add Year
        </button>
      </div>

      {/* Existing years with target/last_year */}
<div className="bg-white p-4 rounded-xl shadow">
  <div className="text-sm text-slate-600 mb-2">Existing years</div>
  {years.length === 0 ? (
    <div className="text-slate-500">No years yet.</div>
  ) : (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-2">Year</th>
            <th className="text-left p-2">Target</th>
            <th className="text-left p-2">Last Year</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Activity</th>
            <th className="text-left p-2">Delete</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.id} className="border-t">
              <td className="p-2">{y.year}</td>
              <td className="p-2">{y.target}</td>
              <td className="p-2">{y.last_year}</td>
              <td className="p-2">
                {y.is_active ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    active
                  </span>
                ) : (
                  ""
                )}
              </td>
              <td className="p-2">
                {!y.is_active ? (
                  <button
                    onClick={() => setActiveYear(y.id)}
                    className="text-xs px-2 py-1 rounded-full bg-white text-[#057e7f] hover:bg-slate-50"
                  >
                    Set active
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => deleteYear(y.id)}
                  className="text-red-600 bg-white rounded-full px-2 hover:bg-slate-50"
                  title="Delete year"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>


    </div>
  );
}

function AdminGlobal_Data() {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [months, setMonths] = useState([]);
  const { setToast } = useToast(); // (Point 5b)

  // Calendar order
  const CAL = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const idx = Object.fromEntries(CAL.map((m, i) => [m, i]));

  useEffect(() => {
    loadYears();
  }, []);
async function loadYears() {
  try {
    const { data, error } = await supabase
      .from("global_years")
      .select("id,year,target,last_year,is_active")
      .order("year", { ascending: false });
    if (error) throw error;

    setYears(data || []);
    const active = (data || []).find(y => y.is_active);
    setYearId(active ? active.id : data?.[0]?.id || "");
  } catch (e) {
    console.error(e);
    alert(`Load years failed: ${e.message}`);
  }
}


  useEffect(() => {
    if (yearId) loadMonths(yearId);
  }, [yearId]);
  async function loadMonths(yid) {
    try {
      const { data, error } = await supabase
        .from("global_months")
        .select("id,month,value")
        .eq("year_id", yid);
      if (error) throw error;
      const sorted = (data || [])
        .slice()
        .sort((a, b) => idx[a.month] - idx[b.month]);
      setMonths(sorted);
    } catch (e) {
      console.error(e);
      alert(`Load months failed: ${e.message}`);
    }
  }

  async function saveMonths() {
    try {
      for (const m of months) {
        const { error } = await supabase
          .from("global_months")
          .update({ value: Number(m.value || 0) })
          .eq("id", m.id);
        if (error) throw error;
      }
      // (Point 5b) toast de succès
      setToast("Saved");
      setTimeout(() => setToast(""), 2000);
    } catch (e) {
      alert(`Save months failed: ${e.message}`);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Year</span>
        <select
  className="border rounded-md p-2 bg-white text-black"
  value={yearId}
  onChange={(e) => setYearId(e.target.value)}
>
  {years.map((y) => (
    <option key={y.id} value={y.id}>
      {y.year}{y.is_active ? " (active)" : ""}
    </option>
  ))}
</select>

      </div>

      <div className="grid md:grid-cols-3 gap-2 bg-white p-4 rounded-xl shadow">
        {months.map((m, idx2) => (
          <label key={m.id} className="flex items-center gap-2">
            <span className="w-10">{m.month}</span>
            <input
  className="border rounded-md p-2 flex-1 bg-white text-black"
  type="number"
  value={m.value}
  onChange={(e) => {
    const v = Number(e.target.value || 0);
    setMonths((list) => {
      const next = [...list];
      next[idx2] = { ...next[idx2], value: v };
      return next;
    });
  }}
/>

          </label>
        ))}
        {months.length === 0 && (
          <div className="text-slate-500">No data for this year.</div>
        )}
      </div>

      <div>
        <button
          onClick={saveMonths}
          className="px-4 py-2 rounded-full bg-[#057e7f] text-white hover:opacity-90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* =============================
 * Visualization — by OKR Version
 * ============================= */
function AdminView() {
  const [versions, setVersions] = useState([]);
  const [versionId, setVersionId] = useState("");
  const [users, setUsers] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
  (async () => {
    try {
      const { data: v, error: ev } = await supabase
        .from("okr_versions")
        .select("id,label,is_active,created_at")
        .order("created_at", { ascending: false });
      if (ev) throw ev;

      setVersions(v || []);
      const active = (v || []).find(x => x.is_active);
      setVersionId(active ? active.id : v?.[0]?.id || "");

      const { data: u, error: eu } = await supabase
        .from("profiles")
        .select("id,email")
        .order("email");
      if (eu) throw eu;
      setUsers(u || []);
    } catch (e) {
      console.error(e);
      alert(`Load visualization refs failed: ${e.message}`);
    }
  })();
}, []);


  useEffect(() => {
    if (!versionId || users.length === 0) return;
    (async () => {
      try {
        const { data: items, error: ei } = await supabase
          .from("okr_items")
          .select("id,category,assigned_user_id")
          .eq("version_id", versionId);
        if (ei) throw ei;

        const { data: answers, error: ea } = await supabase
          .from("user_okr_answers")
          .select("user_id,item_id,status")
          .eq("version_id", versionId);
        if (ea) throw ea;

        const itemsById = new Map(items?.map((i) => [i.id, i]) || []);
        const userMap = new Map(users.map((u) => [u.id, u.email]));

        const perUser = new Map(); // email -> { Client:[], Myself:[], Company:[] }
        for (const a of answers || []) {
          const it = itemsById.get(a.item_id);
          if (!it) continue;
          const email = userMap.get(a.user_id) || a.user_id;
          if (!perUser.has(email))
            perUser.set(email, { Client: [], Myself: [], Company: [] });
          perUser.get(email)[it.category].push(a.status || "orange");
        }

        const agg = (arr) =>
          arr.includes("red")
            ? "red"
            : arr.includes("orange")
            ? "orange"
            : arr.length
            ? "green"
            : "-";
        const out = [];
        for (const u of users) {
          const cats = perUser.get(u.email) || {
            Client: [],
            Myself: [],
            Company: [],
          };
          out.push({
            email: u.email,
            client: agg(cats.Client),
            myself: agg(cats.Myself),
            company: agg(cats.Company),
          });
        }
        out.sort((a, b) => a.email.localeCompare(b.email));
        setRows(out);
      } catch (e) {
        console.error(e);
        alert(`Build visualization failed: ${e.message}`);
      }
    })();
  }, [versionId, users]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">Version</span>
        <select
          className="border rounded-md p-2 bg-white text-black"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
              {v.is_active ? " (active)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Myself</th>
              <th className="text-left p-3">Company</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{r.email}</td>
                <td className="p-3">{renderBadge(r.client)}</td>
                <td className="p-3">{renderBadge(r.myself)}</td>
                <td className="p-3">{renderBadge(r.company)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-slate-500">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
<div className="text-xs text-slate-500">
  Legend: <Badge status="green" /> — <Badge status="orange" /> — <Badge status="red" /> — <Badge status="-" />
</div>

    </div>
  );
}

function renderBadge(status) {
  if (status === "-") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-300 text-slate-700">
        No data
      </span>
    );
  }

  const colorMap = { red: "bg-red-500", orange: "bg-orange-400", green: "bg-green-500" };
  const labelMap = { green: "Completed", orange: "In progress", red: "Not completed" };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-white ${
        colorMap[status] || "bg-slate-400"
      }`}
    >
      {labelMap[status] || status}
    </span>
  );
}



function Badge({ status }) {
  if (status === "-") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-300 text-slate-700">
        No data
      </span>
    );
  }

  const colorMap = {
    green: "bg-green-500",
    orange: "bg-orange-400",
    red: "bg-red-500",
  };
  const labelMap = {
    green: "Completed",
    orange: "In progress",
    red: "Not completed",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-white ${
        colorMap[status] || "bg-slate-400"
      }`}
    >
      {labelMap[status] || status}
    </span>
  );
}

/* =============================
 * Admin — Roles (container + sous-onglets)
 * ============================= */
function AdminRoles() {
  const [subTab, setSubTab] = useState("defs"); // comp | defs | assign

  return (
    <section className="space-y-6">


      {/* Sub-tabs */}
      <div className="flex gap-2 bg-slate-100 rounded-full p-1 w-fit">
        {[
          { key: "defs",  label: "Definition of roles" }, // ← nouveau
          { key: "comp",  label: "Role competencies" },   // ← renommé
          { key: "assign", label: "Role of employees" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              subTab === t.key ? "bg-[#057e7f] text-white shadow" : "bg-white text-[#057e7f]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "comp"   && <AdminRoles_Description />}
      {subTab === "defs"   && <AdminRoles_Definition />}
      {subTab === "assign" && <AdminRoles_Assign />}
    </section>
  );
}



/* =============================
 * Roles — Description des roles (form + liste CRUD)
 * ============================= */
function AdminRoles_Description() {
  const [role, setRole] = useState(""); // rôle choisi (vient de roles_definitions)
  const [category, setCategory] = useState(ROLES_CATEGORIES_NEW[0]);
  const [competency, setCompetency] = useState("");
  const [description, setDescription] = useState("");

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({
    competency: "",
    description: "",
    category: ROLES_CATEGORIES_NEW[0],
  });

  const [availableRoles, setAvailableRoles] = useState([]); // depuis roles_definitions

  useEffect(() => { loadRoles(); }, []);
  useEffect(() => { loadItems(); }, [availableRoles]);

  async function loadRoles() {
    const { data, error } = await supabase
      .from("roles_definitions")
      .select("role")
      .order("role", { ascending: true });
    if (error) { alert(`Load roles failed: ${error.message}`); return; }
    const list = (data || []).map(x => x.role);
    setAvailableRoles(list);
    if (list.length && !list.includes(role)) setRole(list[0]);
    if (!list.length) setRole("");
  }

  async function loadItems() {
    const { data, error } = await supabase
      .from("roles_competencies")
      .select("id, role, category, competency, description")
      .order("created_at", { ascending: true });
    if (error) { alert(`Load roles failed: ${error.message}`); return; }

    // Tri : d’abord rôle (ordre alpha), puis catégorie (ordre NEW, legacy en fin), puis competency
    const sorted = (data || []).slice().sort((a, b) => {
      if ((a.role || "") !== (b.role || "")) return (a.role || "").localeCompare(b.role || "");
      const caKey = ROLES_LEGACY_TO_NEW[a.category] || a.category;
      const cbKey = ROLES_LEGACY_TO_NEW[b.category] || b.category;
      const ca = ROLES_CATEGORY_INDEX[caKey] ?? 999;
      const cb = ROLES_CATEGORY_INDEX[cbKey] ?? 999;
      if (ca !== cb) return ca - cb;
      return (a.competency || "").localeCompare(b.competency || "");
    });
    setItems(sorted);
  }

  async function addItem() {
    const comp = competency.trim();
    if (!comp || !role) return;
    // On enregistre uniquement dans les nouvelles catégories
    const payload = { role, category, competency: comp, description };
    const { error } = await supabase.from("roles_competencies").insert(payload);
    if (error) { alert(`Add failed: ${error.message}`); return; }
    setCompetency(""); setDescription("");
    loadItems();
  }

  async function saveEdit(id) {
    const payload = {
      competency: edit.competency.trim(),
      description: edit.description,
      category: edit.category, // préserve la valeur existante si legacy (sauf si l’utilisateur choisit une new)
    };
    if (!payload.competency) return;
    const { error } = await supabase.from("roles_competencies").update(payload).eq("id", id);
    if (error) { alert(`Update failed: ${error.message}`); return; }
    setEditingId(null);
    loadItems();
  }

  async function deleteItem(id) {
    if (!confirm("Delete this competency?")) return;
    const { error } = await supabase.from("roles_competencies").delete().eq("id", id);
    if (error) { alert(`Delete failed: ${error.message}`); return; }
    loadItems();
  }

  return (
    <div className="grid gap-6">
      {/* Formulaire */}
      <div className="bg-white p-4 rounded-2xl shadow grid gap-3">
        <div className="grid md:grid-cols-4 gap-3">
          {/* Role */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Role</span>
            <select
              className="border rounded-md p-2 bg-white text-black border-[#057e7f]"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={availableRoles.length === 0}
            >
              {availableRoles.length === 0 ? (
                <option value="">— no roles defined —</option>
              ) : (
                availableRoles.map(r => <option key={r} value={r}>{r}</option>)
              )}
            </select>
          </label>

          {/* Category (NOUVELLES seulement pour la création) */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Category</span>
            <select
              className="border rounded-md p-2 bg-white text-black border-[#057e7f]"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {ROLES_CATEGORIES_NEW.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {/* Competency */}
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm text-slate-600">Competency (short)</span>
            <input
              className="border rounded-md p-2 bg-white text-black border-[#057e7f]"
              placeholder="e.g. Stakeholder management"
              value={competency}
              onChange={(e) => setCompetency(e.target.value)}
              disabled={!role}
            />
          </label>
        </div>

        {/* Description */}
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Description</span>
          <textarea
            className="border rounded-md p-2 bg-white text-black border-[#057e7f]"
            rows={3}
            placeholder="Longer description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!role}
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={addItem}
            disabled={!role}
            className={`px-4 py-2 rounded-full ${role ? "bg-[#057e7f] text-white hover:opacity-90" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
          >
            Add competency
          </button>
          {availableRoles.length === 0 && (
            <span className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1">
              Create roles in “Definition of roles” first.
            </span>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Competency</th>
              <th className="text-left p-2">Description</th>
              <th className="text-left p-2 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.role}</td>

                {/* CATEGORY: si legacy, on garde la valeur, mais on propose aussi les nouvelles */}
                <td className="p-2">
                  {editingId === it.id ? (
                    <select
                      className="border rounded-md p-1 bg-white text-black border-[#057e7f]"
                      value={edit.category}
                      onChange={(e)=>setEdit(s=>({...s, category: e.target.value}))}
                    >
                      {/* option actuelle (legacy ou new) */}
                      {!ROLES_CATEGORIES_NEW.includes(edit.category) && (
                        <option value={edit.category}>{edit.category} (legacy)</option>
                      )}
                      {ROLES_CATEGORIES_NEW.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    it.category
                  )}
                </td>

                {/* COMPETENCY */}
                <td className="p-2">
                  {editingId === it.id ? (
                    <input
                      className="border rounded-md p-1 w-full bg-white text-black border-[#057e7f]"
                      value={edit.competency}
                      onChange={(e)=>setEdit(s=>({...s, competency: e.target.value}))}
                    />
                  ) : (
                    <span className="text-slate-800">{it.competency || ""}</span>
                  )}
                </td>

                {/* DESCRIPTION (aperçu court) */}
                <td className="p-2">
                  {editingId === it.id ? (
                    <textarea
                      className="border rounded-md p-1 w-full bg-white text-black border-[#057e7f]"
                      rows={3}
                      value={edit.description}
                      onChange={(e)=>setEdit(s=>({...s, description: e.target.value}))}
                    />
                  ) : (
                    <div
                      className="text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis"
                      title={it.description || ""}
                    >
                      {(() => {
                        const full = (it.description || "").trim();
                        const max = 60;
                        return full.length > max ? full.slice(0, max) + "…" : full;
                      })()}
                    </div>
                  )}
                </td>

                <td className="p-2">
                  {editingId === it.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(it.id)}
                        className="text-green-700 bg-white rounded-full px-2 hover:bg-slate-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-600 bg-white rounded-full px-2 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(it.id);
                          setEdit({
                            competency: it.competency,
                            description: it.description || "",
                            category: it.category, // garde la catégorie telle quelle (legacy possible)
                          });
                        }}
                        className="text-blue-600 bg-white rounded-full px-2 hover:bg-slate-50"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteItem(it.id)}
                        className="text-red-600 bg-white rounded-full px-2 hover:bg-slate-50"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-2 text-slate-500" colSpan={5}>No data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




/* =============================
 * Roles — Definition of roles (CRUD)
 * ============================= */
function AdminRoles_Definition() {
  const [newRole, setNewRole] = useState("");
  const [defn, setDefn] = useState("");
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ role: "", definition: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from("roles_definitions")
      .select("id, role, definition")
      .order("role", { ascending: true });
    if (error) { alert(`Load roles definitions failed: ${error.message}`); return; }
    setItems(data || []);
  }

  async function add() {
    const name = newRole.trim();
    if (!name) return;
    const payload = { role: name, definition: defn || null };
    const { error } = await supabase.from("roles_definitions").insert(payload);
    if (error) { alert(`Add role failed: ${error.message}`); return; }
    setNewRole(""); setDefn("");
    load();
  }

  async function save(id) {
    const payload = { role: edit.role.trim(), definition: edit.definition || null };
    if (!payload.role) return;
    const { error } = await supabase.from("roles_definitions").update(payload).eq("id", id);
    if (error) { alert(`Update failed: ${error.message}`); return; }
    setEditingId(null);
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this role definition?")) return;
    const { error } = await supabase.from("roles_definitions").delete().eq("id", id);
    if (error) { alert(`Delete failed: ${error.message}`); return; }
    load();
  }

  return (
    <div className="grid gap-6">
      {/* Formulaire d'ajout */}
      <div className="bg-white p-4 rounded-xl shadow grid gap-3">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">Role (name)</span>
            <input
              className="border rounded-md p-2 bg-white text-black border-[#057e7f]"
              placeholder="e.g. Consultant"
              value={newRole}
              onChange={(e)=>setNewRole(e.target.value)}
            />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm text-slate-600">Definition</span>
            <textarea
              className="border rounded-md p-2 bg-white text-black border-[#057e7f]"
              rows={3}
              placeholder="Short definition of the role…"
              value={defn}
              onChange={(e)=>setDefn(e.target.value)}
            />
          </label>
        </div>
        <div>
          <button
            onClick={add}
            className="px-4 py-2 rounded-full bg-[#057e7f] text-white hover:opacity-90"
          >
            Add role
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Definition</th>
              <th className="text-left p-2 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t">
                <td className="p-2">
                  {editingId === it.id ? (
                    <input
                      className="border rounded-md p-1 w-full bg-white text-black border-[#057e7f]"
                      value={edit.role}
                      onChange={(e)=>setEdit(s=>({...s, role: e.target.value}))}
                    />
                  ) : (
                    <span className="text-slate-800">{it.role}</span>
                  )}
                </td>
                <td className="p-2">
                  {editingId === it.id ? (
                    <textarea
                      className="border rounded-md p-1 w-full bg-white text-black border-[#057e7f]"
                      rows={3}
                      value={edit.definition || ""}
                      onChange={(e)=>setEdit(s=>({...s, definition: e.target.value}))}
                    />
                  ) : (
                    <div
                      className="text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis"
                      title={it.definition || ""}
                    >
                      {(() => {
                        const full = (it.definition || "").trim();
                        const max = 60;
                        return full.length > max ? full.slice(0, max) + "…" : full;
                      })()}
                    </div>
                  )}
                </td>
                <td className="p-2">
                  {editingId === it.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => save(it.id)}
                        className="text-green-700 bg-white rounded-full px-2 hover:bg-slate-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-600 bg-white rounded-full px-2 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingId(it.id); setEdit({ role: it.role, definition: it.definition || "" }); }}
                        className="text-blue-600 bg-white rounded-full px-2 hover:bg-slate-50"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => remove(it.id)}
                        className="text-red-600 bg-white rounded-full px-2 hover:bg-slate-50"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-2 text-slate-500" colSpan={3}>No roles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* =============================
 * Roles — Assignation du role aux employés
 * ============================= */
function AdminRoles_Assign() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]); // [{id, role}]

  useEffect(() => { load(); }, []);

  async function load() {
    // On récupère job_role_id (FK) au lieu de job_role (texte)
    const { data: u, error: eu } = await supabase
      .from("profiles")
      .select("id, email, job_role_id")
      .order("email", { ascending: true });
    if (eu) { alert(`Load users failed: ${eu.message}`); return; }
    setUsers(u || []);

    const { data: r, error: er } = await supabase
      .from("roles_definitions")
      .select("id, role")
      .order("role", { ascending: true });
    if (er) { alert(`Load roles failed: ${er.message}`); return; }
    setRoles(r || []);
  }

  async function updateRole(userId, newRoleId) {
    const { error } = await supabase
      .from("profiles")
      .update({ job_role_id: newRoleId || null })
      .eq("id", userId);
    if (error) { alert(`Update failed: ${error.message}`); return; }
    setUsers(list => list.map(u => u.id === userId ? { ...u, job_role_id: newRoleId || null } : u));
  }

  const noRoles = roles.length === 0;

  return (
    <div className="grid gap-4">
      {noRoles && (
        <div className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1 w-fit">
          Define roles first in “Definition of roles”.
        </div>
      )}
      <div className="overflow-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <select
                    className="border rounded-md p-2 bg-white text-black border-[#057e7f]"
                    value={u.job_role_id || ""}
                    onChange={(e) => updateRole(u.id, e.target.value || null)}
                    disabled={noRoles}
                  >
                    <option value="">—</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.role}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td className="p-2 text-slate-500" colSpan={2}>No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function AdminEmployees() {
  const [users, setUsers] = useState([]);
  const { setToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        // On suppose la colonne 'join_date' (DATE) dans 'profiles'
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, join_date")
          .order("email", { ascending: true });
        if (error) throw error;
        setUsers(data || []);
      } catch (e) {
        console.error(e);
        alert(`Load employees failed: ${e.message}`);
      }
    })();
  }, []);

  async function updateJoinDate(userId, val) {
    try {
      const payload = { join_date: val || null };
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;
      setUsers((list) => list.map(u => u.id === userId ? { ...u, join_date: val || null } : u));
      setToast("Saved");
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  }

  return (
    <section className="grid gap-4">

      <div className="overflow-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Anniversary (date of joining)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <input
                    type="date"
                    className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
                    value={u.join_date ? String(u.join_date).slice(0, 10) : ""}
                    onChange={(e) => updateJoinDate(u.id, e.target.value)}
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td className="p-2 text-slate-500" colSpan={2}>No employees.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Aide rapide */}
      <div className="text-xs text-slate-500">
        Tip: set each employee’s <em>date of joining</em> to use for anniversary-related features later.
      </div>
    </section>
  );
}


function RolePage() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  // 3 parts fixes (ordre)
  const CAT_ORDER = ["Behavioral", "Technical", "Business impact"];

  // Palette teal
  const CAT_COLOR = {
    Behavioral: "#057e7f",
    Technical: "#079093",
    "Business impact": "#046a6b",
  };

  const [roles, setRoles] = useState([]);                 // [{ role, definition }]
  const [activeRole, setActiveRole] = useState("");       // rôle attribué à l'utilisateur
  const [selectedRole, setSelectedRole] = useState("");
  const [definition, setDefinition] = useState("");

  const [byCat, setByCat] = useState({ Behavioral: [], Technical: [], "Business impact": [] });
  const [selectedComp, setSelectedComp] = useState(null); // { id, title, description, category }

  // === Versions (comme OKR) ===
  const [versions, setVersions] = useState([]);           // [{id,label,is_active}]
  const [versionId, setVersionId] = useState("");         // version choisie pour commenter

  // === Commentaire lié à (user, version, compétence) ===
  const [commentId, setCommentId] = useState(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // ----- utils géométrie / rendu (identiques à avant) -----
  const rgba = (hex, a) => {
    const h = hex.replace("#", "");
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  };
  const polarToXY = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (cx, cy, r, startAngle, endAngle, sweep = 1) => {
    const start = polarToXY(cx, cy, r, -startAngle);
    const end = polarToXY(cx, cy, r, -endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };
  const anglesFor = (cat) => {
    const i = CAT_ORDER.indexOf(cat);
    const start = 90 - i * 120;
    const end = start - 120;
    return { start, end };
  };

  // Courbe le label de catégorie (Technical inversé)
  const renderCategoryCurvedLabel = (props) => {
    const { cx, cy, innerRadius, startAngle, endAngle, name, index } = props;
    const LABEL_OFFSET = 30;
    const rLabel = innerRadius + LABEL_OFFSET;
    const PAD_DEG = 6;
    const s = startAngle - PAD_DEG;
    const e = endAngle + PAD_DEG;

    const forceReverse = name === "Technical";
    const d = forceReverse
      ? arcPath(cx, cy, rLabel, e, s, 0)
      : arcPath(cx, cy, rLabel, s, e, 1);

    const id = `cat-arc-${index}-${Math.round(s)}-${Math.round(e)}-${forceReverse ? "rev" : "fwd"}`;
    return (
      <>
        <defs><path id={id} d={d} /></defs>
        <text fill="#ffffff" fontWeight="700" fontSize="16">
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {name}
          </textPath>
        </text>
      </>
    );
  };

  // Split 1→3 lignes
  function splitLines(label, maxPerLine, maxLines = 3) {
    const t = (label || "").trim();
    if (!t) return [""];
    if (t.length <= maxPerLine) return [t];
    const words = t.split(/\s+/);
    const lines = [""];
    let li = 0;
    for (const w of words) {
      const cur = lines[li];
      const sep = cur.length ? " " : "";
      if (li < maxLines - 1 && (cur + sep + w).length > maxPerLine) {
        li++;
        lines[li] = w;
      } else {
        lines[li] = (cur + sep + w).trim();
      }
      if (li === maxLines - 1 && lines[li].length > maxPerLine * 1.6) {
        const cut = lines[li].lastIndexOf(" ", Math.max(0, maxPerLine - 1));
        lines[li] = (cut > 0 ? lines[li].slice(0, cut) : lines[li].slice(0, maxPerLine - 1)).trim() + "…";
        break;
      }
    }
    return lines;
  }

  // Label radial (jusqu'à 3 lignes)
  const makeOuterRadialLabelAdvanced = (total, innerR, outerR, category) => (props) => {
    const { cx, cy, midAngle, name, index } = props;
    const padding = 10;
    const startR = innerR + padding;
    const endR   = outerR - padding;
    const rMid   = (startR + endR) / 2;

    const arcDegPerSlice = total > 0 ? (120 / total) : 0;
    if (arcDegPerSlice < 5) return null;

    let flip = false;
    if (category === "Business impact") flip = true;
    else if (category === "Technical" && index >= Math.ceil(total / 2)) flip = true;

    const rotateDeg = -midAngle + (flip ? 180 : 0);
    const ang = (-midAngle * Math.PI) / 180;
    const x0 = cx + rMid * Math.cos(ang);
    const y0 = cy + rMid * Math.sin(ang);

    const available = endR - startR;
    const charsPerLine = Math.max(6, Math.floor(available / 7));
    const lines = splitLines(name, charsPerLine, 3);

    const dySets = { 1: ["0"], 2: ["-0.6em", "1.2em"], 3: ["-1.2em", "0", "1.2em"] };
    const dyVals = dySets[Math.min(3, lines.length)] || ["0"];

    return (
      <text
        x={x0}
        y={y0}
        transform={`rotate(${rotateDeg} ${x0} ${y0})`}
        fill="#ffffff"
        fontSize="12"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="middle"
        pointerEvents="none"
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x0} dy={i === 0 ? dyVals[0] : dyVals[i]}>
            {line}
          </tspan>
        ))}
      </text>
    );
  };

  // ----- Chargements -----
useEffect(() => {
  if (!userId) return;
  (async () => {
    // Rôles + job_role_id de l'utilisateur
    const [{ data: defs }, { data: prof }] = await Promise.all([
      supabase.from("roles_definitions").select("id, role, definition").order("role", { ascending: true }),
      supabase.from("profiles").select("job_role_id").eq("id", userId).single(),
    ]);

    const list = defs || [];
    setRoles(list.map(d => ({ role: d.role, definition: d.definition, id: d.id })));

    const userRoleId = prof?.job_role_id || null;
    const userRoleObj = list.find(r => r.id === userRoleId);

    const initialRole = userRoleObj?.role || list[0]?.role || "";
    setActiveRole(userRoleObj?.role || "");
    setSelectedRole(initialRole);
    setDefinition(list.find(r => r.role === initialRole)?.definition || "");
  })();
}, [userId]);


  // Versions (comme OKR). Si tu as rendu les versions « par utilisateur », on filtre par user_id = current user.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("okr_versions")
        .select("id,label,is_active,user_id,created_at")
        .or(`user_id.eq.${userId},user_id.is.null`)   // accepte versions globales (null) ou personnelles
        .order("created_at", { ascending: false });
      if (error) { console.error(error); return; }
      setVersions(data || []);
      const active = (data || []).find(v => v.is_active);
      setVersionId(active ? active.id : data?.[0]?.id || "");
    })();
  }, [userId]);

  // Charger compétences du rôle sélectionné
  useEffect(() => {
    if (!selectedRole) {
      setByCat({ Behavioral: [], Technical: [], "Business impact": [] });
      setDefinition("");
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("roles_competencies")
        .select("id, category, competency, description")
        .eq("role", selectedRole);
      if (error) {
        console.error(error);
        setByCat({ Behavioral: [], Technical: [], "Business impact": [] });
        return;
      }
      const map = { Behavioral: [], Technical: [], "Business impact": [] };
      (data || []).forEach(row => {
        const newCat = ROLES_LEGACY_TO_NEW[row.category] || row.category;
        if (map[newCat]) {
          map[newCat].push({
            id: row.id,
            competency: row.competency,
            description: row.description || "",
          });
        }
      });
      setByCat(map);
      const def = roles.find(r => r.role === selectedRole)?.definition || "";
      setDefinition(def);
      setSelectedComp(null);
      setCommentId(null);
      setComment("");
    })();
  }, [selectedRole, roles]);

  // Charger le commentaire quand (compétence, version) changent
  useEffect(() => {
    if (!userId || !selectedComp?.id || !versionId) return;
    (async () => {
      const { data, error } = await supabase
        .from("roles_competency_comments")
        .select("id, comment")
        .eq("user_id", userId)
        .eq("version_id", versionId)
        .eq("competency_id", selectedComp.id)
        .maybeSingle();
      if (error) { console.error(error); return; }
      setCommentId(data?.id || null);
      setComment(data?.comment || "");
    })();
  }, [userId, selectedComp?.id, versionId]);

  // ----- Données anneau intérieur -----
  const innerData = CAT_ORDER.map((name) => ({ name, value: 1 }));

  const titleRole = selectedRole ? `Role — ${selectedRole}` : "Role";

  async function saveComment() {
    if (!userId || !selectedComp?.id || !versionId) return;
    setSaving(true);
    try {
      // upsert sur (user_id, version_id, competency_id)
      const payload = {
        user_id: userId,
        version_id: versionId,
        competency_id: selectedComp.id,
        comment: comment || null,
      };
      const { data, error } = await supabase
        .from("roles_competency_comments")
        .upsert(payload, { onConflict: "user_id,version_id,competency_id" })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      setCommentId(data?.id || commentId);
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      {/* Titre + dropdown rôle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#057e7f]">{titleRole}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Role</span>
          <select
            className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {roles.length === 0 ? (
              <option value="">— no roles defined —</option>
            ) : (
              roles.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.role}{r.role === activeRole ? " (active)" : ""}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Description du rôle */}
      <p className="text-slate-700">
        {definition ? definition : "No definition for this role."}
      </p>

      {/* Pie chart */}
      <div className="role-chart bg-white rounded-2xl shadow p-4 h-[620px]">
        <style>{`.role-chart .recharts-tooltip-wrapper{display:none!important;}`}</style>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Anneau intérieur */}
            <Pie
              data={innerData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={135}
              startAngle={90}
              endAngle={-270}
              label={renderCategoryCurvedLabel}
              labelLine={false}
              isAnimationActive={false}
            >
              {innerData.map((d) => (
                <Cell key={d.name} fill={CAT_COLOR[d.name]} />
              ))}
            </Pie>

            {/* Anneau extérieur par catégorie */}
            {CAT_ORDER.map((cat) => {
              const list = byCat[cat] || [];
              if (!list.length) return null;
              const { start, end } = anglesFor(cat);
              const data = list.map((c, i) => ({
                id: c.id,
                name: c.competency,
                category: cat,
                description: c.description,
                value: 1,
                shade: 0.55 + (0.45 * (i % 6)) / 5,
              }));

              const innerR = 145;
              const outerR = 280;
              const RadialLabel = makeOuterRadialLabelAdvanced(list.length, innerR, outerR, cat);

              return (
                <Pie
                  key={cat}
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={innerR}
                  outerRadius={outerR}
                  startAngle={start}
                  endAngle={end}
                  paddingAngle={1}
                  minAngle={2}
                  isAnimationActive={false}
                  label={RadialLabel}
                  labelLine={false}
                  onClick={(_, idx) => {
                    const d = data[idx];
                    setSelectedComp({
                      id: d.id,
                      title: d.name,
                      description: d.description,
                      category: cat,
                    });
                  }}
                >
                  {data.map((d) => (
                    <Cell key={d.id} fill={rgba(CAT_COLOR[cat], d.shade)} cursor="pointer" />
                  ))}
                </Pie>
              );
            })}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Panneau: compétence sélectionnée + commentaire par version */}
      {selectedComp && (
        <div className="bg-white rounded-2xl shadow p-4 grid gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm text-slate-500">{selectedComp.category}</div>
              <h3 className="text-lg font-semibold text-[#057e7f]">{selectedComp.title}</h3>
            </div>

            {/* Dropdown Version (comme OKR) */}
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Version</span>
              <select
                className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}{v.is_active ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-slate-700 whitespace-pre-wrap">
            {selectedComp.description || "No description."}
          </p>

          {/* Commentaire utilisateur, lié à (user, version, compétence) */}
          <div className="grid gap-2">

            <textarea
              rows={4}
              className="border rounded-md p-2 bg-white text-black border-[#057e7f] focus:ring-2 focus:ring-[#057e7f] focus:border-[#057e7f]"
              placeholder="Add your personal notes about this competency…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div>
              <button
                onClick={saveComment}
                disabled={saving}
                className="px-4 py-2 rounded-full bg-[#057e7f] text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save comment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}



/**
 * ==============================
 *  APP
 * ==============================
 */
export default function App() {
  const [toast, setToast] = useState(""); // (Point 3/5) état global du toast

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastCtx.Provider value={{ toast, setToast }}>
          <Shell>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/okr" element={<ProtectedRoute><OKR /></ProtectedRoute>} />
              <Route path="/okr/:category" element={<ProtectedRoute><OKR /></ProtectedRoute>} />
              <Route path="/global" element={<ProtectedRoute><Global /></ProtectedRoute>} />
              <Route path="/role" element={<ProtectedRoute><RolePage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        </ToastCtx.Provider>
      </AuthProvider>
    </BrowserRouter>
  );
}


