import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Car, Shield, AlertCircle, Wrench, Search, RefreshCw, Layers, Key, ArrowLeft, Calendar, User, Settings, Clipboard, ChevronDown, CheckCircle2, FileText } from 'lucide-react';

function SandboxFleet({ vehicles, maintenanceRecords, onUpdateVehicleKm, onUpdateVehicleStatus, onAddMaintenanceRecord, onLogout }) {
  const [activeTab, setActiveTab] = useState('flota'); // 'flota', 'registro', 'movimientos'
  const [prefilledPatente, setPrefilledPatente] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // --- ESTADOS PARA EDICIÓN INLINE DE KM ---
  const [editingKmId, setEditingKmId] = useState(null);
  const [tempKm, setTempKm] = useState('');
  
  // --- ESTADOS PARA HISTORIAL/GRÁFICO ---
  const [selectedPatente, setSelectedPatente] = useState(vehicles[0]?.patente || '');
  const [localRecords, setLocalRecords] = useState([]);

  // --- ESTADOS DEL FORMULARIO DE MANTENIMIENTO ---
  const [mantenimiento, setMantenimiento] = useState('');
  const [formPatente, setFormPatente] = useState('');
  const [formKilometros, setFormKilometros] = useState('');
  const [formMotivo, setFormMotivo] = useState('');
  const [formNuevoEstado, setFormNuevoEstado] = useState('Operativo');
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Actualizar registros cuando cambie la patente seleccionada o la lista de mantenimientos
  useEffect(() => {
    if (selectedPatente) {
      const recordsForPlate = maintenanceRecords
        .filter(r => r.patente.trim().toUpperCase() === selectedPatente.trim().toUpperCase())
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Ascendente para gráfico
      setLocalRecords(recordsForPlate);
    } else {
      setLocalRecords([]);
    }
  }, [selectedPatente, maintenanceRecords]);

  // Autocompletar datos del formulario al seleccionar patente en el formulario de mantenimiento
  useEffect(() => {
    if (formPatente) {
      const found = vehicles.find(v => v.patente.toUpperCase() === formPatente.trim().toUpperCase());
      if (found) {
        setFormNuevoEstado(found.estado || 'Operativo');
        setFormKilometros(found.km_actual || '');
      }
    }
  }, [formPatente, vehicles]);

  // Contadores
  const stats = vehicles.reduce(
    (acc, v) => {
      acc[v.estado] = (acc[v.estado] || 0) + 1;
      return acc;
    },
    { Operativo: 0, 'En Taller': 0, 'Requiere Service': 0, Alquilado: 0 }
  );

  const filteredVehiculos = vehicles.filter(v => {
    const matchesSearch =
      v.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca_modelo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      statusFilter === 'Todos' || v.estado === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Operativo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500';
      case 'En Taller':
        return 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500';
      case 'Alquilado':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-500';
      case 'Requiere Service':
        return 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 focus:ring-slate-500';
    }
  };

  const handleStatusChange = (patente, nuevoEstado) => {
    const oldStatus = vehicles.find(v => v.patente === patente)?.estado || 'Operativo';
    onUpdateVehicleStatus(patente, oldStatus, nuevoEstado);
  };

  const handleSaveKm = (e, vehiculo) => {
    e.preventDefault();
    const newKm = parseInt(tempKm, 10);
    if (isNaN(newKm)) return;
    if (newKm < (vehiculo.km_actual || 0)) {
      alert(`El kilometraje no puede ser menor al actual (${(vehiculo.km_actual || 0).toLocaleString()} km).`);
      return;
    }

    onUpdateVehicleKm(vehiculo.patente, vehiculo.id, newKm);
    setEditingKmId(null);
  };

  const handleRegisterMaintenanceBtn = (patente) => {
    setFormPatente(patente);
    setActiveTab('registro');
    setFormSuccess(false);
    setFormError('');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!mantenimiento || !formPatente || !formKilometros || !formMotivo || !formNuevoEstado) {
      setFormError('Por favor, completa todos los campos.');
      return;
    }

    const foundVehiculo = vehicles.find(v => v.patente === formPatente);
    if (!foundVehiculo) {
      setFormError('Vehículo no encontrado.');
      return;
    }

    const numKm = parseInt(formKilometros, 10);
    if (numKm < (foundVehiculo.km_actual || 0)) {
      setFormError(`Los kilómetros no pueden ser menores a los actuales del auto (${(foundVehiculo.km_actual || 0).toLocaleString()} km).`);
      return;
    }

    // Registrar en memoria
    onAddMaintenanceRecord({
      vehiculo_id: foundVehiculo.id,
      patente: formPatente,
      tipo_mantenimiento: mantenimiento,
      kilometros: numKm,
      motivo: formMotivo,
      nuevo_estado: formNuevoEstado
    });

    setFormSuccess(true);
    setTimeout(() => {
      // Limpiar formulario y volver
      setFormSuccess(false);
      setMantenimiento('');
      setFormPatente('');
      setFormKilometros('');
      setFormMotivo('');
      setFormNuevoEstado('Operativo');
      setActiveTab('flota');
    }, 1500);
  };

  // Gráfico de kilómetros
  const chartData = localRecords.map(r => ({
    fecha: r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '',
    Kilómetros: r.current_km,
    Motivo: r.motivo,
    Tipo: r.tipo_mantenimiento
  }));

  const selectedVehiculo = vehicles.find(v => v.patente === selectedPatente);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        
        {/* CABECERA Y NAVEGACIÓN */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors group mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Volver al Menú
            </button>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Car className="w-7 h-7 text-blue-600 stroke-[2.5]" />
              Control de Flota <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">Demo</span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold">
              Supervisión de estado mecánico, kilometraje y servicios en tiempo real.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex gap-1 shadow-sm self-start sm:self-center">
            <button
              onClick={() => setActiveTab('flota')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'flota'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Estado de Flota
            </button>
            <button
              onClick={() => {
                setActiveTab('registro');
                setFormSuccess(false);
                setFormError('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'registro'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Registrar Servicio
            </button>
            <button
              onClick={() => {
                setActiveTab('movimientos');
                if (vehicles.length > 0 && !selectedPatente) {
                  setSelectedPatente(vehicles[0].patente);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'movimientos'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Historial y Curva
            </button>
          </div>
        </div>

        {/* PESTAÑA 1: ESTADO DE FLOTA */}
        {activeTab === 'flota' && (
          <div className="space-y-6">
            
            {/* TARJETAS DE INDICADORES */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Flota</span>
                  <span className="text-xl font-black text-slate-800">{vehicles.length}</span>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-lg"><Car className="w-5 h-5" /></div>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Operativos</span>
                  <span className="text-xl font-black text-emerald-600">{stats.Operativo}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><Shield className="w-5 h-5" /></div>
              </div>
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Alquilados</span>
                  <span className="text-xl font-black text-indigo-600">{stats.Alquilado}</span>
                </div>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><Key className="w-5 h-5" /></div>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">En Taller</span>
                  <span className="text-xl font-black text-amber-600">{stats['En Taller']}</span>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><Wrench className="w-5 h-5" /></div>
              </div>
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Req. Service</span>
                  <span className="text-xl font-black text-rose-600">{stats['Requiere Service']}</span>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
              </div>
            </div>

            {/* CONTROLES BÚSQUEDA */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por patente o modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
                {['Todos', 'Operativo', 'Alquilado', 'En Taller', 'Requiere Service'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all whitespace-nowrap ${
                      statusFilter === filter
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* GRID AUTOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredVehiculos.map((v) => (
                <div
                  key={v.id}
                  className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-sm rounded-lg border-2 border-slate-800 shadow-sm tracking-widest font-black uppercase">
                      {v.patente}
                    </div>
                    
                    <div className="relative">
                      <select
                        value={v.estado}
                        onChange={(e) => handleStatusChange(v.patente, e.target.value)}
                        className={`text-[10px] font-black border-2 rounded-lg py-1 pl-2 pr-6 outline-none cursor-pointer appearance-none transition-all ${getStatusStyles(v.estado)}`}
                      >
                        <option value="Operativo">Operativo</option>
                        <option value="Alquilado">Alquilado</option>
                        <option value="En Taller">En Taller</option>
                        <option value="Requiere Service">Requiere Service</option>
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none text-slate-400">▼</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-800 text-base leading-tight">
                      {v.marca_modelo}
                    </h4>
                    
                    <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2 text-slate-500 font-medium">
                      <span>Kilometraje:</span>
                      {editingKmId === v.id ? (
                        <form onSubmit={(e) => handleSaveKm(e, v)} className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempKm}
                            onChange={(e) => setTempKm(e.target.value)}
                            className="w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 font-bold outline-none focus:border-blue-500"
                            required
                            min={v.km_actual || 0}
                            autoFocus
                          />
                          <button type="submit" className="p-1 text-emerald-600 hover:bg-emerald-50 rounded font-black text-xs">✓</button>
                          <button type="button" onClick={() => setEditingKmId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded font-black text-xs">✕</button>
                        </form>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded">
                            {v.km_actual ? v.km_actual.toLocaleString() : '0'} km
                          </span>
                          <button
                            onClick={() => {
                              setEditingKmId(v.id);
                              setTempKm(v.km_actual || '');
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="Actualizar Kilometraje"
                          >
                            <Wrench className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                    {v.tipo_aceite && (
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                        <span>Aceite recomendado:</span>
                        <span className="italic">{v.tipo_aceite}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleRegisterMaintenanceBtn(v.patente)}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-black transition-all border border-dashed border-slate-200 hover:border-blue-200 flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-3 h-3" /> Registrar Mantenimiento
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* PESTAÑA 2: REGISTRAR SERVICIO */}
        {activeTab === 'registro' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
              
              {formSuccess ? (
                <div className="py-8 text-center space-y-4 animate-fade-in">
                  <div className="inline-flex p-4 bg-green-50 text-green-500 rounded-full mb-2 animate-bounce">
                    <CheckCircle2 className="w-16 h-16" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">¡Registro Guardado!</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    El registro de mantenimiento fue guardado exitosamente en el Sandbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('flota')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors group mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Cancelar y Volver
                  </button>

                  <div className="space-y-1">
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

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                      Auto / Patente
                    </label>
                    <div className="relative">
                      <select
                        value={formPatente}
                        onChange={(e) => setFormPatente(e.target.value)}
                        required
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="" disabled>-- Selecciona Patente / Auto --</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.patente}>
                            {v.marca_modelo} ({v.patente})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                      Kilómetros Actuales
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Clipboard className="w-4 h-4" /></span>
                      <input
                        type="number"
                        value={formKilometros}
                        onChange={(e) => setFormKilometros(e.target.value)}
                        required
                        min="0"
                        placeholder="Ej: 85500"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Motivo del Service / Diagnóstico *
                    </label>
                    <textarea
                      required
                      rows="3"
                      placeholder="Detalle los motivos del servicio..."
                      value={formMotivo}
                      onChange={(e) => setFormMotivo(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-slate-400" />
                      Nuevo Estado del Vehículo *
                    </label>
                    <div className="relative">
                      <select
                        value={formNuevoEstado}
                        onChange={(e) => setFormNuevoEstado(e.target.value)}
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

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold leading-normal">
                      ⚠️ {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.98]"
                  >
                    Guardar Mantenimiento
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: MOVIMIENTOS E HISTORIAL */}
        {activeTab === 'movimientos' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Car className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Historial y Curva de Uso</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Visualizá el desgaste y control mecánico por patente.</p>
                </div>
              </div>

              <select
                value={selectedPatente}
                onChange={(e) => setSelectedPatente(e.target.value)}
                className="w-full sm:w-60 bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:bg-white transition-all appearance-none"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.patente}>
                    {v.patente.slice(-2).toUpperCase()} - {v.marca_modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfico */}
              <div className="lg:col-span-2 bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col min-h-[300px]">
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gráfico Evolutivo</span>
                  <h4 className="text-sm font-extrabold text-slate-800">Curva de Kilometraje del Auto</h4>
                </div>

                <div className="flex-grow h-60">
                  {chartData.length < 2 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 text-slate-400">
                      <p className="text-xs font-bold">Datos insuficientes para la curva</p>
                      <p className="text-[10px] mt-0.5">Se necesitan al menos 2 registros de kilometraje.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} stroke="#cbd5e1" />
                        <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} domain={['auto', 'auto']} stroke="#cbd5e1" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Line type="monotone" dataKey="Kilómetros" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Ficha técnica */}
              <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="mb-4 border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ficha Técnica</span>
                    <h4 className="text-sm font-extrabold text-slate-800">🚗 {selectedVehiculo?.marca_modelo}</h4>
                  </div>
                  {selectedVehiculo && (
                    <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Patente:</span>
                        <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded tracking-widest font-black text-xs uppercase">{selectedVehiculo.patente}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                        <span className="text-slate-400">Kilometraje:</span>
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{selectedVehiculo.km_actual.toLocaleString()} km</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                        <span className="text-slate-400">Aceite:</span>
                        <span className="italic text-slate-700">{selectedVehiculo.tipo_aceite || 'No especificado'}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                        <span className="text-slate-400">Registros:</span>
                        <span className="font-bold text-slate-700">{localRecords.length} movimientos</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla Detalle */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Historial Detallado de Movimientos</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Kilómetros</th>
                      <th className="p-3">Diagnóstico / Motivo</th>
                      <th className="p-3">Estado Resultante</th>
                      <th className="p-3">Registrado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                    {[...localRecords].reverse().map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(r.created_at).toLocaleString('es-AR')}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold rounded-lg uppercase tracking-wide text-[9px]">
                            {r.tipo_mantenimiento}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{r.current_km ? r.current_km.toLocaleString() : 0} km</td>
                        <td className="p-3 text-slate-500 font-normal leading-relaxed">{r.motivo}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            r.nuevo_estado === 'Operativo' ? 'bg-emerald-50 text-emerald-700' :
                            r.nuevo_estado === 'Alquilado' ? 'bg-indigo-50 text-indigo-700' :
                            r.nuevo_estado === 'En Taller' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {r.nuevo_estado}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{r.creado_por}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default SandboxFleet;
