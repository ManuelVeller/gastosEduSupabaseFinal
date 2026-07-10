import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { maintenanceService } from '../../services/maintenanceService';
import { notificationService } from '../../services/notificationService';
import { ArrowLeft, Wrench, Car, Clipboard, AlertTriangle, CheckCircle2, ChevronDown, FileText, Settings } from 'lucide-react';

function FormularioMantenimiento({ initialPatente = '', onCancel, onSaved }) {
  const navigate = useNavigate();

  // --- ESTADOS DEL FORMULARIO ---
  const [mantenimiento, setMantenimiento] = useState('');
  const [patente, setPatente] = useState(initialPatente);
  const [kilometros, setKilometros] = useState('');
  const [motivo, setMotivo] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('Operativo');

  // --- ESTADOS DE CONTROL ---
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);

  // Obtener nombre del operador
  const empleado = localStorage.getItem('nombre_empleado') || 'Operador General';

  // --- CARGAR DATOS INICIALES ---
  useEffect(() => {
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

    if (found) {
      const savedStatuses = localStorage.getItem('fleet_status');
      const statuses = savedStatuses ? JSON.parse(savedStatuses) : {};
      const currentStatus = statuses[found.patente] || found.estado || 'Operativo';
      setNuevoEstado(currentStatus);
      
      // Autocompletar con los kilómetros actuales del auto
      setKilometros(found.km_actual || '');
    }
  }, [patente, vehiculos]);

  // Actualizar patente si cambia la prop inicial
  useEffect(() => {
    if (initialPatente) {
      setPatente(initialPatente);
    }
  }, [initialPatente]);

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

    if (!mantenimiento || !patente || !kilometros || !motivo || !nuevoEstado) {
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
      const numKm = parseInt(kilometros, 10);

      // Validar que los kilómetros ingresados no sean menores a los registrados
      const lastKm = await maintenanceService.getLastKilometers(cleanPatente);
      if (numKm < lastKm) {
        setErrorText(`Los kilómetros ingresados (${numKm.toLocaleString()} km) no pueden ser menores a los kilómetros registrados anteriormente (${lastKm.toLocaleString()} km).`);
        setLoading(false);
        return;
      }

      // Calculamos la fecha local de hoy en Argentina (UTC-3)
      const ahora = new Date();
      const offset = ahora.getTimezoneOffset() * 60000;
      const fechaLocal = new Date(ahora.getTime() - offset).toISOString().split('T')[0];

      // Guardar en la nueva tabla maintenance_records y actualizar vehiculos
      const record = {
        vehiculo_id: selectedVehiculo.id,
        patente: cleanPatente,
        tipo_mantenimiento: mantenimiento,
        kilometros: numKm,
        motivo: motivo,
        nuevo_estado: nuevoEstado,
        creado_por: empleado,
        fecha: fechaLocal
      };

      await maintenanceService.saveMaintenanceRecord(record);

      // Actualizar localStorage para sincronizar con la UI del estado de la flota
      const savedStatuses = localStorage.getItem('fleet_status');
      const statuses = savedStatuses ? JSON.parse(savedStatuses) : {};
      const oldStatus = statuses[cleanPatente] || 'Operativo';
      statuses[cleanPatente] = nuevoEstado;
      localStorage.setItem('fleet_status', JSON.stringify(statuses));

      // Notificar cambio de estado del vehículo a n8n si cambió
      if (oldStatus !== nuevoEstado) {
        try {
          await notificationService.sendVehicleStatusChanged(cleanPatente, oldStatus, nuevoEstado);
        } catch (errNotif) {
          console.error('Error al notificar cambio de estado del vehículo:', errNotif);
        }
      }

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
            El registro de mantenimiento fue guardado exitosamente.
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
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                <Car className="w-4 h-4" />
              </span>
              <select
                value={patente}
                onChange={(e) => setPatente(e.target.value)}
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer appearance-none"
              >
                <option value="" disabled>-- Selecciona Patente / Auto --</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.patente}>
                    {maintenanceService.formatPatenteLabel(v.patente, v.marca_modelo)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
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

          {/* CAMPO: MOTIVO DEL SERVICE / DIAGNÓSTICO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Motivo del Service / Diagnóstico *
            </label>
            <textarea
              required
              rows="3"
              placeholder="Detalle los motivos del ingreso al taller o diagnóstico del vehículo..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* CAMPO: NUEVO ESTADO DEL VEHÍCULO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-400" />
              Nuevo Estado del Vehículo *
            </label>
            <div className="relative">
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="Operativo">Operativo</option>
                <option value="Alquilado">Alquilado</option>
                <option value="En Taller">En Taller</option>
                <option value="Requiere Service">Requiere Service</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            disabled={loading}
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
