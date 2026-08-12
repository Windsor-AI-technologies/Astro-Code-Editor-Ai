import { useState, useEffect, useRef } from "react";
import "./WelcomeAuth.css";

type AuthView = "welcome" | "login" | "signup";

const API_URL = "https://astro-backend.garzaromerojeshuaabiram2019ktv.workers.dev";

interface WelcomeAuthProps {
  onComplete: (session?: { access_token: string; refresh_token: string }) => void;
}

const FEATURES = [
  { title: "Multi-Mode IDE", desc: "Switch between IDE, Agent, Design, Electronics, Data, Music & Flowchart", icon: "🚀" },
  { title: "AI Assistant (Perl)", desc: "Voice-powered AI that reads your code, opens apps, and searches the web", icon: "🔮" },
  { title: "Analytics & Notebooks", desc: "Jupyter-like Python notebooks with Pyodide — no install needed", icon: "📊" },
  { title: "Real Debugger", desc: "Node.js debugger with breakpoints, stepping, and variable inspection", icon: "🐛" },
  { title: "Extensions Marketplace", desc: "Install themes and extensions from Open VSX", icon: "🧩" },
];

export default function WelcomeAuth({ onComplete }: WelcomeAuthProps) {
  const [view, setView] = useState<AuthView>("welcome");
  const [featureIdx, setFeatureIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => setFeatureIdx((i) => (i + 1) % FEATURES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const nextFeature = () => setFeatureIdx((i) => (i + 1) % FEATURES.length);
  const prevFeature = () => setFeatureIdx((i) => (i - 1 + FEATURES.length) % FEATURES.length);

  // ── OAuth (Google/GitHub) — opens browser, polls for session ──
  const startOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/${provider}`);
      const { url } = await res.json();

      // Open in system browser (Tauri)
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("perl_open_url", { url });
      } catch {
        window.open(url, "_blank");
      }

      // Poll for session tokens (backend stores them after callback)
      pollingRef.current = setInterval(async () => {
        try {
          const sessionRes = await fetch(`${API_URL}/auth/session`);
          const { session } = await sessionRes.json();
          if (session) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            // Save session
            localStorage.setItem("astro-session", JSON.stringify(session));
            localStorage.setItem("astro-auth-skip", "true");

            // Fetch user info and save it too
            try {
              const meRes = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              const user = await meRes.json();
              if (user.email) {
                localStorage.setItem("astro-user", JSON.stringify(user));
                // Save plan from database
                localStorage.setItem("astro-user-plan", JSON.stringify({
                  id: user.plan || "free",
                  label: (user.plan || "free").charAt(0).toUpperCase() + (user.plan || "free").slice(1),
                  perlAddon: user.perl_addon || false,
                }));
              }
            } catch {}

            setLoading(false);
            onComplete(session);
          }
        } catch { /* keep polling */ }
      }, 1500);

      // Stop polling after 2 minutes
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setLoading(false);
          setError("Login timed out. Try again.");
        }
      }, 120000);
    } catch (e) {
      setLoading(false);
      setError("Could not connect to backend. Run: npm run dev in AstroBackend");
    }
  };

  // ── Email login ──
  const handleLogin = async () => {
    if (!email || !password) { setError("Fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      localStorage.setItem("astro-session", JSON.stringify(data.session));
      localStorage.setItem("astro-auth-skip", "true");
      setLoading(false);
      onComplete(data.session);
    } catch {
      setError("Could not connect to backend");
      setLoading(false);
    }
  };

  // ── Email signup ──
  const handleSignup = async () => {
    if (!email || !password || !name) { setError("Fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      localStorage.setItem("astro-session", JSON.stringify(data.session));
      localStorage.setItem("astro-auth-skip", "true");
      setLoading(false);
      onComplete(data.session);
    } catch {
      setError("Could not connect to backend");
      setLoading(false);
    }
  };

  // ── Login view ──
  if (view === "login") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <button className="auth-back" onClick={() => { setView("welcome"); setError(""); }}>← Back</button>
          <div className="auth-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to your Astro account</p>
          </div>
          <div className="auth-form">
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="auth-input" autoFocus />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="auth-input" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" onClick={handleLogin} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
          </div>
          <div className="auth-divider"><span>or</span></div>
          <div className="auth-social">
            <button className="auth-social-btn" onClick={() => startOAuth("github")} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/></svg>
              GitHub
            </button>
            <button className="auth-social-btn" onClick={() => startOAuth("google")} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
          </div>
          <p className="auth-switch">Don't have an account? <button onClick={() => { setView("signup"); setError(""); }}>Sign up</button></p>
        </div>
      </div>
    );
  }

  // ── Signup view ──
  if (view === "signup") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <button className="auth-back" onClick={() => { setView("welcome"); setError(""); }}>← Back</button>
          <div className="auth-card-header">
            <h2>Create your account</h2>
            <p>Start building with Astro IDE</p>
          </div>
          <div className="auth-form">
            <div className="auth-field">
              <label>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="auth-input" autoFocus />
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="auth-input" />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="auth-input" onKeyDown={(e) => e.key === "Enter" && handleSignup()} />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" onClick={handleSignup} disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
          </div>
          <div className="auth-divider"><span>or</span></div>
          <div className="auth-social">
            <button className="auth-social-btn" onClick={() => startOAuth("github")} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/></svg>
              GitHub
            </button>
            <button className="auth-social-btn" onClick={() => startOAuth("google")} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
          </div>
          <p className="auth-switch">Already have an account? <button onClick={() => { setView("login"); setError(""); }}>Sign in</button></p>
        </div>
      </div>
    );
  }

  // ── Welcome view ──
  return (
    <div className="auth-screen">
      <div className="auth-welcome">
        <div className="auth-features">
          <div className="auth-features-card">
            <span className="auth-feature-icon">{FEATURES[featureIdx].icon}</span>
            <h3>{FEATURES[featureIdx].title}</h3>
            <p>{FEATURES[featureIdx].desc}</p>
          </div>
          <div className="auth-features-nav">
            <button onClick={prevFeature} className="auth-features-arrow">‹</button>
            <div className="auth-features-dots">
              {FEATURES.map((_, i) => (
                <span key={i} className={`auth-dot ${i === featureIdx ? "auth-dot--active" : ""}`} onClick={() => setFeatureIdx(i)} />
              ))}
            </div>
            <button onClick={nextFeature} className="auth-features-arrow">›</button>
          </div>
        </div>

        <div className="auth-options">
          <div className="auth-logo">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--accent)" strokeWidth="2.5" fill="color-mix(in srgb, var(--accent) 8%, transparent)"/>
              <ellipse cx="24" cy="24" rx="18" ry="7" stroke="var(--accent)" strokeWidth="1.5" fill="none" opacity="0.5"/>
              <circle cx="24" cy="24" r="4" fill="var(--accent)"/><circle cx="24" cy="24" r="2" fill="#fff"/>
            </svg>
            <h1>Astro IDE</h1>
            <p>The lightweight, multi-mode editor</p>
          </div>

          <div className="auth-buttons">
            <button className="auth-btn auth-btn--primary" onClick={() => setView("signup")}>Create Account</button>
            <button className="auth-btn auth-btn--secondary" onClick={() => setView("login")}>Sign In</button>
          </div>

          <div className="auth-divider"><span>or continue with</span></div>

          <div className="auth-social auth-social--compact">
            <button className="auth-social-btn" onClick={() => startOAuth("github")} disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/></svg>
            </button>
            <button className="auth-social-btn" onClick={() => startOAuth("google")} disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </button>
          </div>

          {loading && <p className="auth-loading">Waiting for login in browser...</p>}

          <button className="auth-skip" onClick={() => onComplete()}>Skip — use offline</button>
        </div>
      </div>
    </div>
  );
}
