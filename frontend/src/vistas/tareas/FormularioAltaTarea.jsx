import React, { useState } from 'react';
import { tasksService } from '../../services/tasksService';
import { X, Calendar, FileText, User, Car, Settings } from 'lucide-react';

function FormularioAltaTarea({ sprints = [], perfiles = [], onClose, onSaved }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaVence, setFechaVence] = useState('');
  const [estado, setEstado] = useState('Backlog');
  const [selectedSprint, setSelectedSprint] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [creador, setCreador] = useState(localStorage.getItem('nombre_empleado') || '');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorText('El título de la tarea es obligatorio.');
      return;
    }

    setLoading(true);
    setErrorText('');

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

      // Encodificar el Sprint en tipo_actividad
      let tipoActividad = 'General';
      if (selectedSprint) {
        tipoActividad = `${selectedSprint}|General`;
      }

      const newTask = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha_vencimiento: fechaVence || null,
        estado: estado,
        creado_por: creador || 'Empleado',
        asignado_a: asignadoNombre,
        tipo_actividad: tipoActividad
      };

      await tasksService.createTask(newTask);

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error('Error al crear tarea:', err);
      setErrorText('No se pudo guardar la tarea: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        
        {/* Barra superior decorativa */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 z-10" />

        {/* Cabecera Modal */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100/80 shrink-0">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            📋 Crear Nueva Tarea
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
          
          {/* Contenedor de Inputs con Scroll Interno */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            
            {/* Campo: Título */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                Título de la Tarea *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Entregar Jeep en el Aeropuerto"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Campo: Creador */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Creador (Creado por) *
              </label>
              <div className="relative">
                <select
                  value={creador}
                  onChange={(e) => setCreador(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Seleccionar creador --</option>
                  {perfiles.map(p => (
                    <option key={p.id} value={p.nombre || p.email}>
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
                  rows="2"
                  placeholder="Detalles sobre qué hacer..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                />
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
                  value={fechaVence}
                  onChange={(e) => setFechaVence(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campo: Estado Inicial */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                Estado Inicial *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Settings className="w-4 h-4" />
                </span>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Backlog">Backlog</option>
                  <option value="En Progreso">En Progreso</option>
                  <option value="Completada">Completada</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
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

            {/* Campo: Asignar Persona */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                Asignar Persona
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <select
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">-- Seleccionar persona --</option>
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

          </div>

          {/* Botonera y Alertas Fijas al Fondo */}
          <div className="p-6 pt-4 border-t border-slate-100 bg-white shrink-0 space-y-4">
            {errorText && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 animate-pulse">
                ⚠️ {errorText}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear Tarea'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

export default FormularioAltaTarea;
