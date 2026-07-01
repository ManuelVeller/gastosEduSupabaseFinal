import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, FileText, CheckCircle, PieChart, ArrowUpRight, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const AdminDashboard = ({ user, onLogout }) => {
  const [gastos, setGastos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [sprintsHistoricos, setSprintsHistoricos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');
  const [sprintLoading, setSprintLoading] = useState(false);

  // Mapeo centralizado de filtros
  const [filtros, setFiltros] = useState({
    periodo: 'activo', // 'activo', 'todos', o el UUID de un sprint cerrado
    fechaDesde: '',
    fechaHasta: '',
    categoria: 'todos',
    medioPago: 'todos'
  });

  // 1. Cargar la lista de sprints cerrados para el selector
  const fetchSprints = async () => {
    try {
      const { data } = await supabase
        .from('sprints')
        .select('id, nombre, fecha_inicio')
        .eq('estado', 'cerrado')
        .order('fecha_inicio', { ascending: false });
      if (data) setSprintsHistoricos(data);
    } catch (err) {
      console.error('Error cargando historico de sprints:', err);
    }
  };

  // 2. Consulta dinámica y estricta según filtros aplicados
  const fetchAdminData = async () => {
    try {
      setLoading(true);

      let queryGastos = supabase
        .from('gastos')
        .select('*, sprints!fk_gastos_sprints_unica(nombre)')
        .order('fecha_gasto', { ascending: false });

      let queryIngresos = supabase
        .from('ingresos')
        .select('*, sprints!fk_ingresos_sprints_unica(nombre)')
        .order('fecha', { ascending: false });

      // --- FILTRO ESTRICTO DE SPRINT ACTIVO ---
      if (filtros.periodo === 'activo') {
        const { data: sprintActivo, error: sprintError } = await supabase
          .from('sprints')
          .select('id')
          .eq('estado', 'activo')
          .maybeSingle();

        if (sprintError) throw sprintError;

        if (sprintActivo && sprintActivo.id) {
          queryGastos = queryGastos.eq('sprint_id', sprintActivo.id);
          queryIngresos = queryIngresos.eq('sprint_id', sprintActivo.id);
        } else {
          setGastos([]);
          setIngresos([]);
          setLoading(false);
          return;
        }
      } 
      // --- FILTRO PARA SPRINTS HISTÓRICOS CERRADOS ---
      else if (filtros.periodo !== 'todos' && filtros.periodo !== 'personalizado') {
        queryGastos = queryGastos.eq('sprint_id', filtros.periodo);
        queryIngresos = queryIngresos.eq('sprint_id', filtros.periodo);
      }

      // --- FILTRO POR RANGOS DE FECHA MANUAL ---
      if (filtros.fechaDesde) {
        queryGastos = queryGastos.gte('fecha_gasto', filtros.fechaDesde);
        queryIngresos = queryIngresos.gte('fecha', filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        queryGastos = queryGastos.lte('fecha_gasto', filtros.fechaHasta);
        queryIngresos = queryIngresos.lte('fecha', filtros.fechaHasta);
      }

      const [gastosRes, ingresosRes] = await Promise.all([
        queryGastos,
        queryIngresos
      ]);

      if (gastosRes.error) throw gastosRes.error;
      if (ingresosRes.error) throw ingresosRes.error;

      setGastos(gastosRes.data || []);
      setIngresos(ingresosRes.data || []);

    } catch (err) {
      console.error('Error fetching admin data:', err);
      alert('Error al filtrar los datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchAdminData();
  }, [filtros]);

  useEffect(() => {
    fetchSprints();
  }, []);

  // --- LÓGICA DE EXPORTACIÓN A EXCEL MÚLTIPLE HOJA ---
  const exportarAExcel = () => {
    if (filteredGastos.length === 0 && filteredIngresos.length === 0) {
      alert("No hay datos filtrados en este período para exportar.");
      return;
    }

    try {
      const libro = XLSX.utils.book_new();

      if (filteredGastos.length > 0) {
        const datosGastos = filteredGastos.map(g => ({
          Fecha: g.fecha_gasto ? new Date(g.fecha_gasto).toLocaleDateString('es-AR') : 'Sin fecha',
          Empleado: g.creado_por || 'Desconocido',
          Sprint: g.sprints?.nombre || 'Global / Sin asignar',
          Categoría: g.categoria,
          Descripción: g.descripcion || '-',
          'Método Pago': g.metodo_pago || '-',
          Monto: parseFloat(g.monto || 0)
        }));
        const hojaGastos = XLSX.utils.json_to_sheet(datosGastos);
        XLSX.utils.book_append_sheet(libro, hojaGastos, "Gastos");
      }

      if (filteredIngresos.length > 0) {
        const datosIngresos = filteredIngresos.map(i => ({
          Fecha: i.fecha ? new Date(i.fecha).toLocaleDateString('es-AR') : 'Sin fecha',
          'Cargado Por': i.creado_por || 'Sistema',
          Sprint: i.sprints?.nombre || 'Global / Sin asignar',
          Categoría: i.categoria,
          Descripción: i.descripcion || '-',
          Monto: parseFloat(i.monto || 0)
        }));
        const hojaIngresos = XLSX.utils.json_to_sheet(datosIngresos);
        XLSX.utils.book_append_sheet(libro, hojaIngresos, "Ingresos");
      }

      XLSX.writeFile(libro, `Rendicion_Caja_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      alert("Error al generar el archivo.");
    }
  };

  // --- LÓGICA PARA CONTROLAR EL SPRINT FINANCIERO ---
  const iniciarNuevoSprint = async () => {
    const nombreSprint = prompt("Ingresá el nombre/período del nuevo Sprint (ej: Quincena Junio):");
    if (!nombreSprint) return;

    setSprintLoading(true);
    try {
      await supabase
        .from('sprints')
        .update({ estado: 'cerrado', fecha_fin: new Date().toISOString() })
        .eq('estado', 'activo');

      const { error } = await supabase
        .from('sprints')
        .insert([{ 
          nombre: nombreSprint, 
          usuario: user?.email || 'mmanu', 
          estado: 'activo' 
        }]);

      if (error) throw error;

      alert(`🚀 Sprint "${nombreSprint}" iniciado exitosamente.`);
      fetchSprints(); 
      setFiltros({ ...filtros, periodo: 'activo' }); 
    } catch (error) {
      console.error("Error configurando Sprint:", error);
      alert("Error al iniciar el Sprint: " + error.message);
    } finally {
      setSprintLoading(false);
    }
  };

  // --- LÓGICA DE FILTRADO INTERACTIVO LOCAL ---
  const categoriasDisponibles = Array.from(new Set([
    ...gastos.map(g => g.categoria),
    ...ingresos.map(i => i.categoria)
  ])).filter(Boolean).sort();

  const mediosPagoDisponibles = Array.from(new Set([
    ...gastos.map(g => g.metodo_pago || g.medio_pago),
    ...ingresos.map(i => i.metodo_pago || i.medio_pago)
  ])).filter(Boolean).sort();

  const filteredGastos = gastos.filter(g => {
    if (filtros.categoria !== 'todos' && g.categoria !== filtros.categoria) return false;
    if (filtros.medioPago !== 'todos' && (g.metodo_pago || g.medio_pago) !== filtros.medioPago) return false;
    return true;
  });

  const filteredIngresos = ingresos.filter(i => {
    if (filtros.categoria !== 'todos' && i.categoria !== filtros.categoria) return false;
    if (filtros.medioPago !== 'todos' && (i.metodo_pago || i.medio_pago) !== filtros.medioPago) return false;
    return true;
  });

  const balancePorCategoria = {};

  filteredGastos.forEach(g => {
    if (!balancePorCategoria[g.categoria]) balancePorCategoria[g.categoria] = { Gastos: 0, Ingresos: 0 };
    balancePorCategoria[g.categoria].Gastos += parseFloat(g.monto || 0);
  });

  filteredIngresos.forEach(i => {
    if (!balancePorCategoria[i.categoria]) balancePorCategoria[i.categoria] = { Gastos: 0, Ingresos: 0 };
    balancePorCategoria[i.categoria].Ingresos += parseFloat(i.monto || 0);
  });

  const chartData = Object.keys(balancePorCategoria).map(key => ({
    name: key,
    Gastos: balancePorCategoria[key].Gastos,
    Ingresos: balancePorCategoria[key].Ingresos
  }));

  // --- CÁLCULOS DE DESGLOSE DE GASTOS ---
  const getGastosPorCategoria = () => {
    const agrupado = {};
    let total = 0;
    filteredGastos.forEach(g => {
      const cat = g.categoria || 'Sin Categoría';
      const monto = parseFloat(g.monto || 0);
      agrupado[cat] = (agrupado[cat] || 0) + monto;
      total += monto;
    });
    return Object.entries(agrupado)
      .map(([categoria, monto]) => ({
        categoria,
        monto,
        porcentaje: total > 0 ? (monto / total) * 100 : 0
      }))
      .sort((a, b) => b.monto - a.monto);
  };

  const getGastosPorMedioPago = () => {
    const agrupado = {};
    let total = 0;
    filteredGastos.forEach(g => {
      const medio = g.metodo_pago || 'Sin Especificar';
      const monto = parseFloat(g.monto || 0);
      agrupado[medio] = (agrupado[medio] || 0) + monto;
      total += monto;
    });
    return Object.entries(agrupado)
      .map(([medioPago, monto]) => ({
        medioPago,
        monto,
        porcentaje: total > 0 ? (monto / total) * 100 : 0
      }))
      .sort((a, b) => b.monto - a.monto);
  };

  const totalGastos = filteredGastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
  const totalIngresos = filteredIngresos.reduce((sum, i) => sum + parseFloat(i.monto || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-sm opacity-80">Gestión Global de Caja y Tareas</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 hover:bg-white/20 p-2 rounded-lg transition-colors">
          <span className="hidden sm:inline text-sm">Cerrar Sesión</span>
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col sm:flex-row gap-6">
        
        {/* SIDEBAR NAVIGATION */}
        <nav className="sm:w-64 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
          <button onClick={() => setActiveTab('resumen')} className={`flex items-center gap-3 p-3 rounded-xl whitespace-nowrap transition-colors ${activeTab === 'resumen' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            <PieChart className="w-5 h-5" /> Resumen
          </button>
          <button onClick={() => setActiveTab('ingresos')} className={`flex items-center gap-3 p-3 rounded-xl whitespace-nowrap transition-colors ${activeTab === 'ingresos' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            <ArrowUpRight className="w-5 h-5" /> Todos los Ingresos
          </button>
          <button onClick={() => setActiveTab('gastos')} className={`flex items-center gap-3 p-3 rounded-xl whitespace-nowrap transition-colors ${activeTab === 'gastos' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            <FileText className="w-5 h-5" /> Todos los Gastos
          </button>
        </nav>

        {/* CONTENT AREA */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
          
          {/* SECCIÓN GLOBAL DE FILTROS */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 grid grid-cols-1 gap-4 p-4 md:grid-cols-3 lg:flex lg:flex-row mb-6">
            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Filtrar Período</label>
              <select 
                value={filtros.periodo} 
                onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none cursor-pointer pr-8 focus:border-indigo-500 transition-colors"
              >
                <option value="activo">⚡ Sprint Actual Activo</option>
                <option value="todos">🌍 Ver Histórico Completo</option>
                {sprintsHistoricos.map(s => (
                  <option key={s.id} value={s.id}>🛑 {s.nombre} ({new Date(s.fecha_inicio).toLocaleDateString('es-AR')})</option>
                ))}
              </select>
            </div>

            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Desde Fecha</label>
              <input 
                type="date" 
                value={filtros.fechaDesde} 
                onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value, periodo: e.target.value ? 'personalizado' : filtros.periodo })}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Hasta Fecha</label>
              <input 
                type="date" 
                value={filtros.fechaHasta} 
                onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value, periodo: e.target.value ? 'personalizado' : filtros.periodo })}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Categoría</label>
              <select 
                value={filtros.categoria} 
                onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none cursor-pointer pr-8 focus:border-indigo-500 transition-colors"
              >
                <option value="todos">✨ Todas las Categorías</option>
                {categoriasDisponibles.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="w-full lg:flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Medio de Pago</label>
              <select 
                value={filtros.medioPago} 
                onChange={(e) => setFiltros({ ...filtros, medioPago: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none cursor-pointer pr-8 focus:border-indigo-500 transition-colors"
              >
                <option value="todos">💳 Todos los Medios</option>
                {mediosPagoDisponibles.map(mp => (
                  <option key={mp} value={mp}>{mp}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">Cargando datos filtrados...</div>
          ) : (
            <>
              {/* TAB 1: RESUMEN GENERAL */}
              {activeTab === 'resumen' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">Resumen General</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-sm text-green-700 font-medium">Ingresos Totales</p>
                      <p className="text-3xl font-black text-green-600">${totalIngresos.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <p className="text-sm text-red-700 font-medium">Gastos Totales</p>
                      <p className="text-3xl font-black text-red-500">${totalGastos.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-500 font-medium">Flujo Neto</p>
                      <p className={`text-3xl font-black ${totalIngresos - totalGastos >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                        ${(totalIngresos - totalGastos).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* DESGLOSE DE GASTOS EN DOS COLUMNAS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    
                    {/* Columna 1: Por Categoría */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                        <span className="text-lg">📁</span>
                        <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Gastos por Categoría</h3>
                      </div>
                      
                      {getGastosPorCategoria().length === 0 ? (
                        <p className="text-slate-400 text-xs italic">No hay gastos registrados en este período.</p>
                      ) : (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                          {getGastosPorCategoria().map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-600">{item.categoria}</span>
                                <span className="text-red-500">${item.monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${item.porcentaje}%` }} 
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 text-right font-medium">
                                {item.porcentaje.toFixed(1)}% del total
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Columna 2: Por Medio de Pago */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                        <span className="text-lg">💳</span>
                        <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Gastos por Medio de Pago</h3>
                      </div>

                      {getGastosPorMedioPago().length === 0 ? (
                        <p className="text-slate-400 text-xs italic">No hay gastos registrados en este período.</p>
                      ) : (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                          {getGastosPorMedioPago().map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-600">{item.medioPago}</span>
                                <span className="text-red-500">${item.monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${item.porcentaje}%` }} 
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 text-right font-medium">
                                {item.porcentaje.toFixed(1)}% del total
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <button 
                      onClick={iniciarNuevoSprint}
                      disabled={sprintLoading}
                      className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      🏁 Configurar / Arrancar Sprint
                    </button>
                    <button 
                      onClick={exportarAExcel}
                      className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      📊 Descargar Cierre en Excel
                    </button>
                  </div>

                  <div className="h-[320px] mt-4 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Bar dataKey="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB 2: TODOS LOS INGRESOS */}
              {activeTab === 'ingresos' && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-slate-800">Todos los Ingresos ({filteredIngresos.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-100 text-slate-500">
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Cargado Por</th>
                          <th className="p-3">Sprint</th>
                          <th className="p-3">Categoría</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIngresos.length === 0 ? (
                          <tr><td colSpan="6" className="p-4 text-center text-slate-400">No hay ingresos bajo este criterio de filtro.</td></tr>
                        ) : (
                          filteredIngresos.map(i => (
                            <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="p-3 text-sm text-slate-600">{i.fecha ? new Date(i.fecha).toLocaleDateString() : 'Sin Fecha'}</td>
                              <td className="p-3 text-sm font-bold text-slate-700">{i.creado_por || 'Sistema'}</td>
                              <td className="p-3 text-sm italic text-indigo-600 font-medium">{i.sprints?.nombre || 'Global'}</td>
                              <td className="p-3 text-sm text-slate-600">{i.categoria}</td>
                              <td className="p-3 text-sm text-slate-500">{i.descripcion}</td>
                              <td className="p-3 font-bold text-green-600">${i.monto}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: TODOS LOS GASTOS */}
              {activeTab === 'gastos' && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-slate-800">Todos los Gastos ({filteredGastos.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-100 text-slate-500">
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Empleado</th>
                          <th className="p-3">Sprint</th>
                          <th className="p-3">Categoría</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3">Método</th>
                          <th className="p-3">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGastos.length === 0 ? (
                          <tr><td colSpan="7" className="p-4 text-center text-slate-400">No hay gastos bajo este criterio de filtro.</td></tr>
                        ) : (
                          filteredGastos.map(g => (
                            <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="p-3 text-sm text-slate-600">{g.fecha_gasto ? new Date(g.fecha_gasto).toLocaleDateString() : 'Sin Fecha'}</td>
                              <td className="p-3 text-sm font-bold text-slate-700">{g.creado_por || 'Desconocido'}</td>
                              <td className="p-3 text-sm italic text-indigo-600 font-medium">{g.sprints?.nombre || 'Global'}</td>
                              <td className="p-3 text-sm text-slate-600">{g.categoria}</td>
                              <td className="p-3 text-sm text-slate-500">{g.descripcion}</td>
                              <td className="p-3 text-sm text-slate-400">{g.metodo_pago || '—'}</td>
                              <td className="p-3 font-bold text-red-500">${g.monto}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;