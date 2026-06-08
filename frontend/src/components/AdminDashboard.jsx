import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, FileText, CheckCircle, PieChart, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdminDashboard = ({ user, onLogout }) => {
  const [gastos, setGastos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen'); // resumen, gastos, ingresos, tareas

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Consultas globales a Supabase independientes de las relaciones de Auth viejas
      const [gastosRes, ingresosRes, tareasRes] = await Promise.all([
        supabase.from('gastos').select('*').order('fecha_gasto', { ascending: false }),
        supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
        supabase.from('tareas').select('*') // <-- Quitamos el .order() conflictivo
      ]);

      if (gastosRes.error) throw gastosRes.error;
      if (ingresosRes.error) throw ingresosRes.error;
      if (tareasRes.error) throw tareasRes.error;

      setGastos(gastosRes.data || []);
      setIngresos(ingresosRes.data || []);
      setTareas(tareasRes.data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // --- PROCESAMIENTO DE DATOS PARA EL GRÁFICO COMPARATIVO ---
  const balancePorCategoria = {};

  gastos.forEach(g => {
    if (!balancePorCategoria[g.categoria]) balancePorCategoria[g.categoria] = { Gastos: 0, Ingresos: 0 };
    balancePorCategoria[g.categoria].Gastos += parseFloat(g.monto || 0);
  });

  ingresos.forEach(i => {
    if (!balancePorCategoria[i.categoria]) balancePorCategoria[i.categoria] = { Gastos: 0, Ingresos: 0 };
    balancePorCategoria[i.categoria].Ingresos += parseFloat(i.monto || 0);
  });

  const chartData = Object.keys(balancePorCategoria).map(key => ({
    name: key,
    Gastos: balancePorCategoria[key].Gastos,
    Ingresos: balancePorCategoria[key].Ingresos
  }));

  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);
  const totalIngresos = ingresos.reduce((sum, i) => sum + parseFloat(i.monto || 0), 0);

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
          <button onClick={() => setActiveTab('tareas')} className={`flex items-center gap-3 p-3 rounded-xl whitespace-nowrap transition-colors ${activeTab === 'tareas' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            <CheckCircle className="w-5 h-5" /> Tareas
          </button>
        </nav>

        {/* CONTENT AREA */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">Cargando datos globales...</div>
          ) : (
            <>
              {/* TAB 1: RESUMEN GENERAL */}
              {activeTab === 'resumen' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">Resumen General</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-500 font-medium">Tareas Pendientes</p>
                      <p className="text-3xl font-black text-amber-500">{tareas.filter(t => t.estado === 'pendiente').length}</p>
                    </div>
                  </div>

                  {/* Gráfico dual Recharts */}
                  <div className="h-[320px] mt-8 w-full">
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
                  <h2 className="text-2xl font-bold text-slate-800">Todos los Ingresos</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-100 text-slate-500">
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Cargado Por</th>
                          <th className="p-3">Categoría</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingresos.length === 0 ? (
                          <tr><td colSpan="5" className="p-4 text-center text-slate-400">No hay ingresos registrados.</td></tr>
                        ) : (
                          ingresos.map(i => (
                            <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="p-3 text-sm text-slate-600">{i.fecha ? new Date(i.fecha).toLocaleDateString() : 'Sin Fecha'}</td>
                              <td className="p-3 text-sm font-bold text-slate-700">{i.creado_por || 'Sistema'}</td>
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
                  <h2 className="text-2xl font-bold text-slate-800">Todos los Gastos</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-100 text-slate-500">
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Empleado</th>
                          <th className="p-3">Categoría</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3">Método</th>
                          <th className="p-3">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gastos.length === 0 ? (
                          <tr><td colSpan="6" className="p-4 text-center text-slate-400">No hay gastos registrados.</td></tr>
                        ) : (
                          gastos.map(g => (
                            <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="p-3 text-sm text-slate-600">{g.fecha_gasto ? new Date(g.fecha_gasto).toLocaleDateString() : 'Sin Fecha'}</td>
                              <td className="p-3 text-sm font-bold text-slate-700">{g.creado_por || 'Desconocido'}</td>
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

              {/* TAB 4: TAREAS */}
              {activeTab === 'tareas' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Tareas de Empleados</h2>
                    <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700">Nueva Tarea</button>
                  </div>
                  <div className="space-y-3">
                    {tareas.length === 0 ? (
                      <p className="text-slate-400">No hay tareas creadas.</p>
                    ) : (
                      tareas.map(t => (
                        <div key={t.id} className="border border-slate-100 p-4 rounded-xl flex justify-between items-center bg-slate-50">
                          <div>
                            <h4 className="font-bold text-slate-700">{t.titulo}</h4>
                            <p className="text-sm text-slate-500">Asignada a: {t.creado_por || 'Empleado'}</p>
                          </div>
                          <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.estado === 'completada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {t.estado}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
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
