import { useEffect, useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import logo from '../assets/logo_puntoazul.svg';
import { es } from 'date-fns/locale';
import {
	Calendar,
	MapPin,
	Clock,
	Save,
	RefreshCw,
	Check,
	AlertCircle,
	X,
	Plus,
	ArrowLeft,
	LogOut,
	Users,
	ClipboardList,
} from 'lucide-react';
import 'react-day-picker/style.css';
import bg from "../assets/bg_puntoazul.png"


const convertirHoraAMinutos = (horaStr) => {
	// Ejemplo: "10:30 am" o "2:00 pm"
	const [tiempo, periodo] = horaStr.split(' ');
	const [horas, minutos] = tiempo.split(':').map(Number);

	let hora24 = horas;

	// Convertir a formato 24 horas
	if (periodo === 'pm' && horas !== 12) {
		hora24 = horas + 12;
	} else if (periodo === 'am' && horas === 12) {
		hora24 = 0;
	}

	return hora24 * 60 + minutos;
};

/**
 * Valida que la hora de fin sea posterior a la hora de inicio
 */
const validarRangoHorario = (horaInicio, horaFin) => {
	const minutosInicio = convertirHoraAMinutos(horaInicio);
	const minutosFin = convertirHoraAMinutos(horaFin);

	return minutosFin > minutosInicio;
};

/**
 * Convierte una cadena de hora (ej: "13:00" o "1:00 pm") a un formato estándar "1:00 pm".
 * Esencial para que los <select> reconozcan el valor inicial del backend (ACF).
 */
const formatearHoraACampo = (horaStr) => {
	if (!horaStr) return '';
	let [tiempo, periodo] = horaStr.toLowerCase().split(' ');

	// Si ya tiene am/pm, normalizar
	if (periodo) {
		let [horas, minutos] = tiempo.split(':').map(Number);
		const ampm = periodo === 'pm' ? 'pm' : 'am';
		const hora12 = horas % 12 === 0 ? 12 : horas % 12;
		const minutosStr = String(minutos).padStart(2, '0');
		return `${hora12}:${minutosStr} ${ampm}`;
	}

	// Si es formato 24h sin am/pm (ej: "13:30"), convertir a 12h am/pm
	if (tiempo.includes(':')) {
		let [h24, m] = tiempo.split(':').map(Number);
		const ampm = h24 >= 12 ? 'pm' : 'am';
		const hora12 = h24 % 12 === 0 ? 12 : h24 % 12;
		const minutosStr = String(m).padStart(2, '0');
		return `${hora12}:${minutosStr} ${ampm}`;
	}

	// Devolver original si el formato no es reconocible
	return horaStr;
};


// Días de la semana para el checkbox
const DIAS_SEMANA = [
	{ key: 'lunes', label: 'Lun' },
	{ key: 'martes', label: 'Mar' },
	{ key: 'miercoles', label: 'Mié' },
	{ key: 'jueves', label: 'Jue' },
	{ key: 'viernes', label: 'Vie' },
	{ key: 'sabado', label: 'Sáb' },
	{ key: 'domingo', label: 'Dom' },
];

export default function DashboardCalendar({ token, onLogout }) {
	const [locales, setLocales] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [notification, setNotification] = useState(null);
	const [modalConfig, setModalConfig] = useState(null);
	const [modalRangos, setModalRangos] = useState([]);
	const [bloqueoDiaCompleto, setBloqueoDiaCompleto] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(null);

	const ACF_URL = `${import.meta.env.VITE_API_URL}/acf/v3/pages/984`;

	const selectedLocal = useMemo(() => {
		return selectedIndex !== null ? locales[selectedIndex] : null;
	}, [selectedIndex, locales]);


	const showNotification = (type, message) => {
		setNotification({ type, message });
		setTimeout(() => setNotification(null), 4000);
	};

	const formatDateToString = (date) => {
		const d = String(date.getDate()).padStart(2, '0');
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const y = date.getFullYear();
		// El formato de WordPress es MM/DD/YYYY
		return `${m}/${d}/${y}`;
	};

	const formatDateToDisplay = (dateStr) => {
		// Asumiendo formato MM/DD/YYYY de WordPress
		const parts = dateStr.split('/');
		if (parts.length === 3) {
			const [m, d, y] = parts;
			return `${d}/${m}/${y}`; // Formato DD/MM/YYYY para display
		}
		return dateStr;
	};

	const parseDate = (str) => {
		const [m, d, y] = str.split('/').map(Number);
		return new Date(y, m - 1, d);
	};

	const generarOpcionesMediaHora = () => {
		const opciones = [];

		for (let h = 8; h <= 20; h++) {
			for (let m of [0, 30]) {
				const ampm = h < 12 ? 'am' : 'pm';
				const hora12 = h % 12 === 0 ? 12 : h % 12;
				const minutos = m === 0 ? '00' : '30';
				opciones.push(`${hora12}:${minutos} ${ampm}`);
			}
		}

		return opciones;
	};

	const opcionesMediaHora = generarOpcionesMediaHora();

	const fetchLocales = async () => {
		setLoading(true);
		try {
			const res = await fetch(ACF_URL, {
				headers: { Authorization: `Basic ${token}` },
			});
			const data = await res.json();
			// Asegurarse de que `fechas_no_disponibles` sea un array si no existe, para evitar errores en el `map`
			const processedLocales = (data.acf.locales || []).map(local => ({
				...local,
				// APLICAR FORMATO ESTÁNDAR PARA QUE LOS <SELECT> FUNCIONEN CORRECTAMENTE
				inicio_reserva: formatearHoraACampo(local.inicio_reserva),
				fin_reserva: formatearHoraACampo(local.fin_reserva),
				atencion_hasta_x_hora: formatearHoraACampo(local.atencion_hasta_x_hora),
				fechas_no_disponibles: local.fechas_no_disponibles || [],
				imagen: local.imagen || "",
			}));
			setLocales(processedLocales);
			setHasChanges(false);
		} catch (err) {
			showNotification('error', 'Error al cargar los datos');
			console.error('Error al obtener ACF:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLocales();
	}, []);

	// Función para manejar la actualización de campos generales del local
	const handleLocalFieldChange = (index, field, value) => {
		const newLocales = [...locales];
		newLocales[index] = { ...newLocales[index], [field]: value };
		setLocales(newLocales);
		setHasChanges(true);

		// Opcional: Validaciones rápidas de formato de hora si es aplicable.
		if (['inicio_reserva', 'fin_reserva', 'atencion_hasta_x_hora'].includes(field)) {
			// Validar que el rango de reserva sea válido si ambas horas están definidas
			const inicio = newLocales[index].inicio_reserva;
			const fin = newLocales[index].fin_reserva;

			if (inicio && fin && !validarRangoHorario(inicio, fin)) {
				// Aquí podrías mostrar una notificación de error temporal o marcar el campo
				console.warn("Rango de reserva inválido");
			}
		}
	};

	const handleDayClick = (fecha, index, event) => {
		event.preventDefault();

		// react-day-picker devuelve la fecha del día a las 00:00. Necesitamos el formato MM/DD/YYYY
		// para buscar en nuestro array de bloqueos (que usa ese formato).
		const fechaStr = formatDateToString(fecha);

		const fechas = locales[index].fechas_no_disponibles || [];
		const fechaExistente = fechas.find((f) => f.fecha_bloq === fechaStr);

		if (fechaExistente) {
			setModalConfig({ localIndex: index, fecha: fechaStr, nombre: locales[index].nombre });
			setModalRangos(
				fechaExistente.horas && Array.isArray(fechaExistente.horas)
					? fechaExistente.horas
					: []
			);
			setBloqueoDiaCompleto(fechaExistente.horas === false);
		} else {
			setModalConfig({ localIndex: index, fecha: fechaStr, nombre: locales[index].nombre });
			setModalRangos([]);
			setBloqueoDiaCompleto(false);
		}
	};

	const agregarRango = () => {
		setModalRangos([
			...modalRangos,
			{ hora_inicio: '10:00 am', hora_fin: '11:00 am' },
		]);
	};

	const actualizarRango = (i, campo, valor) => {
		const nuevos = [...modalRangos];
		nuevos[i][campo] = valor;
		setModalRangos(nuevos);
	};

	const eliminarRango = (i) => {
		setModalRangos(modalRangos.filter((_, idx) => idx !== i));
	};

	const guardarBloqueo = () => {
		if (!bloqueoDiaCompleto) {
			// Validar que haya al menos un rango
			if (modalRangos.length === 0) {
				showNotification(
					'error',
					'Debes agregar al menos un rango de horas o bloquear el día completo'
				);
				return;
			}

			// Validar rangos (igualdad y orden)
			for (let i = 0; i < modalRangos.length; i++) {
				const r = modalRangos[i];

				if (r.hora_fin === r.hora_inicio) {
					showNotification(
						'error',
						`Rango ${i + 1}: Las horas de inicio y fin no pueden ser iguales`
					);
					return;
				}

				if (!validarRangoHorario(r.hora_inicio, r.hora_fin)) {
					showNotification(
						'error',
						`Rango ${i + 1}: La hora de fin (${r.hora_fin}) debe ser posterior a la hora de inicio (${r.hora_inicio})`
					);
					return;
				}
			}

			// Validar que no haya solapamiento entre rangos
			for (let i = 0; i < modalRangos.length; i++) {
				for (let j = i + 1; j < modalRangos.length; j++) {
					const rangoA = modalRangos[i];
					const rangoB = modalRangos[j];

					const inicioA = convertirHoraAMinutos(rangoA.hora_inicio);
					const finA = convertirHoraAMinutos(rangoA.hora_fin);
					const inicioB = convertirHoraAMinutos(rangoB.hora_inicio);
					const finB = convertirHoraAMinutos(rangoB.hora_fin);

					// Verificar solapamiento
					if (
						(inicioA < finB && finA > inicioB) ||
						(inicioB < finA && finB > inicioA)
					) {
						showNotification(
							'error',
							`Los rangos ${i + 1} y ${j + 1} se solapan. Por favor ajústalos.`
						);
						return;
					}
				}
			}
		}

		const newLocales = [...locales];
		const fechas =
			newLocales[modalConfig.localIndex].fechas_no_disponibles || [];

		// Eliminar fecha anterior si existe
		const fechasFiltradas = fechas.filter(
			(f) => f.fecha_bloq !== modalConfig.fecha
		);

		const nuevoBloqueo = {
			fecha_bloq: modalConfig.fecha,
			horas: bloqueoDiaCompleto
				? false
				: modalRangos.map((r) => ({
					hora_inicio: r.hora_inicio,
					hora_fin: r.hora_fin,
				})),
		};

		fechasFiltradas.push(nuevoBloqueo);

		newLocales[modalConfig.localIndex].fechas_no_disponibles = fechasFiltradas;

		setLocales(newLocales);
		setHasChanges(true);
		setModalConfig(null);
		setModalRangos([]);
		setBloqueoDiaCompleto(false);
	};

	const eliminarBloqueo = () => {
		const newLocales = [...locales];
		const localActual = newLocales[modalConfig.localIndex];

		// Filtrar la fecha a eliminar
		const fechasFiltradas = (localActual.fechas_no_disponibles || []).filter(
			(f) => f.fecha_bloq !== modalConfig.fecha
		);

		localActual.fechas_no_disponibles = fechasFiltradas;

		setLocales(newLocales);
		setHasChanges(true);
		showNotification('success', 'Bloqueo eliminado correctamente');
		setModalConfig(null);
		setModalRangos([]);
		setBloqueoDiaCompleto(false);
	};

	const guardarCambios = async () => {
		setSaving(true);

		try {
			// 1. Validaciones generales de los locales antes de guardar
			for (let i = 0; i < locales.length; i++) {
				const local = locales[i];

				// Validación de rango de reserva
				if (!validarRangoHorario(local.inicio_reserva, local.fin_reserva)) {
					showNotification(
						'error',
						`Error en ${local.nombre}: Hora de fin de reserva debe ser posterior a la de inicio.`
					);
					setSaving(false);
					return;
				}

				// Validación de atención
				if (!validarRangoHorario(local.fin_reserva, local.atencion_hasta_x_hora)) {
					showNotification(
						'error',
						`Error en ${local.nombre}: Hora de fin de atención debe ser posterior a la hora de fin de reserva.`
					);
					setSaving(false);
					return;
				}
			}

			const localesFormateados = locales.map((local) => ({
				codigo_local: local.codigo_local,
				nombre: local.nombre,
				// imagen: local.imagen,
				location: local.location,
				inicio_reserva: local.inicio_reserva,
				fin_reserva: local.fin_reserva,
				dias_disponibles: local.dias_disponibles,
				nro_reservas_max: String(local.nro_reservas_max), // Asegurar string para ACF
				cantidad_personas_max: String(local.cantidad_personas_max), // Asegurar string para ACF
				atencion_hasta_x_hora: local.atencion_hasta_x_hora,
				fechas_no_disponibles: local.fechas_no_disponibles || [],
			}));

			const payload = { fields: { locales: localesFormateados } };

			const res = await fetch(ACF_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${token}`,
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(`Error ${res.status}: ${errorText}`);
			}

			showNotification('success', 'Cambios guardados correctamente');
			setHasChanges(false);

			await fetchLocales();
		} catch (err) {
			showNotification('error', 'Error al guardar: ' + err.message);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 w-full">
				<RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 w-full" style={{ backgroundImage: `url(${bg})` }}>
			{/* Notificaciones */}
			{notification && (
				<div className="fixed top-24 right-6 z-50">
					<div
						className={`px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
							} text-white`}
					>
						{notification.type === 'success' ? (
							<Check className="w-5 h-5" />
						) : (
							<AlertCircle className="w-5 h-5" />
						)}
						<span className="font-medium">{notification.message}</span>
					</div>
				</div>
			)}

			{/* HEADER */}
			<div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex justify-center">
						<img
							src={logo}
							alt="Punto Azul"
							className="w-14 h-14 object-contain"
						/>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={guardarCambios}
							disabled={saving || !hasChanges}
							className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${hasChanges
								? 'bg-gray-800 hover:bg-gray-900 text-white shadow-lg'
								: 'bg-gray-200 text-gray-400 cursor-not-allowed'
								}`}
						>
							{saving ? (
								<RefreshCw className="w-5 h-5 animate-spin" />
							) : (
								<Save className="w-5 h-5" />
							)}
							<span className="hidden md:inline">
								{saving ? 'Guardando...' : 'Guardar cambios'}
							</span>
						</button>

						<button
							onClick={() => onLogout && onLogout()}
							className="flex items-center gap-2 px-6 py-4 md:py-3 rounded-lg font-medium bg-red-50 text-red-700 hover:bg-red-100 transition"
							title="Cerrar sesión"
						>
							<LogOut className="w-4 h-4" />
							<span className="hidden md:inline">Cerrar sesión</span>
						</button>
					</div>
				</div>
			</div>

			{/* MODAL */}
			{modalConfig && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-xl font-bold text-gray-900">
								Configurar bloqueo para {modalConfig.nombre}
							</h3>
							<button
								onClick={() => setModalConfig(null)}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="mb-4">
							<p className="text-sm text-gray-700 mb-1 font-medium">
								Fecha seleccionada
							</p>
							<div className="bg-gray-100 px-4 py-2 rounded-lg text-gray-900 font-medium">
								{formatDateToDisplay(modalConfig.fecha)}
							</div>
						</div>

						<label className="flex items-center gap-2 mb-4 cursor-pointer">
							<input
								type="checkbox"
								checked={bloqueoDiaCompleto}
								onChange={(e) => {
									setBloqueoDiaCompleto(e.target.checked);
									if (e.target.checked) {
										setModalRangos([]);
									}
								}}
								className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
							/>
							<span className="text-sm text-gray-700 font-medium">
								Bloquear todo el día
							</span>
						</label>

						{!bloqueoDiaCompleto && (
							<div className="space-y-3 mb-6">
								{modalRangos.map((r, i) => {
									// Validar el rango actual
									const esIgual = r.hora_inicio === r.hora_fin;
									const esInvalido = !esIgual && !validarRangoHorario(r.hora_inicio, r.hora_fin);
									const tieneError = esIgual || esInvalido;

									return (
										<div key={i}>
											<div className="flex gap-2 items-center">
												<select
													value={r.hora_inicio}
													onChange={(e) =>
														actualizarRango(i, 'hora_inicio', e.target.value)
													}
													className={`flex-1 px-3 py-2 border rounded-lg text-sm ${tieneError ? 'border-red-500 bg-red-50' : 'border-gray-300'
														}`}
												>
													{opcionesMediaHora.map((h) => (
														<option key={h}>{h}</option>
													))}
												</select>

												<span className="text-gray-500">-</span>

												<select
													value={r.hora_fin}
													onChange={(e) =>
														actualizarRango(i, 'hora_fin', e.target.value)
													}
													className={`flex-1 px-3 py-2 border rounded-lg text-sm ${tieneError ? 'border-red-500 bg-red-50' : 'border-gray-300'
														}`}
												>
													{opcionesMediaHora.map((h) => (
														<option key={h}>{h}</option>
													))}
												</select>

												<button
													onClick={() => eliminarRango(i)}
													className="text-red-600 hover:text-red-700 p-2"
												>
													<X className="w-5 h-5" />
												</button>
											</div>

											{/* Mensaje de error visual */}
											{tieneError && (
												<div className="flex items-center gap-1 mt-1 ml-1">
													<AlertCircle className="w-3 h-3 text-red-500" />
													<p className="text-xs text-red-600">
														{esIgual
															? 'Las horas no pueden ser iguales'
															: 'La hora de fin debe ser posterior a la de inicio'
														}
													</p>
												</div>
											)}
										</div>
									);
								})}

								<button
									onClick={agregarRango}
									className="flex items-center gap-2 text-gray-800 hover:text-black font-medium text-sm mt-3"
								>
									<Plus className="w-4 h-4" />
									Agregar rango horario
								</button>
							</div>
						)}

						<div className="flex gap-3 mt-6">
							<button
								onClick={eliminarBloqueo}
								className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:bg-red-300"
								disabled={!locales[modalConfig.localIndex]?.fechas_no_disponibles.some(f => f.fecha_bloq === modalConfig.fecha)}
							>
								Eliminar bloqueo
							</button>
							<button
								onClick={guardarBloqueo}
								className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-colors disabled:bg-gray-400"
								disabled={!bloqueoDiaCompleto && modalRangos.some(r => r.hora_inicio === r.hora_fin || !validarRangoHorario(r.hora_inicio, r.hora_fin))}
							>
								Guardar
							</button>
						</div>
					</div>
				</div>
			)}

			{/* LOCALES: vista previa o detalle */}
			<div className="max-w-7xl mx-auto px-6 py-8">
				<div className="mb-5 flex justify-between items-center">
					{selectedIndex !== null && (
						<button
							onClick={() => setSelectedIndex(null)}
							className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-700 font-medium text-sm"
							aria-label="Volver a la lista de locales"
						>
							<ArrowLeft className="w-4 h-4" />
							Volver a locales
						</button>
					)}
					<a href="https://puntoazulrestaurante.com/" target="_blank" class="flex items-center gap-2 p-2 rounded-lg bg-[#00BDF2] text-white font-medium text-sm shadow-md hover:bg-blue-600 transition" aria-label="Ver página web del local">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link w-4 h-4">
							<path d="M15 3h6v6" />
							<path d="M10 14 21 3" />
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						</svg>
						Ver Página Web
					</a>
				</div>

				{selectedIndex === null ? (
					/* Vista de lista de locales */
					<div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
						{locales.map((local, index) => {
							const blockedCount = (local.fechas_no_disponibles || []).length;
							return (
								<div
									key={local.codigo_local}
									className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 cursor-pointer"
									onClick={() => setSelectedIndex(index)}
								>
									<div className="relative h-64 overflow-hidden"> {/* Altura reducida para vista previa */}
										<img
											src={local.imagen}
											alt={local.nombre}
											className="w-full h-full object-cover"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
										<div className="absolute bottom-3 left-3">
											<h3 className="text-xl font-bold text-white">
												{local.nombre}
											</h3>
											<p className="text-sm text-white/80 flex items-center gap-1">
												<MapPin className='w-3 h-3' />
												{local.location}
											</p>
										</div>
									</div>

									<div className="p-4 space-y-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2 text-gray-700">
												<Clock className="w-4 h-4" />
												<span className="text-sm font-medium">
													Reserva: <b>{local.inicio_reserva} - {local.fin_reserva}</b>
												</span>
											</div>
											<div className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full font-semibold max-w-max">
												{blockedCount}{' '}
												{blockedCount === 1 ? 'bloqueo' : 'bloqueos'}
											</div>
										</div>
										<div className="border-t border-gray-100 pt-3 flex justify-between items-center">
											<div className="flex items-center gap-1 text-xs text-gray-600">
												<Users className='w-3 h-3' /> Max. Personas: <span className="font-bold text-gray-800">{local.cantidad_personas_max}</span>
											</div>
											<div className="flex items-center gap-1 text-xs text-gray-600">
												<ClipboardList className='w-3 h-3' /> Max. Reservas: <span className="font-bold text-gray-800">{local.nro_reservas_max}</span>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					/* Vista de detalle y configuración del local */
					<div className="grid lg:grid-cols-3 gap-8">
						{/* Columna 1: Formulario de Configuración General */}
						<div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-6 max-h-min">
							<h2 className="text-2xl font-bold text-gray-900 border-b pb-3 mb-4">
								⚙️ Configuración de {selectedLocal.nombre}
							</h2>

							{/* Campo: URL de Imagen */}
							{/* <div>
								<label htmlFor={`imagen-${selectedLocal.codigo_local}`} className="block text-sm font-medium text-gray-700 mb-1">
									URL de Imagen del Local
								</label>
								<input
									type="text"
									id={`imagen-${selectedLocal.codigo_local}`}
									value={selectedLocal.imagen} // <--- Usa el valor normalizado del estado
									onChange={(e) =>
										handleLocalFieldChange(selectedIndex, 'imagen', e.target.value)
									}
									className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
									placeholder="https://ejemplo.com/imagen.jpg"
								/>
								{selectedLocal.imagen && (
									<img
										src={selectedLocal.imagen}
										alt="Previsualización"
										className="mt-3 w-full h-32 object-cover rounded-lg border border-gray-200"
									/>
								)}
							</div> */}

							{/* Campo: Ubicación */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Ubicación (Dirección)
								</label>
								<div className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
									<MapPin className="w-4 h-4 text-gray-500" />
									<input
										type="text"
										value={selectedLocal.location}
										onChange={(e) =>
											handleLocalFieldChange(selectedIndex, 'location', e.target.value)
										}
										className="w-full bg-gray-50 focus:outline-none text-sm"
										placeholder="Av. Principal 123"
									/>
								</div>
							</div>

							{/* Rango de Reserva */}
							<div className='border-t pt-4'>
								<h3 className="text-md font-semibold text-gray-800 mb-2">Horario de Reservas</h3>
								<div className="flex gap-3">
									{/* Inicio Reserva */}
									<div className='flex-1'>
										<label className="block text-xs font-medium text-gray-600 mb-1">
											Inicio de reserva
										</label>
										<select
											value={selectedLocal.inicio_reserva}
											onChange={(e) =>
												handleLocalFieldChange(selectedIndex, 'inicio_reserva', e.target.value)
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
										>
											{opcionesMediaHora.map((h) => (
												<option key={h}>{h}</option>
											))}
										</select>
									</div>
									{/* Fin Reserva */}
									<div className='flex-1'>
										<label className="block text-xs font-medium text-gray-600 mb-1">
											Fin de reserva
										</label>
										<select
											value={selectedLocal.fin_reserva}
											onChange={(e) =>
												handleLocalFieldChange(selectedIndex, 'fin_reserva', e.target.value)
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
										>
											{opcionesMediaHora.map((h) => (
												<option key={h}>{h}</option>
											))}
										</select>
										{(selectedLocal.inicio_reserva && selectedLocal.fin_reserva) && !validarRangoHorario(selectedLocal.inicio_reserva, selectedLocal.fin_reserva) && (
											<p className="text-xs text-red-500 mt-1">El fin debe ser posterior al inicio de reserva.</p>
										)}
									</div>
								</div>
							</div>

							{/* Atención hasta */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Atención hasta (Hora máxima en local)
								</label>
								<select
									value={selectedLocal.atencion_hasta_x_hora}
									onChange={(e) =>
										handleLocalFieldChange(selectedIndex, 'atencion_hasta_x_hora', e.target.value)
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
								>
									{opcionesMediaHora.map((h) => (
										<option key={h}>{h}</option>
									))}
								</select>
								{(selectedLocal.fin_reserva && selectedLocal.atencion_hasta_x_hora) && !validarRangoHorario(selectedLocal.fin_reserva, selectedLocal.atencion_hasta_x_hora) && (
									<p className="text-xs text-red-500 mt-1">Debe ser posterior a la hora de fin de reserva.</p>
								)}
							</div>


							{/* Números Máximos */}
							<div className="grid grid-cols-2 gap-3 border-t pt-4">
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">
										Máx. Personas por Reserva
									</label>
									<input
										type="number"
										min="1"
										max="50"
										value={selectedLocal.cantidad_personas_max}
										onChange={(e) =>
											handleLocalFieldChange(selectedIndex, 'cantidad_personas_max', e.target.value)
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">
										Máx. Reservas por Día
									</label>
									<input
										type="number"
										min="1"
										max="100"
										value={selectedLocal.nro_reservas_max}
										onChange={(e) =>
											handleLocalFieldChange(selectedIndex, 'nro_reservas_max', e.target.value)
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
									/>
								</div>
							</div>

							{/* Días Disponibles */}
							<div className="border-t pt-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Días Disponibles para Reserva
								</label>
								<div className="grid grid-cols-4 gap-2">
									{DIAS_SEMANA.map((dia) => (
										<label
											key={dia.key}
											className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-100"
										>
											<input
												type="checkbox"
												checked={selectedLocal.dias_disponibles.includes(dia.key)}
												onChange={(e) => {
													const currentDays = selectedLocal.dias_disponibles;
													let newDays;
													if (e.target.checked) {
														newDays = [...currentDays, dia.key].sort((a, b) =>
															DIAS_SEMANA.findIndex(d => d.key === a) - DIAS_SEMANA.findIndex(d => d.key === b)
														);
													} else {
														newDays = currentDays.filter((d) => d !== dia.key);
													}
													handleLocalFieldChange(selectedIndex, 'dias_disponibles', newDays);
												}}
												className="w-4 h-4 text-gray-800 focus:ring-gray-700 border-gray-300 rounded"
											/>
											{dia.label}
										</label>
									))}
								</div>
							</div>
						</div>


						{/* Columna 2 y 3: Calendario de Bloqueos y Fechas Bloqueadas */}
						<div className="lg:col-span-2 space-y-6">
							<div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
								<h2 className="text-2xl font-bold text-gray-900 border-b pb-3 mb-4">
									🗓️ Bloqueo de Fechas y Horas
								</h2>
								<p className="text-sm text-gray-600 mb-4">
									Haz click en una fecha en el calendario para bloquear horas específicas o el día completo.
								</p>
								<div className="flex justify-center">
									<DayPicker
										mode="single"
										onDayClick={(day, modifiers, event) => {
											if (modifiers.disabled) return;
											handleDayClick(day, selectedIndex, event);
										}}
										locale={es}
										className="custom-calendar-style"
										modifiers={{
											blocked: selectedLocal.fechas_no_disponibles.map(f => parseDate(f.fecha_bloq)),
										}}
										modifiersStyles={{
											blocked: {
												backgroundColor: 'rgba(239, 68, 68, 0.1)', // Rojo suave
												color: '#ef4444', // Rojo
												borderRadius: '8px',
												fontWeight: 'bold',
												border: '1px solid #fecaca',
											},
										}}
										footer={
											<p className="text-xs text-gray-500 mt-2">
												Días con fondo rojo suave tienen bloqueos.
											</p>
										}
									/>
								</div>
							</div>

							{/* Lista de Fechas Bloqueadas */}
							<div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
								<h3 className="text-xl font-bold text-gray-900 border-b pb-3 mb-4">
									Lista de Bloqueos Activos ({selectedLocal.fechas_no_disponibles.length})
								</h3>
								<div className="space-y-3 max-h-96 overflow-y-auto pr-2">
									{selectedLocal.fechas_no_disponibles.length > 0 ? (
										selectedLocal.fechas_no_disponibles
											.sort((a, b) => parseDate(a.fecha_bloq) - parseDate(b.fecha_bloq))
											.map((fb, idx) => (
												<div
													key={idx}
													className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-start justify-between cursor-pointer hover:bg-red-100 transition-colors"
													onClick={(e) => {
														// Simula el click en el calendario para abrir el modal
														const fakeDate = parseDate(fb.fecha_bloq);
														handleDayClick(fakeDate, selectedIndex, e);
													}}
												>
													<div className="flex flex-col">
														<span className="font-semibold text-red-800 text-sm mb-1">
															{formatDateToDisplay(fb.fecha_bloq)}
														</span>
														<span className={`text-xs ${fb.horas === false ? 'text-red-900 font-bold' : 'text-gray-700'}`}>
															{fb.horas === false
																? '🚫 Día Completo Bloqueado'
																: `Bloqueado: ${fb.horas.length} ${fb.horas.length === 1 ? 'rango' : 'rangos'}`
															}
														</span>
													</div>
													<button
														onClick={(e) => {
															e.stopPropagation(); // Evitar abrir el modal al hacer click en la X
															setModalConfig({ localIndex: selectedIndex, fecha: fb.fecha_bloq, nombre: selectedLocal.nombre });
															// Forzar eliminación sin abrir el modal de configuración
															setTimeout(() => eliminarBloqueo(), 100);
														}}
														className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-200 transition"
														title="Eliminar bloqueo de fecha"
													>
														<X className="w-4 h-4" />
													</button>
												</div>
											))
									) : (
										<p className="text-gray-500 text-sm">
											No hay fechas bloqueadas para este local.
										</p>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Estilos adicionales para DayPicker (necesarios para el estilo personalizado) */}
			<style jsx global>{`
                .custom-calendar-style .rdp {
                    --rdp-cell-size: 40px; 
                    --rdp-caption-font-size: 1.125rem; 
                    padding: 0;
                }
                .custom-calendar-style .rdp-day {
                    width: var(--rdp-cell-size);
                    height: var(--rdp-cell-size);
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .custom-calendar-style .rdp-day_selected:not([aria-disabled='true']),
                .custom-calendar-style .rdp-day_selected:hover:not([aria-disabled='true']) {
                    background-color: #1f2937; /* Gray 800 para seleccion manual */
                    color: white;
                }
                .custom-calendar-style .rdp-day:hover:not([aria-disabled='true']) {
                    background-color: #f3f4f6; /* Gray 100 on hover */
                }
                .custom-calendar-style .rdp-button {
                    border-radius: 8px;
                }
                .custom-calendar-style .rdp-nav_button {
                    color: #4b5563; /* Gray 600 */
                }
                .custom-calendar-style .rdp-head_cell {
                    color: #1f2937; /* Gray 800 */
                    font-weight: 600;
                }
            `}</style>
		</div>
	);
}