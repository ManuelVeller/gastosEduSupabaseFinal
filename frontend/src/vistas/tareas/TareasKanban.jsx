import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { tasksService } from '../../services/tasksService';
import { notificationService } from '../../services/notificationService';
import FormularioAltaTarea from './FormularioAltaTarea';
import { ArrowLeft, Plus, Check, Clock, AlertCircle, X, User, Calendar, FileText, RefreshCw, Car, Layers } from 'lucide-react';

function TareasKanban() {
  const navigate = useNavigate();

  // --- ESTADOS DE DATOS ---
  const [tareas, setTareas] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // --- ESTADOS DEL MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sprint_activo'); // 'sprint_activo' o 'historial'
  const [historySearch, setHistorySearch] = useState('');

  // --- TOAST NOTIFICATIONS ---
  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- CARGAR DATOS INICIALES ---
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Sprints Activos
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('*')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true });

      if (sprintsError) throw sprintsError;
      setSprints(sprintsData || []);

      // 2. Fetch Tareas desde el servicio
      const tasksData = await tasksService.getTasks();
      setTareas(tasksData || []);

      // 3. Fetch Perfiles
      const { data: perfilesData, error: perfilesError } = await supabase
        .from('perfiles')
        .select('*')
        .order('nombre', { ascending: true });

      if (perfilesError) throw perfilesError;
      setPerfiles(perfilesData || []);

    } catch (err) {
      console.error('Error al cargar datos del tablero:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PARSEAR INFORMACIÓN DE LA TAREA ---
  const parseTaskSprintId = (tipoActividad) => {
    if (!tipoActividad) return 'global';
    if (tipoActividad.includes('|')) {
      return tipoActividad.split('|')[0] || 'global';
    }
    // Si es un UUID (ej: por retrocompatibilidad si se guardó solo el ID del sprint)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(tipoActividad)) {
      return tipoActividad;
    }
    return 'global';
  };

  const parseTaskCategory = (tipoActividad) => {
    if (!tipoActividad) return 'General';
    if (tipoActividad.includes('|')) {
      return tipoActividad.split('|')[1] || 'General';
    }
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(tipoActividad)) {
      return 'General';
    }
    return tipoActividad;
  };

  const parseTaskDate = (title) => {
    const match = title.match(/\(Vence: ([0-9/]{10})\)/);
    return match ? match[1] : null;
  };

  const cleanTaskTitle = (title) => {
    // Limpia la fecha del título
    let clean = title.replace(/\(Vence: [0-9/]{10}\)/, '');
    // Limpia la descripción (si está adjuntada con " - ")
    const splitIndex = clean.indexOf(' - ');
    if (splitIndex !== -1) {
      clean = clean.substring(0, splitIndex);
    }
    return clean.trim();
  };

  const parseTaskDesc = (title) => {
    const splitIndex = title.indexOf(' - ');
    if (splitIndex !== -1) {
      return title.substring(splitIndex + 3).replace(/\(Vence: [0-9/]{10}\)/, '').trim();
    }
    return '';
  };

  // --- HELPERS PARA COMPATIBILIDAD CON NUEVOS CAMPOS ---
  const getTaskTitle = (t) => {
    const titleVal = t.title || t.titulo || '';
    if (!titleVal) return '';
    if (t.descripcion || t.fecha_vencimiento || t.fecha_vence) {
      return titleVal;
    }
    return cleanTaskTitle(titleVal);
  };

  const getTaskDesc = (t) => {
    if (t.descripcion) return t.descripcion;
    return parseTaskDesc(t.title || t.titulo || '');
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
    return parseTaskDate(t.title || t.titulo || '');
  };

  const getSprintName = (t) => {
    const sprintId = parseTaskSprintId(t.tipo_actividad);
    if (sprintId === 'global') return 'General';
    const sp = sprints.find(s => s.id === sprintId);
    return sp ? sp.nombre : 'General';
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetState, targetSprintId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToMove = tareas.find(t => t.id === taskId);
    if (!taskToMove) return;

    // Obtener la categoría del tipo de actividad para conservarla
    const category = parseTaskCategory(taskToMove.tipo_actividad);
    
    // Generar el nuevo tipo_actividad encodificado con el sprint destino
    let newTipoActividad = category;
    if (targetSprintId !== 'global') {
      newTipoActividad = `${targetSprintId}|${category}`;
    }

    // Actualizar localmente primero (Optimistic UI)
    const oldTareas = [...tareas];
    setTareas(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, estado: targetState, tipo_actividad: newTipoActividad } 
        : t
    ));

    try {
      await tasksService.updateTaskStatus(taskId, targetState, newTipoActividad);
      
      const cleanTitle = getTaskTitle(taskToMove);
      showToast(`Tarea "${cleanTitle}" movida a ${targetState}`);

      // Notificar cambio de estado a n8n
      try {
        await notificationService.sendTaskStatusChanged(taskToMove, taskToMove.estado, targetState);
      } catch (errNotif) {
        console.error('Error al notificar cambio de estado de tarea:', errNotif);
      }

    } catch (err) {
      console.error('Error al actualizar tarea vía Drag & Drop:', err);
      setTareas(oldTareas); // Revertir en caso de error
      alert('Error en base de datos: ' + err.message);
    }
  };

  const handleSavedTask = () => {
    setIsModalOpen(false);
    fetchData();
    showToast('¡Tarea creada con éxito!');
  };

  // --- FILTRADO DE TAREAS POR SWIMLANE (SPRINT) Y ESTADO (COLUMNA) ---
  const getTasks = (sprintId, colState) => {
    return tareas.filter(t => {
      const taskSprintId = parseTaskSprintId(t.tipo_actividad);
      const est = t.estado ? t.estado.trim() : 'Backlog';
      
      // Comprobar sprint
      if (taskSprintId !== sprintId) return false;

      // Comprobar columna de estado
      if (colState === 'Backlog') {
        return est.toLowerCase() === 'backlog' || est.toLowerCase() === 'pendiente' || est.toLowerCase() === 'por_hacer';
      }
      if (colState === 'En Progreso') {
        return est.toLowerCase() === 'en progreso' || est.toLowerCase() === 'en_progreso';
      }
      if (colState === 'Completada') {
        return est.toLowerCase() === 'completada' || est.toLowerCase() === 'completado';
      }
      return false;
    });
  };

  const columnas = [
    { title: 'Backlog', key: 'Backlog', border: 'border-slate-200', text: 'text-slate-700' },
    { title: 'En Progreso', key: 'En Progreso', border: 'border-amber-200', text: 'text-amber-700' },
    { title: 'Completadas', key: 'Completada', border: 'border-emerald-200', text: 'text-emerald-700' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl w-full mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-semibold text-xs transition-colors group mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Volver al Menú Principal
            </button>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              📋 Kanban de Tareas por Auto
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Gestión visual de tareas asociadas a los Sprints / Vehículos de la flota.
            </p>
          </div>

          <div className="flex gap-3 self-start md:self-center">
            <button
              onClick={fetchData}
              className="p-2.5 bg-white text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm flex items-center"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nueva Tarea
            </button>
          </div>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex border-b border-slate-200/80 gap-6">
          <button
            onClick={() => setActiveTab('sprint_activo')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sprint_activo'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🏃‍♂️ Sprint Activo (Tareas Vigentes)
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            ⏳ Historial Completadas
          </button>
        </div>

        {/* TABLERO SWIMLANES O HISTORIAL */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-bold">Cargando tablero Kanban...</p>
          </div>
        ) : activeTab === 'historial' ? (
          <div className="space-y-4">
            {/* BUSCADOR DE HISTORIAL */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Buscar en el historial por título, descripción o creador..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {/* TABLA DE TAREAS COMPLETADAS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase text-slate-450 tracking-wider">
                      <th className="p-4">Tarea</th>
                      <th className="p-4">Descripción</th>
                      <th className="p-4">Vencimiento</th>
                      <th className="p-4">Auto / Sprint</th>
                      <th className="p-4">Creado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-650">
                    {tareas
                      .filter(t => {
                        const est = t.estado ? t.estado.toLowerCase() : '';
                        if (est !== 'completada' && est !== 'completado') return false;

                        const title = getTaskTitle(t).toLowerCase();
                        const desc = getTaskDesc(t).toLowerCase();
                        const creator = (t.creado_por || '').toLowerCase();
                        const query = historySearch.toLowerCase();

                        return title.includes(query) || desc.includes(query) || creator.includes(query);
                      })
                      .map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 font-bold text-slate-700">
                            {getTaskTitle(t)}
                          </td>
                          <td className="p-4 max-w-xs break-words text-slate-500 font-normal leading-relaxed">
                            {getTaskDesc(t) || <span className="italic text-slate-350 font-normal">Sin descripción</span>}
                          </td>
                          <td className="p-4 font-semibold text-slate-400">
                            {getTaskDate(t) || 'Sin vencimiento'}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold rounded-lg uppercase tracking-wide text-[10px]">
                              {getSprintName(t)}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-indigo-500">
                            {t.creado_por || 'Empleado'}
                          </td>
                        </tr>
                      ))}
                    {tareas.filter(t => {
                      const est = t.estado ? t.estado.toLowerCase() : '';
                      return est === 'completada' || est === 'completado';
                    }).length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 italic font-semibold">
                          No hay tareas completadas registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* AGREGAR FILA POR CADA SPRINT ACTIVO */}
            {sprints.map(sprint => (
              <div key={sprint.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                
                {/* Cabecera Swimlane */}
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Car className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight uppercase">
                    Auto / Período: <span className="text-indigo-600">{sprint.nombre}</span>
                  </h2>
                  {sprint.notas && (
                    <span className="text-xs text-slate-400 font-medium italic truncate max-w-sm ml-2">
                      ({sprint.notas})
                    </span>
                  )}
                </div>

                {/* Columnas del Swimlane */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {columnas.map(col => {
                    const columnTasks = getTasks(sprint.id, col.key);
                    return (
                      <div
                        key={col.key}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.key, sprint.id)}
                        className={`rounded-xl border border-dashed ${col.border} p-4 bg-slate-50/50 min-h-[160px] flex flex-col space-y-3 transition-colors duration-250`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100/50 pb-1.5 mb-1">
                          <span className={col.text}>{col.title}</span>
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-100 text-[10px] text-slate-500">
                            {columnTasks.length}
                          </span>
                        </div>

                        <div className="flex-grow space-y-2.5">
                          {columnTasks.length === 0 ? (
                            <div className="h-20 flex items-center justify-center text-slate-350 text-[11px] font-medium border border-dashed border-slate-200/50 rounded-lg">
                              Arrastrá tareas acá
                            </div>
                          ) : (
                            columnTasks.map(t => (
                              <div
                                key={t.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, t.id)}
                                className="bg-white border border-slate-150 p-3 rounded-lg shadow-sm hover:shadow cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all duration-200 space-y-2 group"
                              >
                                <h4 className="font-bold text-slate-700 text-xs leading-snug group-hover:text-slate-900 transition-colors break-words">
                                  {getTaskTitle(t)}
                                </h4>
                                {getTaskDesc(t) && (
                                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                    {getTaskDesc(t)}
                                  </p>
                                )}
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 text-[9px] text-slate-400 font-medium">
                                  <span className="flex items-center gap-0.5">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {t.creado_por || 'Empleado'}
                                  </span>
                                  {getTaskDate(t) && (
                                    <span className="flex items-center gap-0.5 text-indigo-500 font-semibold">
                                      <Calendar className="w-3 h-3" />
                                      {getTaskDate(t)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* SWIMLANE GLOBAL / GENERAL */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="w-5 h-5 text-slate-500" />
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight uppercase">
                  Tareas Generales <span className="text-slate-400">(Sin Auto Asignado)</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {columnas.map(col => {
                  const columnTasks = getTasks('global', col.key);
                  return (
                    <div
                      key={col.key}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.key, 'global')}
                      className={`rounded-xl border border-dashed ${col.border} p-4 bg-slate-50/50 min-h-[160px] flex flex-col space-y-3 transition-colors duration-250`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100/50 pb-1.5 mb-1">
                        <span className={col.text}>{col.title}</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-100 text-[10px] text-slate-500">
                          {columnTasks.length}
                        </span>
                      </div>

                      <div className="flex-grow space-y-2.5">
                        {columnTasks.length === 0 ? (
                          <div className="h-20 flex items-center justify-center text-slate-350 text-[11px] font-medium border border-dashed border-slate-200/50 rounded-lg">
                            Arrastrá tareas acá
                          </div>
                        ) : (
                          columnTasks.map(t => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              className="bg-white border border-slate-150 p-3 rounded-lg shadow-sm hover:shadow cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all duration-200 space-y-2 group"
                            >
                              <h4 className="font-bold text-slate-700 text-xs leading-snug group-hover:text-slate-900 transition-colors break-words">
                                {getTaskTitle(t)}
                              </h4>
                              {getTaskDesc(t) && (
                                <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                  {getTaskDesc(t)}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 text-[9px] text-slate-400 font-medium">
                                <span className="flex items-center gap-0.5">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {t.creado_por || 'Empleado'}
                                </span>
                                {getTaskDate(t) && (
                                  <span className="flex items-center gap-0.5 text-indigo-500 font-semibold">
                                    <Calendar className="w-3 h-3" />
                                    {getTaskDate(t)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* FORMULARIO DE ALTA DE TAREAS */}
      {isModalOpen && (
        <FormularioAltaTarea
          sprints={sprints}
          perfiles={perfiles}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSavedTask}
        />
      )}

      {/* TOAST SYSTEM */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 px-4.5 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 animate-slide-in pointer-events-auto max-w-sm"
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

export default TareasKanban;
