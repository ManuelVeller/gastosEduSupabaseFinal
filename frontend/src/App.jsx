import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import MenuPrincipal from './vistas/MenuPrincipal';
import MantenimientoDashboard from './vistas/mantenimiento/MantenimientoDashboard';
import TareasKanban from './vistas/tareas/TareasKanban';
import SandboxApp from './components/Sandbox/SandboxApp';
import { Wrench, ClipboardList } from 'lucide-react';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // 1. LEER EL NOMBRE GUARDADO: Intenta buscar si ya hay un nombre en la memoria del celular
  const [empleado, setEmpleado] = useState(() => {
    return localStorage.getItem('nombre_empleado') || '';
  }); 
  const [nuevoNombre, setNuevoNombre] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // 2. GUARDAR EL NOMBRE EN LA MEMORIA
  const handleGuardarNombre = (e) => {
    e.preventDefault();
    if (nuevoNombre.trim() !== '') {
      const nombreLimpio = nuevoNombre.trim();
      localStorage.setItem('nombre_empleado', nombreLimpio); // Se guarda en el celular
      setEmpleado(nombreLimpio); // Se activa en la app
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'jefe2026') { // <-- Tu clave maestra
      setIsAdmin(true);
      setShowAdminLogin(false);
      setError('');
      setAdminPassword('');
      navigate('/admin', { replace: true });
    } else {
      setError('Contraseña incorrecta');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    navigate('/finanzas', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Cargando...</p>
      </div>
    );
  }

  // 3. PANTALLA INICIAL SI NO HAY NOMBRE GUARDADO
  if (!empleado && !showAdminLogin && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">¡Hola! Bienvenid@</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresa tu nombre para configurar la app en este dispositivo.</p>
          
          <form onSubmit={handleGuardarNombre} className="space-y-4">
            <input 
              type="text" 
              placeholder="Ej: Edu" 
              value={nuevoNombre} 
              onChange={(e) => setNuevoNombre(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              autoFocus
            />
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Comenzar a usar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Acceso Administración</h3>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Ingresar Clave Maestra" 
              value={adminPassword} 
              onChange={(e) => setAdminPassword(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-center"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowAdminLogin(false); setError(''); }} className="w-1/2 py-2 bg-slate-100 text-slate-600 rounded-lg">Volver</button>
              <button type="submit" className="w-1/2 py-2 bg-blue-600 text-white rounded-lg">Ingresar</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<MenuPrincipal />} />
          <Route 
            path="/finanzas" 
            element={
              <EmployeeDashboard 
                empleado={empleado} 
                onResetName={() => { localStorage.removeItem('nombre_empleado'); setEmpleado(''); }} 
              />
            } 
          />
          <Route 
            path="/admin" 
            element={isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/finanzas" replace />} 
          />
          <Route path="/mantenimiento" element={<MantenimientoDashboard />} />
          <Route path="/tareas" element={<TareasKanban />} />
          <Route path="/sandbox" element={<SandboxApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <footer className="py-6 text-center bg-slate-50 flex justify-center gap-4 items-center">
        <span className="text-xs text-slate-400">Operando como: <strong>{empleado}</strong></span>
        <button onClick={() => setShowAdminLogin(true)} className="text-xs text-slate-300 hover:text-slate-500 transition-colors">
          ⚙️ Panel de Control
        </button>
      </footer>
    </div>
  );
}

function MantenimientoPlaceholder() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-6 shadow-inner animate-pulse">
        <Wrench className="w-12 h-12 stroke-[2]" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Mantenimiento de Flota</h2>
      <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
        Este módulo se encuentra bajo desarrollo activo. Pronto podrás registrar services, reparaciones y controlar el estado de toda la flota.
      </p>
      <button 
        onClick={() => navigate('/')} 
        className="px-6 py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
      >
        Volver al Menú Principal
      </button>
    </div>
  );
}

function TareasPlaceholder() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-6 shadow-inner animate-pulse">
        <ClipboardList className="w-12 h-12 stroke-[2]" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Gestión de Tareas</h2>
      <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
        Este módulo se encuentra bajo desarrollo activo. Pronto podrás organizar las tareas diarias, asignar responsables y controlar el progreso.
      </p>
      <button 
        onClick={() => navigate('/')} 
        className="px-6 py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
      >
        Volver al Menú Principal
      </button>
    </div>
  );
}

export default App;
