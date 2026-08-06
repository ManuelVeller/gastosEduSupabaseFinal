import React, { useState } from 'react';
import { 
  INITIAL_VEHICLES, 
  INITIAL_MAINTENANCE, 
  INITIAL_SPRINTS, 
  INITIAL_TRANSACTIONS 
} from './mockData';
import SandboxDashboard from './SandboxDashboard';
import SandboxFleet from './SandboxFleet';
import SandboxTransactions from './SandboxTransactions';
import SandboxRentalModal from './SandboxRentalModal';
import { DollarSign, Wrench, Shield, Check, Calendar, User, ArrowLeft, Key } from 'lucide-react';

function SandboxApp() {
  // --- ESTADO EN MEMORIA (SANDBOX) ---
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [sprints, setSprints] = useState(INITIAL_SPRINTS);
  const [maintenanceRecords, setMaintenanceRecords] = useState(INITIAL_MAINTENANCE);
  
  // Navigation / Auth states
  const [currentView, setCurrentView] = useState('menu'); // 'menu', 'finanzas', 'admin', 'mantenimiento'
  const [empleado, setEmpleado] = useState('');
  const [inputName, setInputName] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Rental modal state
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);

  // Obtener sprint activo
  const activeSprint = sprints.find(s => s.estado === 'activo') || null;

  // --- HANDLERS DE ESTADO ---

  // Actualizar kilómetros desde edición rápida
  const handleUpdateVehicleKm = (patente, id, newKm) => {
    // 1. Actualizar auto
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, km_actual: newKm } : v));
    
    // 2. Registrar en historial
    const newRecord = {
      id: `m-rapid-km-${Date.now()}`,
      created_at: new Date().toISOString(),
      vehiculo_id: id,
      patente: patente.toUpperCase(),
      tipo_mantenimiento: 'Otro',
      current_km: newKm,
      motivo: 'Actualización rápida de kilometraje',
      nuevo_estado: vehicles.find(v => v.id === id)?.estado || 'Operativo',
      creado_por: empleado || 'Operador Demo'
    };
    setMaintenanceRecords(prev => [...prev, newRecord]);
  };

  // Actualizar estado del vehículo
  const handleUpdateVehicleStatus = (patente, oldStatus, newStatus) => {
    setVehicles(prev => prev.map(v => v.patente === patente ? { ...v, estado: newStatus } : v));

    const vehiculo = vehicles.find(v => v.patente === patente);
    if (!vehiculo) return;

    let motivoText = '';
    if (newStatus === 'Operativo') {
      motivoText = 'Auto operativo y disponible';
    } else if (newStatus === 'En Taller') {
      motivoText = 'Ingreso al taller';
    } else if (newStatus === 'Alquilado') {
      motivoText = 'Auto alquilado';
    } else {
      motivoText = 'Requiere service';
    }

    const newRecord = {
      id: `m-status-${Date.now()}`,
      created_at: new Date().toISOString(),
      vehiculo_id: vehiculo.id,
      patente: patente.toUpperCase(),
      tipo_mantenimiento: 'Otro',
      current_km: vehiculo.km_actual,
      motivo: motivoText,
      nuevo_estado: newStatus,
      creado_por: empleado || 'Operador Demo'
    };
    setMaintenanceRecords(prev => [...prev, newRecord]);
  };

  // Agregar mantenimiento completo
  const handleAddMaintenanceRecord = (record) => {
    // 1. Actualizar kilometraje y estado del auto
    setVehicles(prev => prev.map(v => v.id === record.vehiculo_id ? { ...v, km_actual: record.kilometros, estado: record.nuevo_estado } : v));

    // 2. Registrar en historial
    const newRecord = {
      id: `m-record-${Date.now()}`,
      created_at: new Date().toISOString(),
      vehiculo_id: record.vehiculo_id,
      patente: record.patente.toUpperCase(),
      tipo_mantenimiento: record.tipo_mantenimiento,
      current_km: record.kilometros,
      motivo: record.motivo,
      nuevo_estado: record.nuevo_estado,
      creado_por: empleado || 'Operador Demo'
    };
    setMaintenanceRecords(prev => [...prev, newRecord]);
  };

  // Abrir nuevo sprint
  const handleStartSprint = (nombre, patente, fechaInicio, fechaFin, notas) => {
    // 1. Cerrar cualquier sprint activo anterior
    setSprints(prev => prev.map(s => s.estado === 'activo' ? { ...s, estado: 'cerrado', fecha_fin_real: new Date().toISOString().split('T')[0] } : s));

    // 2. Crear el nuevo sprint activo
    const newSprint = {
      id: `sprint-${Date.now()}`,
      nombre,
      fecha_inicio: fechaInicio || new Date().toISOString().split('T')[0],
      fecha_fin_estimada: fechaFin || new Date().toISOString().split('T')[0],
      notas: notas || '',
      operador: empleado || 'Edu',
      estado: 'activo'
    };

    setSprints(prev => [...prev, newSprint]);
  };

  // Cerrar sprint actual
  const handleCloseSprint = () => {
    if (!window.confirm("¿Estás seguro de que querés cerrar este período y generar el reporte final?")) return;
    setSprints(prev => prev.map(s => s.estado === 'activo' ? { ...s, estado: 'cerrado', fecha_fin_real: new Date().toISOString().split('T')[0] } : s));
  };

  // Agregar nueva transacción
  const handleAddTransaction = (t) => {
    const newTrans = {
      id: `t-${Date.now()}`,
      monto: t.monto,
      categoria: t.categoria,
      descripcion: t.descripcion,
      metodo_pago: t.metodo_pago,
      creado_por: t.creado_por,
      sprint_id: t.sprint_id,
      ...(t.fecha_gasto ? { fecha_gasto: t.fecha_gasto } : { fecha: t.fecha })
    };
    setTransactions(prev => [...prev, newTrans]);
  };

  // Confirmar alquiler (Nueva funcionalidad del Sandbox)
  const handleConfirmRental = (patente, fechaInicio, fechaFin, monto) => {
    const vehiculo = vehicles.find(v => v.patente === patente);
    if (!vehiculo) return;

    // 1. Cambiar estado del auto a Alquilado
    setVehicles(prev => prev.map(v => v.patente === patente ? { ...v, estado: 'Alquilado' } : v));

    // 2. Añadir movimiento al historial del vehículo
    const newMaintRecord = {
      id: `m-rental-${Date.now()}`,
      created_at: new Date().toISOString(),
      vehiculo_id: vehiculo.id,
      patente: patente.toUpperCase(),
      tipo_mantenimiento: 'Otro',
      current_km: vehiculo.km_actual,
      motivo: `Auto alquilado desde ${fechaInicio.split('-').reverse().join('/')} hasta ${fechaFin.split('-').reverse().join('/')}`,
      nuevo_estado: 'Alquilado',
      creado_por: empleado || 'Operador Demo'
    };
    setMaintenanceRecords(prev => [...prev, newMaintRecord]);

    // 3. Registrar transacción de ingreso (Cobro)
    const transaction = {
      monto: monto,
      categoria: 'Cobro',
      descripcion: `Alquiler ${vehiculo.marca_modelo} (${patente}) - ${fechaInicio.split('-').reverse().join('/')} al ${fechaFin.split('-').reverse().join('/')}`,
      metodo_pago: 'MP',
      creado_por: empleado || 'Operador Demo',
      // Si hay un sprint activo, lo asociamos a él
      sprint_id: activeSprint ? activeSprint.id : (sprints[sprints.length - 1]?.id || null),
      fecha: fechaInicio
    };
    handleAddTransaction(transaction);
  };

  // --- LOGICA DE NAVEGACION ---
  const handleGuardarNombre = (e) => {
    e.preventDefault();
    if (inputName.trim() !== '') {
      setEmpleado(inputName.trim());
      setCurrentView('finanzas');
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'jefe2026') {
      setShowAdminLogin(false);
      setAdminPassword('');
      setLoginError('');
      setCurrentView('admin');
    } else {
      setLoginError('Contraseña incorrecta (Maestra: jefe2026)');
    }
  };

  const showFloatingRentalBtn = empleado && currentView !== 'menu' && !showAdminLogin;

  // --- RENDERS DE SUB-PAGINAS ---

  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-slate-100 relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600 rounded-t-2xl" />
          <h3 className="text-xl font-black text-slate-800 mb-2 text-center">Acceso Administración (Demo)</h3>
          <p className="text-xs text-slate-400 text-center mb-6">Usa la contraseña maestra para ingresar</p>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Clave maestra (jefe2026)" 
              value={adminPassword} 
              onChange={(e) => setAdminPassword(e.target.value)} 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-center font-bold outline-none focus:border-indigo-500"
              autoFocus
            />
            {loginError && <p className="text-red-500 text-xs text-center font-bold">{loginError}</p>}
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => { setShowAdminLogin(false); setLoginError(''); setAdminPassword(''); }} 
                className="w-1/2 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs"
              >
                Volver
              </button>
              <button 
                type="submit" 
                className="w-1/2 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10"
              >
                Ingresar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Si elige finanzas y no tiene nombre guardado
  if (currentView === 'finanzas' && !empleado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-slate-100 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600 rounded-t-2xl" />
          <h2 className="text-xl font-black text-slate-800 mb-2">¡Hola! Bienvenido al Sandbox</h2>
          <p className="text-xs text-slate-400 mb-6">Ingresá tu nombre para simular la app como empleado.</p>
          
          <form onSubmit={handleGuardarNombre} className="space-y-4">
            <input 
              type="text" 
              placeholder="Ej: Edu" 
              value={inputName} 
              onChange={(e) => setInputName(e.target.value)} 
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-center font-bold outline-none focus:border-blue-500"
              required
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setCurrentView('menu')}
                className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs"
              >
                Menú
              </button>
              <button 
                type="submit" 
                className="w-2/3 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10"
              >
                Comenzar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between relative">
      <div className="flex-grow">
        {currentView === 'menu' && (
          <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
            <div className="max-w-4xl w-full space-y-12">
              {/* Cabecera */}
              <div className="text-center space-y-2">
                <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full uppercase tracking-wider">Demo Interactiva</span>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                  Control de Flota y Finanzas
                </h1>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Sandbox autónomo funcionando 100% en el navegador. Las interacciones se reiniciarán al recargar (F5).
                </p>
              </div>

              {/* Botonera de Opciones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-4">
                <button
                  onClick={() => {
                    if (empleado) setCurrentView('finanzas');
                    else setCurrentView('finanzas');
                  }}
                  className="flex flex-col items-center p-8 rounded-2xl border border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100/50 bg-white hover:bg-emerald-50/10 text-center group transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="p-4 rounded-xl mb-5 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <DollarSign className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-emerald-950">
                    Carga Finanzas
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-[200px]">
                    Simulá la interfaz de carga rápida de ingresos y gastos del operario.
                  </p>
                </button>

                <button
                  onClick={() => setCurrentView('mantenimiento')}
                  className="flex flex-col items-center p-8 rounded-2xl border border-blue-100 hover:border-blue-300 hover:shadow-blue-100/50 bg-white hover:bg-blue-50/10 text-center group transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="p-4 rounded-xl mb-5 bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Wrench className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-blue-950">
                    Control de Flota
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-[200px]">
                    Supervisá kilometrajes, cambiá estados de vehículos y registrá services.
                  </p>
                </button>

                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="flex flex-col items-center p-8 rounded-2xl border border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-100/50 bg-white hover:bg-indigo-50/10 text-center group transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="p-4 rounded-xl mb-5 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <Shield className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-indigo-950">
                    Panel Admin
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-[200px]">
                    Visualizá los gráficos de balance diarios, listados completos y exportaciones a Excel.
                  </p>
                </button>
              </div>

              {/* Botón Registrar Alquiler Directo en Menu */}
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => {
                    // Inicializar operario por defecto si no hay
                    if (!empleado) {
                      setEmpleado('Edu');
                    }
                    setIsRentalModalOpen(true);
                  }}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-xl transition-all flex items-center gap-2 text-sm active:scale-95 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  🔑 Registrar Alquiler (Rápido)
                </button>
              </div>

            </div>
          </div>
        )}

        {currentView === 'finanzas' && (
          <SandboxTransactions 
            empleado={empleado}
            onResetName={() => { setEmpleado(''); }}
            onLogout={() => setCurrentView('menu')}
            vehicles={vehicles}
            transactions={transactions}
            activeSprint={activeSprint}
            onStartSprint={handleStartSprint}
            onCloseSprint={handleCloseSprint}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {currentView === 'admin' && (
          <SandboxDashboard 
            transactions={transactions}
            sprints={sprints}
            activeSprint={activeSprint}
            onStartSprint={handleStartSprint}
            onLogout={() => setCurrentView('menu')}
            vehicles={vehicles}
          />
        )}

        {currentView === 'mantenimiento' && (
          <SandboxFleet 
            vehicles={vehicles}
            maintenanceRecords={maintenanceRecords}
            onUpdateVehicleKm={handleUpdateVehicleKm}
            onUpdateVehicleStatus={handleUpdateVehicleStatus}
            onAddMaintenanceRecord={handleAddMaintenanceRecord}
            onLogout={() => setCurrentView('menu')}
          />
        )}
      </div>

      {/* FOOTER */}
      {currentView !== 'menu' && (
        <footer className="py-4 text-center bg-slate-50 flex justify-center gap-4 items-center border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-bold">
            Sandbox Operando {empleado ? `como: ${empleado}` : '(Sin operario)'}
          </span>
          <button 
            onClick={() => {
              if (currentView === 'admin') {
                setCurrentView('menu');
              } else {
                setShowAdminLogin(true);
              }
            }} 
            className="text-[10px] text-slate-400 hover:text-slate-600 font-black tracking-wide"
          >
            ⚙️ Panel Control
          </button>
        </footer>
      )}

      {/* FLOATING ACTION BUTTON: Registrar Alquiler */}
      {showFloatingRentalBtn && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsRentalModalOpen(true)}
            className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-2 border-white cursor-pointer"
            title="Registrar nuevo alquiler"
          >
            <Key className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* MODAL REGISTRAR ALQUILER */}
      <SandboxRentalModal 
        isOpen={isRentalModalOpen}
        onClose={() => setIsRentalModalOpen(false)}
        vehicles={vehicles}
        onConfirm={handleConfirmRental}
      />
    </div>
  );
}

export default SandboxApp;
