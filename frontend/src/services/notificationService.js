import { supabase } from '../supabaseClient';

export const notificationService = {
  /**
   * Inserta un evento en la tabla 'notificaciones' de Supabase.
   * @param {string} event Nombre del tipo de evento.
   * @param {object} data Datos asociados al evento.
   */
  async sendNotification(event, data) {
    let titulo = 'Notificación';
    let mensaje = '';
    let creado_por = data.creado_por || data.operador || 'Sistema';

    switch (event) {
      case 'task_created':
        titulo = 'Nueva Tarea Creada';
        mensaje = `Se creó la tarea "${data.titulo || data.title}" asignada a ${data.asignado_a || 'General'}.`;
        break;
      case 'task_status_changed':
        titulo = data.is_closed ? 'Tarea Completada' : 'Estado de Tarea Actualizado';
        mensaje = `La tarea "${data.titulo || data.title}" cambió de "${data.old_status}" a "${data.new_status}".`;
        break;
      case 'sprint_opened':
        titulo = 'Período de Control Abierto';
        mensaje = `Se abrió el período "${data.nombre}" por el operador ${data.operador}.`;
        break;
      case 'sprint_reminder':
        titulo = 'Sprint Abierto Pendiente';
        mensaje = data.message;
        break;
      case 'vehicle_status_changed':
        titulo = 'Cambio de Estado de Auto';
        if (data.is_entering_service) {
          mensaje = `El auto patente ${data.patente} ingresó a taller/service (Estado: ${data.new_status}).`;
        } else if (data.is_leaving_service) {
          mensaje = `El auto patente ${data.patente} finalizó taller/service (Estado: ${data.new_status}).`;
        } else {
          mensaje = `El auto patente ${data.patente} cambió su estado a "${data.new_status}".`;
        }
        break;
      default:
        mensaje = JSON.stringify(data);
    }

    try {
      const { error } = await supabase
        .from('notificaciones')
        .insert([
          {
            tipo_evento: event,
            titulo,
            mensaje,
            leido: false,
            creado_por,
            metadata: data
          }
        ]);

      if (error) {
        // Logueamos pero no rompemos la app si la tabla no está creada
        console.warn('Advertencia al guardar notificación (verificar si la tabla "notificaciones" existe en Supabase):', error.message);
      }
    } catch (err) {
      console.error('Error de red/conexión al insertar notificación en Supabase:', err);
    }
  },

  /**
   * Notifica que se ha creado una nueva tarea.
   */
  async sendTaskCreated(task) {
    await this.sendNotification('task_created', {
      id: task.id,
      titulo: task.titulo || task.title,
      descripcion: task.descripcion,
      estado: task.estado,
      creado_por: task.creado_por,
      asignado_a: task.asignado_a,
      fecha_vencimiento: task.fecha_vencimiento,
      tipo_actividad: task.tipo_actividad
    });
  },

  /**
   * Notifica que una tarea cambió de estado o fue completada/cerrada.
   */
  async sendTaskStatusChanged(task, oldStatus, newStatus) {
    const isClosed = newStatus === 'Completada' || newStatus === 'Done';
    await this.sendNotification('task_status_changed', {
      id: task.id,
      titulo: task.titulo || task.title,
      old_status: oldStatus,
      new_status: newStatus,
      is_closed: isClosed,
      asignado_a: task.asignado_a,
      tipo_actividad: task.tipo_actividad
    });
  },

  /**
   * Notifica que se abrió un nuevo sprint.
   */
  async sendSprintOpened(sprint) {
    await this.sendNotification('sprint_opened', {
      id: sprint.id,
      nombre: sprint.nombre,
      fecha_inicio: sprint.fecha_inicio,
      fecha_fin_estimada: sprint.fecha_fin_estimada,
      operador: sprint.operador,
      notas: sprint.notas
    });
  },

  /**
   * Notifica un recordatorio de que un sprint lleva mucho tiempo abierto.
   */
  async sendSprintReminder(sprint, daysOpen) {
    await this.sendNotification('sprint_reminder', {
      id: sprint.id,
      nombre: sprint.nombre,
      fecha_inicio: sprint.fecha_inicio,
      fecha_fin_estimada: sprint.fecha_fin_estimada,
      operador: sprint.operador,
      days_open: daysOpen,
      message: `El sprint "${sprint.nombre}" iniciado por ${sprint.operador} sigue abierto o quedó pendiente de cerrarse.`
    });
  },

  /**
   * Notifica que un vehículo cambió de estado.
   */
  async sendVehicleStatusChanged(patente, oldStatus, newStatus) {
    const isEnteringService = (newStatus === 'En Taller' || newStatus === 'Requiere Service') && oldStatus !== 'En Taller' && oldStatus !== 'Requiere Service';
    const isLeavingService = newStatus === 'Operativo' && (oldStatus === 'En Taller' || oldStatus === 'Requiere Service');

    await this.sendNotification('vehicle_status_changed', {
      patente: patente.toUpperCase(),
      old_status: oldStatus,
      new_status: newStatus,
      is_entering_service: isEnteringService,
      is_leaving_service: isLeavingService
    });
  }
};
