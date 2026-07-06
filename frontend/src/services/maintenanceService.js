import { supabase } from '../supabaseClient';

export const maintenanceService = {
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
    // 1. Insertar el registro en maintenance_records usando current_km
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert([
        {
          vehiculo_id: record.vehiculo_id,
          patente: record.patente.trim().toUpperCase(),
          tipo_mantenimiento: record.tipo_mantenimiento,
          current_km: record.kilometros, // Guardar en la columna current_km
          motivo: record.motivo,
          nuevo_estado: record.nuevo_estado,
          creado_por: record.creado_por,
          fecha: record.fecha
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

    return data ? data[0] : null;
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
      .eq('patente', cleanPatente)
      .order('fecha', { ascending: true });

    if (error) {
      console.error('Error al obtener registros de mantenimiento:', error);
      throw error;
    }
    return data || [];
  }
};
