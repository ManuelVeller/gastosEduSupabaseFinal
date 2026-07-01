import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X } from 'lucide-react';

export default function ModalNuevoTicket({ isOpen, onClose, onTicketCreado }) {
  const [form, setForm] = useState({
    titulo: '',
    tipo_actividad: '',
    creado_por: ''
  });
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.titulo.trim() || !form.tipo_actividad.trim() || !form.creado_por) {
      alert("Por favor, seleccioná una persona asignada y completá los campos obligatorios.");
      return;
    }

    setEnviando(true);
    try {
      const { data, error } = await supabase
        .from('tareas')
        .insert([
          {
            titulo: form.titulo.trim(),
            tipo_actividad: form.tipo_actividad.trim(),
            creado_por: form.creado_por, 
            estado: 'por_hacer'
          }
        ])
        .select();

      if (error) throw error;

      if (onTicketCreado && data && data[0]) {
        onTicketCreado(data[0]);
      }

      setForm({ titulo: '', tipo_actividad: '', creado_por: '' });
      onClose();
      
    } catch (err) {
      console.error("Error al crear el ticket:", err);
      alert("Error en el servidor: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-xl p-6 border border-slate-100 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Nuevo Ticket de Tarea</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Título de la tarea *</label>
            <input
              type="text"
              placeholder="Entregar Jeep en el Aeropuerto"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-semibold outline-none focus:border-indigo-500 focus:bg-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tipo de actividad *</label>
            <input
              type="text"
              placeholder="Ej: Mantenimiento, Administración, Urgente"
              value={form.tipo_actividad}
              onChange={(e) => setForm({ ...form, tipo_actividad: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-semibold outline-none focus:border-indigo-500 focus:bg-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Persona Asignada *</label>
            <div className="relative">
              <select
                value={form.creado_por}
                onChange={(e) => setForm({ ...form, creado_por: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-bold outline-none focus:border-indigo-500 focus:bg-white cursor-pointer appearance-none"
                required
              >
                <option value="" disabled hidden>-- Seleccionar persona --</option>
                <option value="manu">manu</option>
                <option value="edu">edu</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button type="button" onClick={onClose} className="py-3 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl">Cancelar</button>
            <button type="submit" disabled={enviando} className="py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl disabled:opacity-50">
              {enviando ? 'Creando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}