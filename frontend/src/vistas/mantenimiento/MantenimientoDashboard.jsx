import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ListaCondiciones from './ListaCondiciones';
import FormularioMantenimiento from './FormularioMantenimiento';
import { ArrowLeft, Car, Wrench, Layers } from 'lucide-react';

function MantenimientoDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('flota'); // 'flota' o 'registro'
  const [prefilledPatente, setPrefilledPatente] = useState('');

  const handleRegisterMaintenance = (patente) => {
    setPrefilledPatente(patente);
    setActiveTab('registro');
  };

  const handleSaved = () => {
    setPrefilledPatente('');
    setActiveTab('flota');
  };

  const handleCancel = () => {
    setPrefilledPatente('');
    setActiveTab('flota');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full mx-auto space-y-6 animate-fade-in">
        
        {/* ENCABEZADO Y BOTÓN VOLVER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-semibold text-xs transition-colors group mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Volver al Menú Principal
            </button>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Car className="w-8 h-8 text-blue-600 stroke-[2.5]" />
              Control de Flota
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Supervisión de estado mecánico, kilometraje y registro de servicios.
            </p>
          </div>

          {/* CONTROLES DE PESTAÑA */}
          <div className="bg-white border border-slate-200/60 p-1.5 rounded-2xl flex gap-1 shadow-sm self-start sm:self-center">
            <button
              onClick={() => {
                setActiveTab('flota');
                setPrefilledPatente('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'flota'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              Estado de Flota
            </button>
            <button
              onClick={() => {
                setActiveTab('registro');
                setPrefilledPatente('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'registro'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Registrar Servicio
            </button>
          </div>
        </div>

        {/* CONTENIDO DE LA PESTAÑA SELECCIONADA */}
        <div className="pt-2">
          {activeTab === 'flota' ? (
            <ListaCondiciones onRegisterMaintenance={handleRegisterMaintenance} />
          ) : (
            <div className="max-w-xl mx-auto">
              <FormularioMantenimiento
                initialPatente={prefilledPatente}
                onCancel={handleCancel}
                onSaved={handleSaved}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default MantenimientoDashboard;
