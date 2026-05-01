import { useState, useEffect } from 'react'
import axios from 'axios'
import RoboticPopup from './RoboticPopup'

// ✅ PRODUCTION URL - DIRECT
const API_URL = "http://localhost:3001";

function Auth({ show, setToken }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  // Image upload states
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [showOTP, setShowOTP] = useState(false)
  const [otp, setOtp] = useState('')
  const [tempEmail, setTempEmail] = useState('')
  const [tempName, setTempName] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [tempImage, setTempImage] = useState(null)

  const [popup, setPopup] = useState({ show: false, message: '', type: '' })

  const showRoboticPopup = (message, type = 'info') => {
    console.log(`[POPUP] ${type}: ${message}`);
    setPopup({ show: true, message, type })
    setTimeout(() => setPopup({ show: false, message: '', type: '' }), 3000);
  }

  useEffect(() => {
    console.log("[AUTH] Component mounted");
    console.log(`[AUTH] API_URL: ${API_URL}`);

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    console.log("[IMAGE] File selected:", file?.name);
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showRoboticPopup("⚠️ IMAGE SIZE MUST BE LESS THAN 2MB ⚠️", "error")
        return
      }

      if (!file.type.startsWith('image/')) {
        showRoboticPopup("⚠️ ONLY IMAGE FILES ARE ALLOWED ⚠️", "error")
        return
      }

      setProfileImage(file)

      const reader = new FileReader()
      reader.onloadend = () => {
        console.log("[IMAGE] Preview created successfully");
        setImagePreview(reader.result)
      }
      reader.onerror = (error) => {
        console.error("[IMAGE] FileReader error:", error);
      }
      reader.readAsDataURL(file)
    }
  }

  // Convert image to base64
  const imageToBase64 = (file) => {
    console.log("[IMAGE] Converting to base64...");
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        console.log("[IMAGE] Base64 conversion successful");
        resolve(reader.result)
      }
      reader.onerror = error => {
        console.error("[IMAGE] Base64 conversion error:", error);
        reject(error)
      }
    })
  }

  const handleSendOTP = async (name, email, password, image) => {
    console.log("=========================================");
    console.log("[REGISTER] Starting registration process");
    console.log(`[REGISTER] Name: ${name}`);
    console.log(`[REGISTER] Email: ${email}`);
    console.log(`[REGISTER] Password length: ${password?.length || 0}`);
    console.log(`[REGISTER] Has image: ${!!image}`);
    console.log(`[REGISTER] API_URL: ${API_URL}`);
    console.log(`[REGISTER] Full URL: ${API_URL}/register`);

    try {
      let imageBase64 = null
      if (image) {
        console.log("[REGISTER] Converting image to base64...");
        imageBase64 = await imageToBase64(image)
      }

      const requestData = {
        name,
        email,
        password,
        profileImage: imageBase64
      };
      console.log("[REGISTER] Request data prepared");
      console.log("[REGISTER] Sending POST request...");

      const res = await axios.post(`${API_URL}/register`, requestData);

      console.log("[REGISTER] Response received:", res.status, res.statusText);
      console.log("[REGISTER] Response data:", res.data);

      if (res.data.message) {
        console.log("[REGISTER] Registration successful, OTP sent");
        setTempName(name)
        setTempEmail(email)
        setTempPassword(password)
        setTempImage(imageBase64)
        setShowOTP(true)
        showRoboticPopup("⚡ OTP TRANSMITTED TO TARGET EMAIL ⚡", "success")
      } else {
        console.log("[REGISTER] Unexpected response format:", res.data);
        showRoboticPopup("❌ UNEXPECTED RESPONSE FROM SERVER ❌", "error");
      }
    } catch (err) {
      console.log("=========================================");
      console.log("[REGISTER] ❌ ERROR OCCURRED ❌");
      console.log(`[REGISTER] Error message: ${err.message}`);
      console.log(`[REGISTER] Response status: ${err.response?.status || 'No response'}`);
      console.log(`[REGISTER] Response data:`, err.response?.data || 'No data');
      console.log("=========================================");

      const errorMessage = err.response?.data?.error || err.message || "❌ REGISTRATION PROTOCOL FAILED ❌";
      showRoboticPopup(errorMessage, "error")
    }
  }

  const handleVerifyOTP = async () => {
    console.log("=========================================");
    console.log("[VERIFY] Starting OTP verification");
    console.log(`[VERIFY] Email: ${tempEmail}`);
    console.log(`[VERIFY] OTP: ${otp}`);

    try {
      console.log("[VERIFY] Sending verification request...");
      const res = await axios.post(`${API_URL}/verify-otp`, {
        email: tempEmail,
        otp: otp,
        profileImage: tempImage
      })

      console.log("[VERIFY] Response received:", res.status);
      console.log("[VERIFY] Response data:", res.data);

      if (res.data.token) {
        console.log("[VERIFY] ✅ Verification successful! Token received");
        localStorage.setItem("token", res.data.token)
        setToken(res.data.token)
        setShowOTP(false)
        show(true)
        setName('')
        setEmail('')
        setPassword('')
        setOtp('')
        setProfileImage(null)
        setImagePreview(null)
        showRoboticPopup("✅ ACCESS GRANTED! USER REGISTERED ✅", "success")
      } else {
        console.log("[VERIFY] No token in response:", res.data);
        showRoboticPopup("❌ VERIFICATION FAILED - NO TOKEN ❌", "error");
      }
    } catch (err) {
      console.log("=========================================");
      console.log("[VERIFY] ❌ VERIFICATION ERROR ❌");
      console.log(`[VERIFY] Error message: ${err.message}`);
      console.log(`[VERIFY] Response data:`, err.response?.data || 'No data');
      console.log("=========================================");

      const errorMessage = err.response?.data?.error || "❌ INVALID OTP CODE ❌";
      showRoboticPopup(errorMessage, "error")
    }
  }

  const handleResendOTP = async () => {
    console.log("[RESEND] Requesting new OTP for:", tempEmail);

    try {
      const res = await axios.post(`${API_URL}/resend-otp`, {
        email: tempEmail
      })

      console.log("[RESEND] Response:", res.status, res.data);

      if (res.data.message) {
        console.log("[RESEND] ✅ New OTP sent successfully");
        showRoboticPopup("🔄 NEW OTP CODE GENERATED & SENT 🔄", "info")
      }
    } catch (err) {
      console.log("[RESEND] ❌ Error:", err.message);
      showRoboticPopup("⚠️ OTP RESEND FAILED ⚠️", "error")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("=========================================");
    console.log(`[FORM] Form submitted, isLogin: ${isLogin}`);

    if (isLogin) {
      console.log("[LOGIN] Attempting login...");
      console.log(`[LOGIN] Email: ${email}`);
      console.log(`[LOGIN] Full URL: ${API_URL}/login`);

      try {
        const res = await axios.post(`${API_URL}/login`, {
          email,
          password
        })

        console.log("[LOGIN] Response:", res.status, res.data);

        if (res.data.token) {
          console.log("[LOGIN] ✅ Login successful");
          localStorage.setItem("token", res.data.token)
          setToken(res.data.token)
          show(true)
          showRoboticPopup("🔓 SYSTEM ACCESS GRANTED 🔓", "success")
        }
      } catch (err) {
        console.log("[LOGIN] ❌ LOGIN ERROR ❌");
        console.log(`[LOGIN] Error message: ${err.message}`);
        console.log(`[LOGIN] Response data:`, err.response?.data || 'No data');

        const errorMessage = err.response?.data?.error || "❌ LOGIN PROTOCOL FAILED ❌";
        showRoboticPopup(errorMessage, "error")
      }
    } else {
      if (!name || !email || !password) {
        showRoboticPopup("⚠️ ALL FIELDS REQUIRED ⚠️", "error")
        return
      }
      console.log("[FORM] Calling handleSendOTP...");
      handleSendOTP(name, email, password, profileImage)
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
    resendButton: {
      background: "transparent",
      color: "#00ff00",
      border: "2px solid #00ff00",
      marginTop: "10px"
    }
  }

  if (showOTP) {
    return (
      <>
        {popup.show && <RoboticPopup message={popup.message} type={popup.type} onClose={() => setPopup({ show: false, message: '', type: '' })} />}
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.title}>[ VERIFICATION ]</h2>
            <p style={styles.subtitle}>Enter OTP code sent to: <strong>{tempEmail}</strong></p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>[ OTP CODE ]</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔐</span>
                <input type="text" placeholder="ENTER 6-DIGIT CODE" value={otp} onChange={(e) => setOtp(e.target.value)} style={styles.input} maxLength="6" required autoFocus />
              </div>
            </div>

            <button onClick={handleVerifyOTP} style={styles.button}>[ VERIFY & REGISTER ]</button>
            <button onClick={handleResendOTP} style={{ ...styles.button, ...styles.resendButton }}>[ RESEND OTP ]</button>

            <div style={styles.footer}>
              <p onClick={() => { setShowOTP(false); setOtp(''); }} style={styles.toggleLink}>← [ BACK ]</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {popup.show && <RoboticPopup message={popup.message} type={popup.type} onClose={() => setPopup({ show: false, message: '', type: '' })} />}
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