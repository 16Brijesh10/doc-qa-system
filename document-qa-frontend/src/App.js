import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [role, setRole] = useState(null); 
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState({ answer: "Hello! Upload a document to begin.", sources: [] });
  const [displayedText, setDisplayedText] = useState(""); 
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayedText, loading]);

  // Typewriter Effect Logic
  useEffect(() => {
    let index = 0;
    const fullText = chat.answer;
    setDisplayedText("");

    if (fullText.startsWith("Hello!") || fullText === "Thinking...") {
      setDisplayedText(fullText);
      return;
    }

    const interval = setInterval(() => {
      setDisplayedText((prev) => fullText.slice(0, index + 1));
      index++;
      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [chat.answer]);

  const handleLogout = () => {
    setRole(null);
    setChat({ answer: "Hello! Upload a document to begin.", sources: [] });
    setQuestion("");
    setDisplayedText("");
  };

  // Robust Formatter for **Bold** and ### Headers
  const formatResponse = (text) => {
    if (!text) return "";
    
    // Convert Markdown Bold (**text**) to HTML <strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert Markdown Headers (### text) to Bold <strong>
    formatted = formatted.replace(/^### (.*$)/gim, '<strong>$1</strong>');

    return formatted.split('\n').map((line, index) => (
      <span 
        key={index} 
        className="response-line"
        dangerouslySetInnerHTML={{ __html: line + (line.trim() ? "" : "<br/>") }} 
      />
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
    const currentQuestion = question;
    setQuestion(""); // Clear input immediately for better UX
    setChat({ ...chat, answer: "Thinking..." });

    try {
      const res = await fetch(`http://127.0.0.1:8000/query?q=${encodeURIComponent(currentQuestion)}`, { method: "POST" });
      const data = await res.json();
      setChat({ answer: data.answer, sources: data.sources || [] });
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

  if (!role) {
    return (
      <div className="login-container">
        <h1 className="login-title">Document Intelligence</h1>
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

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h2 className="app-title">Document Intelligence</h2>
          <span className={`status-badge ${role}`}>{role} Mode</span>
        </div>
        <button className="logout-btn-top" onClick={handleLogout}>Logout</button>
      </header>

      <div className="chat-window">
        <div className="message-container">
          <div className={`answer-text ${loading ? 'pulse' : ''}`}>
            {formatResponse(displayedText)}
          </div>
          
          {chat.sources.length > 0 && !loading && (
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
          {role === 'admin' && (
            <div className="upload-container">
              <label htmlFor="file-input" className="round-plus-btn" title="Upload Documents">+</label>
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

          <button className="send-btn" onClick={askQuestion} disabled={loading}>
            {loading ? "..." : "➔"}
          </button>
        </div>
        
        <div className="footer-actions">
          {role === 'admin' && (
            <button className="secondary-btn clear-btn" onClick={clearChat}>
              Clear History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
