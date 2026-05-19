import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import LoginForm from './components/LoginForm';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPerfil(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchPerfil(session.user.id);
      } else {
        setPerfil(null);
        setLoading(false);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchPerfil = async (userId) => {
    try {
      // 1. Intentamos buscar el perfil. 
      // IMPORTANTE: Se escribe maybeSingle() con la S mayúscula.
      let { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;

      // 2. Si el perfil no existe en la tabla, lo creamos ahora mismo
      if (!data) {
        console.log("Perfil no encontrado, creando uno nuevo...");
        const { data: nuevoPerfil, error: errorInsert } = await supabase
          .from('perfiles')
          .insert([
            { 
              id: userId, 
              email: session?.user?.email, 
              rol: 'empleado' // Rol por defecto
            }
          ])
          .select()
          .single();

        if (errorInsert) throw errorInsert;
        data = nuevoPerfil;
      }

      // 3. Ahora que tenemos data (ya sea porque existía o porque la creamos)
      setPerfil(data);

      // 4. Redireccionamos según el rol que tenga el perfil
      if (data?.rol === 'admin') {
        navigate('/admin');
      } else {
        navigate('/employee');
      }

    } catch (err) {
      console.error('Error en el flujo de perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Cargando aplicación...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!session ? <LoginForm /> : <Navigate to={perfil?.rol === 'admin' ? '/admin' : '/employee'} />} 
      />
      
      <Route 
        path="/employee" 
        element={
          session && perfil?.rol === 'empleado' 
            ? <EmployeeDashboard user={session.user} onLogout={handleLogout} /> 
            : <Navigate to="/login" />
        } 
      />
      
      <Route 
        path="/admin" 
        element={
          session && perfil?.rol === 'admin' 
            ? <AdminDashboard user={session.user} onLogout={handleLogout} /> 
            : <Navigate to="/login" />
        } 
      />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
