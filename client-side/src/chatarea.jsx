import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const EmojiPickerComponent = ({ onEmojiSelect, onClose }) => {
  const emojis = ["🐦", "💘", "👋", "⃝🌷", "🦅", "♕", "🌹", "🔥", "🏵️", "💮", "💐", "元", "🃏", "🎴", "🎭", "🏴‍☠️", "🏴", "🏳️", "🌌", "❄️", "🌘", "⨌", "⏰", "✂️", "💴", "🎸", "🎶", "👽", "🕉️", "🕌", "🧿", "🎃", "🦄", "🧞", "🍭", "🔮", "🎭", "🕷️", "⛱", "🌀", "🎯", "❎", "✅", "📵", "☎", "🧙‍♂️", "👨‍🦼", "✍︎", "✌︎", "🎰", "♞", "🕹", "♝", "🎻", "🂫", "🂡", "🀢", "🀣", "🀤", "🦉", "🕶️", "💍", "💄", "🧥"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px", padding: "15px", background: "#1f2937", borderRadius: "16px", width: "350px", maxWidth: "90vw", maxHeight: "400px", overflowY: "auto", border: "1px solid #4f46e5", boxShadow: "0 10px 25px rgba(0,0,0,0.3)", position: "absolute", bottom: "70px", right: "10px", zIndex: 1000 }}>
      {emojis.map((emoji, index) => (
        <button key={index} onClick={() => { onEmojiSelect(emoji); onClose(); }} style={{ fontSize: "28px", background: "transparent", border: "none", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.target.style.transform = "scale(1.2)"; e.target.style.background = "#4f46e520"; }} onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.background = "transparent"; }}>{emoji}</button>
      ))}
    </div>
  );
};

const ChatArea = ({ selectedUser, Userprofile, id, token, prev_msg, uid, onBack }) => {
  const [text, setText] = useState("");
  const [indicator, setindicator] = useState("");
  const [messages, setMessages] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragEnabled, setDragEnabled] = useState(true);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Drag handlers
  const handleTouchStart = (e) => { if (!dragEnabled) return; dragStartY.current = e.touches[0].clientY; isDragging.current = true; e.preventDefault(); };
  const handleTouchMove = (e) => { if (!isDragging.current || !dragEnabled) return; const delta = e.touches[0].clientY - dragStartY.current; let newOffset = dragOffset + delta; newOffset = Math.min(Math.max(newOffset, -100), 300); setDragOffset(newOffset); dragStartY.current = e.touches[0].clientY; e.preventDefault(); };
  const handleTouchEnd = () => { isDragging.current = false; };

  // Responsive & back button
  useEffect(() => { const checkMobile = () => setIsMobile(window.innerWidth <= 768); checkMobile(); window.addEventListener("resize", checkMobile); return () => window.removeEventListener("resize", checkMobile); }, []);
  useEffect(() => { if (!isMobile || !onBack) return; window.history.pushState(null, "", window.location.href); const handlePopState = (e) => { e.preventDefault(); onBack(); window.history.pushState(null, "", window.location.href); }; window.addEventListener("popstate", handlePopState); return () => { window.removeEventListener("popstate", handlePopState); window.history.back(); }; }, [isMobile, onBack]);

  // Socket connection & event listeners
  useEffect(() => {
    if (!token) return;
    const socket = io("", { auth: { token } });
    socketRef.current = socket;

    socket.on("receive_message", (msg) => {
      setMessages(prev => [...prev, { _id: msg._id, text: msg.text, isOwn: false, delivered: msg.delivered || false, seen: msg.seen || false, timestamp: msg.createdAt }]);
      setindicator("");
    });
    socket.on("message_sent", (msg) => {
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, _id: msg._id, timestamp: msg.createdAt, delivered: msg.delivered } : m));
    });
    socket.on("messages_delivered", ({ by }) => { if (by === id) setMessages(prev => prev.map(m => m.isOwn && !m.delivered ? { ...m, delivered: true } : m)); });
    socket.on("messages_seen", ({ by }) => { if (by === id) setMessages(prev => prev.map(m => m.isOwn && !m.seen ? { ...m, seen: true, delivered: true } : m)); });
    socket.on("user_online", (userId) => { if (userId === id) setOnlineStatus(true); });
    socket.on("user_offline", (userId) => { if (userId === id) setOnlineStatus(false); });
    
    // ✅ Typing indicator stop event
    socket.on("stop_typing_indicator", () => setindicator(""));
    
    // ✅ Online status response
    socket.on("online_status", ({ userId, isOnline }) => { if (userId === id) setOnlineStatus(isOnline); });

    return () => socket?.disconnect();
  }, [token, id]);

  // ✅ Request online status when chat opens
  useEffect(() => {
    if (!id || !socketRef.current) return;
    socketRef.current.emit("check_online", { userId: id });
    socketRef.current.emit("mark_delivered", { senderId: id });
    socketRef.current.emit("mark_seen", { senderId: id });
    socketRef.current.emit("joinChat", id);
  }, [id]);

  // ✅ Typing indicator with debounce (stop typing after 1.5 sec)
  useEffect(() => {
    if (!id || !socketRef.current) return;
    let typingTimeout;
    const sendTyping = () => {
      socketRef.current?.emit("pass_indicator", { id });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socketRef.current?.emit("stop_typing", { id });
      }, 1500);
    };
    if (text) {
      sendTyping();
    } else {
      socketRef.current?.emit("stop_typing", { id });
      clearTimeout(typingTimeout);
    }
    return () => clearTimeout(typingTimeout);
  }, [text, id]);

  // Load previous messages
  useEffect(() => { if (uid && prev_msg && Array.isArray(prev_msg)) { const formatted = prev_msg.map(msg => ({ _id: msg._id, text: msg.text, isOwn: msg.isOwn === true, delivered: msg.delivered || false, seen: msg.seen || false, timestamp: msg.createdAt })).filter(msg => msg.timestamp).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); setMessages(formatted); } else setMessages([]); }, [uid, prev_msg]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const onSelectEmoji = (emoji) => setText(prev => prev + emoji);
  const send = () => { if (!text.trim() || !id) return; const tempId = Date.now(); setMessages(prev => [...prev, { _id: tempId, text, isOwn: true, delivered: false, seen: false, timestamp: new Date() }]); socketRef.current?.emit("send_message", { text, id }); setText(""); };
  const formatTime = (timestamp) => { if (!timestamp) return ""; const date = new Date(timestamp); if (isNaN(date.getTime())) return ""; return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
  const StatusIcon = ({ msg }) => { if (!msg.isOwn) return null; if (msg.seen) return <span style={{ color: "#34b7f1", fontSize: "12px", marginLeft: "4px" }}>✓✓</span>; if (msg.delivered) return <span style={{ color: "#9ca3af", fontSize: "12px", marginLeft: "4px" }}>✓✓</span>; return <span style={{ color: "#9ca3af", fontSize: "12px", marginLeft: "4px" }}>✓</span>; };
  const getResponsiveStyles = () => { const w = window.innerWidth; if (w <= 480) return { headerHeight: "55px", avatarSize: "35px", fontSize: "14px", bubblePadding: "8px 12px", inputPadding: "10px" }; if (w <= 768) return { headerHeight: "60px", avatarSize: "40px", fontSize: "15px", bubblePadding: "10px 14px", inputPadding: "12px" }; return { headerHeight: "65px", avatarSize: "40px", fontSize: "16px", bubblePadding: "10px 14px", inputPadding: "12px" }; };
  const responsive = getResponsiveStyles();
  const styles = {
    wrapper: { position: "fixed", top: `${dragOffset}px`, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #1f2937, #111827)", zIndex: 1000, transition: "top 0.2s ease", borderRadius: "20px 20px 0 0", overflow: "hidden" },
    dragHandle: { width: "40px", height: "5px", background: "#6b7280", borderRadius: "10px", margin: "10px auto", cursor: "grab", touchAction: "none" },
    header: { height: responsive.headerHeight, display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "8px 12px" : "12px 20px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 },
    headerLeft: { display: "flex", alignItems: "center", gap: "5px" },
    backButton: { background: "transparent", border: "none", fontSize: "31px", color: "white", cursor: "pointer", padding: 0, marginRight: "10px", width: "27px", height: "25px", display: "flex", alignItems: "center", justifyContent: "center" },
    avatar: { width: responsive.avatarSize, height: responsive.avatarSize, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
    avatarImage: { width: "100%", height: "100%", objectFit: "cover" },
    userInfo: { flex: 1, marginLeft: "5px" },
    name: { fontSize: responsive.fontSize, fontWeight: "600", color: "#f3f4f6", lineHeight: 1.3 },
    sub: { fontSize: "10px", color: onlineStatus ? "#22c55e" : "#9ca3af", lineHeight: 1.2 },
    chatBox: { flex: 1, padding: isMobile ? "12px" : "20px", overflowY: "auto", display: "flex", flexDirection: "column" },
    bubble: { padding: responsive.bubblePadding, borderRadius: "18px", fontSize: responsive.fontSize, color: "#fff", wordBreak: "break-word", maxWidth: isMobile ? "80%" : "70%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" },
    messageFooter: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px", marginTop: "4px", marginRight: "8px" },
    inputBox: { padding: responsive.inputPadding, background: "#1f2937", borderTop: "1px solid rgba(255,255,255,0.08)", position: "relative", flexShrink: 0 },
    inputWrapper: { display: "flex", alignItems: "center", gap: "8px", background: "#374151", borderRadius: "28px", padding: "6px 12px" },
    emojiBtn: { background: "transparent", border: "none", borderRadius: "50%", width: "36px", height: "36px", fontSize: "20px", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center" },
    input: { flex: 1, padding: "8px 4px", border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: responsive.fontSize },
    sendBtn: { background: "linear-gradient(135deg, #6366f1, #4f46e5)", border: "none", borderRadius: "50%", width: "36px", height: "36px", color: "#fff", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    stopDragBtn: { background: "#ef4444", border: "none", borderRadius: "20px", padding: "4px 12px", color: "white", fontSize: "12px", cursor: "pointer" },
  };
  
  if (!selectedUser) return (<div style={styles.wrapper}><div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "20px" }}><div><div style={{ fontSize: "80px", marginBottom: "20px" }}>💬</div><h3 style={{ color: "#fff" }}>Welcome to ChatApp</h3><p style={{ color: "#9ca3af" }}>Select a friend to start messaging</p></div></div></div>);
  
  return (
    <div style={styles.wrapper} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div style={styles.dragHandle} />
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {isMobile && <button onClick={onBack} style={styles.backButton}>←</button>}
          <div style={styles.avatar}><img src={Userprofile || "https://via.placeholder.com/40"} alt="Profile" style={styles.avatarImage} onError={(e) => e.target.src = "https://via.placeholder.com/40"} /></div>
          <div style={styles.userInfo}><div style={styles.name}>{selectedUser}</div><div style={styles.sub}>{indicator || (onlineStatus ? "Online" : "Offline")}</div></div>
        </div>
        {isMobile && <button onClick={() => setDragEnabled(false)} style={styles.stopDragBtn} disabled={!dragEnabled}>🔒 Stop Drag</button>}
      </div>
      <div style={styles.chatBox}>
        {messages.length === 0 ? <div style={{ textAlign: "center", color: "#6b7280", marginTop: "40px" }}><span style={{ fontSize: "40px" }}>💬</span><p>No messages yet</p><small>Say hello to {selectedUser}</small></div> : messages.map((m, i) => (
          <div key={m._id || i} style={{ display: "flex", justifyContent: m.isOwn ? "flex-end" : "flex-start", marginBottom: "8px" }}>
            <div style={{ maxWidth: isMobile ? "80%" : "70%" }}>
              <div style={{ ...styles.bubble, background: m.isOwn ? "#4f46e5" : "#1f2937", borderBottomRightRadius: m.isOwn ? "4px" : "18px", borderBottomLeftRadius: m.isOwn ? "18px" : "4px" }}>{m.text}</div>
              <div style={styles.messageFooter}><span style={{ fontSize: "10px", color: "#9ca3af" }}>{formatTime(m.timestamp)}</span><StatusIcon msg={m} /></div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.inputBox}>
        <div style={styles.inputWrapper}>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={styles.emojiBtn}>😊</button>
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message..." style={styles.input} />
          <button onClick={send} style={styles.sendBtn}>➤</button>
        </div>
        {showEmojiPicker && <EmojiPickerComponent onEmojiSelect={onSelectEmoji} onClose={() => setShowEmojiPicker(false)} />}
      </div>
    </div>
  );
};

export default ChatArea;