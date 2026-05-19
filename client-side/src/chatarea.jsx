import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const EmojiPickerComponent = ({ onEmojiSelect, onClose }) => {
  const emojis = [
    '🐦', '⃤💘', '⃟👋', '⃝🌷', '🦅', '♕', '🌹','🔥',
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

const ChatArea = ({ selectedUser, Userprofile, id, token, prev_msg, uid, onBack }) => {
  const [text, setText] = useState("");
  const [indicator, setindicator] = useState("");
  const [messages, setMessages] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ HARDWARE BACK BUTTON – safe version without breaking layout
  useEffect(() => {
    if (!isMobile || !onBack) return;
    const handlePopState = (e) => {
      e.preventDefault();
      onBack(); // go back to sidebar
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, onBack]);

  // Socket connection
  useEffect(() => {
    if (!token) return;
    socketRef.current = io("", { auth: { token } });
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
    socketRef.current?.on("typing_indicator", (notify) => setindicator(notify.text));
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
    setMessages(prev => [...prev, { text, isOwn: true, timestamp: new Date() }]);
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

  const getResponsiveStyles = () => {
    const width = window.innerWidth;
    if (width <= 480) {
      return {
        headerHeight: "55px",
        avatarSize: "35px",
        fontSize: "14px",
        bubblePadding: "8px 12px",
        inputPadding: "10px"
      };
    } else if (width <= 768) {
      return {
        headerHeight: "60px",
        avatarSize: "40px",
        fontSize: "15px",
        bubblePadding: "10px 14px",
        inputPadding: "12px"
      };
    } else {
      return {
        headerHeight: "65px",
        avatarSize: "40px",
        fontSize: "16px",
        bubblePadding: "10px 14px",
        inputPadding: "12px"
      };
    }
  };

  const responsive = getResponsiveStyles();

  const styles = {
    wrapper: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(180deg, #1f2937, #111827)",
      height: "100%",          // ✅ use 100% instead of 100vh (parent must have height)
      width: "100%",
      overflow: "hidden"
    },
    header: {
      height: responsive.headerHeight,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: isMobile ? "8px 12px" : "12px 20px",
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      flexShrink: 0
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "5px"
    },
    backButton: {
      background: "transparent",
      border: "none",
      fontSize: "31px",
      color: "white",
      cursor: "pointer",
      padding: "0",
      marginRight: "10px",
      width: "27px",
      height: "25px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    avatar: {
      width: responsive.avatarSize,
      height: responsive.avatarSize,
      borderRadius: "50%",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },
    userInfo: {
      flex: 1,
      marginLeft: "5px"
    },
    name: {
      fontSize: responsive.fontSize,
      fontWeight: "600",
      color: "#f3f4f6",
      lineHeight: 1.3
    },
    sub: {
      fontSize: "10px",
      color: "#9ca3af",
      lineHeight: 1.2
    },
    chatBox: {
      flex: 1,
      padding: isMobile ? "12px" : "20px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column"
    },
    bubble: {
      padding: responsive.bubblePadding,
      borderRadius: "18px",
      fontSize: responsive.fontSize,
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
      marginTop: "4px",
      marginRight: "8px"
    },
    inputBox: {
      padding: responsive.inputPadding,
      background: "#1f2937",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      position: "relative",
      flexShrink: 0
    },
    inputWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "#374151",
      borderRadius: "28px",
      padding: "6px 12px"
    },
    emojiBtn: {
      background: "transparent",
      border: "none",
      borderRadius: "50%",
      width: "36px",
      height: "36px",
      fontSize: "20px",
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
      fontSize: responsive.fontSize
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

  // ✅ Ensure parent containers have 100% height so that wrapper's height:100% works
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) root.style.height = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }, []);

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
              onError={(e) => e.target.src = "https://via.placeholder.com/40"}
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
                marginBottom: "8px"
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
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={styles.emojiBtn}>
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
        {showEmojiPicker && <EmojiPickerComponent onEmojiSelect={onSelectEmoji} onClose={() => setShowEmojiPicker(false)} />}
      </div>
    </div>
  );
};

export default ChatArea;