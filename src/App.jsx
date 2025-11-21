import { useState, useEffect } from "react"
import Login from "./components/Login"
import DashboardCalendar from "./components/DashboardCalendar"
import Dashboard from "./components/Dashboard"

// Key used in localStorage to persist auth data
const AUTH_KEY = "puntoazul_auth"
// TTL for stored token (milliseconds). Currently 24 hours.
const AUTH_TTL_MS = 24 * 60 * 60 * 1000
//Nerd  cris  GFAf K1VT 57sv Go3r Heaa k5P3
function saveAuth(token) {
  try {
    const payload = {
      value: token,
      expiry: Date.now() + AUTH_TTL_MS,
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload))
  } catch (err) {
    // ignore storage errors
    console.error("saveAuth error", err)
  }
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return parsed.value
  } catch (err) {
    console.error("loadAuth error", err)
    return null
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch (err) {
    console.error("clearAuth error", err)
  }
}

export default function App() {
  // Initialize state from localStorage (lazy initializer)
  const [token, setToken] = useState(() => loadAuth())

  // When token changes, persist or clear it
  useEffect(() => {
    if (token) saveAuth(token)
    else clearAuth()
  }, [token])

  const handleLogin = (tok) => {
    setToken(tok)
    saveAuth(tok)
  }

  const handleLogout = () => {
    setToken(null)
    clearAuth()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <DashboardCalendar token={token} onLogout={handleLogout} />
      )}
    </div>
  )
}
