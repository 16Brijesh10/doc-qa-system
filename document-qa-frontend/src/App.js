import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { auth, googleProvider } from './firebase'; 
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";

function App() {
  // --- States ---
  const [role, setRole] = useState(null); 
  const [loginView, setLoginView] = useState(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState({ answer: "", sources: [] }); 
  const [displayedText, setDisplayedText] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  const welcomeMessage = "Hello! Ask a question to begin.";

  // --- 1. Auth Observer (The Gatekeeper) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userEmail = user.email.toLowerCase().trim();
        const adminEmail = "admin@gmail.com".toLowerCase().trim();

        if (userEmail === adminEmail) {
          setRole('admin');
          setIsSidebarOpen(true);
        } else {
          setRole('user');
          setIsSidebarOpen(false);
        }
      } else {
        // If user logs out, reset everything
        setRole(null);
        setLoginView(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Security & UI Effects ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedText, loading]);

  useEffect(() => {
    if (role === 'admin') fetchUploadedFiles();
  }, [role]);

  // Typewriter effect
  useEffect(() => {
    if (!chat.answer) {
      setDisplayedText("");
      return;
    }
    const fullText = chat.answer;
    if (fullText.startsWith("✅") || fullText.startsWith("❌") || fullText === "Thinking...") {
      setDisplayedText(fullText);
      return;
    }
    let index = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
      setDisplayedText((prev) => fullText.slice(0, index + 1));
      index++;
      if (index >= fullText.length) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [chat.answer]);

  // --- 3. Handlers ---
  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/files");
      const data = await res.json();
      setUploadedFiles(data.files || []);
    } catch (err) { console.error("File sync failed"); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) { setError("Invalid Admin Credentials"); }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) { setError("Google login failed"); }
  };

  // ✅ FIXED LOGOUT: Wipes all session data
  const handleLogout = () => {
    signOut(auth).then(() => {
      setRole(null);
      setLoginView(null);
      setChat({ answer: "", sources: [] });
      setDisplayedText("");
      setQuestion("");
      setUploadedFiles([]);
      setError("");
      // Optional: Force reload to ensure a clean slate
      window.location.reload(); 
    });
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const formData = new FormData();
    for (let file of files) formData.append("files", file);

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/upload", { method: "POST", body: formData });
      const data = await res.json();
      setChat({ answer: `✅ ${data.message}`, sources: [] });
      fetchUploadedFiles();
    } catch (err) { setChat({ answer: "❌ Upload failed.", sources: [] }); }
    setLoading(false);
  };

  const askQuestion = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    const currentQ = question;
    setQuestion("");
    setChat({ answer: "Thinking...", sources: [] });

    try {
      const res = await fetch(`http://127.0.0.1:8000/query?q=${encodeURIComponent(currentQ)}&role=${role}`, { 
        method: "POST" 
      });
      const data = await res.json();
      setChat({ answer: data.answer, sources: data.sources || [] });
    } catch (err) { setChat({ answer: "❌ Connection error.", sources: [] }); }
    setLoading(false);
  };

  const clearChat = async () => {
    if (!window.confirm("Permanent Delete: Clear all files and history?")) return;
    try {
      await fetch("http://127.0.0.1:8000/clear", { method: "POST" });
      setChat({ answer: "✅ System Cleared.", sources: [] });
      setUploadedFiles([]);
    } catch (err) { alert("❌ Failed to clear backend."); }
  };

  const formatResponse = (text) => {
    if (!text) return "";
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^### (.*$)/gim, '<strong>$1</strong>');
    formatted = formatted.replace(/^\* (.*$)/gim, '• $1');
    return formatted.split('\n').map((line, i) => (
      <span key={i} className="response-line" dangerouslySetInnerHTML={{ __html: line + (line.trim() ? "" : "<br/>") }} />
    ));
  };

  // --- 4. Render Logic ---
  if (!role) {
    return (
      <div className="login-container">
        {!loginView ? (
          <div className="role-selection">
            <h1 className="login-title">DOC intelL</h1>
            <div className="login-options">
              <div className="login-card" onClick={() => setLoginView('admin')}>🛡️ <h3>Admin Portal</h3>
              <p>Upload & Manage Files</p></div>
              <div className="login-card" onClick={() => setLoginView('user')}>🔍 <h3>User Portal</h3>
              <p>Query Only</p></div>
            </div>
          </div>
        ) : (
          <div className="auth-card">
            
            {loginView === 'admin' ? (
              <form onSubmit={handleAdminLogin}>
                <h2>Admin Login</h2>
                {error && <p className="error-msg" style={{color: 'red'}}>{error}</p>}
                <input type="email" placeholder="Email" className="login-input" onChange={(e)=>setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" className="login-input" onChange={(e)=>setPassword(e.target.value)} required />
                <button type="submit" className="auth-btn" disabled={loading}>Login</button>
                <button className="back-link" onClick={() => setLoginView(null)}>← Back</button>
              </form>
            ) : (
              <div className="user-auth">
                <h2>User Access</h2>
                <button className="google-btn" onClick={handleGoogleLogin}>Sign in with Google</button>
                <button className="back-link" onClick={() => setLoginView(null)}>← Back</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`app-container ${role}-view ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <header className="app-header">
        <div className="header-left">
          {role === 'admin' && (
            <button className="menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? "✕" : "☰"}
            </button>
          )}
          <h2 className="app-title">DOC intelL</h2>
          <span className={`status-badge ${role}`}>{role} Mode</span>
        </div>
        <button className="logout-btn-top" onClick={handleLogout}>Logout</button>
      </header>

      <div className="main-layout">
        {role === 'admin' && (
          <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">File Inventory</div>
            <div className="file-list">
              {uploadedFiles.map((f, i) => <div key={i} className="file-item">📄 {f}</div>)}
            </div>
          </aside>
        )}

        <main className="chat-window">
          <div className="message-container">
            {!displayedText && !loading ? (
              <div className="welcome-area">{welcomeMessage}</div>
            ) : (
              <div className="answer-text">{formatResponse(displayedText)}</div>
            )}
            
            {chat.sources.length > 0 && !loading && (
              <div className="sources-section">
                <div className="source-label">Sources:</div>
                <div className="source-chips">
                  {[...new Set(chat.sources)].map((s, i) => <span key={i} className="chip">📄 {s}</span>)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </main>
      </div>

      <div className="input-wrapper">
        <div className="floating-input-bar">
          {role === 'admin' && (
            <div className="upload-container">
              <label htmlFor="file-input" className="round-plus-btn">+</label>
              <input id="file-input" type="file" multiple hidden onChange={handleUpload} />
            </div>
          )}
          <input 
            type="text" 
            placeholder="Ask a question..." 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
          />
          <button className="send-btn" onClick={askQuestion} disabled={loading}>➔</button>
        </div>
        
        <div className="footer-actions">
          {role === 'admin' && (
            <button className="secondary-btn clear-btn" onClick={clearChat}>Clear History</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
