import { useState, useEffect } from 'react'
import axios from 'axios'
import RoboticPopup from './RoboticPopup'

function Auth({ show, setToken }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showOTPPopup, setShowOTPPopup] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [tempEmail, setTempEmail] = useState('')
  const [tempName, setTempName] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [tempImage, setTempImage] = useState(null)
  const [popup, setPopup] = useState({ show: false, message: '', type: '' })

  const showRoboticPopup = (message, type = 'info') => {
    setPopup({ show: true, message, type })
    setTimeout(() => setPopup({ show: false, message: '', type: '' }), 3000)
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 7 * 1024 * 1024) {
        showRoboticPopup("⚠️ IMAGE SIZE MUST BE LESS THAN 7MB ⚠️", "error")
        return
      }
      if (!file.type.startsWith('image/')) {
        showRoboticPopup("⚠️ ONLY IMAGE FILES ARE ALLOWED ⚠️", "error")
        return
      }
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
    })
  }

  const handleRegister = async (name, email, password, image) => {
    try {
      let imageBase64 = null
      if (image) imageBase64 = await imageToBase64(image)
      const res = await axios.post('/register', {
        name, email, password, profileImage: imageBase64
      })
      if (res.data.otp) {
        setTempEmail(email)
        setTempName(name)
        setTempPassword(password)
        setTempImage(imageBase64)
        setOtpCode(res.data.otp)
        setShowOTPPopup(true)
        showRoboticPopup(`📧 OTP generated: ${res.data.otp}`, "info")
      } else {
        showRoboticPopup("❌ OTP generation failed", "error")
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "❌ REGISTRATION PROTOCOL FAILED ❌"
      showRoboticPopup(errorMessage, "error")
    }
  }

  const handleVerifyOTP = async () => {
    try {
      const res = await axios.post('/verify-otp', { email: tempEmail, otp: otpCode })
      if (res.data.token) {
        localStorage.setItem("token", res.data.token)
        setToken(res.data.token)
        setShowOTPPopup(false)
        show(true)
        showRoboticPopup("✅ REGISTRATION SUCCESSFUL! ✅", "success")
        setName('')
        setEmail('')
        setPassword('')
        setProfileImage(null)
        setImagePreview(null)
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "❌ INVALID OTP CODE ❌"
      showRoboticPopup(errorMessage, "error")
    }
  }

  const handleResendOTP = async () => {
    try {
      const res = await axios.post('/resend-otp', { email: tempEmail })
      if (res.data.otp) {
        setOtpCode(res.data.otp)
        showRoboticPopup(`🔄 NEW OTP: ${res.data.otp}`, "info")
      }
    } catch (err) {
      showRoboticPopup("⚠️ OTP RESEND FAILED ⚠️", "error")
    }
  }

  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post('/login', { email, password })
      if (res.data.token) {
        localStorage.setItem("token", res.data.token)
        setToken(res.data.token)
        show(true)
        showRoboticPopup("🔓 SYSTEM ACCESS GRANTED 🔓", "success")
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "❌ LOGIN PROTOCOL FAILED ❌"
      showRoboticPopup(errorMessage, "error")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLogin) {
      handleLogin(email, password)
    } else {
      if (!name || !email || !password) {
        showRoboticPopup("⚠️ ALL FIELDS REQUIRED ⚠️", "error")
        return
      }
      handleRegister(name, email, password, profileImage)
    }
  }

  const responsiveStyles = {
    cardPadding: window.innerWidth <= 480 ? "30px 20px" : window.innerWidth <= 768 ? "35px 25px" : "40px",
    titleSize: window.innerWidth <= 480 ? "24px" : window.innerWidth <= 768 ? "26px" : "28px",
    inputPadding: window.innerWidth <= 480 ? "10px 10px 10px 38px" : window.innerWidth <= 768 ? "12px 12px 12px 40px" : "12px 12px 12px 42px",
    buttonPadding: window.innerWidth <= 480 ? "12px" : window.innerWidth <= 768 ? "14px" : "14px",
    iconSize: window.innerWidth <= 480 ? "16px" : "18px"
  }

  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
      padding: isMobile ? "20px" : "0",
      position: "relative",
      overflow: "auto"
    },
    card: {
      background: "rgba(10, 10, 10, 0.95)",
      padding: responsiveStyles.cardPadding,
      borderRadius: isMobile ? "24px" : "20px",
      boxShadow: "0 0 30px rgba(0, 255, 0, 0.3)",
      border: "1px solid #00ff00",
      width: isMobile ? "100%" : "380px",
      maxWidth: "450px",
      animation: "slideUp 0.5s ease",
      margin: isMobile ? "auto" : "0"
    },
    title: {
      textAlign: "center",
      fontSize: responsiveStyles.titleSize,
      fontWeight: "bold",
      color: "#00ff00",
      marginBottom: "8px",
      fontFamily: "'Courier New', monospace",
      textTransform: "uppercase",
      letterSpacing: "2px"
    },
    subtitle: {
      textAlign: "center",
      fontSize: isMobile ? "13px" : "14px",
      color: "#00aa00",
      marginBottom: isMobile ? "25px" : "30px",
      fontFamily: "'Courier New', monospace"
    },
    inputGroup: {
      marginBottom: isMobile ? "16px" : "20px"
    },
    label: {
      display: "block",
      marginBottom: "6px",
      fontSize: isMobile ? "12px" : "13px",
      fontWeight: "600",
      color: "#00ff00",
      fontFamily: "'Courier New', monospace"
    },
    inputWrapper: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    },
    inputIcon: {
      position: "absolute",
      left: "12px",
      fontSize: responsiveStyles.iconSize,
      color: "#00ff00"
    },
    input: {
      width: "100%",
      padding: responsiveStyles.inputPadding,
      border: "1px solid #00ff00",
      borderRadius: "12px",
      fontSize: isMobile ? "14px" : "14px",
      transition: "all 0.3s ease",
      outline: "none",
      fontFamily: "'Courier New', monospace",
      background: "rgba(0, 0, 0, 0.8)",
      color: "#00ff00"
    },
    imageUploadContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginBottom: "20px"
    },
    imagePreview: {
      width: "100px",
      height: "100px",
      borderRadius: "50%",
      border: "2px solid #00ff00",
      marginBottom: "10px",
      objectFit: "cover",
      background: "#1a1a2e"
    },
    fileInput: {
      display: "none"
    },
    fileInputLabel: {
      background: "transparent",
      border: "1px solid #00ff00",
      color: "#00ff00",
      padding: "8px 16px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "12px",
      fontFamily: "'Courier New', monospace",
      transition: "all 0.3s ease"
    },
    button: {
      width: "100%",
      padding: responsiveStyles.buttonPadding,
      background: "transparent",
      color: "#00ff00",
      border: "2px solid #00ff00",
      borderRadius: "12px",
      fontSize: isMobile ? "15px" : "16px",
      fontWeight: "bold",
      cursor: "pointer",
      marginTop: "10px",
      transition: "all 0.3s ease",
      fontFamily: "'Courier New', monospace",
      textTransform: "uppercase"
    },
    footer: {
      marginTop: "25px",
      textAlign: "center",
      display: "flex",
      justifyContent: "center",
      gap: "8px",
      flexWrap: "wrap"
    },
    toggleText: {
      fontSize: isMobile ? "13px" : "14px",
      color: "#00aa00",
      fontFamily: "'Courier New', monospace"
    },
    toggleLink: {
      fontSize: isMobile ? "13px" : "14px",
      color: "#00ff00",
      cursor: "pointer",
      fontWeight: "bold",
      transition: "color 0.3s ease",
      fontFamily: "'Courier New', monospace"
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)"
    },
    modalContent: {
      background: "rgba(10, 10, 10, 0.98)",
      padding: "30px",
      borderRadius: "20px",
      border: "2px solid #00ff00",
      width: isMobile ? "90%" : "350px",
      boxShadow: "0 0 40px rgba(0, 255, 0, 0.4)",
      textAlign: "center"
    }
  }

  return (
    <>
      {popup.show && <RoboticPopup message={popup.message} type={popup.type} onClose={() => setPopup({ show: false, message: '', type: '' })} />}

      {showOTPPopup && (
        <div style={styles.modalOverlay} onClick={() => setShowOTPPopup(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "#00ff00", marginBottom: "10px", fontFamily: "'Courier New', monospace" }}>[ OTP VERIFICATION ]</h2>
            <p style={{ color: "#00aa00", marginBottom: "20px", fontSize: "14px" }}>
              Enter OTP sent to <strong>{tempEmail}</strong>
            </p>
            <input
              type="text"
              placeholder="ENTER 6-DIGIT CODE"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              maxLength="6"
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(0,0,0,0.8)",
                border: "1px solid #00ff00",
                borderRadius: "12px",
                color: "#00ff00",
                fontSize: "18px",
                textAlign: "center",
                letterSpacing: "5px",
                marginBottom: "20px",
                fontFamily: "'Courier New', monospace"
              }}
              autoFocus
            />
            <button onClick={handleVerifyOTP} style={styles.button}>[ VERIFY ]</button>
            <button onClick={handleResendOTP} style={{ ...styles.button, marginTop: "10px" }}>[ RESEND OTP ]</button>
            <button onClick={() => setShowOTPPopup(false)} style={{ ...styles.button, marginTop: "10px", borderColor: "#ff4444", color: "#ff4444" }}>[ CANCEL ]</button>
          </div>
        </div>
      )}

      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>{isLogin ? "[ LOGIN ]" : "[ REGISTER ]"}</h2>
          <p style={styles.subtitle}>{isLogin ? ">_ ACCESS YOUR ACCOUNT" : ">_ CREATE NEW USER PROFILE"}</p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={styles.imageUploadContainer}>
                {imagePreview ? <img src={imagePreview} alt="Profile Preview" style={styles.imagePreview} /> : <div style={{ ...styles.imagePreview, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px" }}>🤖</div>}
                <input type="file" id="profileImage" accept="image/*" style={styles.fileInput} onChange={handleImageChange} />
                <label htmlFor="profileImage" style={styles.fileInputLabel}>[ UPLOAD PROFILE IMAGE ]</label>
                {profileImage && <p style={{ fontSize: "10px", color: "#00aa00", marginTop: "5px" }}>{profileImage.name}</p>}
              </div>
            )}

            {!isLogin && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>[ FULL NAME ]</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>👤</span>
                  <input type="text" placeholder="ENTER YOUR NAME" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} required />
                </div>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>[ EMAIL ADDRESS ]</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>📧</span>
                <input type="email" placeholder="ENTER YOUR EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>[ PASSWORD ]</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔒</span>
                <input type="password" placeholder="ENTER YOUR PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
              </div>
            </div>

            <button type="submit" style={styles.button}>{isLogin ? "[ SIGN IN ]" : "[ CREATE ACCOUNT ]"}</button>
          </form>

          <div style={styles.footer}>
            <p style={styles.toggleText}>{isLogin ? ">_ NO ACCOUNT?" : ">_ HAVE ACCOUNT?"}</p>
            <p onClick={() => { setIsLogin(!isLogin); setName(''); setEmail(''); setPassword(''); setProfileImage(null); setImagePreview(null); }} style={styles.toggleLink}>
              {isLogin ? "[ CREATE NEW ]" : "[ SIGN IN ]"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: #00ff00 !important; box-shadow: 0 0 10px rgba(0, 255, 0, 0.3); outline: none; }
        button:hover { background: #00ff00 !important; color: #000 !important; box-shadow: 0 0 20px rgba(0, 255, 0, 0.5); transform: translateY(-2px); }
        button:active { transform: translateY(0); }
        @media (max-width: 768px) { input, button { font-size: 16px !important; } }
      `}</style>
    </>
  )
}

export default Auth