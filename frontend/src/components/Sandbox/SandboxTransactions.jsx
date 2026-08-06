import React, { useState, useEffect } from 'react';
import { UserX, ArrowLeft, Clipboard, Calendar, Settings } from 'lucide-react';

const CATEGORIES_GASTOS = ['Nafta', 'Lavadero', 'Comida', 'Transporte', 'Estacionamiento', 'Otro'];
const CATEGORIES_INGRESOS = ['Cobro', 'Venta', 'Inyección Capital', 'Otro'];

function SandboxTransactions({ 
  empleado, 
  onResetName, 
  onLogout, 
  vehicles, 
  transactions, 
  activeSprint, 
  onStartSprint, 
  onCloseSprint, 
  onAddTransaction 
}) {
  const [activeTab, setActiveTab] = useState('ingresos'); // 'ingresos' o 'gastos'
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [metodoPago, setMetodoPago] = useState('MP');

  // Fecha de hoy local en formato YYYY-MM-DD
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset() * 60000;
  const hoyStr = new Date(ahora.getTime() - offset).toISOString().split('T')[0];
  const [fecha, setFecha] = useState(hoyStr);

  // Estados para abrir sprint
  const [sprintNombreVehiculo, setSprintNombreVehiculo] = useState('');
  const [sprintFechaInicio, setSprintFechaInicio] = useState(hoyStr);
  const [sprintFechaFin, setSprintFechaFin] = useState(hoyStr);
  const [sprintNotas, setSprintNotas] = useState('');

  const [statusText, setStatusText] = useState('');

  // Limpiar categoría cuando cambia el tipo de registro (Ingreso / Gasto)
  useEffect(() => {
    setCategoria('');
  }, [activeTab]);

  const handleStartSprintSubmit = (e) => {
    e.preventDefault();
    if (!sprintNombreVehiculo) {
      alert('Por favor selecciona un vehículo.');
      return;
    }

    const selectedVehicle = vehicles.find(v => v.patente === sprintNombreVehiculo);
    if (!selectedVehicle) return;

    // Crear el nombre del sprint como "Modelo Suffix"
    const words = selectedVehicle.marca_modelo.split(' ');
    const model = words.length > 1 ? words.slice(1).join(' ') : words[0];
    const suffix = selectedVehicle.patente.slice(-2).toUpperCase();
    const nombreSprint = `${model} ${suffix}`;

    onStartSprint(nombreSprint, selectedVehicle.patente, sprintFechaInicio, sprintFechaFin, sprintNotas);
    
    // Limpiar form
    setSprintNombreVehiculo('');
    setSprintNotas('');
  };

  const handleTransactionSubmit = (e) => {
    e.preventDefault();
    if (!monto || !categoria || !activeSprint) return;

    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      alert('Monto inválido.');
      return;
    }

    setStatusText('Guardando...');

    // Registrar en memoria
    onAddTransaction({
      monto: parsedMonto,
      categoria,
      descripcion,
      metodo_pago: metodoPago,
      creado_por: empleado,
      sprint_id: activeSprint.id,
      // Si es gasto se guarda en fecha_gasto, si es ingreso en fecha
      ...(activeTab === 'gastos' ? { fecha_gasto: fecha } : { fecha })
    });

    setTimeout(() => {
      setStatusText('¡Guardado!');
      setMonto('');
      setDescripcion('');
      setFecha(hoyStr);
      setMetodoPago('MP');
      setCategoria('');
      setTimeout(() => setStatusText(''), 1500);
    }, 500);
  };

  // Filtrar transacciones recientes cargadas por este empleado en esta pestaña
  const misRegistros = transactions
    .filter(t => {
      const matchEmpleado = t.creado_por?.toLowerCase() === empleado?.toLowerCase();
      const matchTab = activeTab === 'gastos' ? !!t.fecha_gasto : !t.fecha_gasto;
      return matchEmpleado && matchTab;
    })
    .sort((a, b) => {
      const dateA = a.fecha || a.fecha_gasto;
      const dateB = b.fecha || b.fecha_gasto;
      return new Date(dateB) - new Date(dateA); // Más recientes primero
    });

  const categoriasActuales = activeTab === 'gastos' ? CATEGORIES_GASTOS : CATEGORIES_INGRESOS;

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col h-[90vh] max-h-[850px] relative border border-slate-100">
        
        {/* HEADER */}
        <header className="bg-slate-800 text-white p-6 pb-8 text-center rounded-b-[2rem] shadow-md z-10 relative flex justify-between items-center">
          <button 
            onClick={onLogout} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center" 
            title="Volver al Menú Principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button> 
          <div>
            <h1 className="text-xl font-black tracking-tight mb-0.5">¡Hola, {empleado}!</h1>
            <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Carga de Movimientos</p>
          </div>
          <button 
            onClick={onResetName} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors" 
            title="Cambiar de usuario"
          >
            <UserX className="w-5 h-5" />
          </button>
        </header>

        {/* NAVEGACIÓN PESTAÑAS (Ingresos / Gastos) */}
        <div className="flex px-6 mt-4 gap-2 z-10">
          <button
            onClick={() => setActiveTab('ingresos')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'ingresos' 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            📈 Cargar Ingreso
          </button>
          <button
            onClick={() => setActiveTab('gastos')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'gastos' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            📉 Cargar Gasto
          </button>
        </div>

        {/* SCROLLABLE MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto pt-4 px-6 pb-6 space-y-6 no-scrollbar relative">
          
          {/* ================= SECCIÓN SPRINT / JIRA CONTROL ================= */}
          {!activeSprint ? (
            // Sprint Cerrado -> Bloqueo
            <div className="bg-slate-100 rounded-2xl p-5 border-2 border-dashed border-slate-300 space-y-4 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h3 className="font-extrabold text-slate-700 text-sm">Control de Turno e Ingresos</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Para habilitar la carga de movimientos, debés iniciar el período de control seleccionando el auto de tu turno.
              </p>
              
              <form onSubmit={handleStartSprintSubmit} className="space-y-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Auto Asociado (Período)</label>
                  <select 
                    value={sprintNombreVehiculo}
                    onChange={(e) => setSprintNombreVehiculo(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="" disabled>-- Seleccione un Vehículo --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.patente}>
                        {v.marca_modelo} ({v.patente})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fecha de Inicio</label>
                    <input 
                      type="date"
                      value={sprintFechaInicio}
                      onChange={(e) => setSprintFechaInicio(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fecha Fin Estimada</label>
                    <input 
                      type="date"
                      value={sprintFechaFin}
                      onChange={(e) => setSprintFechaFin(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Comentarios</label>
                  <textarea 
                    value={sprintNotas}
                    onChange={(e) => setSprintNotas(e.target.value)}
                    placeholder="Notas sobre el turno, reservas asociadas..."
                    rows="2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
                >
                  <span>🔓</span> Abrir Tablero de Carga
                </button>
              </form>
            </div>
          ) : (
            // Sprint Activo -> Info del Sprint y botón Cerrar
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-wider">Tablero Liberado</h4>
                </div>
                <button
                  onClick={onCloseSprint}
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all active:scale-[0.95]"
                >
                  🔒 Cerrar Período
                </button>
              </div>

              <div className="bg-white/85 backdrop-blur-sm rounded-xl p-3 border border-blue-100/50 text-[11px] space-y-1 text-slate-600 font-semibold">
                <div><strong className="text-blue-900 font-bold">Período:</strong> {activeSprint.nombre}</div>
                {activeSprint.notas && (
                  <div className="truncate"><strong className="text-blue-900 font-bold">Notas:</strong> "{activeSprint.notas}"</div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>Op: {activeSprint.operador}</span>
                  <span>Fin: {new Date(activeSprint.fecha_fin_estimada + 'T00:00:00').toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= FORMULARIO MOVIMIENTOS ================= */}
          <form onSubmit={handleTransactionSubmit} className={`space-y-4 transition-all duration-300 ${!activeSprint ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col space-y-4 bg-gradient-to-b from-white to-slate-50/50">
              
              {/* Monto */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block px-1">Monto (ARS)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xl font-black text-slate-300">$</span>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    step="0.01"
                    min="0"
                    required={!!activeSprint}
                    disabled={!activeSprint}
                    placeholder="0.00"
                    className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 pl-9 pr-4 text-2xl font-black text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fecha */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block px-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required={!!activeSprint}
                    disabled={!activeSprint}
                    className="w-full bg-white border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block px-1">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    required={!!activeSprint}
                    disabled={!activeSprint}
                    className="w-full bg-white border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Seleccionar</option>
                    {categoriasActuales.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block px-1">Descripción</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={!activeSprint}
                  placeholder="¿Por qué motivo?"
                  className="w-full bg-white border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 placeholder:text-slate-300 transition-all"
                />
              </div>

              {/* Método de pago */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block px-1">Medio de Pago</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  disabled={!activeSprint}
                  className="w-full bg-white border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="MP">MP</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

            </div>

            <button
              type="submit"
              disabled={!activeSprint}
              className={`w-full py-3 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] ${
                activeTab === 'gastos' 
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10' 
                  : 'bg-green-600 hover:bg-green-700 shadow-green-600/10'
              }`}
            >
              {statusText || (activeTab === 'gastos' ? 'Guardar Gasto' : 'Guardar Ingreso')}
            </button>
          </form>

          <hr className="border-slate-100" />

          {/* HISTORIAL RECIENTE */}
          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-800 px-1">
              Mis {activeTab === 'gastos' ? 'Gastos' : 'Ingresos'} Recientes
            </h3>
            
            {misRegistros.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-4">Aún no hay registros en esta sección.</p>
            ) : (
              <div className="space-y-2.5">
                {misRegistros.map((r) => {
                  const dateVal = r.fecha || r.fecha_gasto;
                  return (
                    <div key={r.id} className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex justify-between items-center hover:border-slate-300 transition-colors">
                      <div>
                        <p className="font-extrabold text-slate-750 text-xs">{r.categoria}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {dateVal ? dateVal.split('-').reverse().join('/') : 'Sin Fecha'}
                          {r.metodo_pago && ` - ${r.metodo_pago}`}
                        </p>
                        {r.descripcion && <p className="text-[10px] text-slate-500 font-normal mt-1">{r.descripcion}</p>}
                      </div>
                      <div className={`text-sm font-black ${activeTab === 'gastos' ? 'text-red-500' : 'text-green-600'}`}>
                        ${parseFloat(r.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
}

export default SandboxTransactions;
