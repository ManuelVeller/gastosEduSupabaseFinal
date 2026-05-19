import React, { useState, useEffect } from 'react';
import ExpenseForm from './ExpenseForm';
import { supabase } from '../supabaseClient';
import { LogOut } from 'lucide-react';

const EmployeeDashboard = ({ user, onLogout }) => {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGastos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resumen_gastos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('fecha_gasto', { ascending: false });

      if (error) throw error;
      setGastos(data || []);
    } catch (err) {
      console.error('Error fetching gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, [user.id]);

  const handleExpenseSaved = () => {
    fetchGastos();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col h-[90vh] max-h-[850px] relative">
        <header className="bg-expense-600 text-white p-6 pb-8 text-center rounded-b-[2rem] shadow-md z-10 relative flex justify-between items-center">
          <div className="w-8"></div> {/* Spacer */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Mis Gastos</h1>
            <p className="text-expense-100/80 text-sm font-medium">Panel de Empleado</p>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Cerrar sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto z-0 -mt-6 pt-10 px-6 pb-6 space-y-8 no-scrollbar relative">
          <section>
            <ExpenseForm onSaved={handleExpenseSaved} user={user} />
          </section>

          <hr className="border-slate-100" />

          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Historial Reciente</h3>
            {loading ? (
              <p className="text-center text-slate-400">Cargando gastos...</p>
            ) : gastos.length === 0 ? (
              <p className="text-center text-slate-400">Aún no hay gastos registrados.</p>
            ) : (
              <div className="space-y-3">
                {gastos.map((g) => (
                  <div key={g.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-700">{g.categoria}</p>
                      <p className="text-xs text-slate-400">{new Date(g.fecha_gasto).toLocaleDateString()} - {g.metodo_pago}</p>
                      {g.descripcion && <p className="text-xs text-slate-500 mt-1">{g.descripcion}</p>}
                    </div>
                    <div className="text-lg font-black text-expense-600">
                      ${g.monto}
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
