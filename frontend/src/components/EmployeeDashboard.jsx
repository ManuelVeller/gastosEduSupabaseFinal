import React, { useState, useEffect } from 'react';
import ExpenseForm from './ExpenseForm';
import { supabase } from '../supabaseClient';
import { UserX } from 'lucide-react';

const EmployeeDashboard = ({ empleado, onResetName }) => {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Iniciamos la pestaña por defecto en 'ingresos' para que combine con el orden visual
  const [activeTab, setActiveTab] = useState('ingresos');

  // Función de carga que filtra por nombre 'creado_por' y por la tabla activa
  const fetchRegistros = async () => {
    try {
      setLoading(true);
      
      const tablaDestino = activeTab === 'gastos' ? 'resumen_gastos' : 'ingresos';
      const columnaFecha = activeTab === 'gastos' ? 'fecha_gasto' : 'fecha';

      const { data, error } = await supabase
        .from(tablaDestino)
        .select('*')
        .eq('creado_por', empleado)
        .order(columnaFecha, { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (err) {
      console.error('Error fetching registros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, [empleado, activeTab]);

  const handleRecordSaved = () => {
    fetchRegistros();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col h-[90vh] max-h-[850px] relative">
        
        {/* HEADER */}
        <header className="bg-slate-800 text-white p-6 pb-8 text-center rounded-b-[2rem] shadow-md z-10 relative flex justify-between items-center">
          <div className="w-8"></div> 
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">¡Hola, {empleado}!</h1>
            <p className="text-slate-300 text-sm font-medium">Panel de Carga Directa</p>
          </div>
          <button 
            onClick={onResetName} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors" 
            title="Cambiar de usuario (Borrar nombre)"
          >
            <UserX className="w-5 h-5" />
          </button>
        </header>

        {/* NAVEGACIÓN DE PESTAÑAS INVERTIDA (Ingreso Izquierda, Gasto Derecha) */}
        <div className="flex px-6 mt-4 gap-2 z-10">
          <button
            onClick={() => setActiveTab('ingresos')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'ingresos' 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            📈 Cargar Ingreso
          </button>
          <button
            onClick={() => setActiveTab('gastos')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'gastos' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            📉 Cargar Gasto
          </button>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="flex-1 overflow-y-auto z-0 pt-4 px-6 pb-6 space-y-6 no-scrollbar relative">
          <section>
            <ExpenseForm 
              onSaved={handleRecordSaved} 
              empleado={empleado} 
              tipoRegistro={activeTab} 
            />
          </section>

          <hr className="border-slate-100" />

          {/* HISTORIAL RECIENTE */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">
              Mis {activeTab === 'gastos' ? 'Gastos' : 'Ingresos'} Recientes
            </h3>
            
            {loading ? (
              <p className="text-center text-slate-400">Cargando...</p>
            ) : registros.length === 0 ? (
              <p className="text-center text-slate-400">Aún no hay registros en esta sección.</p>
            ) : (
              <div className="space-y-3">
                {registros.map((r) => (
                  <div key={r.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-700">{r.categoria}</p>
                      <p className="text-xs text-slate-400">
                        {(activeTab === 'gastos' ? r.fecha_gasto : r.fecha) 
                          ? (activeTab === 'gastos' ? r.fecha_gasto : r.fecha).split('-').reverse().join('/') 
                          : 'Sin Fecha'} 
                        {r.metodo_pago && ` - ${r.metodo_pago}`}
                      </p>
                      {r.descripcion && <p className="text-xs text-slate-500 mt-1">{r.descripcion}</p>}
                    </div>
                    <div className={`text-lg font-black ${activeTab === 'gastos' ? 'text-red-500' : 'text-green-600'}`}>
                      ${r.monto}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
