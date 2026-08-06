// Datos simulados iniciales para la versión Sandbox / Demo (100% Frontend)

// Calculamos fechas relativas en formato local (YYYY-MM-DD) para que los gráficos siempre muestren días recientes
const getRelativeDateStr = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export const INITIAL_VEHICLES = [
  {
    id: 1,
    patente: 'AF 106 OJ',
    marca_modelo: 'Chevrolet Onix',
    km_actual: 45200,
    tipo_aceite: '5W-30 Sintético',
    estado: 'Operativo'
  },
  {
    id: 2,
    patente: 'AE 842 MX',
    marca_modelo: 'Fiat Cronos',
    km_actual: 28400,
    tipo_aceite: '0W-20 Sintético',
    estado: 'Alquilado'
  },
  {
    id: 3,
    patente: 'AD 913 QW',
    marca_modelo: 'Toyota Etios',
    km_actual: 62100,
    tipo_aceite: '5W-30 Sintético',
    estado: 'En Taller'
  }
];

export const INITIAL_SPRINTS = [
  {
    id: 'sprint-h1',
    nombre: 'Cronos MX - Quincena Julio',
    fecha_inicio: getRelativeDateStr(15),
    fecha_fin_estimada: getRelativeDateStr(5),
    fecha_fin_real: getRelativeDateStr(5),
    notas: 'Sprint histórico de alquiler cerrado exitosamente.',
    operador: 'Edu',
    estado: 'cerrado'
  },
  {
    id: 'sprint-active-1',
    nombre: 'Onix OJ - Turno Edu',
    fecha_inicio: getRelativeDateStr(4),
    fecha_fin_estimada: getRelativeDateStr(0),
    notas: 'Turno de control activo para el Chevrolet Onix.',
    operador: 'Edu',
    estado: 'activo'
  }
];

export const INITIAL_TRANSACTIONS = [
  // Transacciones del Sprint Histórico
  {
    id: 't1',
    monto: 185000,
    categoria: 'Cobro',
    descripcion: 'Alquiler quincenal Fiat Cronos AE842MX',
    creado_por: 'Edu',
    sprint_id: 'sprint-h1',
    fecha: getRelativeDateStr(14),
    metodo_pago: 'MP'
  },
  {
    id: 't2',
    monto: 15500,
    categoria: 'Nafta',
    descripcion: 'Carga de combustible Shell Infinia',
    creado_por: 'Edu',
    sprint_id: 'sprint-h1',
    fecha_gasto: getRelativeDateStr(12),
    metodo_pago: 'Tarjeta'
  },
  {
    id: 't3',
    monto: 4500,
    categoria: 'Lavadero',
    descripcion: 'Lavado completo interior y exterior',
    creado_por: 'Edu',
    sprint_id: 'sprint-h1',
    fecha_gasto: getRelativeDateStr(10),
    metodo_pago: 'Efectivo'
  },
  {
    id: 't4',
    monto: 8000,
    categoria: 'Estacionamiento',
    descripcion: 'Estacionamiento centro comercial',
    creado_por: 'Edu',
    sprint_id: 'sprint-h1',
    fecha_gasto: getRelativeDateStr(8),
    metodo_pago: 'MP'
  },
  
  // Transacciones del Sprint Activo actual
  {
    id: 't5',
    monto: 95000,
    categoria: 'Cobro',
    descripcion: 'Reserva fin de semana Chevrolet Onix AF106OJ',
    creado_por: 'Edu',
    sprint_id: 'sprint-active-1',
    fecha: getRelativeDateStr(3),
    metodo_pago: 'MP'
  },
  {
    id: 't6',
    monto: 12000,
    categoria: 'Nafta',
    descripcion: 'Carga de nafta super YPF',
    creado_por: 'Edu',
    sprint_id: 'sprint-active-1',
    fecha_gasto: getRelativeDateStr(2),
    metodo_pago: 'Efectivo'
  },
  {
    id: 't7',
    monto: 3800,
    categoria: 'Otro',
    descripcion: 'Compra de líquido limpiaparabrisas',
    creado_por: 'Edu',
    sprint_id: 'sprint-active-1',
    fecha_gasto: getRelativeDateStr(1),
    metodo_pago: 'MP'
  },
  {
    id: 't8',
    monto: 45000,
    categoria: 'Cobro',
    descripcion: 'Cobro de extensión de alquiler',
    creado_por: 'Edu',
    sprint_id: 'sprint-active-1',
    fecha: getRelativeDateStr(0),
    metodo_pago: 'MP'
  }
];

export const INITIAL_MAINTENANCE = [
  // Historial Onix
  {
    id: 'm1',
    created_at: new Date(new Date(getRelativeDateStr(30)).setHours(10, 0, 0)).toISOString(),
    vehiculo_id: 1,
    patente: 'AF 106 OJ',
    tipo_mantenimiento: 'Service',
    current_km: 40000,
    motivo: 'Service oficial de los 40.000 km (Aceite y filtros)',
    nuevo_estado: 'Operativo',
    creado_por: 'Edu'
  },
  {
    id: 'm2',
    created_at: new Date(new Date(getRelativeDateStr(4)).setHours(14, 30, 0)).toISOString(),
    vehiculo_id: 1,
    patente: 'AF 106 OJ',
    tipo_mantenimiento: 'Otro',
    current_km: 45200,
    motivo: 'Actualización rápida de kilometraje',
    nuevo_estado: 'Operativo',
    creado_por: 'Edu'
  },

  // Historial Fiat Cronos
  {
    id: 'm3',
    created_at: new Date(new Date(getRelativeDateStr(60)).setHours(9, 15, 0)).toISOString(),
    vehiculo_id: 2,
    patente: 'AE 842 MX',
    tipo_mantenimiento: 'Service',
    current_km: 20000,
    motivo: 'Service oficial de los 20.000 km',
    nuevo_estado: 'Operativo',
    creado_por: 'Edu'
  },
  {
    id: 'm4',
    created_at: new Date(new Date(getRelativeDateStr(15)).setHours(11, 0, 0)).toISOString(),
    vehiculo_id: 2,
    patente: 'AE 842 MX',
    tipo_mantenimiento: 'Otro',
    current_km: 28400,
    motivo: 'Auto alquilado quincenal',
    nuevo_estado: 'Alquilado',
    creado_por: 'Edu'
  },

  // Historial Toyota Etios
  {
    id: 'm5',
    created_at: new Date(new Date(getRelativeDateStr(45)).setHours(16, 0, 0)).toISOString(),
    vehiculo_id: 3,
    patente: 'AD 913 QW',
    tipo_mantenimiento: 'Service',
    current_km: 60000,
    motivo: 'Service de los 60.000 km completo',
    nuevo_estado: 'Operativo',
    creado_por: 'Admin'
  },
  {
    id: 'm6',
    created_at: new Date(new Date(getRelativeDateStr(2)).setHours(8, 30, 0)).toISOString(),
    vehiculo_id: 3,
    patente: 'AD 913 QW',
    tipo_mantenimiento: 'Mecánica',
    current_km: 62100,
    motivo: 'Ruido en tren delantero - Revisión y cambio de bujes',
    nuevo_estado: 'En Taller',
    creado_por: 'Edu'
  }
];
