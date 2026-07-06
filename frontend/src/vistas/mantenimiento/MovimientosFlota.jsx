import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { maintenanceService } from '../../services/maintenanceService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Car, RefreshCw, Clipboard, Calendar, FileText, Settings, User } from 'lucide-react';

function MovimientosFlota() {
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedPatente, setSelectedPatente] = useState('');
  const [records, setRecords] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [errorText, setErrorText] = useState('');

  // --- CARGAR VEHÍCULOS AL INICIAR ---
  useEffect(() => {
    const fetchVehiculos = async () => {
      try {
        setLoadingVehicles(true);
        const { data, error } = await supabase
          .from('vehiculos')
          .select('*')
          .order('patente', { ascending: true });

        if (error) throw error;
        setVehiculos(data || []);
        if (data && data.length > 0) {
          setSelectedPatente(data[0].patente);
        }
      } catch (err) {
        console.error('Error al cargar vehículos:', err);
        setErrorText('No se pudieron cargar los vehículos.');
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehiculos();
  }, []);

  // --- CARGAR REGISTROS CUANDO CAMBIE LA PATENTE ---
  const fetchRecords = async (patente) => {
    if (!patente) return;
    try {
      setLoadingRecords(true);
      setErrorText('');
      const data = await maintenanceService.getMaintenanceRecords(patente);
      setRecords(data || []);
    } catch (err) {
      console.error('Error al cargar registros de mantenimiento:', err);
      setErrorText('Error al cargar el historial de mantenimiento.');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (selectedPatente) {
      fetchRecords(selectedPatente);
    }
  }, [selectedPatente]);

  // Formatear la fecha YYYY-MM-DD a DD/MM/YYYY para el eje X y tabla
  const formatFecha = (fechaStr) => {
    if (!fechaStr) return '';
    const parts = fechaStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fechaStr;
  };

  // Preparar datos para el gráfico
  const chartData = records.map(r => ({
    fecha: formatFecha(r.fecha),
    Kilómetros: r.current_km,
    Motivo: r.motivo,
    Tipo: r.tipo_mantenimiento
  }));

  // Buscar información del vehículo seleccionado
  const selectedVehiculo = vehiculos.find(v => v.patente === selectedPatente);

  return (
    <div className="space-y-6">
      
      {/* SECTOR DE FILTRO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Historial y Curva de Uso</h3>
            <p className="text-xs text-slate-400 font-medium">Visualizá el desgaste y control mecánico por patente.</p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto items-center">
          {loadingVehicles ? (
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <select
              value={selectedPatente}
              onChange={(e) => setSelectedPatente(e.target.value)}
              className="w-full sm:w-60 bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:bg-white transition-all appearance-none"
            >
              <option value="" disabled>Seleccione un Vehículo</option>
              {vehiculos.map(v => (
                <option key={v.id} value={v.patente}>
                  {v.patente} - {v.marca_modelo}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => fetchRecords(selectedPatente)}
            className="p-2.5 bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorText && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm">
          ⚠️ {errorText}
        </div>
      )}

      {/* CONTENEDOR DE GRÁFICO */}
      {selectedPatente && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GRÁFICO - 2 COLUMNAS */}
          <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[350px]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Gráfico Evolutivo</span>
              <h4 className="text-base font-extrabold text-slate-800">Curva de Kilometraje del Auto</h4>
            </div>

            {loadingRecords ? (
              <div className="flex-grow flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : chartData.length < 2 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <p className="text-slate-400 text-sm font-semibold">Datos insuficientes para trazar la curva</p>
                <p className="text-slate-400 text-xs mt-1">Se requieren al menos 2 registros de kilometraje diferentes.</p>
              </div>
            ) : (
              <div className="w-full h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="fecha" 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} 
                      domain={['auto', 'auto']}
                      stroke="#cbd5e1"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '1rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                        fontFamily: 'sans-serif'
                      }}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px' }}
                      itemStyle={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }} />
                    <Line
                      type="monotone"
                      dataKey="Kilómetros"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* FICHA TÉCNICA RÁPIDA - 1 COLUMNA */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
            <div>
              <div className="mb-4 border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ficha Técnica</span>
                <h4 className="text-base font-extrabold text-slate-800">
                  🚗 {selectedVehiculo ? selectedVehiculo.marca_modelo : 'Sin Seleccionar'}
                </h4>
              </div>

              {selectedVehiculo ? (
                <div className="space-y-4 text-xs font-medium text-slate-600">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Patente:</span>
                    <span className="font-mono bg-slate-900 text-white px-2.5 py-1 rounded text-xs tracking-widest font-black uppercase">
                      {selectedVehiculo.patente}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-50">
                    <span className="text-slate-400">Kilometraje Actual:</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      {selectedVehiculo.km_actual ? selectedVehiculo.km_actual.toLocaleString() : 0} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-50">
                    <span className="text-slate-400">Aceite Recomendado:</span>
                    <span className="italic text-slate-700 font-semibold">{selectedVehiculo.tipo_aceite || 'No especificado'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-50">
                    <span className="text-slate-400">Registros de Mecánica:</span>
                    <span className="font-bold text-slate-700">{records.length} mantenimientos</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">Seleccione un vehículo para ver sus detalles.</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Operaciones Mecánicas de Flota
              </span>
            </div>
          </div>

        </div>
      )}

      {/* TABLA DE MOVIMIENTOS DETALLADOS */}
      {selectedPatente && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historial Detallado de Movimientos</h4>
          </div>

          {loadingRecords ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">Cargando movimientos de la flota...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 font-semibold">Aún no se han registrado mantenimientos para este vehículo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold uppercase text-slate-400 tracking-wider">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Kilómetros</th>
                    <th className="p-4">Diagnóstico / Motivo</th>
                    <th className="p-4">Estado Resultante</th>
                    <th className="p-4">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                  {[...records].reverse().map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatFecha(r.fecha)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-lg uppercase tracking-wide text-[10px]">
                          {r.tipo_mantenimiento}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {r.current_km ? r.current_km.toLocaleString() : 0} km
                      </td>
                      <td className="p-4 max-w-xs break-words font-normal text-slate-500 leading-relaxed">
                        {r.motivo}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          r.nuevo_estado === 'Operativo'
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.nuevo_estado === 'En Taller'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          <Settings className="w-3 h-3" />
                          {r.nuevo_estado}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-bold whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {r.creado_por}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default MovimientosFlota;
