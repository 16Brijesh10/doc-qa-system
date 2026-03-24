import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [role, setRole] = useState(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState({ answer: "", sources: [] }); 
  const [displayedText, setDisplayedText] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const chatEndRef = useRef(null);

  const welcomeMessage = "Hello! Upload a document to begin.";

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayedText, loading]);

  useEffect(() => {
    if (role === 'admin') {
      fetchUploadedFiles();
    }
  }, [role]);

  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/files");
      const data = await res.json();
      setUploadedFiles(data.files || []);
    } catch (err) {
      console.error("Failed to fetch file history");
    }
  };

  // Typewriter Effect
  useEffect(() => {
    if (!chat.answer) {
      setDisplayedText("");
      return;
    }

    let index = 0;
    const fullText = chat.answer;
    
    if (fullText.startsWith("✅") || fullText.startsWith("❌") || fullText === "Thinking...") {
      setDisplayedText(fullText);
      return;
    }

    setDisplayedText("");
    const interval = setInterval(() => {
      setDisplayedText((prev) => fullText.slice(0, index + 1));
      index++;
      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [chat.answer]);

  const handleLogout = () => {
    setRole(null);
    setChat({ answer: "", sources: [] });
    setQuestion("");
    setDisplayedText("");
    setUploadedFiles([]);
  };

  const formatResponse = (text) => {
    if (!text) return "";
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^### (.*$)/gim, '<strong>$1</strong>');
    formatted = formatted.replace(/^\* (.*$)/gim, '• $1');


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
      fetchUploadedFiles();
    } catch (err) {
      setChat({ answer: "❌ Upload failed.", sources: [] });
    }
    setLoading(false);
  };

  const askQuestion = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    const currentQuestion = question;
    setQuestion(""); 
    setChat({ answer: "Thinking...", sources: [] });

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
      setChat({ answer: "", sources: [] });
      setUploadedFiles([]);
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
    /* ✅ Dynamic class handles input bar shift and chat stability */
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <header className="app-header">
        <div className="header-left">
          {role === 'admin' && (
            <button className="menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? "✕" : "☰"}
            </button>
          )}
          <h2 className="app-title">Document Intelligence</h2>
          <span className={`status-badge ${role}`}>{role} Mode</span>
        </div>
        <button className="logout-btn-top" onClick={handleLogout}>Logout</button>
      </header>

      <div className="main-layout">
        {role === 'admin' && (
          <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">Shared Knowledge</div>
            <div className="file-list">
              {uploadedFiles.length > 0 ? (
                uploadedFiles.map((file, i) => (
                  <div key={i} className="file-item" title={file}>📄 {file}</div>
                ))
              ) : (
                <div className="empty-msg">No files uploaded yet.</div>
              )}
            </div>
          </aside>
        )}

        <div className="chat-window">
          <div className="message-container">
            {!displayedText && !loading ? (
              <div className="welcome-area">
                <div className="welcome-text">{welcomeMessage}</div>
              </div>
            ) : (
              <div className={`answer-text ${loading && displayedText === "Thinking..." ? 'pulse' : ''}`}>
                {formatResponse(displayedText)}
              </div>
            )}
            
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
