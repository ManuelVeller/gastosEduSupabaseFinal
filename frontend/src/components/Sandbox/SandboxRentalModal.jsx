import React, { useState } from 'react';
import { X, Calendar, Car, DollarSign, CheckCircle } from 'lucide-react';

function SandboxRentalModal({ isOpen, onClose, vehicles, onConfirm }) {
  // Calculamos la fecha local de hoy para el valor inicial de fecha
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset() * 60000;
  const hoyStr = new Date(ahora.getTime() - offset).toISOString().split('T')[0];

  const [selectedPatente, setSelectedPatente] = useState('');
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [monto, setMonto] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorText('');

    if (!selectedPatente) {
      setErrorText('Por favor, selecciona un vehículo.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setErrorText('Por favor, completa ambas fechas.');
      return;
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setErrorText('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }
    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      setErrorText('Por favor, ingresa un monto válido mayor a 0.');
      return;
    }

    // Ejecutar confirmación
    onConfirm(selectedPatente, fechaInicio, fechaFin, parsedMonto);
    
    // Mostrar pantalla de éxito antes de cerrar
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      // Limpiar formulario
      setSelectedPatente('');
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
      setMonto('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden relative transform scale-100 transition-all duration-300">
        
        {/* Cabecera decorativa */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">🔑</span>
              Registrar Alquiler
            </h3>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="inline-flex p-4 bg-emerald-50 text-emerald-500 rounded-full mb-2 animate-bounce">
                <CheckCircle className="w-12 h-12 stroke-[2.5]" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">¡Alquiler Registrado!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                El vehículo cambió a estado Alquilado y el cobro fue añadido al Dashboard.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Selector de Vehículo */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
                  Vehículo de la Flota
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Car className="w-4 h-4" />
                  </span>
                  <select
                    value={selectedPatente}
                    onChange={(e) => setSelectedPatente(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer appearance-none"
                  >
                    <option value="" disabled>-- Seleccione el Auto --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.patente}>
                        {v.marca_modelo} ({v.patente}) - [{v.estado}]
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Rango de Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
                    Fecha Inicio
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
                    Fecha Fin
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Monto del Alquiler */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
                  Monto del Alquiler (ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-4 text-lg font-black text-slate-400 top-1/2 -translate-y-1/2">$</span>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                    min="1"
                    placeholder="Monto en pesos (Ej: 150000)"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-9 pr-4 text-base font-bold text-slate-800 outline-none placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Mensaje de Error */}
              {errorText && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold leading-normal">
                  ⚠️ {errorText}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all"
                >
                  Confirmar Alquiler
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default SandboxRentalModal;
