import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, KeyRound, Mail, ShieldAlert } from 'lucide-react'; // Sumamos un icono para el rol

const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('empleado'); // Nuevo estado para capturar el rol del dropdown

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre: nombre,
              rol: rol // Ahora le pasa el rol que el usuario seleccionó en el dropdown
            }
          }
        });
        if (error) throw error;
        alert('Registro exitoso. Revisa tu correo (si está habilitada la confirmación) o inicia sesión.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (onLogin && data.user) {
          onLogin(data.user);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col relative">
        <header className="bg-expense-600 text-white p-6 pb-8 text-center rounded-b-[2rem] shadow-md z-10 relative">
          <div className="flex justify-center mb-2">
            <div className="bg-white/20 p-3 rounded-full">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Gastos</h1>
          <p className="text-expense-100/80 text-sm font-medium mt-1">
            {isSignUp ? 'Crea tu cuenta' : 'Inicia sesión para continuar'}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto z-0 pt-6 px-6 pb-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LogIn className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-expense-500 focus:border-expense-500 sm:text-sm bg-slate-50 outline-none transition-all"
                      placeholder="Tu nombre completo"
                    />
                  </div>
                </div>

                {/* DROPDOWN DE SELECCIÓN DE ROL: Solo visible al registrarse */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Perfil</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldAlert className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-expense-500 focus:border-expense-500 sm:text-sm bg-slate-50 outline-none transition-all cursor-pointer"
                    >
                      <option value="empleado">👤 Usuario</option>
                      <option value="admin">🔑 Administrador </option>
                    </select>
                  </div>
                </div>
              </>
            )}
            
            

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-expense-500 focus:border-expense-500 sm:text-sm bg-slate-50 outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-expense-500 focus:border-expense-500 sm:text-sm bg-slate-50 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-expense-600 text-white py-3 px-4 rounded-xl font-semibold shadow-md hover:bg-expense-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-expense-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-expense-600 text-sm font-semibold hover:underline"
              type="button"
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
