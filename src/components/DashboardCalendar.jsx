import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import 'react-day-picker/style.css';

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

	const showNotification = (type, message) => {
		setNotification({ type, message });
		setTimeout(() => setNotification(null), 4000);
	};

	const formatDateToString = (date) => {
		// Asegurarnos de que date sea un objeto Date válido
		const d = String(date.getDate()).padStart(2, '0');
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const y = date.getFullYear();
		// WordPress espera formato: mm/dd/yyyy (formato americano)
		return `${m}/${d}/${y}`;
	};

	const formatDateToDisplay = (dateStr) => {
		// dateStr viene en formato "mm/dd/yyyy"
		const [m, d, y] = dateStr.split('/');
		// Mostrar en formato legible: dd/mm/yyyy
		return `${d}/${m}/${y}`;
	};

	const parseDate = (str) => {
		// str viene en formato "mm/dd/yyyy" desde WordPress
		const [m, d, y] = str.split('/').map(Number);
		// Date() espera (año, mes-1, día)
		return new Date(y, m - 1, d);
	};

	const generarOpcionesMediaHora = () => {
		const opciones = [];
		for (let h = 0; h < 24; h++) {
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
			setLocales(data.acf.locales || []);
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

	// ✅ Cambio 1: Prevenir deselección de días bloqueados
	const handleDayClick = (fecha, index, event) => {
		event.preventDefault();

		// Asegurarnos de trabajar con un objeto Date
		const fechaObj = new Date(fecha);

		// Guardamos en formato mm/dd/yyyy para WordPress
		const fechaStr = `${
			fechaObj.getMonth() + 1
		}/${fechaObj.getDate()}/${fechaObj.getFullYear()}`;

		console.log('Fecha clickeada:', fechaObj);
		console.log('Fecha para WordPress:', fechaStr);

		const fechas = locales[index].fechas_no_disponibles || [];
		const fechaExistente = fechas.find((f) => f.fecha_bloq === fechaStr);

		if (fechaExistente) {
			setModalConfig({ localIndex: index, fecha: fechaStr });
			setModalRangos(
				fechaExistente.horas && Array.isArray(fechaExistente.horas)
					? fechaExistente.horas
					: []
			);
			setBloqueoDiaCompleto(fechaExistente.horas === false);
		} else {
			setModalConfig({ localIndex: index, fecha: fechaStr });
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

			// Validar rangos
			for (const r of modalRangos) {
				if (r.hora_fin === r.hora_inicio) {
					showNotification(
						'error',
						'Las horas de inicio y fin no pueden ser iguales'
					);
					return;
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

		// ✅ Cambio 2: Guardar correctamente el formato de horas
		const nuevoBloqueo = {
			fecha_bloq: modalConfig.fecha,
			horas: bloqueoDiaCompleto
				? false
				: modalRangos.map((r) => ({
						hora_inicio: r.hora_inicio,
						hora_fin: r.hora_fin,
				  })),
		};

		console.log('Guardando bloqueo:', nuevoBloqueo);
		fechasFiltradas.push(nuevoBloqueo);

		newLocales[modalConfig.localIndex].fechas_no_disponibles = fechasFiltradas;
		console.log(
			'Fechas no disponibles actualizadas:',
			newLocales[modalConfig.localIndex].fechas_no_disponibles
		);

		setLocales(newLocales);
		setHasChanges(true);
		setModalConfig(null);
		setModalRangos([]);
		setBloqueoDiaCompleto(false);
		// showNotification(
		// 	'success',
		// 	'Bloqueo configurado. No olvides guardar los cambios.'
		// );
	};

	const eliminarBloqueo = () => {
		const newLocales = [...locales];
		const fechas =
			newLocales[modalConfig.localIndex].fechas_no_disponibles || [];
		newLocales[modalConfig.localIndex].fechas_no_disponibles = fechas.filter(
			(f) => f.fecha_bloq !== modalConfig.fecha
		);

		setLocales(newLocales);
		setHasChanges(true);
		setModalConfig(null);
		setModalRangos([]);
		setBloqueoDiaCompleto(false);
		// showNotification(
		// 	'success',
		// 	'Bloqueo eliminado. No olvides guardar los cambios.'
		// );
	};

	// ✅ Cambio 3: Enviar solo fechas_no_disponibles sin tocar las imágenes
	const guardarCambios = async () => {
		setSaving(true);

		try {
			// Preparar el payload solo con fechas_no_disponibles
			const localesFormateados = locales.map((local) => ({
				codigo_local: local.codigo_local,
				nombre: local.nombre,
				// NO enviamos 'imagen' para evitar que se borre
				location: local.location,
				inicio_reserva: local.inicio_reserva,
				fin_reserva: local.fin_reserva,
				dias_disponibles: local.dias_disponibles,
				nro_reservas_max: local.nro_reservas_max,
				cantidad_personas_max: local.cantidad_personas_max,
				atencion_hasta_x_hora: local.atencion_hasta_x_hora,
				fechas_no_disponibles: local.fechas_no_disponibles || [],
			}));

			const payload = { fields: { locales: localesFormateados } };

			console.log('=== DATA A ENVIAR A WORDPRESS ===');
			console.log(JSON.stringify(payload, null, 2));
			console.log('=== FECHAS ESPECÍFICAS ===');
			localesFormateados.forEach((local, idx) => {
				console.log(
					`Local ${idx} (${local.nombre}):`,
					local.fechas_no_disponibles
				);
			});

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
				console.error('Respuesta de error:', errorText);
				throw new Error(`Error ${res.status}: ${errorText}`);
			}

			const responseData = await res.json();
			console.log('=== RESPUESTA DE WORDPRESS ===');
			console.log(JSON.stringify(responseData, null, 2));

			showNotification('success', 'Cambios guardados correctamente');
			setHasChanges(false);

			// Recargar datos para sincronizar
			await fetchLocales();
		} catch (err) {
			showNotification('error', 'Error al guardar: ' + err.message);
			console.error('Error completo:', err);
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
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 w-full">
			{/* Notificaciones */}
			{notification && (
				<div className="fixed top-24 right-6 z-50">
					<div
						className={`px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${
							notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
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
			<div className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex justify-center">
						<img
							src={logo}
							alt="Punto Azul"
							className="w-14 h-14 object-contain"
						/>
					</div>
					{/* <div className="hidden md:flex items-center gap-3">
						{selectedIndex !== null && (
							<button
								onClick={() => setSelectedIndex(null)}
								className="mr-2 p-2 rounded-md bg-gray-100 hover:bg-gray-200"
								aria-label="Volver"
							>
								<ArrowLeft className="w-5 h-5 text-gray-700" />
							</button>
						)}
						<div className="bg-gray-800 p-3 rounded-lg">
							<Calendar className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Gestión de Disponibilidad
							</h1>
							<p className="text-gray-500 text-sm">
								{locales.length} {locales.length === 1 ? 'local' : 'locales'}{' '}
								disponibles
							</p>
						</div>
					</div> */}
					<div className="flex items-center gap-2">
						<button
							onClick={guardarCambios}
							disabled={saving || !hasChanges}
							className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
								hasChanges
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
								Configurar bloqueo
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
								className="w-4 h-4"
							/>
							<span className="text-sm text-gray-700 font-medium">
								Bloquear todo el día
							</span>
						</label>

						{!bloqueoDiaCompleto && (
							<div className="space-y-3 mb-6">
								{modalRangos.map((r, i) => (
									<div key={i} className="flex gap-2 items-center">
										<select
											value={r.hora_inicio}
											onChange={(e) =>
												actualizarRango(i, 'hora_inicio', e.target.value)
											}
											className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
											className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
										>
											{opcionesMediaHora.map((h) => (
												<option key={h}>{h}</option>
											))}
										</select>

										<button
											onClick={() => eliminarRango(i)}
											className="text-red-600 hover:text-red-700"
										>
											<X className="w-5 h-5" />
										</button>
									</div>
								))}

								<button
									onClick={agregarRango}
									className="flex items-center gap-2 text-gray-800 hover:text-black font-medium text-sm"
								>
									<Plus className="w-4 h-4" />
									Agregar rango horario
								</button>
							</div>
						)}

						<div className="flex gap-3">
							<button
								onClick={eliminarBloqueo}
								className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
							>
								Eliminar
							</button>
							<button
								onClick={guardarBloqueo}
								className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-colors"
							>
								Guardar
							</button>
						</div>
					</div>
				</div>
			)}

			{/* LOCALES: vista previa o detalle */}
			<div className="max-w-7xl mx-auto px-6 py-8">
				<div className="mb-5">
					{selectedIndex !== null && (
						<button
							onClick={() => setSelectedIndex(null)}
							className="mr-2 p-2 rounded-md bg-gray-100 hover:bg-gray-200"
							aria-label="Volver"
						>
							<ArrowLeft className="w-5 h-5 text-gray-700" />
						</button>
					)}
				</div>
				{selectedIndex === null ? (
					<div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
						{locales.map((local, index) => {
							const blockedCount = (local.fechas_no_disponibles || []).length;
							return (
								<div
									key={local.codigo_local}
									className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 cursor-pointer"
									onClick={() => setSelectedIndex(index)}
								>
									<div className="relative h-96 overflow-hidden">
										<img
											src={local.imagen}
											alt={local.nombre}
											className="w-full h-full object-cover"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
										<div className="absolute bottom-3 left-3">
											<h3 className="text-lg font-bold text-white">
												{local.nombre}
											</h3>
											<p className="text-xs text-white/80">{local.location}</p>
										</div>
									</div>
									<div className="p-4">
										<div className="flex items-center justify-between">
											<div className="text-sm text-gray-600">
												{local.inicio_reserva} - {local.fin_reserva}
											</div>
											<div className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full">
												{blockedCount}{' '}
												{blockedCount === 1 ? 'bloqueo' : 'bloqueos'}
											</div>
										</div>
										<div className="mt-3">
											<button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 font-medium">
												Configurar
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="grid grid-cols-1">
						{locales
							.slice(selectedIndex, selectedIndex + 1)
							.map((local, indexOffset) => {
								const index = selectedIndex;
								const fechasBloqueadas = (
									local.fechas_no_disponibles || []
								).map((f) => parseDate(f.fecha_bloq));

								return (
									<div
										key={local.codigo_local}
										className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 md:flex"
									>
										<img
											src={local.imagen}
											alt={local.nombre}
											className="w-full max-h-72 md:max-h-[600px] object-cover"
										/>
										<div className="p-4 md:p-6">
											<h2 className="text-xl font-bold text-gray-900 mb-3">
												{local.nombre}
											</h2>

											<div className="flex items-center gap-2 text-gray-600 mb-2">
												<MapPin className="w-5 h-5 text-gray-700" />
												<span className="text-sm">{local.location}</span>
											</div>

											<div className="flex items-center gap-2 text-gray-600 mb-4">
												<Clock className="w-5 h-5 text-gray-700" />
												<span className="text-sm">
													{local.inicio_reserva} - {local.fin_reserva}
												</span>
											</div>

											<div className="border border-gray-200 rounded-xl p-2 sm:p-4 bg-gray-50 max-w-full overflow-x-auto">
												<DayPicker
													mode="single"
													selected={fechasBloqueadas[0]}
													onDayClick={(day, modifiers, e) =>
														handleDayClick(day, index, e)
													}
													disabled={{ before: new Date() }}
													locale={es}
													weekStartsOn={1}
													className="mx-auto w-full"
													modifiers={{
														blocked: fechasBloqueadas,
													}}
													modifiersStyles={{
														blocked: {
															backgroundColor: '#d1d5db',
															color: '#000',
															borderRadius: '50%',
															fontWeight: 'bold',
														},
													}}
												/>
											</div>

											<p className="text-center text-xs text-gray-500 mt-3 italic">
												Haz clic en una fecha para configurar horarios de
												bloqueo
											</p>

											<p className="text-center text-xs text-gray-500 mt-6 mx-2 font-semibold">
												Las fechas en gris están bloqueadas y no se pueden
												seleccionar.
											</p>
										</div>
									</div>
								);
							})}
					</div>
				)}
			</div>

			{hasChanges && (
				<div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
					<div className="bg-amber-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
						<AlertCircle className="w-5 h-5" />
						<span className="font-medium">Tienes cambios sin guardar</span>
					</div>
				</div>
			)}
		</div>
	);
}
