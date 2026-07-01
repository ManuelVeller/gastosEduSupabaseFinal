import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Wrench, ClipboardList } from 'lucide-react';

function MenuPrincipal() {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight mb-3">
          Panel de Control
        </h1>
        <p className="text-base sm:text-lg text-slate-500 max-w-md mx-auto">
          Seleccione una de las siguientes áreas para comenzar a gestionar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {options.map((opt, index) => {
          const IconComponent = opt.icon;
          return (
            <button
              key={index}
              onClick={opt.onClick}
              className={`flex flex-col items-center p-8 rounded-2xl border bg-white shadow-sm transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl text-center group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${opt.color}`}
            >
              <div className={`p-4 rounded-2xl mb-6 transition-all duration-300 group-hover:scale-110 ${opt.iconBg}`}>
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
    </div>
  );
}

export default MenuPrincipal;
