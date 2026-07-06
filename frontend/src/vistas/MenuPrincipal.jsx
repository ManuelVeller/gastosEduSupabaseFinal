import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { tasksService } from '../services/tasksService';
import { DollarSign, Wrench, ClipboardList, Check, Calendar, User } from 'lucide-react';

function MenuPrincipal() {
  const navigate = useNavigate();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // --- SHOW TOAST HELPER ---
  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- FETCH PENDING TASKS ---
  const fetchPendingTasks = async () => {
    try {
      setLoading(true);
      const tasks = await tasksService.getTasks();

      // Filtrar pendientes en memoria (cualquiera que no esté completada)
      const pending = (tasks || []).filter(
        t => {
          const est = t.estado ? t.estado.toLowerCase() : '';
          return est !== 'completada' && est !== 'completado';
        }
      );
      setPendingTasks(pending);
    } catch (err) {
      console.error('Error fetching pending tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  // --- CYCLE TASK STATUS QUICK ACTION ---
  const handleCycleTaskStatus = async (taskId, currentStatus, taskTitle) => {
    try {
      let nextStatus = 'En Progreso';
      if (currentStatus === 'En Progreso') {
        nextStatus = 'Completada';
      }

      await tasksService.updateTaskStatus(taskId, nextStatus);

      if (nextStatus === 'Completada') {
        // Quitar de la lista local si está completada
        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
        showToast(`¡Tarea "${taskTitle}" completada con éxito!`);
      } else {
        // Actualizar el estado en la lista local
        setPendingTasks(prev =>
          prev.map(t => (t.id === taskId ? { ...t, estado: nextStatus } : t))
        );
        showToast(`Tarea "${taskTitle}" cambiada a "${nextStatus}"`);
      }
    } catch (err) {
      console.error('Error cycling task status:', err);
      alert('Error al cambiar el estado de la tarea: ' + err.message);
    }
  };

  // Helpers para extraer fecha y limpiar título de tareas legacy y nuevas
  const getTaskTitle = (t) => {
    const titleVal = t.title || t.titulo || '';
    if (!titleVal) return '';
    if (t.descripcion || t.fecha_vencimiento || t.fecha_vence) {
      return titleVal;
    }
    return titleVal.replace(/\(Vence: [0-9/]{10}\)/, '').trim();
  };

  const getTaskDate = (t) => {
    const dueField = t.fecha_vencimiento || t.fecha_vence;
    if (dueField) {
      const parts = dueField.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dueField;
    }
    const titleVal = t.title || t.titulo || '';
    const match = titleVal.match(/\(Vence: ([0-9/]{10})\)/);
    return match ? match[1] : null;
  };

  const options = [
    {
      title: 'Finanzas',
      description: 'Control de gastos, ingresos y balances generales.',
      icon: DollarSign,
      color: 'border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100/50 bg-white hover:bg-emerald-50/20',
      iconBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
      onClick: () => navigate('/finanzas'),
    },
    {
      title: 'Mantenimiento de Flota',
      description: 'Registro de service, reparaciones y estado de vehículos.',
      icon: Wrench,
      color: 'border-blue-100 hover:border-blue-300 hover:shadow-blue-100/50 bg-white hover:bg-blue-50/20',
      iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
      onClick: () => navigate('/mantenimiento'),
    },
    {
      title: 'Tareas',
      description: 'Listados de tareas pendientes, asignaciones y control diario.',
      icon: ClipboardList,
      color: 'border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-100/50 bg-white hover:bg-indigo-50/20',
      iconBg: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
      onClick: () => navigate('/tareas'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center px-6 py-12">
      <div className="max-w-4xl w-full flex-grow flex flex-col justify-center space-y-12">
        
        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight mb-3">
            Panel de Control
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-md mx-auto">
            Seleccione una de las siguientes áreas para comenzar a gestionar
          </p>
        </div>

        {/* CONTENEDOR GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {options.map((opt, index) => {
            const IconComponent = opt.icon;
            return (
              <button
                key={index}
                onClick={opt.onClick}
                className={`flex flex-col items-center p-8 rounded-2xl border bg-white shadow-sm transition-all duration-350 transform hover:-translate-y-1.5 hover:shadow-xl text-center group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${opt.color}`}
              >
                <div className={`p-4 rounded-2xl mb-6 transition-all duration-355 group-hover:scale-110 ${opt.iconBg}`}>
                  <IconComponent className="w-8 h-8 stroke-[2]" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 transition-colors duration-300 group-hover:text-slate-900">
                  {opt.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[220px]">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* LISTA COMPACTA DE TAREAS PENDIENTES */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Tareas Pendientes del Día
              </h2>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingTasks.length} pendientes
            </span>
          </div>

          {loading ? (
            <p className="text-center text-slate-400 text-sm py-4 animate-pulse">Cargando tareas pendientes...</p>
          ) : pendingTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-400 space-y-1">
              <p className="text-sm font-semibold">🎉 ¡Todo al día!</p>
              <p className="text-xs text-slate-400">No tenés tareas pendientes para hoy.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
              {pendingTasks.map(t => {
                const date = getTaskDate(t);
                const title = getTaskTitle(t);
                return (
                   <div key={t.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 group">
                    <div className="space-y-1.5 pr-4 flex-1">
                      <p className="font-bold text-slate-700 text-sm group-hover:text-slate-900 transition-colors leading-snug">
                        {title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                          {t.tipo_actividad && t.tipo_actividad.includes('|') ? t.tipo_actividad.split('|')[1] : (t.tipo_actividad || 'General')}
                        </span>
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>Creador: {t.creado_por || 'Empleado'}</span>
                        </div>
                        {date && (
                          <div className="flex items-center gap-1 text-indigo-500 font-semibold">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Vence: {date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Botón interactivo de ciclo de estado */}
                      <button
                        onClick={() => handleCycleTaskStatus(t.id, t.estado || 'Backlog', title)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1 border hover:scale-105 active:scale-95 ${
                          t.estado === 'En Progreso'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                        title={`Estado actual: ${t.estado || 'Backlog'}. Haz clic para avanzar.`}
                      >
                        {t.estado === 'En Progreso' ? (
                          <>⚡ En Progreso</>
                        ) : (
                          <>📋 Backlog</>
                        )}
                      </button>

                      {/* Botón de completado directo */}
                      <button
                        onClick={() => handleCycleTaskStatus(t.id, 'En Progreso', title)}
                        className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
                        title="Completar Tarea Directamente"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 animate-slide-in pointer-events-auto max-w-sm"
          >
            <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-xs font-bold leading-normal">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MenuPrincipal;
