import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Wrench, Car, Clipboard, DollarSign, CreditCard, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';

function FormularioMantenimiento({ initialPatente = '', onCancel, onSaved }) {
  const navigate = useNavigate();

  // --- ESTADOS DEL FORMULARIO ---
  const [mantenimiento, setMantenimiento] = useState('');
  const [patente, setPatente] = useState(initialPatente);
  const [kilometros, setKilometros] = useState('');
  const [total, setTotal] = useState('');
  const [medioPago, setMedioPago] = useState('');

  // --- ESTADOS DE CONTROL ---
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [activeSprint, setActiveSprint] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);

  // Obtener nombre del operador
  const empleado = localStorage.getItem('nombre_empleado') || 'Operador General';

  // --- CARGAR DATOS INICIALES ---
  useEffect(() => {
    fetchActiveSprint();
    fetchVehiculos();
  }, []);

  // --- ACTUALIZAR INFORMACIÓN DEL VEHÍCULO DETECTADO ---
  useEffect(() => {
    if (patente.trim() === '') {
      setSelectedVehiculo(null);
      return;
    }
    const cleanPatente = patente.trim().toUpperCase();
    const found = vehiculos.find(v => v.patente.toUpperCase() === cleanPatente);
    setSelectedVehiculo(found || null);
  }, [patente, vehiculos]);

  // Actualizar patente si cambia la prop inicial
  useEffect(() => {
    if (initialPatente) {
      setPatente(initialPatente);
    }
  }, [initialPatente]);

  const fetchActiveSprint = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('estado', 'activo')
        .maybeSingle();

      if (error) throw error;
      setActiveSprint(data);
    } catch (err) {
      console.error('Error al chequear sprint activo:', err);
    }
  };

  const fetchVehiculos = async () => {
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*');

      if (error) throw error;
      setVehiculos(data || []);
    } catch (err) {
      console.error('Error al cargar vehículos:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!activeSprint) {
      setErrorText('No se puede guardar: Debes iniciar un período de control en Finanzas primero.');
      return;
    }

    if (!mantenimiento || !patente || !kilometros || !total || !medioPago) {
      setErrorText('Por favor, completa todos los campos.');
      return;
    }

    if (!selectedVehiculo) {
      setErrorText('La patente ingresada no corresponde a ningún vehículo de la flota.');
      return;
    }

    setLoading(true);
    setErrorText('');

    try {
      const cleanPatente = patente.trim().toUpperCase();
      const numTotal = parseFloat(total);
      const numKm = parseInt(kilometros, 10);

      // Calculamos la fecha local de hoy en Argentina (UTC-3)
      const ahora = new Date();
      const offset = ahora.getTimezoneOffset() * 60000;
      const fechaLocal = new Date(ahora.getTime() - offset).toISOString().split('T')[0];

      // 1. Guardar en historial_services
      const serviceRecord = {
        vehiculo_id: selectedVehiculo.id,
        km_servicio: numKm,
        tipo_aceite: selectedVehiculo.tipo_aceite || 'No especificado',
        detalles: mantenimiento,
        monto: numTotal,
        medio_pago: medioPago,
        fecha: fechaLocal
      };

      const { error: serviceError } = await supabase
        .from('historial_services')
        .insert([serviceRecord]);

      if (serviceError) throw serviceError;

      // 2. Guardar en tabla GASTOS para impactar en Finanzas
      const gastoRecord = {
        monto: numTotal,
        categoria: 'Mantenimiento',
        descripcion: `Mantenimiento: ${mantenimiento} | Patente: ${cleanPatente} | KM: ${numKm}`,
        creado_por: empleado,
        sprint_id: activeSprint.id,
        fecha_gasto: fechaLocal,
        metodo_pago: medioPago
      };

      const { error: gastoError } = await supabase
        .from('gastos')
        .insert([gastoRecord]);

      if (gastoError) throw gastoError;

      // 3. Actualizar KM del vehículo en la tabla vehiculos
      const { error: kmError } = await supabase
        .from('vehiculos')
        .update({ km_actual: numKm })
        .eq('id', selectedVehiculo.id);

      if (kmError) throw kmError;

      setSuccess(true);
      setTimeout(() => {
        if (onSaved) {
          onSaved();
        } else {
          navigate('/');
        }
      }, 2000);

    } catch (err) {
      console.error('Error al guardar el mantenimiento:', err);
      setErrorText('Hubo un error al guardar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
      
      {/* BARRA DE COLOR SUPERIOR */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

      {success ? (
        <div className="py-8 text-center space-y-4 animate-fade-in">
          <div className="inline-flex p-4 bg-green-50 text-green-500 rounded-full mb-2 animate-bounce">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">¡Registro Guardado!</h3>
          <p className="text-slate-500 max-w-xs mx-auto">
            El mantenimiento fue cargado exitosamente como gasto en el módulo de Finanzas.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* BOTÓN VOLVER (Opcional, sólo si no hay un onCancel explícito o si no está embebido) */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors group mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Cancelar y Volver
            </button>
          )}

          {/* AVISO DE SPRINT INACTIVO */}
          {!activeSprint && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800 text-sm font-medium leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Atención:</span> No hay un período de control activo en Finanzas. Debes abrir un turno/tablero antes de poder registrar transacciones.
              </div>
            </div>
          )}

          {/* CAMPO: TIPO DE MANTENIMIENTO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
              Tipo de Mantenimiento
            </label>
            <div className="relative">
              <select
                value={mantenimiento}
                onChange={(e) => setMantenimiento(e.target.value)}
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="" disabled>Seleccione una opción</option>
                <option value="Service">Service</option>
                <option value="Mecánica">Mecánica</option>
                <option value="Chapista">Chapista</option>
                <option value="Cerrajería">Cerrajería</option>
                <option value="RTO">RTO</option>
                <option value="Electricista">Electricista</option>
                <option value="Otro">Otro</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* CAMPO: PATENTE VEHÍCULO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
              Patente Vehículo
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Car className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={patente}
                onChange={(e) => setPatente(e.target.value)}
                required
                placeholder="Ej: AA123BB"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none uppercase placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* DETALLE DEL VEHÍCULO DETECTADO */}
            {selectedVehiculo && (
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-1 mt-1 text-slate-600 animate-fade-in flex items-center justify-between">
                <div>
                  <strong className="text-blue-900 font-bold block text-sm">
                    🚗 {selectedVehiculo.marca_modelo}
                  </strong>
                  <span className="text-slate-500 font-medium">
                    Km registrado anterior: <strong>{selectedVehiculo.km_actual.toLocaleString()} km</strong>
                  </span>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                  Detectado
                </span>
              </div>
            )}
          </div>

          {/* CAMPO: KILÓMETROS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
              Kilómetros Actuales
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Clipboard className="w-4 h-4" />
              </span>
              <input
                type="number"
                value={kilometros}
                onChange={(e) => setKilometros(e.target.value)}
                required
                min="0"
                placeholder="Ej: 85500"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* CONTENEDOR GRID: TOTAL Y MEDIO DE PAGO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* CAMPO: TOTAL (Monto) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                Total
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-9 pr-4 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* CAMPO: MEDIO DE PAGO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                Medio de Pago
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <select
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="" disabled>Seleccionar</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* MENSAJE DE ERROR */}
          {errorText && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-800 text-sm font-medium leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>{errorText}</div>
            </div>
          )}

          {/* BOTÓN GUARDAR */}
          <button
            type="submit"
            disabled={loading || !activeSprint}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <span>Registrando...</span>
            ) : (
              <span>Guardar Mantenimiento</span>
            )}
          </button>

        </form>
      )}

    </div>
  );
}

export default FormularioMantenimiento;
