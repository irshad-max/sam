// components/RoboticPopup.jsx
import { useEffect } from 'react'

function RoboticPopup({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    
    return () => clearTimeout(timer)
  }, [onClose])

  const getIcon = () => {
    switch(type) {
      case 'success':
        return '✔'
      case 'error':
        return '✖'
      case 'info':
        return 'ⓘ'
      default:
        return '⚙'
    }
  }

  const getAccentColor = () => {
    switch(type) {
      case 'success':
        return '#4ade80'
      case 'error':
        return '#f87171'
      case 'info':
        return '#60a5fa'
      default:
        return '#a78bfa'
    }
  }

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontFamily: "'Share Tech Mono', 'Courier New', monospace"
    },
    popup: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      border: `2px solid ${getAccentColor()}`,
      borderRadius: '16px',
      padding: '28px 32px',
      minWidth: '320px',
      maxWidth: '420px',
      textAlign: 'center',
      boxShadow: `0 0 20px ${getAccentColor()}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
      position: 'relative',
      overflow: 'hidden'
    },
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: `linear-gradient(90deg, transparent, ${getAccentColor()}, transparent)`,
      animation: 'scan 2s linear infinite'
    },
    header: {
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px'
    },
    iconBox: {
      width: '60px',
      height: '60px',
      borderRadius: '12px',
      background: `linear-gradient(135deg, ${getAccentColor()}20, transparent)`,
      border: `1px solid ${getAccentColor()}40`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      color: getAccentColor()
    },
    title: {
      fontSize: '14px',
      letterSpacing: '2px',
      color: getAccentColor(),
      textTransform: 'uppercase',
      marginBottom: '8px',
      fontWeight: '500'
    },
    message: {
      color: '#e2e8f0',
      fontSize: '15px',
      lineHeight: '1.5',
      marginBottom: '24px',
      fontFamily: "'Share Tech Mono', monospace"
    },
    progressContainer: {
      width: '100%',
      height: '3px',
      background: '#1e293b',
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: '8px'
    },
    progressBar: {
      width: '100%',
      height: '100%',
      background: `linear-gradient(90deg, ${getAccentColor()}, ${getAccentColor()}80)`,
      animation: 'progress 4s linear forwards'
    },
    button: {
      background: 'transparent',
      border: `1px solid ${getAccentColor()}40`,
      borderRadius: '8px',
      color: getAccentColor(),
      padding: '8px 20px',
      marginTop: '20px',
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: "'Share Tech Mono', monospace",
      fontWeight: '500',
      letterSpacing: '1px',
      transition: 'all 0.2s ease',
      width: '100%'
    },
    statusDot: {
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: getAccentColor(),
      boxShadow: `0 0 6px ${getAccentColor()}`,
      marginRight: '8px',
      animation: 'pulse 1.5s infinite'
    },
    footerText: {
      fontSize: '10px',
      color: '#475569',
      marginTop: '16px',
      letterSpacing: '1px'
    }
  }

  const getStatusText = () => {
    switch(type) {
      case 'success': return 'OPERATION SUCCESSFUL'
      case 'error': return 'SYSTEM ALERT'
      case 'info': return 'INFORMATION'
      default: return 'PROCESSING'
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div style={styles.scanLine} />
        
        <div style={styles.header}>
          <div style={styles.iconBox}>
            {getIcon()}
          </div>
          <div>
            <div style={styles.title}>
              <span style={styles.statusDot} />
              {getStatusText()}
            </div>
          </div>
        </div>
        
        <div style={styles.message}>
          {message}
        </div>
        
        <div style={styles.progressContainer}>
          <div style={styles.progressBar} />
        </div>
        
        <button 
          style={styles.button}
          onMouseEnter={(e) => {
            e.target.style.background = `${getAccentColor()}20`
            e.target.style.borderColor = getAccentColor()
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.borderColor = `${getAccentColor()}40`
          }}
          onClick={onClose}
        >
          ⏎ CONFIRM
        </button>
        
        <div style={styles.footerText}>
          [ SYSTEM v2.0 | SECURE CONNECTION ]
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes progress {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  )
}

export default RoboticPopup