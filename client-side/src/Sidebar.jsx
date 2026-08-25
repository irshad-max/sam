import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const Sidebar = ({
  token,
  user_id,
  getmsg,
  onUserSelect,
  isMobile = false,
  currentUserId,
}) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [friends, setFriends] = useState([]);
  const [activeTab, setActiveTab] = useState("chats");
  const [animateItem, setAnimateItem] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const socketRef = useRef(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [dragEnabled, setDragEnabled] = useState(true);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const isMobileDevice = isMobile || window.innerWidth <= 768;

  const handleTouchStart = (e) => {
    if (!isMobileDevice || !dragEnabled) return;
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    e.preventDefault();
  };
  const handleTouchMove = (e) => {
    if (!isDragging.current || !dragEnabled) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    let newOffset = dragOffset + delta;
    newOffset = Math.min(Math.max(newOffset, -100), 300);
    setDragOffset(newOffset);
    dragStartY.current = e.touches[0].clientY;
    e.preventDefault();
  };
  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const getAvatarUrl = (name) =>
    `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEHXDwhB6qPo7H6iSoa5TXCjhQrUeN43KDu3XwZX5KPg&s=${encodeURIComponent(name || "User")}`;
  const showToastMessage = (msg, isError = false) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  useEffect(() => {
    if (!token) return;
    fetchFriends();
    fetchUnreadCounts();
  }, [token]);
  const fetchFriends = async () => {
    try {
      const res = await axios.get("/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(res.data);
    } catch (err) {
      showToastMessage("❌ Failed to fetch friends", true);
    }
  };
  const fetchUnreadCounts = async () => {
    try {
      const res = await axios.get("/unread-counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCounts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    const socket = io("", { auth: { token } });
    socketRef.current = socket;
    socket.on("new_message_notification", ({ from, count }) => {
      setUnreadCounts((prev) => ({ ...prev, [from]: count }));
      showToastMessage(
        `📩 New message from ${friends.find((f) => f._id === from)?.name || "someone"}`,
      );
    });
    socket.on("messages_seen", ({ by }) => {
      setUnreadCounts((prev) => ({ ...prev, [by]: 0 }));
    });
    socket.on("receive_message", (msg) => {
      setUnreadCounts((prev) => ({
        ...prev,
        [msg.sender]: (prev[msg.sender] || 0) + 1,
      }));
    });
    return () => socket?.disconnect();
  }, [token, friends]);

  const fetchUsers = async () => {
    const res = await axios.post("/users");
    setUsers(res.data);
  };

  const fetchRequests = async () => {
    const res = await axios.post(
      "/request-show",
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setRequests(res.data);
  };
  const sendRequest = async (receiverId) => {
    try {
      await axios.post(
        "/request",
        { receiver: receiverId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToastMessage("✅ Friend request sent!");
      setActiveTab("chats");
      setSearch("");
    } catch (err) {
      showToastMessage("❌ Failed to send request", true);
    }
  };
  const confirmRequest = async (requestId) => {
    try {
      await axios.post(
        `/accept-request/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      await fetchFriends();
      await fetchUnreadCounts();
      showToastMessage("✅ Friend request accepted!");
      setShowRequests(false);
    } catch (err) {
      showToastMessage("❌ Failed to accept request", true);
    }
  };
  const handleSelectUser = async (id, name, profileImage) => {
    setAnimateItem(id);
    setTimeout(() => setAnimateItem(null), 300);
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
    if (onUserSelect) onUserSelect({ id, name, profileImage });
    else user_id({ id, name, profileImage });
    if (socketRef.current) socketRef.current.emit("joinChat", id.toString());
    await getmsg(id);
  };
  const clearSearch = () => {
    setSearch("");
    setUsers([]);
  };
  const filteredUsers = users.filter((u) => {
    if (currentUserId && u._id === currentUserId) return false;
    if (friends.some((f) => f._id === u._id)) return false;
    return u.name.toLowerCase().includes(search.toLowerCase());
  });

  const colorStyles = {
    primary: "#4f46e5",
    primaryDark: "#4338ca",
    secondary: "#1f2937",
    background: "#111827",
    surface: "#1f2937",
    text: "#f3f4f6",
    textSecondary: "#9ca3af",
    accent: "#3b82f6",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
  };
  const dynamicStyles = {
    wrapper: {
      position: isMobileDevice ? "fixed" : "relative",
      top: isMobileDevice ? `${dragOffset}px` : "auto",
      left: 0,
      right: 0,
      bottom: isMobileDevice ? "auto" : 0,
      height: isMobileDevice ? windowHeight : "100%",
      display: "flex",
      flexDirection: "column",
      background: `linear-gradient(180deg, ${colorStyles.secondary}, ${colorStyles.background})`,
      color: colorStyles.text,
      overflow: "hidden",
      zIndex: 1000,
      transition: "top 0.2s ease",
      borderRadius: isMobileDevice ? "20px 20px 0 0" : "0",
    },
    dragHandle: {
      width: "40px",
      height: "5px",
      background: "#6b7280",
      borderRadius: "10px",
      margin: "10px auto",
      cursor: "grab",
      touchAction: "none",
      display: isMobileDevice ? "block" : "none",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 20px",
      background: colorStyles.surface,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
    },
    logo: {
      fontSize: "18px",
      margin: 0,
      background: `linear-gradient(135deg, ${colorStyles.primary}, #764ba2)`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    buttonGroup: { display: "flex", gap: "8px" },
    friendBtn: {
      padding: "8px 12px",
      background: colorStyles.accent,
      border: "none",
      borderRadius: "20px",
      color: "#fff",
      cursor: "pointer",
      fontSize: "12px",
    },
    requestBtn: {
      padding: "8px 12px",
      background: "transparent",
      border: `1px solid ${colorStyles.accent}`,
      borderRadius: "20px",
      color: colorStyles.accent,
      cursor: "pointer",
      fontSize: "12px",
    },
    stopDragBtn: {
      padding: "4px 12px",
      background: "#ef4444",
      border: "none",
      borderRadius: "20px",
      color: "#fff",
      fontSize: "12px",
      cursor: "pointer",
    },
    searchWrapper: { position: "relative", padding: "12px 16px" },
    searchInput: {
      width: "80%",
      padding: "10px 40px",
      borderRadius: "25px",
      border: "none",
      background: "#374151",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
    },
    content: { flex: 1, overflowY: "auto", padding: "12px" },
    sectionTitle: {
      fontSize: "12px",
      fontWeight: "600",
      color: colorStyles.textSecondary,
      marginBottom: "10px",
      marginTop: "5px",
    },
    friendItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px",
      background: colorStyles.surface,
      borderRadius: "12px",
      marginBottom: "8px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      border: `1px solid rgba(255,255,255,0.05)`,
    },
    friendAvatar: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${colorStyles.primary}, #764ba2)`,
    },
    friendAvatarImage: { width: "100%", height: "100%", objectFit: "cover" },
    friendName: {
      fontSize: "14px",
      fontWeight: "500",
      color: colorStyles.text,
    },
    friendPreview: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
    unreadBadge: {
      background: colorStyles.error,
      color: "white",
      borderRadius: "12px",
      padding: "2px 8px",
      fontSize: "11px",
      fontWeight: "bold",
      marginLeft: "8px",
    },
  };

  const Toast = () =>
    showToast && (
      <div
        style={{
          position: "fixed",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#333",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: "8px",
          zIndex: 2000,
        }}
      >
        {toastMsg}
      </div>
    );
  const BottomNav = () => (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        background: colorStyles.surface,
        borderTop: "1px solid rgba(255,255,255,0.1)",
        padding: "8px 16px",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 100,
      }}
    >
      {" "}
      <button
        onClick={() => {
          setActiveTab("chats");
          setShowRequests(false);
        }}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "none",
          border: "none",
          color: activeTab === "chats" ? colorStyles.accent : "#9ca3af",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "22px" }}>💬</span>
        <span>Chats</span>
        {totalUnread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0px",
              right: "25%",
              background: colorStyles.error,
              color: "white",
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "10px",
            }}
          >
            {totalUnread}
          </span>
        )}
      </button>{" "}
      <button
        onClick={() => {
          setActiveTab("requests");
          fetchRequests();
        }}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "none",
          border: "none",
          color: activeTab === "requests" ? colorStyles.accent : "#9ca3af",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "22px" }}>👥</span>
        <span>Requests</span>
        {requests.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: "0px",
              right: "25%",
              background: colorStyles.error,
              color: "white",
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "10px",
            }}
          >
            {requests.length}
          </span>
        )}
      </button>{" "}
      <button
        onClick={() => setActiveTab("search")}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "none",
          border: "none",
          color: activeTab === "search" ? colorStyles.accent : "#9ca3af",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "22px" }}>🔍</span>
        <span>Search</span>
      </button>{" "}
    </div>
  );

  return (
    <div
      style={dynamicStyles.wrapper}
      onTouchStart={isMobileDevice ? handleTouchStart : undefined}
      onTouchMove={isMobileDevice ? handleTouchMove : undefined}
      onTouchEnd={isMobileDevice ? handleTouchEnd : undefined}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}.friend-item:hover{background:#374151 !important;transform:translateX(5px) !important}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${colorStyles.secondary}}::-webkit-scrollbar-thumb{background:${colorStyles.primary};border-radius:4px}`}</style>
      {isMobileDevice && <div style={dynamicStyles.dragHandle} />}
      <div style={dynamicStyles.header}>
        <h2 style={dynamicStyles.logo}>💬 ChatApp</h2>
        <div style={dynamicStyles.buttonGroup}>
          <button onClick={fetchFriends} style={dynamicStyles.friendBtn}>
            👥 Refresh Friends ({friends.length})
          </button>
          <button
            onClick={() => {
              setShowRequests(!showRequests);
              fetchRequests();
            }}
            style={dynamicStyles.requestBtn}
          >
            📋 Requests
          </button>
          {isMobileDevice && (
            <button
              onClick={() => setDragEnabled(false)}
              style={dynamicStyles.stopDragBtn}
              disabled={!dragEnabled}
            >
              🔒 Stop Drag
            </button>
          )}
        </div>
      </div>
      <div style={dynamicStyles.searchWrapper}>
        <span
          style={{
            position: "absolute",
            left: "28px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "14px",
            color: "#9ca3af",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          placeholder="Search user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={fetchUsers}
          style={dynamicStyles.searchInput}
        />
        {search && (
          <span
            onClick={clearSearch}
            style={{
              position: "absolute",
              right: "28px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            ✖
          </span>
        )}
      </div>
      <div style={dynamicStyles.content}>
        {showRequests && (
          <div style={{ marginBottom: "20px" }}>
            <h4 style={dynamicStyles.sectionTitle}>
              Friend Requests ({requests.length})
            </h4>
            {requests.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#6b7280",
                }}
              >
                👋 No pending requests
              </div>
            )}
            {requests.map((r) => (
              <div
                key={r._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  background: colorStyles.surface,
                  borderRadius: "12px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <img
                    src={r.sender.profileImage || getAvatarUrl(r.sender.name)}
                    alt="avatar"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                  <span>{r.sender.name}</span>
                </div>
                <button
                  onClick={() => confirmRequest(r._id)}
                  style={{
                    padding: "6px 16px",
                    background: colorStyles.success,
                    border: "none",
                    borderRadius: "20px",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}
        <h4 style={dynamicStyles.sectionTitle}>Chats ({friends.length})</h4>
        {friends.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}
          >
            <span
              style={{
                fontSize: "50px",
                display: "block",
                marginBottom: "10px",
              }}
            >
              💬
            </span>
            <p>No friends yet</p>
            <button
              onClick={fetchFriends}
              style={{
                marginTop: "15px",
                padding: "8px 20px",
                background: colorStyles.accent,
                border: "none",
                borderRadius: "20px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Refresh Friends
            </button>
          </div>
        ) : (
          friends.map((f, index) => {
            const unread = unreadCounts[f._id] || 0;
            return (
              <div
                key={f._id}
                className="friend-item"
                style={{
                  ...dynamicStyles.friendItem,
                  background:
                    animateItem === f._id
                      ? colorStyles.primary
                      : colorStyles.surface,
                  animation: `slideInLeft ${0.3 + index * 0.05}s ease`,
                }}
                onClick={() => handleSelectUser(f._id, f.name, f.profileImage)}
              >
                <div
                  className="friend-avatar"
                  style={dynamicStyles.friendAvatar}
                >
                  <img
                    src={f.profileImage || getAvatarUrl(f.name)}
                    alt="avatar"
                    style={dynamicStyles.friendAvatarImage}
                  />
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={dynamicStyles.friendName}>{f.name}</div>
                    <div style={dynamicStyles.friendPreview}>
                      {unread > 0
                        ? `${unread} new message${unread > 1 ? "s" : ""}`
                        : "Tap to chat"}
                    </div>
                  </div>
                  {unread > 0 && (
                    <span style={dynamicStyles.unreadBadge}>{unread}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        {search && (
          <>
            {" "}
            <h4 style={dynamicStyles.sectionTitle}>Search Results</h4>{" "}
            {filteredUsers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#6b7280",
                }}
              >
                😕 No users found
              </div>
            ) : (
              filteredUsers.map((u, index) => (
                <div
                  key={u._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px",
                    background: colorStyles.surface,
                    borderRadius: "12px",
                    marginBottom: "8px",
                    animation: `slideInLeft ${0.3 + index * 0.05}s ease`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <img
                      src={u.profileImage || getAvatarUrl(u.name)}
                      alt="avatar"
                      style={{
                        width: "35px",
                        height: "35px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                    <span>{u.name}</span>
                  </div>
                  <button
                    onClick={() => sendRequest(u._id)}
                    style={{
                      padding: "6px 16px",
                      background: colorStyles.accent,
                      border: "none",
                      borderRadius: "20px",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>
              ))
            )}{" "}
          </>
        )}
      </div>
      {isMobileDevice && <BottomNav />}
      <Toast />
    </div>
  );
};
export default Sidebar;
