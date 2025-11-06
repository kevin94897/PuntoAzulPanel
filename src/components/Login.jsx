import { useState } from "react"
import logo from "../assets/logo_puntoazul.svg"
import bg from "../assets/bg_puntoazul.png"

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("")
  const [appPassword, setAppPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)

    if (!username || !appPassword) {
      setError("Por favor ingresa usuario y contraseña de aplicación")
      return
    }

    setLoading(true)

    // 🔑 Genera token Base64
    const token = btoa(`${username}:${appPassword}`)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/wp/v2/users/me`,
        {
          headers: {
            Authorization: `Basic ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error("Credenciales inválidas o sin permisos")

      const user = await response.json()
      console.log("Usuario autenticado:", user)

      onLogin(token) // Guardamos token en App.jsx
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex items-center justify-center min-h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" />

      <form
        onSubmit={handleLogin}
        className="relative z-10 bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm"
      >
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Punto Azul" className="w-24 h-24 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
          Acceso al Panel
        </h2>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm mb-2">Usuario de WordPress</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="ej. admin"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm mb-2">
            Contraseña de aplicación
          </label>
          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="ej. AbCd EfgH ..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Conectando..." : "Iniciar sesión"}
        </button>

        {error && (
          <p className="text-red-500 text-sm text-center mt-4">{error}</p>
        )}
      </form>
    </div>
  )
}

