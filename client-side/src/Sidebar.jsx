import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const Sidebar = ({ token, user_id, getmsg, onUserSelect, isMobile = false }) => {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [senderuid, setsenderuid] = useState("");
    const [requests, setRequests] = useState([]);
    const [showRequests, setShowRequests] = useState(false);
    const [friends, setFriends] = useState([]);
    const [count_notify, setcount_notify] = useState(0);
    const [new_msg, setnew_msg] = useState("");
    const [activeTab, setActiveTab] = useState("chats");
    const [animateItem, setAnimateItem] = useState(null);
    const [showAnimation, setShowAnimation] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [showToast, setShowToast] = useState(false);
    const socketRef = useRef(null);

    // Default avatar generator
    const getAvatarUrl = (name) => {
        return `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEHXDwhB6qPo7H6iSoa5TXCjhQrUeN43KDu3XwZX5KPg&s=${encodeURIComponent(name || 'User')}`;
    };

    const showToastMessage = (msg, isError = false) => {
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    useEffect(() => {
        setShowAnimation(true);
        const timer = setTimeout(() => setShowAnimation(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!token) return;
        const socket = io("https://livechat-zfsq.onrender.com", {
            auth: { token }
        });
        socketRef.current = socket;

        socket.on("notification", (data) => {
            setsenderuid(data.sender.toString());
            setcount_notify(prev => prev + 1);
            setnew_msg("✉️ New");
            showToastMessage("📩 New message received!");
        });

        return () => {
            if (socket) socket.disconnect();
        };
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchFriends();
        }
    }, [token]);

    const fetchUsers = async () => {
        const res = await axios.post("https://livechat-zfsq.onrender.com/users");
        setUsers(res.data);
    };

    const fetchRequests = async () => {
        const res = await axios.post(
            "https://livechat-zfsq.onrender.com/request-show",
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setRequests(res.data);
    };

    const fetchFriends = async () => {
        try {
            const res = await axios.get("https://livechat-zfsq.onrender.com/friends", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(res.data);
            showToastMessage(`✅ Friends list updated (${res.data.length} friends)`);
        } catch (err) {
            console.log("Fetch friends error:", err);
            showToastMessage("❌ Failed to fetch friends", true);
        }
    };

    const sendRequest = async (receiverId) => {
        try {
            await axios.post(
                "https://livechat-zfsq.onrender.com/request",
                { receiver: receiverId },
                { headers: { Authorization: `Bearer ${token}` } }
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
                `https://livechat-zfsq.onrender.com/accept-request/${requestId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRequests(prev => prev.filter(r => r._id !== requestId));
            await fetchFriends();
            showToastMessage("✅ Friend request accepted!");
            setShowRequests(false);
        } catch (err) {
            showToastMessage("❌ Failed to accept request", true);
        }
    };

    const handleSelectUser = async (id, name,profileImage) => {
        setAnimateItem(id);
        setTimeout(() => setAnimateItem(null), 300);

        if (senderuid === String(id)) {
            setnew_msg("");
            setcount_notify(prev => Math.max(0, prev - 1));
        }

        if (onUserSelect) {
            onUserSelect({ id, name, profileImage });
        } else {
            user_id({ id, name, profileImage });
        }

        if (socketRef.current) {
            socketRef.current.emit("joinChat", id.toString());
        }

        await getmsg(id);
    };

    const clearSearch = () => {
        setSearch("");
        setUsers([]);
    };

    const filteredUsers = users.filter(
        u => u.name.toLowerCase().includes(search.toLowerCase())
    );

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
        warning: "#f59e0b"
    };

    const getStyles = () => {
        const isMobileDevice = isMobile || window.innerWidth <= 768;

        return {
            sidebar: {
                width: isMobileDevice ? "100%" : "320px",
                height: "100vh",
                background: `linear-gradient(180deg, ${colorStyles.secondary}, ${colorStyles.background})`,
                color: colorStyles.text,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                borderRight: isMobileDevice ? "none" : `1px solid rgba(255,255,255,0.08)`,
                animation: showAnimation ? "fadeIn 0.5s ease" : "none"
            },
            header: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                background: colorStyles.surface,
                borderBottom: `1px solid rgba(255,255,255,0.1)`
            },
            logo: {
                fontSize: "18px",
                margin: 0,
                background: `linear-gradient(135deg, ${colorStyles.primary}, #764ba2)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            },
            buttonGroup: {
                display: "flex",
                gap: "8px"
            },
            friendBtn: {
                padding: "8px 12px",
                background: colorStyles.accent,
                border: "none",
                borderRadius: "20px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500",
                transition: "all 0.3s ease"
            },
            requestBtn: {
                padding: "8px 12px",
                background: "transparent",
                border: `1px solid ${colorStyles.accent}`,
                borderRadius: "20px",
                color: colorStyles.accent,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500",
                transition: "all 0.3s ease"
            },
            searchWrapper: {
                position: "relative",
                padding: "12px 16px"
            },
            searchInput: {
                width: "80%",
                padding: "10px 40px",
                borderRadius: "25px",
                border: "none",
                background: "#374151",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                transition: "all 0.3s ease"
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
                border: `1px solid rgba(255,255,255,0.05)`
            },
            friendAvatar: {
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${colorStyles.primary}, #764ba2)`
            },
            friendAvatarImage: {
                width: "100%",
                height: "100%",
                objectFit: "cover"
            },
            friendName: {
                fontSize: "14px",
                fontWeight: "500",
                color: colorStyles.text
            },
            friendPreview: {
                fontSize: "11px",
                color: "#9ca3af",
                marginTop: "2px"
            },
            content: {
                flex: 1,
                overflowY: "auto",
                padding: "12px",
                paddingBottom: isMobileDevice ? "70px" : "0"
            },
            sectionTitle: {
                fontSize: "12px",
                fontWeight: "600",
                color: colorStyles.textSecondary,
                marginBottom: "10px",
                marginTop: "5px"
            }
        };
    };

    const dynamicStyles = getStyles();

    const Toast = () => (
        showToast && (
            <div style={{
                position: "fixed",
                bottom: "80px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#333",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                zIndex: 2000,
                animation: "fadeInUp 0.3s ease"
            }}>
                {toastMsg}
            </div>
        )
    );

    const BottomNav = () => (
        <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            background: colorStyles.surface,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            padding: "8px 16px",
            paddingBottom: "env(safe-area-inset-bottom)",
            zIndex: 100
        }}>
            <button onClick={() => { setActiveTab("chats"); setShowRequests(false); }} style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "none",
                border: "none",
                color: activeTab === "chats" ? colorStyles.accent : "#9ca3af",
                cursor: "pointer",
                padding: "8px",
                fontSize: "12px"
            }}>
                <span style={{ fontSize: "22px" }}>💬</span>
                <span>Chats</span>
                {count_notify > 0 && <span style={{
                    position: "absolute",
                    top: "0px",
                    right: "25%",
                    background: colorStyles.error,
                    color: "white",
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "10px"
                }}>{count_notify}</span>}
            </button>
            <button onClick={() => { setActiveTab("requests"); fetchRequests(); }} style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "none",
                border: "none",
                color: activeTab === "requests" ? colorStyles.accent : "#9ca3af",
                cursor: "pointer",
                padding: "8px",
                fontSize: "12px"
            }}>
                <span style={{ fontSize: "22px" }}>👥</span>
                <span>Requests</span>
                {requests.length > 0 && <span style={{
                    position: "absolute",
                    top: "0px",
                    right: "25%",
                    background: colorStyles.error,
                    color: "white",
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "10px"
                }}>{requests.length}</span>}
            </button>
            <button onClick={() => setActiveTab("search")} style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "none",
                border: "none",
                color: activeTab === "search" ? colorStyles.accent : "#9ca3af",
                cursor: "pointer",
                padding: "8px",
                fontSize: "12px"
            }}>
                <span style={{ fontSize: "22px" }}>🔍</span>
                <span>Search</span>
            </button>
        </div>
    );

    return (
        <div style={dynamicStyles.sidebar}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes bounce { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                .friend-item:hover { background: #374151 !important; transform: translateX(5px) !important; }
                .friend-item:hover .friend-avatar { transform: scale(1.05); }
                input:focus { border: 1px solid ${colorStyles.primary} !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.2) !important; }
                button:hover { transform: scale(1.02) !important; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: ${colorStyles.secondary}; }
                ::-webkit-scrollbar-thumb { background: ${colorStyles.primary}; border-radius: 4px; }
            `}</style>

            <div style={dynamicStyles.header}>
                <h2 style={dynamicStyles.logo}>💬 ChatApp</h2>
                <div style={dynamicStyles.buttonGroup}>
                    <button onClick={fetchFriends} style={dynamicStyles.friendBtn}>
                        👥 Refresh Friends ({friends.length})
                    </button>
                    <button onClick={() => { setShowRequests(!showRequests); fetchRequests(); }} style={dynamicStyles.requestBtn}>
                        📋 Requests
                    </button>
                </div>
            </div>

            <div style={dynamicStyles.searchWrapper}>
                <span style={{ position: "absolute", left: "28px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#9ca3af" }}>🔍</span>
                <input type="text" placeholder="Search user..." value={search}
                    onChange={(e) => setSearch(e.target.value)} onFocus={fetchUsers}
                    style={dynamicStyles.searchInput} />
                {search && <span onClick={clearSearch} style={{ position: "absolute", right: "28px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9ca3af" }}>✖</span>}
            </div>

            <div style={dynamicStyles.content}>
                {showRequests && (
                    <div style={{ marginBottom: "20px" }}>
                        <h4 style={dynamicStyles.sectionTitle}>Friend Requests ({requests.length})</h4>
                        {requests.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                                <span>👋 No pending requests</span>
                            </div>
                        ) : (
                            requests.map((r, index) => (
                                <div key={r._id} style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "12px", background: colorStyles.surface, borderRadius: "12px",
                                    marginBottom: "8px", animation: `slideInLeft ${0.3 + index * 0.05}s ease`
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <img
                                            src={r.sender.profileImage}
                                            alt="avatar"
                                            style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                                        />
                                        <span>{r.sender.name}</span>
                                    </div>
                                    <button onClick={() => confirmRequest(r._id)} style={{
                                        padding: "6px 16px", background: colorStyles.success,
                                        border: "none", borderRadius: "20px", color: "#fff", cursor: "pointer"
                                    }}>Accept</button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <h4 style={dynamicStyles.sectionTitle}>Chats ({friends.length})</h4>
                {friends.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                        <span style={{ fontSize: "50px", display: "block", marginBottom: "10px" }}>💬</span>
                        <p>No friends yet</p>
                        <button onClick={fetchFriends} style={{
                            marginTop: "15px", padding: "8px 20px", background: colorStyles.accent,
                            border: "none", borderRadius: "20px", color: "#fff", cursor: "pointer"
                        }}>Refresh Friends</button>
                    </div>
                ) : (
                    friends.map((f, index) => (
                        <div key={f._id} className="friend-item" style={{
                            ...dynamicStyles.friendItem,
                            animation: `slideInLeft ${0.3 + index * 0.05}s ease`,
                            background: animateItem === f._id ? colorStyles.primary : colorStyles.surface
                        }} onClick={() => handleSelectUser(f._id, f.name, f.profileImage)}>
                            <div className="friend-avatar" style={dynamicStyles.friendAvatar}>
                                <img
                                    src={f.profileImage}
                                    alt="avatar"
                                    style={dynamicStyles.friendAvatarImage}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={dynamicStyles.friendName}>{f.name}</div>
                                <div style={dynamicStyles.friendPreview}>
                                    {senderuid === String(f._id) ? new_msg || "New message" : "Tap to chat"}
                                </div>
                            </div>
                            {senderuid === String(f._id) && new_msg && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorStyles.accent, animation: "pulse 1s infinite" }}></div>}
                        </div>
                    ))
                )}

                {search && (
                    <>
                        <h4 style={dynamicStyles.sectionTitle}>Search Results</h4>
                        {filteredUsers.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                                <span>😕 No users found</span>
                            </div>
                        ) : (
                            filteredUsers.map((u, index) => (
                                <div key={u._id} style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "10px", background: colorStyles.surface, borderRadius: "12px",
                                    marginBottom: "8px", animation: `slideInLeft ${0.3 + index * 0.05}s ease`
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <img
                                            src={u.profileImage}
                                            alt="avatar"
                                            style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover" }}
                                        />
                                        <span>{u.name}</span>
                                    </div>
                                    <button onClick={() => sendRequest(u._id)} style={{
                                        padding: "6px 16px", background: colorStyles.accent,
                                        border: "none", borderRadius: "20px", color: "#fff", cursor: "pointer"
                                    }}>Add</button>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            {isMobile && <BottomNav />}
            <Toast />
        </div>
    );
};

export default Sidebar;