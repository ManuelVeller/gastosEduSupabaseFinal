import { supabase } from '../supabaseClient';

export const maintenanceService = {
  /**
   * Formatea la patente y modelo del auto como: XX - Modelo (ej: AF1060J - chevrolet onix -> OJ - Chevrolet Onix)
   */
  formatPatenteLabel(patente, marcaModelo) {
    if (!patente) return '';
    const patenteUpper = patente.toUpperCase();
    let lastTwo = patenteUpper.slice(-2);
    lastTwo = lastTwo.replace(/0/g, 'O');

    let modelFormatted = '';
    if (marcaModelo) {
      modelFormatted = marcaModelo
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    } else {
      modelFormatted = 'Vehículo Desconocido';
    }

    return `${lastTwo} - ${modelFormatted}`;
  },

  /**
   * Obtiene los últimos kilómetros registrados de un vehículo en base a su patente.
   * @param {string} patente Patente del vehículo a consultar.
   * @returns {Promise<number>} Kilómetros actuales registrados.
   */
  async getLastKilometers(patente) {
    if (!patente) return 0;
    const cleanPatente = patente.trim().toUpperCase();
    const { data, error } = await supabase
      .from('vehiculos')
      .select('km_actual')
      .eq('patente', cleanPatente)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener últimos kilómetros:', error);
      throw error;
    }
    return data ? (data.km_actual || 0) : 0;
  },

  /**
   * Guarda un registro de mantenimiento en la tabla maintenance_records
   * y actualiza los kilómetros del vehículo en la tabla vehiculos.
   * @param {object} record Datos del registro de mantenimiento.
   */
  async saveMaintenanceRecord(record) {
    // 1. Insertar el registro en maintenance_records usando las columnas correctas en la base de datos
    const reasonWithUser = `[${record.creado_por || 'Operador General'}] ${record.motivo || ''}`;
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert([
        {
          vehicle_plate: record.patente.trim().toUpperCase(),
          current_km: record.kilometros,
          reason_maintenance: reasonWithUser,
          fleet_status_update: record.nuevo_estado,
          resolution_details: record.tipo_mantenimiento
        }
      ])
      .select();

    if (error) {
      console.error('Error al guardar registro de mantenimiento:', error);
      throw error;
    }

    // 2. Actualizar km_actual en la tabla vehiculos
    const { error: vehiculoError } = await supabase
      .from('vehiculos')
      .update({
        km_actual: record.kilometros
      })
      .eq('id', record.vehiculo_id);

    if (vehiculoError) {
      console.error('Error al actualizar kilometraje del vehículo:', vehiculoError);
      throw vehiculoError;
    }

    // Adaptar la fila devuelta para que el frontend siga recibiendo los nombres de columna que espera
    if (data && data.length > 0) {
      const r = data[0];
      return {
        id: r.id,
        created_at: r.created_at,
        vehiculo_id: record.vehiculo_id,
        patente: r.vehicle_plate,
        tipo_mantenimiento: r.resolution_details,
        kilometros: r.current_km,
        motivo: r.reason_maintenance,
        nuevo_estado: r.fleet_status_update,
        creado_por: record.creado_por,
        fecha: r.created_at ? r.created_at.split('T')[0] : ''
      };
    }

    return null;
  },

  /**
   * Obtiene todos los registros de mantenimiento de un vehículo ordenados cronológicamente por fecha.
   * @param {string} patente Patente del vehículo.
   * @returns {Promise<Array>} Listado de registros de mantenimiento.
   */
  async getMaintenanceRecords(patente) {
    if (!patente) return [];
    const cleanPatente = patente.trim().toUpperCase();
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_plate', cleanPatente)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al obtener registros de mantenimiento:', error);
      throw error;
    }

    // Adaptar las filas devueltas para que el frontend reciba los nombres de columna que espera
    return (data || []).map(r => {
      let motivo = r.reason_maintenance || '';
      let creado_por = 'Operador General';
      const match = motivo.match(/^\[(.*?)\] (.*)$/s);
      if (match) {
        creado_por = match[1];
        motivo = match[2];
      }
      return {
        id: r.id,
        created_at: r.created_at,
        fecha: r.created_at ? r.created_at.split('T')[0] : '',
        tipo_mantenimiento: r.resolution_details || 'Otro',
        current_km: r.current_km,
        motivo: motivo,
        nuevo_estado: r.fleet_status_update,
        creado_por: creado_por
      };
    });
  }
};
