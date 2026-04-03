import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:8000";

function TypingDots() {
  return (
    <div className="typing-dots">
      <span /><span /><span />
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`message-row ${isUser ? "user-row" : "bot-row"}`}>
      {!isUser && <div className="avatar bot-avatar">AI</div>}
      <div className={`bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
        {msg.text}
      </div>
      {isUser && <div className="avatar user-avatar">You</div>}
    </div>
  );
}

export default function App() {
  const [urlInput, setUrlInput] = useState("");
  const [trainedUrls, setTrainedUrls] = useState([]);
  const [training, setTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleTrain = async () => {
    const url = urlInput.trim();
    if (!url || training) return;
    if (trainedUrls.includes(url)) {
      setTrainStatus({ type: "warn", text: "This URL is already trained." });
      return;
    }
    setTraining(true);
    setTrainStatus({ type: "info", text: "Scraping and embedding content..." });
    try {
      const res = await axios.post(`${API}/train`, { url });
      if (res.data.status === "success") {
        setTrainedUrls((p) => [...p, url]);
        setTrainStatus({ type: "success", text: `Done — added ${res.data.chunks} chunks from this page.` });
        setUrlInput("");
      } else {
        setTrainStatus({ type: "error", text: res.data.message });
      }
    } catch {
      setTrainStatus({ type: "error", text: "Could not connect to backend. Is it running?" });
    }
    setTraining(false);
  };

  const handleChat = async () => {
    const q = question.trim();
    if (!q || chatLoading || trainedUrls.length === 0) return;
    setMessages((p) => [...p, { role: "user", text: q }]);
    setQuestion("");
    setChatLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { question: q });
      setMessages((p) => [...p, { role: "bot", text: res.data.answer || res.data.message }]);
    } catch {
      setMessages((p) => [...p, { role: "bot", text: "Error connecting to backend." }]);
    }
    setChatLoading(false);
  };

  const ready = trainedUrls.length > 0;

  return (
    <div className="app">
      <div className="bg-grid" />

      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">R</div>
          <div>
            <div className="logo-name">RAGBot</div>
            <div className="logo-sub">Knowledge Assistant</div>
          </div>
        </div>

        <div className="section-label">Data Sources</div>

        <div className="train-box">
          <div className="input-wrap">
            <span className="input-icon">🔗</span>
            <input
              className="url-input"
              placeholder="https://docs.example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrain()}
              disabled={training}
            />
          </div>
          <button
            className={`train-btn ${training ? "loading" : ""}`}
            onClick={handleTrain}
            disabled={training}
          >
            {training ? (
              <>
                <span className="spinner" />
                Training...
              </>
            ) : (
              <>
                <span className="btn-icon">+</span>
                Add & Train
              </>
            )}
          </button>

          {training && (
            <div className="progress-track">
              <div className="progress-bar" />
            </div>
          )}

          {trainStatus && (
            <div className={`status-msg status-${trainStatus.type}`}>
              {trainStatus.type === "success" && "✓ "}
              {trainStatus.type === "error" && "✕ "}
              {trainStatus.type === "warn" && "⚠ "}
              {trainStatus.text}
            </div>
          )}
        </div>

        {trainedUrls.length > 0 && (
          <div className="url-list">
            {trainedUrls.map((u, i) => (
              <div key={i} className="url-item">
                <span className="url-dot" />
                <span className="url-text">{u}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className={`dot ${ready ? "green" : "yellow"}`} />
            {ready ? `${trainedUrls.length} source${trainedUrls.length > 1 ? "s" : ""} active` : "No sources yet"}
          </div>
        </div>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <div>
            <div className="chat-title">Chat</div>
            <div className="chat-sub">
              {ready ? `Answering from ${trainedUrls.length} trained source${trainedUrls.length > 1 ? "s" : ""}` : "Add a URL on the left to begin"}
            </div>
          </div>
        </header>

        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              {ready ? (
                <>
                  <div className="empty-icon">💬</div>
                  <div className="empty-title">Ready to answer</div>
                  <div className="empty-sub">Ask anything about your trained sources.</div>
                </>
              ) : (
                <>
                  <div className="empty-icon">🧠</div>
                  <div className="empty-title">No knowledge yet</div>
                  <div className="empty-sub">Paste a URL in the sidebar and click Add & Train.</div>
                </>
              )}
            </div>
          )}

          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {chatLoading && (
            <div className="message-row bot-row">
              <div className="avatar bot-avatar">AI</div>
              <div className="bubble bot-bubble"><TypingDots /></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className={`input-bar ${!ready ? "disabled" : ""}`}>
          <input
            className="chat-input"
            placeholder={ready ? "Ask a question about your sources..." : "Train on a URL first..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChat()}
            disabled={!ready || chatLoading}
          />
          <button
            className="send-btn"
            onClick={handleChat}
            disabled={!ready || chatLoading || !question.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}