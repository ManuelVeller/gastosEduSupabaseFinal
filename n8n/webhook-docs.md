# N8N Workflows

## Webhook Endpoint
`POST http://localhost:5678/webhook/expense`

### Payload structure:
```json
{
  "amount": 12.50,
  "category": "Food",
  "description": "Lunch at cafe",
  "date": "2023-10-25",
  "timestamp": "2023-10-25T12:00:00Z"
}
```

## Google Sheets Workflow Requirements
1. Receive webhook POST request on `expense` path.
2. Read JSON body.
3. Use Google Sheets node -> Append Row.
4. Cells Mapping:
   - A: `date`
   - B: `amount`
   - C: `category`
   - D: `description`
   - E: `timestamp`

## Optional Daily Summary Automation
1. Cron trigger every day at 21:00.
2. Google Sheets node -> Read all rows for current date.
3. Code Node -> Calculate summation.
4. Telegram/Slack/Email Node -> Send "Your daily expenses have been recorded. Total spent today: $X."

---

## Webhook Endpoint for Notifications
`POST http://localhost:5678/webhook/notifications`

Este endpoint recibe eventos en tiempo real desde el frontend relacionados con el flujo de tareas, sprints y estado de la flota de vehículos.

### Estructura base del Payload:
```json
{
  "event": "nombre_del_evento",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "data": { ... }
}
```

### Tipos de Eventos y sus Datos (`data`):

#### 1. Creación de Tarea (`task_created`)
Enviado cuando se registra una nueva tarea en el tablero.
```json
{
  "event": "task_created",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "data": {
    "id": "uuid-de-la-tarea",
    "titulo": "Cambio de pastillas de freno Jeep",
    "descripcion": "Revisar frenos traseros también",
    "estado": "Backlog",
    "creado_por: "Edu",
    "asignado_a": "Manu",
    "fecha_vencimiento": "2026-07-15",
    "tipo_actividad": "sprint-uuid|General"
  }
}
```

#### 2. Cambio/Cierre de Estado de Tarea (`task_status_changed`)
Enviado al mover una tarea de columna o completarla.
```json
{
  "event": "task_status_changed",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "data": {
    "id": "uuid-de-la-tarea",
    "titulo": "Cambio de pastillas de freno Jeep",
    "old_status": "En Progreso",
    "new_status": "Completada",
    "is_closed": true,
    "asignado_a": "Manu",
    "tipo_actividad": "sprint-uuid|General"
  }
}
```

#### 3. Apertura de Sprint (`sprint_opened`)
Enviado al abrir un nuevo período de control.
```json
{
  "event": "sprint_opened",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "data": {
    "id": "uuid-del-sprint",
    "nombre": "Jeep OJ",
    "fecha_inicio": "2026-07-08",
    "fecha_fin_estimada": "2026-07-12",
    "operador": "mmanu",
    "notas": "Notas iniciales del sprint"
  }
}
```

#### 4. Recordatorio de Sprint Vencido / Abierto hace mucho (`sprint_reminder`)
Enviado una vez al día cuando se detecta un sprint que supera los 3 días abierto o su fecha estimada de cierre.
```json
{
  "event": "sprint_reminder",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "data": {
    "id": "uuid-del-sprint",
    "nombre": "Jeep OJ",
    "fecha_inicio": "2026-07-01",
    "fecha_fin_estimada": "2026-07-05",
    "operador": "mmanu",
    "days_open": 7,
    "message": "El sprint \"Jeep OJ\" iniciado por mmanu sigue abierto o quedó pendiente de cerrarse."
  }
}
```

#### 5. Cambio de Estado de Vehículo/Taller (`vehicle_status_changed`)
Enviado cuando un auto cambia de estado en el panel de flota o entra/sale del taller.
```json
{
  "event": "vehicle_status_changed",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "data": {
    "patente": "AF106OJ",
    "old_status": "Operativo",
    "new_status": "En Taller",
    "is_entering_service": true,
    "is_leaving_service": false
  }
}
```

