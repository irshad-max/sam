import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const EmojiPickerComponent = ({ onEmojiSelect, onClose }) => {
  const emojis = [
    '🐦‍🔥', '⃤💘', '⃟👋', '⃝🌷', '🦅', '♕', '🌹',
    '🏵️', '💮', '💐', '元', '🃏', '🎴', '🎭', '🏴‍☠️', '🏴', '🏳️', '🌌',
    '❄️', '🌘', '⨌', '⏰', '✂️', '💴', '🎸', '🎶', '👽', '🕉️',
    '🕌', '🧿', '🎃', '🦄', '🧞', '🍭', '🔮', '🎭', '🕷️', '⛱', 
    '🌀', '🎯', '❎', '✅', '📵', '☎','🧙‍♂️','👨‍🦼','✍︎','✌︎','🎰',
    '♞','🕹','♝','🎻','🂫','🂡','🀢','🀣','🀤','🦉','🕶️','💍','💄',
    '🧥'
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gap: '8px',
      padding: '15px',
      background: '#1f2937',
      borderRadius: '16px',
      width: '350px',
      maxWidth: '90vw',
      maxHeight: '400px',
      overflowY: 'auto',
      border: '1px solid #4f46e5',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      position: 'absolute',
      bottom: '70px',
      right: '10px',
      zIndex: 1000
    }}>
      {emojis.map((emoji, index) => (
        <button
          key={index}
          onClick={() => {
            onEmojiSelect(emoji);
            onClose();
          }}
          style={{
            fontSize: '28px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.2)';
            e.target.style.background = '#4f46e520';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.background = 'transparent';
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

// ========== MAIN CHATAREA COMPONENT ==========
const ChatArea = ({ selectedUser, Userprofile, id, token, prev_msg, uid, onBack }) => {
  const [text, setText] = useState("");
  const [indicator, setindicator] = useState("");
  const [messages, setMessages] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🟢 HARDWARE BACK BUTTON HANDLER (Android/iPhone)
  useEffect(() => {
    if (!isMobile || !onBack) return;

    // Push a dummy state to intercept the back button
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (event) => {
      event.preventDefault();
      if (onBack) onBack();  // close chat and show sidebar
      // Push another dummy state so that further back presses also work
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up: remove our dummy state so normal navigation works later
      window.history.back();
    };
  }, [isMobile, onBack]);

  // Socket connection
  useEffect(() => {
    if (!token) return;
    socketRef.current = io("", {
      auth: { token }
    });

    socketRef.current.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, {
        text: msg.text,
        isOwn: false,
        seen: false,
        timestamp: new Date()
      }]);
      setindicator("");
    });

    return () => socketRef.current?.disconnect();
  }, [token]);

  // Typing indicator
  useEffect(() => {
    if (!id) return;

    socketRef.current?.emit("pass_indicator", { id });
    socketRef.current?.on("typing_indicator", (notify) => {
      setindicator(notify.text);
    });

    return () => {
      socketRef.current?.off("typing_indicator");
      setindicator("");
    };
  }, [text, id]);

  // Load previous messages
  useEffect(() => {
    if (uid && prev_msg && Array.isArray(prev_msg)) {
      const formatted = prev_msg.map(msg => ({
        text: msg.text,
        isOwn: msg.isOwn === true,
        seen: msg.seen || false,
        timestamp: msg.createdAt || new Date()
      }));
      setMessages(formatted);
    } else {
      setMessages([]);
    }
  }, [uid, prev_msg]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSelectEmoji = (emoji) => setText(prev => prev + emoji);
  const send = () => {
    if (!text.trim() || !id) return;
    socketRef.current?.emit("send_message", { text, id });
    setMessages((prev) => [...prev, { text, isOwn: true, timestamp: new Date() }]);
    setText("");
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (msg) => {
    if (!msg.isOwn) return null;
    return msg.seen ?
      <span style={{ color: "#34b7f1", fontSize: "10px", marginLeft: "4px" }}>✓✓</span> :
      <span style={{ color: "#9ca3af", fontSize: "10px", marginLeft: "4px" }}>✓</span>;
  };

  // Responsive styles with 100dvh for mobile
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(180deg, #1f2937, #111827)",
      height: "100dvh",
      width: "100%",
      overflow: "hidden",
      position: "relative"
    },
    header: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: isMobile ? "8px 12px" : "12px 20px",
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      minHeight: "55px"
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flex: 1
    },
    backButton: {
      background: "transparent",
      border: "none",
      fontSize: "28px",
      color: "white",
      cursor: "pointer",
      padding: "0",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%"
    },
    avatar: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },
    userInfo: {
      flex: 1,
      minWidth: 0
    },
    name: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#f3f4f6",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    },
    sub: {
      fontSize: "11px",
      color: "#9ca3af"
    },
    chatBox: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? "12px" : "20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    },
    bubble: {
      padding: "10px 14px",
      borderRadius: "18px",
      fontSize: "15px",
      color: "#fff",
      wordBreak: "break-word",
      maxWidth: isMobile ? "80%" : "70%",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
    },
    messageFooter: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: "4px",
      marginTop: "2px",
      marginRight: "8px"
    },
    inputBox: {
      flexShrink: 0,
      padding: "10px 12px",
      background: "#1f2937",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      position: "relative"
    },
    inputWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "#374151",
      borderRadius: "28px",
      padding: "4px 12px"
    },
    emojiBtn: {
      background: "transparent",
      border: "none",
      borderRadius: "50%",
      width: "36px",
      height: "36px",
      fontSize: "22px",
      cursor: "pointer",
      color: "#9ca3af",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    input: {
      flex: 1,
      padding: "8px 4px",
      border: "none",
      outline: "none",
      background: "transparent",
      color: "#fff",
      fontSize: "16px"
    },
    sendBtn: {
      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
      border: "none",
      borderRadius: "50%",
      width: "36px",
      height: "36px",
      color: "#fff",
      fontSize: "16px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  };

  if (!selectedUser) {
    return (
      <div style={styles.wrapper}>
        <div style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "20px"
        }}>
          <div>
            <div style={{ fontSize: "80px", marginBottom: "20px" }}>💬</div>
            <h3 style={{ color: "#fff" }}>Welcome to ChatApp</h3>
            <p style={{ color: "#9ca3af" }}>Select a friend to start messaging</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {isMobile && (
            <button onClick={onBack} style={styles.backButton}>
              ←
            </button>
          )}
          <div style={styles.avatar}>
            <img
              src={Userprofile || "https://via.placeholder.com/40"}
              alt="Profile"
              style={styles.avatarImage}
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/40";
              }}
            />
          </div>
          <div style={styles.userInfo}>
            <div style={styles.name}>{selectedUser || "Select user"}</div>
            <div style={styles.sub}>{indicator || "Online"}</div>
          </div>
        </div>
      </div>

      <div style={styles.chatBox}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6b7280", marginTop: "40px" }}>
            <span style={{ fontSize: "40px" }}>💬</span>
            <p>No messages yet</p>
            <small>Say hello to {selectedUser}</small>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.isOwn ? "flex-end" : "flex-start",
              }}
            >
              <div style={{ maxWidth: isMobile ? "80%" : "70%" }}>
                <div
                  style={{
                    ...styles.bubble,
                    background: m.isOwn ? "#4f46e5" : "#1f2937",
                    borderBottomRightRadius: m.isOwn ? "4px" : "18px",
                    borderBottomLeftRadius: m.isOwn ? "18px" : "4px"
                  }}
                >
                  {m.text}
                </div>
                <div style={styles.messageFooter}>
                  <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    {formatTime(m.timestamp)}
                  </span>
                  {getStatusIcon(m)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputBox}>
        <div style={styles.inputWrapper}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={styles.emojiBtn}
          >
            😊
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            style={styles.input}
          />
          <button onClick={send} style={styles.sendBtn}>
            ➤
          </button>
        </div>
        {showEmojiPicker && (
          <EmojiPickerComponent
            onEmojiSelect={onSelectEmoji}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ChatArea;