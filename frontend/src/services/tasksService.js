import { supabase } from '../supabaseClient';

export const tasksService = {
  /**
   * Obtiene todas las tareas de la tabla tasks en Supabase.
   * @returns {Promise<Array>} Listado de tareas.
   */
  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener tareas:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Crea una nueva tarea en la tabla tasks de Supabase.
   * @param {object} task Datos de la tarea a crear.
   * @returns {Promise<object>} Tarea creada.
   */
  async createTask(task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title: task.titulo,
          descripcion: task.descripcion || '',
          estado: task.estado || 'Backlog',
          creado_por: task.creado_por || 'Empleado',
          asignado_a: task.asignado_a || null,
          fecha_vencimiento: task.fecha_vencimiento || null,
          tipo_actividad: task.tipo_actividad || 'General'
        }
      ])
      .select();

    if (error) {
      console.error('Error al crear tarea:', error);
      throw error;
    }
    return data ? data[0] : null;
  },

  /**
   * Actualiza el estado y tipo de actividad de una tarea.
   * @param {string} taskId ID de la tarea.
   * @param {string} newStatus Nuevo estado (ej: 'Backlog', 'En Progreso', 'Completada').
   * @param {string} [newTipoActividad] Tipo de actividad codificada (sprint).
   * @returns {Promise<object>} Tarea actualizada.
   */
  async updateTaskStatus(taskId, newStatus, newTipoActividad) {
    const updateData = { estado: newStatus };
    if (newTipoActividad !== undefined) {
      updateData.tipo_actividad = newTipoActividad;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select();

    if (error) {
      console.error('Error al actualizar estado de tarea:', error);
      throw error;
    }
    return data ? data[0] : null;
  }
};
