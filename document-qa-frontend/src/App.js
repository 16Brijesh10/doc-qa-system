import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [role, setRole] = useState(null); 
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState({ answer: "Hello! Upload a document to begin.", sources: [] });
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Helper to scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  // ✅ HANDLER: Logout and Clear State
  const handleLogout = () => {
    setRole(null); // Return to login screen
    setChat({ answer: "Hello! Upload a document to begin.", sources: [] }); // Wipe chat
    setQuestion(""); // Wipe input box
  };

  // ✅ FORMATTER: Converts **bold** to <strong> and handles line breaks
  const formatResponse = (text) => {
    if (!text) return "";
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formatted.split('\n').map((line, index) => (
      <span key={index} dangerouslySetInnerHTML={{ __html: line + "<br/>" }} />
    ));
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
      setChat({ answer: `✅ ${data.message}. You can now ask questions.`, sources: [] });
    } catch (err) {
      setChat({ answer: "❌ Upload failed. Check if FastAPI is running.", sources: [] });
    }
    setLoading(false);
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setChat({ ...chat, answer: "Thinking..." });

    try {
      const res = await fetch(`http://127.0.0.1:8000/query?q=${encodeURIComponent(question)}`, { method: "POST" });
      const data = await res.json();
      setChat({ answer: data.answer, sources: data.sources || [] });
      setQuestion(""); 
    } catch (err) {
      setChat({ answer: "❌ Error connecting to backend.", sources: [] });
    }
    setLoading(false);
  };

  const clearChat = async () => {
    if (!window.confirm("Clear all documents and chat history?")) return;
    setLoading(true);
    try {
      await fetch("http://127.0.0.1:8000/clear", { method: "POST" });
      setChat({ answer: "System cleared. Ready for new uploads.", sources: [] });
    } catch (err) { alert("❌ Failed to clear database."); }
    setLoading(false);
  };

  // --- LOGIN VIEW ---
  if (!role) {
    return (
      <div className="login-container">
        <h1>Document Intelligence</h1>
        <div className="login-options">
          <div className="login-card" onClick={() => setRole('admin')}>
            <h3>Admin Portal</h3>
            <p>Upload & Manage Files</p>
          </div>
          <div className="login-card" onClick={() => setRole('user')}>
            <h3>User Portal</h3>
            <p>Chat & Query Only</p>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN INTERFACE ---
  return (
    <div className="app-container">
      {/* ✅ NEW: Header with Name and Status */}
      <header className="app-header">
        <div className="header-content">
          <span className="app-logo"></span>
          <h2 className="app-title">Document Intelligence</h2>
          <span className={`status-badge ${role}`}>{role} Mode</span>
        </div>
      </header>
      {role === 'admin' && (
        <div className="admin-action">
          <label htmlFor="file-input" className="floating-plus">+</label>
          <input id="file-input" type="file" multiple hidden onChange={handleUpload} />
        </div>
      )}

      <div className="chat-window">
        <div className="message-container">
          <div className={`answer-text ${loading ? 'pulse' : ''}`}>
            {formatResponse(chat.answer)}
          </div>
          
          {chat.sources.length > 0 && (
            <div className="sources-section">
              <div className="source-label">Sources Used:</div>
              <div className="source-chips">
                {[...new Set(chat.sources)].map((s, i) => (
                  <span key={i} className="chip">📄 {s}</span>
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="input-wrapper">
        <div className="floating-input-bar">
          <input 
            type="text" 
            placeholder="Ask a question..." 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
          />
          <button onClick={askQuestion} disabled={loading}>{loading ? "..." : "Send"}</button>
        </div>
        
        <div className="footer-actions">
          {role === 'admin' && (
            <button className="secondary-btn clear-btn" onClick={clearChat}>
              Clear History
            </button>
          )}
          {/* ✅ Updated to call handleLogout */}
          <button className="secondary-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;