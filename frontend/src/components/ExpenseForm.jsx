import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { notificationService } from '../services/notificationService';

const CATEGORIES_GASTOS = ['Transporte', 'Lavadero', 'Comida', 'Nafta', 'Estacionamiento', 'Otro'];
const CATEGORIES_INGRESOS = ['Venta', 'Inyección Capital', 'Cobro', 'Otro'];

function ExpenseForm({ onSaved, empleado, tipoRegistro }) {
    // Calculamos la fecha local real de Argentina (UTC-3)
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    const fechaLocal = new Date(ahora.getTime() - offset).toISOString().split('T')[0];

    // --- ESTADOS PARA EL FORMULARIO DE CARGA ---
    const [formData, setFormData] = useState({
        monto: '',
        categoria: '',
        descripcion: '',
        metodo_pago: 'MP',
        fecha: fechaLocal
    });

    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');

    // --- ESTADOS PARA LA LÓGICA DE JIRA / SPRINTS ---
    const [activeSprint, setActiveSprint] = useState(null);
    const [loadingSprint, setLoadingSprint] = useState(true);
    const [vehicles, setVehicles] = useState([]);
    const [sprintFormData, setSprintFormData] = useState({
        nombre: '',
        fecha_inicio: fechaLocal,
        fecha_fin_estimada: fechaLocal,
        notas: ''
    });

    // Verificar si hay un Sprint activo y cargar vehículos al montar
    useEffect(() => {
        checkActiveSprint();
        fetchVehiculos();
    }, []);

    // Reseteamos la categoría al cambiar entre Gasto e Ingreso
    useEffect(() => {
        setFormData(prev => ({ ...prev, categoria: '' }));
    }, [tipoRegistro]);

    const checkSprintReminder = async (sprint) => {
        try {
            const fechaInicio = new Date(sprint.fecha_inicio);
            const hoy = new Date();
            const timeDiff = hoy.getTime() - fechaInicio.getTime();
            const daysOpen = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            
            // Se considera largo si lleva abierto 3 días o más, o si superó la fecha estimada
            const isTooLong = daysOpen >= 3;
            const isPastEstimated = sprint.fecha_fin_estimada && new Date(hoy.toISOString().split('T')[0]) > new Date(sprint.fecha_fin_estimada);

            if (isTooLong || isPastEstimated) {
                const localStorageKey = `last_sprint_reminder_sent_${sprint.id}`;
                const lastSentStr = localStorage.getItem(localStorageKey);
                const lastSent = lastSentStr ? new Date(parseInt(lastSentStr, 10)) : null;
                
                // Si nunca se envió o pasaron más de 24 horas (86400000 ms)
                if (!lastSent || (hoy.getTime() - lastSent.getTime() > 24 * 60 * 60 * 1000)) {
                    await notificationService.sendSprintReminder(sprint, daysOpen);
                    localStorage.setItem(localStorageKey, hoy.getTime().toString());
                    console.log(`Recordatorio de sprint inactivo/abierto enviado. ID: ${sprint.id}`);
                }
            }
        } catch (err) {
            console.error("Error al procesar el recordatorio del sprint:", err);
        }
    };

    const checkActiveSprint = async () => {
        setLoadingSprint(true);
        try {
            const { data, error } = await supabase
                .from('sprints')
                .select('*')
                .eq('estado', 'activo')
                .maybeSingle();

            if (error) throw error;
            setActiveSprint(data);
            if (data) {
                checkSprintReminder(data);
            }
        } catch (err) {
            console.error("Error al chequear el sprint activo:", err);
        } finally {
            setLoadingSprint(false);
        }
    };

    const fetchVehiculos = async () => {
        try {
            const { data, error } = await supabase
                .from('vehiculos')
                .select('*')
                .order('patente', { ascending: true });
            if (error) throw error;
            setVehicles(data || []);
        } catch (err) {
            console.error("Error al cargar vehículos:", err);
        }
    };

    const getCarLabel = (v) => {
        if (!v || !v.marca_modelo || !v.patente) return '';
        const words = v.marca_modelo.split(' ');
        const model = words.length > 1 ? words.slice(1).join(' ') : words[0];
        const suffix = v.patente.slice(-2).toUpperCase();
        return `${model} ${suffix}`;
    };

    const handleSprintChange = (e) => {
        const { name, value } = e.target;
        setSprintFormData(prev => ({ ...prev, [name]: value }));
    };

    // Crear un nuevo Sprint (Abrir Tablero)
    const handleStartSprint = async (e) => {
        e.preventDefault();
        if (!sprintFormData.nombre) return;

        setLoadingSprint(true);
        try {
            // Mandamos los datos limpios evitando formatos ISO complejos que rompan Supabase (Error 400)
            const nuevoSprint = {
                nombre: sprintFormData.nombre,
                fecha_inicio: sprintFormData.fecha_inicio, 
                fecha_fin_estimada: sprintFormData.fecha_fin_estimada, 
                notas: sprintFormData.notas,
                operador: empleado || 'mmanu',
                estado: 'activo'
            };

            const { data, error } = await supabase
                .from('sprints')
                .insert([nuevoSprint])
                .select()
                .single();

            if (error) {
                console.error("Error detallado devuelto por Supabase:", error);
                throw error;
            }

            setActiveSprint(data);

            // Notificar apertura de sprint a n8n
            if (data) {
                try {
                    await notificationService.sendSprintOpened(data);
                } catch (errNotif) {
                    console.error("Error al enviar notificación de apertura de sprint:", errNotif);
                }
            }

            // Limpiar form de sprint y restablecer a fecha local
            setSprintFormData({ nombre: '', fecha_inicio: fechaLocal, fecha_fin_estimada: fechaLocal, notas: '' });
        } catch (err) {
            console.error("Error al iniciar el sprint:", err);
            alert("No se pudo iniciar el período de control");
        } finally {
            setLoadingSprint(false);
        }
    };

    // Concluir y Cerrar Sprint Actual
    const handleCloseSprint = async () => {
        if (!window.confirm("¿Estás seguro de que querés cerrar este período y generar el reporte final?")) return;

        setLoadingSprint(true);
        try {
            const { error } = await supabase
                .from('sprints')
                .update({ 
                    estado: 'cerrado',
                    fecha_fin_real: new Date().toISOString()
                })
                .eq('id', activeSprint.id);

            if (error) throw error;

            setActiveSprint(null);
            if (onSaved) onSaved(); 
        } catch (err) {
            console.error("Error al cerrar el sprint:", err);
            alert("Hubo un problema al cerrar el período");
        } finally {
            setLoadingSprint(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.monto || !activeSprint) return;

        setLoading(true);
        setStatusText('Guardando...');

        try {
            const registroToInsert = {
                monto: parseFloat(formData.monto), 
                categoria: formData.categoria,
                descripcion: formData.descripcion || '', 
                creado_por: empleado,
                sprint_id: activeSprint.id // Enlazamos al Sprint activo
            };

            if (tipoRegistro === 'gastos') {
                registroToInsert.fecha_gasto = formData.fecha;
                registroToInsert.metodo_pago = formData.metodo_pago;
            } else {
                registroToInsert.fecha = formData.fecha;
                registroToInsert.metodo_pago = formData.metodo_pago;
            }

            const { error } = await supabase
                .from(tipoRegistro)
                .insert([registroToInsert]);

            if (error) throw error;

            setStatusText('¡Guardado!');
            setFormData(prev => ({ ...prev, monto: '', descripcion: '' }));
            
            if (onSaved) onSaved();
            
        } catch (err) {
            console.error("Error al guardar la transacción:", err);
            setStatusText('Error: revisá la consola');
        } finally {
            setTimeout(() => setStatusText(''), 3000);
            setLoading(false);
        }
    };

    const categoriasActuales = tipoRegistro === 'gastos' ? CATEGORIES_GASTOS : CATEGORIES_INGRESOS;

    if (loadingSprint) {
        return <div className="text-center p-5 text-slate-500 font-semibold animate-pulse">Cargando Tablero de Control...</div>;
    }

    return (
        <div className="space-y-6">
            
            {/* ==================== SECCIÓN ESTILO JIRA / RENTLY CHECK ==================== */}
            {!activeSprint ? (
                // ESTADO 1: Tablero Cerrado -> Bloqueo y Configuración Obligatoria
                <div className="bg-slate-100/80 rounded-[1.5rem] p-5 border-2 border-dashed border-slate-300 shadow-inner space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔑</span>
                        <h3 className="font-bold text-slate-700 tracking-tight">Control de Turno e Ingresos</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Para habilitar la carga de ingresos/gastos y asegurar la trazabilidad del software, debés abrir el tablero de control de este período.
                    </p>
                    
                    <form onSubmit={handleStartSprint} className="space-y-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Auto Asociado (Período)</label>
                            <select 
                                name="nombre"
                                required
                                value={sprintFormData.nombre}
                                onChange={handleSprintChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="" disabled>-- Seleccione un Vehículo --</option>
                                {vehicles.map(v => {
                                    const label = getCarLabel(v);
                                    return (
                                        <option key={v.id} value={label}>
                                            {v.marca_modelo} ({v.patente})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Rango de Fechas (Desde - Hasta) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fecha de Inicio</label>
                                <input 
                                    type="date"
                                    name="fecha_inicio"
                                    required
                                    value={sprintFormData.fecha_inicio}
                                    onChange={handleSprintChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fecha Fin Estimada</label>
                                <input 
                                    type="date"
                                    name="fecha_fin_estimada"
                                    required
                                    value={sprintFormData.fecha_fin_estimada}
                                    onChange={handleSprintChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Comentarios</label>
                            <textarea 
                                name="notas"
                                placeholder="Notas sobre el estado del dinero, reservas asociadas, etc..."
                                value={sprintFormData.notas}
                                onChange={handleSprintChange}
                                rows="2"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 active:scale-[0.99]"
                        >
                            <span>🔓</span> Abrir Tablero de Carga
                        </button>
                    </form>
                </div>
            ) : (
                // ESTADO 2: Tablero Abierto -> Información Compacta del Sprint Corriendo
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-[1.5rem] p-4 shadow-sm flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">Tablero de Carga Liberado</h4>
                        </div>
                        <button
                            onClick={handleCloseSprint}
                            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-1 px-3 rounded-lg text-xs transition-all shadow-sm active:scale-[0.95]"
                        >
                            🔒 Cerrar Período y Reporte
                        </button>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-blue-100/50 text-xs space-y-1.5 text-slate-600 font-medium">
                        <div><strong className="text-blue-900 font-bold">Período:</strong> {activeSprint.nombre}</div>
                        {activeSprint.notas && (
                            <div className="truncate"><strong className="text-blue-900 font-bold">Comentarios:</strong> "{activeSprint.notas}"</div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                            <span>Op: {activeSprint.operador}</span>
                            <span>Estimado fin: {activeSprint.fecha_fin_estimada.split('-').reverse().join('/')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== FORMULARIO DE INGRESOS Y GASTOS ==================== */}
            <form onSubmit={handleSubmit} className={`space-y-5 transition-all duration-300 ${!activeSprint ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col space-y-5 bg-gradient-to-b from-white to-slate-50/50">
                    
                    {/* Monto */}
                    <div className="relative">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Monto</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-5 text-2xl font-black text-slate-300">$</span>
                            <input
                                type="number"
                                name="monto"
                                value={formData.monto}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                required={!!activeSprint}
                                disabled={!activeSprint}
                                placeholder="0.00"
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-3xl font-black text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Fecha */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Fecha</label>
                            <input
                                type="date"
                                name="fecha"
                                value={formData.fecha}
                                onChange={handleChange}
                                required={!!activeSprint}
                                disabled={!activeSprint}
                                className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                        </div>

                        {/* Categoría */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Categoría</label>
                            <div className="relative">
                                <select
                                    name="categoria"
                                    value={formData.categoria}
                                    onChange={handleChange}
                                    required={!!activeSprint}
                                    disabled={!activeSprint}
                                    className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                                >
                                    <option value="" disabled>Seleccionar</option>
                                    {categoriasActuales.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Descripción (Opcional)</label>
                        <input
                            type="text"
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            disabled={!activeSprint}
                            placeholder="¿Por qué motivo?"
                            className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Método de Pago */}
                <div className="relative">
                    <select
                        name="metodo_pago"
                        value={formData.metodo_pago}
                        onChange={handleChange}
                        disabled={!activeSprint}
                        className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                    >
                        <option value="MP">MP</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>                     
                
                <button
                    type="submit"
                    disabled={loading || !activeSprint}
                    className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] ${
                        tipoRegistro === 'gastos' 
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                            : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                    }`}
                >
                    {statusText || (tipoRegistro === 'gastos' ? 'Guardar Gasto' : 'Guardar Ingreso')}
                </button>
            </form>
        </div>
    );
}

export default ExpenseForm;
