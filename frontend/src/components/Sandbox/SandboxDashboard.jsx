import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { FileText, PieChart, ArrowUpRight, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const ingresos = payload.find(p => p.dataKey === 'Ingresos')?.value || 0;
    const gastos = payload.find(p => p.dataKey === 'Gastos')?.value || 0;
    const neto = payload.find(p => p.dataKey === 'Neto')?.value ?? (ingresos - gastos);

    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xl font-sans text-xs space-y-2">
        <p className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-1">
          📅 Fecha: {label}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-slate-500 font-semibold">📈 Ingresos:</span>
            <span className="text-green-600 font-bold">${ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-slate-500 font-semibold">📉 Egresos:</span>
            <span className="text-red-500 font-bold">${gastos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between gap-6 border-t border-slate-100 pt-1.5 mt-1 font-bold">
            <span className="text-slate-700">💼 Flujo Neto:</span>
            <span className={neto >= 0 ? 'text-blue-600' : 'text-amber-600'}>
              ${neto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

function SandboxDashboard({ transactions, sprints, activeSprint, onStartSprint, onLogout, vehicles }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [filtros, setFiltros] = useState({
    periodo: 'activo', // 'activo', 'todos', o ID de sprint cerrado
    fechaDesde: '',
    fechaHasta: '',
    categoria: 'todos',
    medioPago: 'todos'
  });

  const sprintsHistoricos = sprints.filter(s => s.estado === 'cerrado');

  // Filtrar los datos en base a los filtros seleccionados
  const getFilteredTransactions = () => {
    let list = [...transactions];

    // --- FILTRO DE SPRINT ---
    if (filtros.periodo === 'activo') {
      if (activeSprint) {
        list = list.filter(t => t.sprint_id === activeSprint.id);
      } else {
        // Si no hay sprint activo y está seleccionado "activo", retornamos vacío
        return [];
      }
    } else if (filtros.periodo !== 'todos' && filtros.periodo !== 'personalizado') {
      list = list.filter(t => t.sprint_id === filtros.periodo);
    }

    // --- FILTRO DE RANGOS DE FECHA ---
    if (filtros.fechaDesde) {
      list = list.filter(t => {
        const f = t.fecha || t.fecha_gasto;
        return f >= filtros.fechaDesde;
      });
    }
    if (filtros.fechaHasta) {
      list = list.filter(t => {
        const f = t.fecha || t.fecha_gasto;
        return f <= filtros.fechaHasta;
      });
    }

    // --- FILTRO DE CATEGORÍA ---
    if (filtros.categoria !== 'todos') {
      list = list.filter(t => t.categoria === filtros.categoria);
    }

    // --- FILTRO DE MEDIO DE PAGO ---
    if (filtros.medioPago !== 'todos') {
      list = list.filter(t => t.metodo_pago === filtros.medioPago);
    }

    return list;
  };

  const currentFiltered = getFilteredTransactions();

  // Separar en ingresos y egresos
  const filteredIngresos = currentFiltered.filter(t => !t.fecha_gasto);
  const filteredGastos = currentFiltered.filter(t => !!t.fecha_gasto);

  // Totales
  const totalIngresos = filteredIngresos.reduce((sum, i) => sum + parseFloat(i.monto || 0), 0);
  const totalGastos = filteredGastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
  const flujoNeto = totalIngresos - totalGastos;

  // Categorías y Medios de pago disponibles en base a transacciones cargadas
  const categoriasDisponibles = Array.from(new Set(transactions.map(t => t.categoria))).filter(Boolean).sort();
  const mediosPagoDisponibles = Array.from(new Set(transactions.map(t => t.metodo_pago))).filter(Boolean).sort();

  // Formatear datos para el gráfico cronológico
  const mapaFechas = {};

  currentFiltered.forEach(t => {
    const fecha = t.fecha || t.fecha_gasto || 'Sin Fecha';
    if (!mapaFechas[fecha]) mapaFechas[fecha] = { Gastos: 0, Ingresos: 0 };
    if (t.fecha_gasto) {
      mapaFechas[fecha].Gastos += parseFloat(t.monto || 0);
    } else {
      mapaFechas[fecha].Ingresos += parseFloat(t.monto || 0);
    }
  });

  const fechasOrdenadas = Object.keys(mapaFechas).sort((a, b) => {
    if (a === 'Sin Fecha') return 1;
    if (b === 'Sin Fecha') return -1;
    return new Date(a) - new Date(b);
  });

  const chartData = fechasOrdenadas.map(fecha => {
    const d = mapaFechas[fecha];
    let fechaFormateada = fecha;
    if (fecha !== 'Sin Fecha') {
      const dateObj = new Date(fecha + 'T00:00:00');
      if (!isNaN(dateObj)) {
        fechaFormateada = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
      }
    }
    return {
      name: fechaFormateada,
      Ingresos: d.Ingresos,
      Gastos: d.Gastos,
      Neto: d.Ingresos - d.Gastos
    };
  });

  // Exportar los datos actuales a un libro Excel multihoja
  const exportarAExcel = () => {
    if (filteredGastos.length === 0 && filteredIngresos.length === 0) {
      alert("No hay datos filtrados en este período para exportar.");
      return;
    }

    try {
      const libro = XLSX.utils.book_new();

      if (filteredGastos.length > 0) {
        const datosGastos = filteredGastos.map(g => ({
          Fecha: g.fecha_gasto ? new Date(g.fecha_gasto + 'T00:00:00').toLocaleDateString('es-AR') : 'Sin fecha',
          Empleado: g.creado_por || 'Desconocido',
          Sprint: sprints.find(s => s.id === g.sprint_id)?.nombre || 'Global / Sin asignar',
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
          Fecha: i.fecha ? new Date(i.fecha + 'T00:00:00').toLocaleDateString('es-AR') : 'Sin fecha',
          'Cargado Por': i.creado_por || 'Sistema',
          Sprint: sprints.find(s => s.id === i.sprint_id)?.nombre || 'Global / Sin asignar',
          Categoría: i.categoria,
          Descripción: i.descripcion || '-',
          'Método Pago': i.metodo_pago || '-',
          Monto: parseFloat(i.monto || 0)
        }));
        const hojaIngresos = XLSX.utils.json_to_sheet(datosIngresos);
        XLSX.utils.book_append_sheet(libro, hojaIngresos, "Ingresos");
      }

      XLSX.writeFile(libro, `Sandbox_Rendicion_Caja_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      alert("Error al generar el archivo.");
    }
  };

  const handleConfigurarSprint = () => {
    if (activeSprint) {
      alert("Ya hay un sprint activo. Debes cerrarlo desde el panel de carga antes de iniciar uno nuevo.");
      return;
    }
    const nombre = prompt("Ingresá el nombre/período del nuevo Sprint (ej: Quincena Agosto):");
    if (!nombre) return;
    
    // Auto Asociado opcional para simular
    let autoLabel = '';
    if (vehicles && vehicles.length > 0) {
      const chooseCar = window.confirm(`¿Querés asociar el primer auto de la flota (${vehicles[0].marca_modelo}) a este Sprint?`);
      if (chooseCar) {
        const v = vehicles[0];
        const words = v.marca_modelo.split(' ');
        const model = words.length > 1 ? words.slice(1).join(' ') : words[0];
        const suffix = v.patente.slice(-2).toUpperCase();
        autoLabel = `${model} ${suffix}`;
      }
    }

    onStartSprint(nombre, autoLabel || 'General');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      
      {/* HEADER */}
      <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>🛡️</span> Admin Dashboard <span className="text-xs bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Demo</span>
          </h1>
          <p className="text-xs opacity-80">Gestión de Caja en Memoria (100% Client-Side)</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 p-2 rounded-xl transition-all active:scale-95 text-xs font-semibold">
          <span>Volver al Menú</span>
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col sm:flex-row gap-6">
        
        {/* SIDEBAR NAVIGATION */}
        <nav className="sm:w-64 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
          <button 
            onClick={() => setActiveTab('resumen')} 
            className={`flex items-center gap-3 p-3.5 rounded-xl whitespace-nowrap transition-all font-bold text-xs ${activeTab === 'resumen' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/50'}`}
          >
            <PieChart className="w-4 h-4" /> Resumen General
          </button>
          <button 
            onClick={() => setActiveTab('ingresos')} 
            className={`flex items-center gap-3 p-3.5 rounded-xl whitespace-nowrap transition-all font-bold text-xs ${activeTab === 'ingresos' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/50'}`}
          >
            <ArrowUpRight className="w-4 h-4" /> Todos los Ingresos ({filteredIngresos.length})
          </button>
          <button 
            onClick={() => setActiveTab('gastos')} 
            className={`flex items-center gap-3 p-3.5 rounded-xl whitespace-nowrap transition-all font-bold text-xs ${activeTab === 'gastos' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/50'}`}
          >
            <FileText className="w-4 h-4" /> Todos los Gastos ({filteredGastos.length})
          </button>
        </nav>

        {/* CONTENT AREA */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200/50 p-6 min-h-[500px] flex flex-col">
          
          {/* SECCIÓN GLOBAL DE FILTROS */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 mb-6">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Filtrar Período</label>
              <select 
                value={filtros.periodo} 
                onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
              >
                <option value="activo">⚡ Sprint Actual Activo</option>
                <option value="todos">🌍 Ver Histórico Completo</option>
                {sprintsHistoricos.map(s => (
                  <option key={s.id} value={s.id}>🛑 {s.nombre} ({new Date(s.fecha_inicio + 'T00:00:00').toLocaleDateString('es-AR')})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Desde Fecha</label>
              <input 
                type="date" 
                value={filtros.fechaDesde} 
                onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value, periodo: e.target.value ? 'personalizado' : filtros.periodo })}
                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Hasta Fecha</label>
              <input 
                type="date" 
                value={filtros.fechaHasta} 
                onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value, periodo: e.target.value ? 'personalizado' : filtros.periodo })}
                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Categoría</label>
              <select 
                value={filtros.categoria} 
                onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
              >
                <option value="todos">✨ Todas las Categorías</option>
                {categoriasDisponibles.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Medio de Pago</label>
              <select 
                value={filtros.medioPago} 
                onChange={(e) => setFiltros({ ...filtros, medioPago: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
              >
                <option value="todos">💳 Todos los Medios</option>
                {mediosPagoDisponibles.map(mp => (
                  <option key={mp} value={mp}>{mp}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TAB 1: RESUMEN GENERAL */}
          {activeTab === 'resumen' && (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-slate-800">Resumen Financiero</h2>
                  {activeSprint && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-200">
                      Sprint Activo: {activeSprint.nombre}
                    </span>
                  )}
                </div>
                
                {/* METRIC CARD GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/80 shadow-sm">
                    <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Ingresos Totales</p>
                    <p className="text-3xl font-black text-green-600 mt-2">${totalIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100/80 shadow-sm">
                    <p className="text-xs text-red-700 font-bold uppercase tracking-wider">Gastos Totales</p>
                    <p className="text-3xl font-black text-red-500 mt-2">${totalGastos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Flujo Neto</p>
                    <p className={`text-3xl font-black mt-2 ${flujoNeto >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                      ${flujoNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button 
                    onClick={handleConfigurarSprint}
                    className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                  >
                    🏁 Configurar / Arrancar Sprint
                  </button>
                  <button 
                    onClick={exportarAExcel}
                    className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                  >
                    📊 Descargar Cierre en Excel
                  </button>
                </div>
              </div>

              {/* GRÁFICO AREA */}
              <div className="mt-8 flex-grow">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Evolución Diaria (Ingresos vs Egresos)</h4>
                <div className="h-72 w-full">
                  {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50 text-slate-400 text-xs font-semibold">
                      Sin datos para mostrar en este período.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorNeto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                          stroke="#cbd5e1"
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                          stroke="#cbd5e1"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }} />
                        <Area
                          type="monotone"
                          dataKey="Ingresos"
                          stroke="#16a34a"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorIngresos)"
                          dot={{ r: 4, stroke: '#16a34a', strokeWidth: 2, fill: '#ffffff' }}
                          activeDot={{ r: 6, stroke: '#16a34a', strokeWidth: 2, fill: '#16a34a' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Gastos"
                          name="Egresos"
                          stroke="#ef4444"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorGastos)"
                          dot={{ r: 4, stroke: '#ef4444', strokeWidth: 2, fill: '#ffffff' }}
                          activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#ef4444' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Neto"
                          name="Flujo Neto"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorNeto)"
                          dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#3b82f6' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TODOS LOS INGRESOS */}
          {activeTab === 'ingresos' && (
            <div className="space-y-4 flex-grow">
              <h2 className="text-xl font-black text-slate-800">Todos los Ingresos ({filteredIngresos.length})</h2>
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Cargado Por</th>
                      <th className="p-3.5">Sprint</th>
                      <th className="p-3.5">Categoría</th>
                      <th className="p-3.5">Descripción</th>
                      <th className="p-3.5">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredIngresos.length === 0 ? (
                      <tr><td colSpan="6" className="p-6 text-center text-slate-400 font-medium">No hay ingresos registrados para este filtro.</td></tr>
                    ) : (
                      filteredIngresos.map(i => (
                        <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 text-slate-600 font-medium">
                            {i.fecha ? new Date(i.fecha + 'T00:00:00').toLocaleDateString() : 'Sin Fecha'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-700">{i.creado_por || 'Sistema'}</td>
                          <td className="p-3.5 italic text-indigo-600 font-bold">{sprints.find(s => s.id === i.sprint_id)?.nombre || 'Global'}</td>
                          <td className="p-3.5 font-semibold text-slate-700">{i.categoria}</td>
                          <td className="p-3.5 text-slate-500 max-w-xs truncate" title={i.descripcion}>{i.descripcion || '-'}</td>
                          <td className="p-3.5 font-black text-green-600 text-sm">${parseFloat(i.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
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
            <div className="space-y-4 flex-grow">
              <h2 className="text-xl font-black text-slate-800">Todos los Gastos ({filteredGastos.length})</h2>
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Empleado</th>
                      <th className="p-3.5">Sprint</th>
                      <th className="p-3.5">Categoría</th>
                      <th className="p-3.5">Descripción</th>
                      <th className="p-3.5">Método</th>
                      <th className="p-3.5">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredGastos.length === 0 ? (
                      <tr><td colSpan="7" className="p-6 text-center text-slate-400 font-medium">No hay gastos registrados para este filtro.</td></tr>
                    ) : (
                      filteredGastos.map(g => (
                        <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 text-slate-600 font-medium">
                            {g.fecha_gasto ? new Date(g.fecha_gasto + 'T00:00:00').toLocaleDateString() : 'Sin Fecha'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-700">{g.creado_por || 'Desconocido'}</td>
                          <td className="p-3.5 italic text-indigo-600 font-bold">{sprints.find(s => s.id === g.sprint_id)?.nombre || 'Global'}</td>
                          <td className="p-3.5 font-semibold text-slate-700">{g.categoria}</td>
                          <td className="p-3.5 text-slate-500 max-w-xs truncate" title={g.descripcion}>{g.descripcion || '-'}</td>
                          <td className="p-3.5 text-slate-400 font-semibold">{g.metodo_pago || '—'}</td>
                          <td className="p-3.5 font-black text-red-500 text-sm">${parseFloat(g.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default SandboxDashboard;
