-- 1. Crear tabla de notificaciones internas
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  tipo_evento TEXT NOT NULL, -- 'task_created', 'task_status_changed', 'sprint_opened', 'sprint_reminder', 'vehicle_status_changed'
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE NOT NULL,
  creado_por TEXT,
  metadata JSONB
);

-- 2. Habilitar RLS (Seguridad a Nivel de Fila)
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para acceso público (Lectura, Inserción y Modificación)
-- Adaptá estas políticas según los roles de tu base de datos si utilizás autenticación estricta.
CREATE POLICY "Permitir select público" ON public.notificaciones FOR SELECT USING (true);
CREATE POLICY "Permitir insert público" ON public.notificaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update público" ON public.notificaciones FOR UPDATE USING (true);

-- 4. Habilitar Tiempo Real (Supabase Realtime)
-- Permite que los cambios e inserciones en esta tabla se transmitan en vivo a la app React.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
