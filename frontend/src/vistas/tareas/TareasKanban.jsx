import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
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
  const [modalLoading, setModalLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');

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

      // 2. Fetch Tareas
      const { data: tareasData, error: tareasError } = await supabase
        .from('tareas')
        .select('*')
        .order('created_at', { ascending: false });

      if (tareasError) throw tareasError;
      setTareas(tareasData || []);

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
      // Retorna todo lo que está después del guion y remueve la fecha si existiera
      return title.substring(splitIndex + 3).replace(/\(Vence: [0-9/]{10}\)/, '').trim();
    }
    return '';
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
      const { error } = await supabase
        .from('tareas')
        .update({ 
          estado: targetState,
          tipo_actividad: newTipoActividad
        })
        .eq('id', taskId);

      if (error) throw error;
      
      const cleanTitle = cleanTaskTitle(taskToMove.titulo);
      const stateNames = {
        pendiente: 'Pendiente',
        en_progreso: 'En Progreso',
        completada: 'Completada'
      };
      showToast(`Tarea "${cleanTitle}" movida a ${stateNames[targetState] || targetState}`);

    } catch (err) {
      console.error('Error al actualizar tarea vía Drag & Drop:', err);
      setTareas(oldTareas); // Revertir en caso de error
      alert('Error en base de datos: ' + err.message);
    }
  };

  // --- GUARDAR NUEVA TAREA DESDE EL MODAL ---
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setModalLoading(true);

    try {
      let asignadoNombre = 'General';
      let asignadoId = null;

      // Buscar perfil asignado
      const matchedProfile = perfiles.find(p => p.id === assignedUser);
      if (matchedProfile) {
        asignadoNombre = matchedProfile.nombre || matchedProfile.email;
        asignadoId = matchedProfile.id;
      } else if (assignedUser === 'manu' || assignedUser === 'edu') {
        asignadoNombre = assignedUser;
      }

      // Encodificar la fecha y la descripción dentro del título del ticket
      let formattedTitle = newTitle.trim();
      if (newDesc.trim()) {
        formattedTitle += ` - ${newDesc.trim()}`;
      }
      if (newDate) {
        formattedTitle += ` (Vence: ${newDate.split('-').reverse().join('/')})`;
      }

      // Encodificar el Sprint en tipo_actividad
      let newTipoActividad = 'General';
      if (selectedSprint) {
        newTipoActividad = `${selectedSprint}|General`;
      }

      const newTask = {
        titulo: formattedTitle,
        tipo_actividad: newTipoActividad,
        creado_por: asignadoNombre,
        usuario_id: asignadoId,
        estado: 'pendiente' // Nace en Pendientes
      };

      const { data, error } = await supabase
        .from('tareas')
        .insert([newTask])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setTareas(prev => [data[0], ...prev]);
      } else {
        fetchData();
      }

      showToast(`¡Tarea "${newTitle.trim()}" creada con éxito!`);
      
      // Limpiar y cerrar
      setNewTitle('');
      setNewDate('');
      setNewDesc('');
      setAssignedUser('');
      setSelectedSprint('');
      setIsModalOpen(false);

    } catch (err) {
      console.error('Error al crear tarea:', err);
      alert('No se pudo guardar la tarea: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // --- FILTRADO DE TAREAS POR SWIMLANE (SPRINT) Y ESTADO (COLUMNA) ---
  const getTasks = (sprintId, colState) => {
    return tareas.filter(t => {
      const taskSprintId = parseTaskSprintId(t.tipo_actividad);
      const est = t.estado ? t.estado.toLowerCase() : 'pendiente';
      
      // Comprobar sprint
      if (taskSprintId !== sprintId) return false;

      // Comprobar columna de estado
      if (colState === 'pendiente') {
        return est === 'pendiente' || est === 'por_hacer';
      }
      if (colState === 'en_progreso') {
        return est === 'en_progreso';
      }
      if (colState === 'completada') {
        return est === 'completada' || est === 'completado';
      }
      return false;
    });
  };

  const columnas = [
    { title: 'Pendientes', key: 'pendiente', border: 'border-slate-200', text: 'text-slate-700' },
    { title: 'En Progreso', key: 'en_progreso', border: 'border-amber-200', text: 'text-amber-700' },
    { title: 'Completadas', key: 'completada', border: 'border-emerald-200', text: 'text-emerald-700' }
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

        {/* TABLERO SWIMLANES */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-bold">Cargando tablero Kanban...</p>
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
                                  {cleanTaskTitle(t.titulo)}
                                </h4>
                                {parseTaskDesc(t.titulo) && (
                                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                    {parseTaskDesc(t.titulo)}
                                  </p>
                                )}
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 text-[9px] text-slate-400 font-medium">
                                  <span className="flex items-center gap-0.5">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {t.creado_por || 'Empleado'}
                                  </span>
                                  {parseTaskDate(t.titulo) && (
                                    <span className="flex items-center gap-0.5 text-indigo-500 font-semibold">
                                      <Calendar className="w-3 h-3" />
                                      {parseTaskDate(t.titulo)}
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
                                {cleanTaskTitle(t.titulo)}
                              </h4>
                              {parseTaskDesc(t.titulo) && (
                                <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                  {parseTaskDesc(t.titulo)}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 text-[9px] text-slate-400 font-medium">
                                <span className="flex items-center gap-0.5">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {t.creado_por || 'Empleado'}
                                </span>
                                {parseTaskDate(t.titulo) && (
                                  <span className="flex items-center gap-0.5 text-indigo-500 font-semibold">
                                    <Calendar className="w-3 h-3" />
                                    {parseTaskDate(t.titulo)}
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

      {/* MODAL DE CREACIÓN TIPO JIRA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-slate-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Barra superior decorativa */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />

            {/* Cabecera Modal */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                📋 Crear Nueva Tarea
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateTask} className="space-y-4">
              
              {/* Campo: Título */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Título de la Tarea *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Entregar Jeep en el Aeropuerto"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
                />
              </div>

              {/* Campo: Sprint/Auto */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Sprint / Auto Asociado
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Car className="w-4 h-4" />
                  </span>
                  <select
                    value={selectedSprint}
                    onChange={(e) => setSelectedSprint(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">-- Sin asignar a Auto (Tarea General) --</option>
                    {sprints.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Campo: Fecha */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Fecha Vencimiento
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Campo: Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Descripción / Anotaciones
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <FileText className="w-4 h-4" />
                  </span>
                  <textarea
                    rows="3"
                    placeholder="Detalles sobre qué hacer, precauciones..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                  />
                </div>
              </div>

              {/* Campo: Asignar Persona */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Asignar Persona *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <select
                    value={assignedUser}
                    onChange={(e) => setAssignedUser(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Seleccionar persona --</option>
                    {perfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre || p.email} ({p.rol})
                      </option>
                    ))}
                    <option value="edu">edu (empleado)</option>
                    <option value="manu">manu (admin)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Botonera de Envío */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Guardando...' : 'Crear Tarea'}
                </button>
              </div>

            </form>
          </div>
        </div>
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
