import { useEffect, useState } from "react"

export default function Dashboard({ token }) {
  const [selectedLocal, setSelectedLocal] = useState(null)
  const [acfData, setAcfData] = useState(null)
  const [loading, setLoading] = useState(false)

  const locales = [
    {
      id: "primavera",
      nombre: "Primavera",
      img: "https://puntoazulrestaurante.com/wp-content/uploads/2025/05/local-primavera.png",
    },
    {
      id: "sanmartin",
      nombre: "San Martín (noche)",
      img: "https://puntoazulrestaurante.com/wp-content/uploads/2025/05/Rectangle-319.png",
    },
    {
      id: "benavides",
      nombre: "Benavides",
      img: "https://puntoazulrestaurante.com/wp-content/uploads/2025/05/Rectangle-319-2.png",
    },
    {
      id: "jorgechavez",
      nombre: "Jorge Chávez",
      img: "https://puntoazulrestaurante.com/wp-content/uploads/2025/05/Rectangle-319-1.png",
    },
  ]

  const ACF_URL = "https://puntoazulrestaurante.com/wp-json/acf/v3/pages/984"

  const fetchACF = async () => {
    setLoading(true)
    try {
      const res = await fetch(ACF_URL, {
        headers: { Authorization: `Basic ${token}` },
      })
      const json = await res.json()
      setAcfData(json.acf)
    } catch (error) {
      console.error("Error al cargar ACF:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchACF()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-gray-100 flex flex-col items-center py-12 px-4 w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <img
          src="https://puntoazulrestaurante.com/wp-content/uploads/2024/05/logo.svg"
          alt="Logo Punto Azul"
          className="mx-auto w-24 mb-4"
        />
        <h1 className="text-4xl font-bold text-blue-800">Panel de Reservas</h1>
        <p className="text-gray-600 mt-2">
          Selecciona una sede para administrar sus fechas
        </p>
      </div>

      {/* Grid de locales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {locales.map((local) => (
          <div
            key={local.id}
            onClick={() => setSelectedLocal(local.id)}
            className={`cursor-pointer bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition transform hover:-translate-y-1 ${
              selectedLocal === local.id ? "ring-4 ring-blue-500" : ""
            }`}
          >
            <img
              src={local.img}
              alt={local.nombre}
              className="w-full h-48 object-cover"
            />
            <div className="p-4 text-center">
              <h3 className="font-semibold text-gray-800 text-lg">
                {local.nombre}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Info de la sede seleccionada */}
      {selectedLocal && (
        <div className="bg-white mt-12 p-8 rounded-xl shadow-md w-full max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">
            {locales.find((l) => l.id === selectedLocal)?.nombre}
          </h2>

          {loading && <p className="text-gray-500">Cargando fechas...</p>}

          {!loading && acfData && (
            <div>
              <p className="text-gray-700 mb-3">
                Aquí podrás ver o editar las fechas desactivadas para esta sede.
              </p>

              <pre className="bg-gray-100 rounded-lg text-left p-4 text-sm overflow-x-auto">
                {JSON.stringify(acfData[selectedLocal], null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
