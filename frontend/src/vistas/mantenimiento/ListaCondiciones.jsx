import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { notificationService } from '../../services/notificationService';
import { maintenanceService } from '../../services/maintenanceService';
import { Car, Shield, AlertCircle, Wrench, Search, RefreshCw, Layers, Key } from 'lucide-react';

function ListaCondiciones({ onRegisterMaintenance }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // --- ESTADOS PARA EDICIÓN INLINE DE KM ---
  const [editingKmId, setEditingKmId] = useState(null);
  const [tempKm, setTempKm] = useState('');
  const [updatingKm, setUpdatingKm] = useState(false);

  // --- CARGAR ESTADOS DESDE LOCALSTORAGE ---
  const [estados, setEstados] = useState(() => {
    const saved = localStorage.getItem('fleet_status');
    return saved ? JSON.parse(saved) : {};
  });

  // --- OBTENER VEHÍCULOS DESDE SUPABASE ---
  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .order('patente', { ascending: true });

      if (error) throw error;
      setVehiculos(data || []);
    } catch (err) {
      console.error('Error fetching fleet vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  // --- GUARDAR ESTADO EN LOCALSTORAGE AL CAMBIAR ---
  // --- GUARDAR ESTADO EN LOCALSTORAGE AL CAMBIAR ---
  const handleStatusChange = async (patente, nuevoEstado) => {
    const oldStatus = estados[patente] || 'Operativo';
    if (oldStatus !== nuevoEstado) {
      const updated = { ...estados, [patente]: nuevoEstado };
      setEstados(updated);
      localStorage.setItem('fleet_status', JSON.stringify(updated));

      try {
        await notificationService.sendVehicleStatusChanged(patente, oldStatus, nuevoEstado);
      } catch (errNotif) {
        console.error('Error al notificar cambio de estado de vehículo:', errNotif);
      }

      // Guardar cambio de estado en la tabla de registros de mantenimiento
      try {
        const vehiculo = vehiculos.find(v => v.patente === patente);
        if (vehiculo) {
          const empleado = localStorage.getItem('nombre_empleado') || 'Operador General';
          let motivoText = '';
          if (nuevoEstado === 'Operativo') {
            motivoText = 'Auto operativo y disponible';
          } else if (nuevoEstado === 'En Taller') {
            motivoText = 'Ingreso al taller';
          } else if (nuevoEstado === 'Alquilado') {
            motivoText = 'Auto alquilado';
          } else {
            motivoText = 'Requiere service';
          }

          await maintenanceService.saveMaintenanceRecord({
            vehiculo_id: vehiculo.id,
            patente: patente,
            tipo_mantenimiento: 'Otro',
            kilometros: vehiculo.km_actual || 0,
            motivo: motivoText,
            nuevo_estado: nuevoEstado,
            creado_por: empleado
          });
        }
      } catch (errDb) {
        console.error('Error al guardar registro de movimiento en la BD:', errDb);
      }
    }
  };

  // --- GUARDAR KILOMETRAJE DESDE LA TARJETA ---
  const handleSaveKm = async (vehiculo) => {
    const newKm = parseInt(tempKm, 10);
    if (isNaN(newKm)) return;
    if (newKm < (vehiculo.km_actual || 0)) {
      alert(`El kilometraje no puede ser menor al actual (${(vehiculo.km_actual || 0).toLocaleString()} km).`);
      return;
    }

    setUpdatingKm(true);
    try {
      const empleado = localStorage.getItem('nombre_empleado') || 'Operador General';
      const currentStatus = getEstado(vehiculo.patente);

      await maintenanceService.saveMaintenanceRecord({
        vehiculo_id: vehiculo.id,
        patente: vehiculo.patente,
        tipo_mantenimiento: 'Otro',
        kilometros: newKm,
        motivo: 'Actualización rápida de kilometraje',
        nuevo_estado: currentStatus,
        creado_por: empleado
      });

      // Actualizar estado local
      setVehiculos(prev => prev.map(v => {
        if (v.id === vehiculo.id) {
          return { ...v, km_actual: newKm };
        }
        return v;
      }));

      setEditingKmId(null);
    } catch (err) {
      console.error('Error al actualizar kilometraje:', err);
      alert('Error al actualizar el kilometraje.');
    } finally {
      setUpdatingKm(false);
    }
  };

  // --- OBTENER ESTADO ACTUAL DE UN VEHÍCULO (POR DEFECTO 'Operativo') ---
  const getEstado = (patente) => {
    return estados[patente] || 'Operativo';
  };

  // --- ESTILOS DINÁMICOS SEGÚN EL ESTADO ---
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

  // --- CONTEO DE ESTADOS PARA RESUMEN ---
  const stats = vehiculos.reduce(
    (acc, v) => {
      const status = getEstado(v.patente);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { Operativo: 0, 'En Taller': 0, 'Requiere Service': 0, Alquilado: 0 }
  );

  // --- FILTRAR VEHÍCULOS ---
  const filteredVehiculos = vehiculos.filter((v) => {
    const matchesSearch =
      v.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca_modelo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      statusFilter === 'Todos' || getEstado(v.patente) === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* TARJETAS DE INDICADORES / CONTADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        
        {/* TOTAL VEHÍCULOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Flota</span>
            <span className="text-2xl font-black text-slate-800">{vehiculos.length}</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
            <Car className="w-6 h-6" />
          </div>
        </div>

        {/* OPERATIVOS */}
        <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider block">Operativos</span>
            <span className="text-2xl font-black text-emerald-600">{stats.Operativo}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* ALQUILADOS */}
        <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600/80 uppercase tracking-wider block">Alquilados</span>
            <span className="text-2xl font-black text-indigo-600">{stats.Alquilado}</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Key className="w-6 h-6" />
          </div>
        </div>

        {/* EN TALLER */}
        <div className="bg-amber-50/30 p-5 rounded-2xl border border-amber-50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600/80 uppercase tracking-wider block">En Taller</span>
            <span className="text-2xl font-black text-amber-600">{stats['En Taller']}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* REQUIERE SERVICE */}
        <div className="bg-rose-50/30 p-5 rounded-2xl border border-rose-50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600/80 uppercase tracking-wider block">Req. Service</span>
            <span className="text-2xl font-black text-rose-600">{stats['Requiere Service']}</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* CONTROLES DE BÚSQUEDA Y FILTRADO */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* BUSCADOR */}
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

        {/* FILTRADO DE ESTADO */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {['Todos', 'Operativo', 'Alquilado', 'En Taller', 'Requiere Service'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* RECARGAR */}
        <button
          onClick={fetchVehiculos}
          className="p-2.5 bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
          title="Recargar flota"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

      </div>

      {/* CUADRICULA DE VEHÍCULOS */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Cargando flota de vehículos...</p>
        </div>
      ) : filteredVehiculos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-semibold">No se encontraron vehículos bajo esta búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredVehiculos.map((v) => {
            const currentStatus = getEstado(v.patente);
            return (
              <div
                key={v.id}
                className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 hover:-translate-y-0.5 duration-300"
              >
                
                {/* CABECERA TARJETA (Patente y Selector Estado) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-sm rounded-lg border-2 border-slate-800 shadow-sm tracking-widest font-black uppercase">
                    {v.patente}
                  </div>
                  
                  {/* SELECTOR DE ESTADO */}
                  <div className="relative">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(v.patente, e.target.value)}
                      className={`text-xs font-bold border-2 rounded-lg py-1 pl-2.5 pr-6 outline-none cursor-pointer appearance-none transition-all ${getStatusStyles(
                        currentStatus
                      )}`}
                    >
                      <option value="Operativo">Operativo</option>
                      <option value="Alquilado">Alquilado</option>
                      <option value="En Taller">En Taller</option>
                      <option value="Requiere Service">Requiere Service</option>
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      ▼
                    </span>
                  </div>
                </div>

                {/* DETALLES DEL VEHÍCULO */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-lg leading-tight">
                    {v.marca_modelo}
                  </h4>
                  
                  <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2 text-slate-500 font-medium">
                    <span>Kilometraje:</span>
                    {editingKmId === v.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveKm(v);
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="number"
                          value={tempKm}
                          onChange={(e) => setTempKm(e.target.value)}
                          className="w-20 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700 font-bold outline-none focus:border-blue-500"
                          required
                          min={v.km_actual || 0}
                          disabled={updatingKm}
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={updatingKm}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded font-bold"
                          title="Guardar"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKmId(null)}
                          disabled={updatingKm}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded font-bold"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </form>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md">
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
                          <Wrench className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </div>

                  {v.tipo_aceite && (
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                      <span>Aceite recomendado:</span>
                      <span className="italic">{v.tipo_aceite}</span>
                    </div>
                  )}
                </div>

                {/* BOTÓN RÁPIDO PARA REGISTRAR MANTENIMIENTO */}
                {onRegisterMaintenance && (
                  <button
                    onClick={() => onRegisterMaintenance(v.patente)}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-bold transition-all border border-dashed border-slate-200 hover:border-blue-200 flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Registrar Mantenimiento
                  </button>
                )}

              </div>
            );
          })}
        </div>
      )}
      
    </div>
  );
}

export default ListaCondiciones;
