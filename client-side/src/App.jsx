import axios from 'axios'
import Auth from './LOGINPAGE'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import ChatArea from './chatarea'

// ✅ PRODUCTION URL - DIRECT
const API_URL = "https://linksy-tn3q.onrender.com";

function App() {
  const [show, setshow] = useState(false)
  const [token, setToken] = useState("")
  const [message, setmessage] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [selectedUser, setSelectedUser] = useState({
    name: "",
    id: ""
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const auth = (data) => { 
    // ✅ FIXED: Production URL
    axios.post(`${API_URL}/register`, {
      name: data.name,
      email: data.email,
      password: data.password,
    }).then(res => {
      setToken(res.data)
      setshow(true)
    }).catch(err => {
      console.log("Registration error:", err)
    })
  }

  const fetchmsg = async (id) => {
    if (!id || !token) return;
    try {
      // ✅ FIXED: Production URL
      const res = await axios.post(
        `${API_URL}/fetchmsg`,
        { receiver: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setmessage(res.data.msg || []);
    } catch (err) {
      console.log("Error fetching messages:", err);
      setmessage([]);
    }
  };

  // ✅ FIXED: ChatArea tab click par khulega
  const handleUserSelect = (userData) => {
    setShowChat(false)
    setSelectedUser({
      name: userData.name,
      id: userData.id,
      profileImage:userData.profileImage
    });
    fetchmsg(userData.id).then(() => {
      setTimeout(() => setShowChat(true), 150)
    })
  };

  const handleBack = () => {
    setShowChat(false)
  };

  // Mobile view: Show either Sidebar or Chat
  if (isMobile) {
    return (
      <>
        {show ? (
          <div style={styles.mobileContainer}>
            {!showChat ? (
              <Sidebar 
                token={token} 
                user_id={handleUserSelect}
                getmsg={fetchmsg}
                isMobile={true}
                onUserSelect={handleUserSelect}
              />
            ) : (
              <div style={styles.chatMobileWrapper}>
                <ChatArea 
                  selectedUser={selectedUser.name} 
                  Userprofile={selectedUser.profileImage} 
                  id={selectedUser.id} 
                  token={token} 
                  prev_msg={message} 
                  uid={selectedUser.id}
                  onBack={handleBack}
                />
              </div>
            )}
          </div>
        ) : (
          <Auth registration={auth} show={setshow} setToken={setToken} />
        )}
      </>
    )
  }

  // Desktop view: Show both side by side
  return (
    <>
      {show ? (
        <div style={styles.desktopContainer}>
          <Sidebar 
            token={token} 
            user_id={handleUserSelect}
            getmsg={fetchmsg}
            isMobile={false}
            onUserSelect={handleUserSelect}
          />
          {!showChat ? (
            <div style={styles.welcomeContainer}>
              <div style={styles.welcomeAnimation}>
                <div style={styles.welcomeIcon}>💬</div>
                <h2 style={{ color: "white" }}>Welcome to ChatApp</h2>
                <p style={{ color: "rgba(255,255,255,0.8)" }}>Select a friend to start chatting</p>
                <div style={styles.welcomeBubbles}>
                  <div style={styles.bubble1}></div>
                  <div style={styles.bubble2}></div>
                  <div style={styles.bubble3}></div>
                </div>
              </div>
            </div>
          ) : (
            <ChatArea 
              selectedUser={selectedUser.name} 
              id={selectedUser.id} 
              token={token} 
              prev_msg={message} 
              uid={selectedUser.id}
            />
          )}
        </div>
      ) : (
        <Auth registration={auth} show={setshow} setToken={setToken} />
      )}
    </>
  )
}

const styles = {
  mobileContainer: {
    width: "100%",
    height: "100vh",
    overflow: "hidden",
    position: "relative",
    background: "#111827"
  },
  chatMobileWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    animation: "slideInRight 0.3s ease"
  },
  desktopContainer: {
    display: "flex",
    height: "100vh",
    overflow: "hidden"
  },
  welcomeContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    position: "relative",
    overflow: "hidden"
  },
  welcomeAnimation: {
    textAlign: "center",
    animation: "fadeInUp 0.5s ease"
  },
  welcomeIcon: {
    fontSize: "80px",
    marginBottom: "20px",
    animation: "bounce 2s infinite"
  },
  welcomeBubbles: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginTop: "30px"
  },
  bubble1: {
    width: "10px",
    height: "10px",
    background: "white",
    borderRadius: "50%",
    animation: "bubbleAnim 1.5s ease-in-out infinite",
    animationDelay: "0s"
  },
  bubble2: {
    width: "10px",
    height: "10px",
    background: "white",
    borderRadius: "50%",
    animation: "bubbleAnim 1.5s ease-in-out infinite",
    animationDelay: "0.3s"
  },
  bubble3: {
    width: "10px",
    height: "10px",
    background: "white",
    borderRadius: "50%",
    animation: "bubbleAnim 1.5s ease-in-out infinite",
    animationDelay: "0.6s"
  }
}

// Add global animations
const styleSheet = document.createElement("style")
styleSheet.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
  
  @keyframes bubbleAnim {
    0%, 100% { transform: translateY(0); opacity: 0.3; }
    50% { transform: translateY(-15px); opacity: 1; }
  }
  
  @media (max-width: 768px) {
    body {
      overflow: hidden;
      margin: 0;
      padding: 0;
    }
  }
`
document.head.appendChild(styleSheet)

export default App