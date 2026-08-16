# CRM V2 — Backlog

Este documento concentra las funciones que se posponen para la V2 del CRM.

Su objetivo es proteger el alcance de la V1: ningún elemento de esta lista debe bloquear el cierre o lanzamiento de la primera versión.

## Actividades

### Recordatorios y notificaciones

- Envío real de recordatorios.
- Recordatorios por correo electrónico.
- Recordatorios previos configurables.
- Notificaciones de actividades vencidas.
- Notificaciones de actividades reasignadas.
- Plantillas configurables para recordatorios.

### Invitaciones

- Envío real de invitaciones por correo.
- Confirmación de asistencia.
- Reenvío y cancelación de invitaciones.
- Notificación a participantes internos y externos.
- Seguimiento del estado de entrega de cada invitación.

### Calendarios externos

- Integración con Google Calendar.
- Integración con Microsoft Outlook Calendar.
- Creación de eventos externos desde actividades del CRM.
- Actualización y cancelación sincronizada de eventos.
- Sincronización bidireccional.
- Prevención de eventos duplicados.
- Manejo de errores, reintentos y pérdida de autorización.
- Almacenamiento seguro de credenciales y permisos de calendario.

## Inventarios

### Trazabilidad avanzada

- Manejo de números de serie.
- Manejo de lotes.
- Manejo de VIN para vehículos.
- Fechas de fabricación y caducidad.
- Historial individual por unidad, serie, lote o VIN.

### Compras y ERP

- Ciclo completo de órdenes de compra.
- Generación de órdenes de compra desde solicitudes de reposición.
- Envío de órdenes al ERP del cliente.
- Adaptadores para diferentes proveedores de ERP.
- Consulta del estado de sincronización con el ERP.
- Reintentos y resolución de errores de integración.
- Prevención de órdenes duplicadas entre Datara y el ERP.
- Confirmación de órdenes por parte del proveedor.
- Recepciones parciales.
- Recepciones totales.
- Conciliación entre lo solicitado, comprado y recibido.
- Registro automático de entradas desde recepciones del ERP.

### Importación, exportación y reportes

- Importación masiva de existencias.
- Importación masiva de movimientos.
- Importación de costos y parámetros de inventario.
- Exportación de existencias.
- Exportación del Kardex.
- Exportación de conteos físicos.
- Exportación de reservas.
- Exportación de auditoría.
- Reportes avanzados de rotación.
- Reportes de antigüedad del inventario.
- Reportes de cobertura y días de inventario.
- Reportes de faltantes y sobreinventario.
- Reportes de valuación histórica.

## Servicios V2

- Catálogo independiente de refacciones y consumibles, separado del catálogo de modelos.
- Vinculación de refacciones autorizadas con existencias de Inventarios.
- Reserva, surtido y consumo automático de refacciones desde la orden de servicio.
- Evidencias fotográficas antes, durante y después del servicio.
- Autorización del cliente mediante portal o firma electrónica.
- Administración de bahías, capacidad y carga del taller.
- Garantías, reclamaciones y retrabajos relacionados con servicios.
- Indicadores avanzados de tiempos, productividad, devoluciones y reincidencias.

## Módulos pendientes para cerrar el CRM V1

Los siguientes módulos forman parte de la V1 y deben terminarse antes de declarar completo el CRM:

- Automatizaciones.
- Analytics.

### Orden de ejecución

1. Automatizaciones: reglas, asignaciones, notificaciones y cambios automáticos de estado.
2. Analytics: revisión del código existente, consolidación de dashboards, KPIs, reportes y embudos.

## Módulos cerrados del CRM V1

- Contratación automática y suscripciones: alta de empresa, demos, pagos recurrentes, catálogo comercial, planes mensuales y anuales, cambios inmediatos con prorrateo, cambios programados, recuperación de pagos y sincronización mediante webhooks de Stripe.
- Inventarios.
- Ventas y órdenes de venta.
- Propuestas comerciales, implementadas como Cotizaciones.
- Seguimientos, implementados mediante Actividades y Agenda.
- Servicios para agencias de motocicletas, con programación, asignación a mecánicos, diagnóstico, acciones y refacciones, autorización gerencial, devolución al taller, cierre controlado y trazabilidad.
- Usuarios y permisos, con administración de miembros, roles por producto, permisos por módulo y acción, acceso por sucursal y protección en interfaz y API.
- Configuración del CRM, con orden, renombrado, visibilidad del menú y protección de los accesos administrativos.
- Licenciamiento modular del CRM, con separación entre producto contratado, módulos habilitados y permisos de usuario.

### Arquitectura comercial definida

- CRM Core: Prospectos, Clientes, Oportunidades, Productos, Agenda y Documentos.
- Capacidades de plataforma: Usuarios del CRM y Configuración.
- Complemento Ventas: Cotizaciones, Órdenes de venta y Promociones.
- Complemento Inventarios.
- Complemento Servicios.
- Complementos futuros: Automatizaciones, Analytics y Campañas.
- Las empresas existentes conservan acceso completo mientras no tengan una contratación modular configurada.
- El menú y las APIs validan tanto la contratación del módulo como los permisos del usuario.

> El CRM V1 todavía no está completo. El siguiente módulo de trabajo es Automatizaciones.

## Verticales y capacidades transversales V2

Las siguientes verticales y capacidades se diseñaron durante el cierre de la V1, pero quedan formalmente fuera de su alcance para proteger la fecha de lanzamiento.

### Priorización de verticales

Orden propuesto de desarrollo:

1. Datara Pets.
2. Datara Seguros para agentes, despachos y promotorías.
3. Datara Dental.
4. Nuevas verticales según validación comercial.

La vertical Agencia automotriz queda despriorizada. Su mercado objetivo suele operar con sistemas DMS, integraciones financieras y procesos impuestos por las marcas, lo que incrementa considerablemente la complejidad y el ciclo comercial.

### Capacidades compartidas de plataforma

Estas capacidades deben diseñarse como módulos transversales reutilizables, no duplicarse dentro de cada industria:

- Booking y reservaciones.
- Check-in y check-out.
- Identidad mediante QR.
- Paquetes, membresías y saldos.
- Cola de atención y estados del servicio.
- Control de capacidad y disponibilidad.
- Automatizaciones por consumo, vencimiento o saldo bajo.
- Notificaciones por correo, WhatsApp y canales internos.
- Historial auditable de movimientos.
- Firma, aceptación y evidencias de recepción y entrega.

Identificadores conceptuales propuestos:

- `booking`
- `check-in`
- `memberships`
- `service-queue`

Los nombres definitivos deberán validarse antes de crear migraciones, permisos o contratos públicos de API.

### Check-in inteligente

El motor de check-in deberá permitir identificar personas, mascotas, miembros, vehículos, activos u otras entidades mediante:

- Código QR individual.
- Cámara de teléfono o tablet.
- Webcam.
- Lector físico compatible.
- Búsqueda y registro manual desde recepción.

Flujo general:

1. Escanear o capturar el identificador.
2. Resolver de forma segura la entidad.
3. Encontrar su reservación, cita, paquete o servicio vigente.
4. Registrar fecha, hora, sucursal y colaborador.
5. Abrir el contexto operativo correspondiente a la industria.
6. Actualizar la cola o estado de atención.
7. Registrar check-out, consumo, cargos, evidencias y resultado.
8. Ejecutar automatizaciones y notificaciones.

#### Seguridad del QR

- El QR no debe contener datos personales, clínicos, financieros ni información de la mascota.
- Debe utilizar un token aleatorio, opaco, revocable y reemplazable.
- La pérdida de una placa o credencial no debe requerir crear nuevamente la entidad.
- Los accesos posteriores al escaneo deben respetar permisos por producto, módulo, acción, organización y sucursal.
- Los datos sensibles solo deben mostrarse al personal autorizado.
- Las operaciones sensibles pueden requerir una segunda validación.
- Todo acceso o cambio relevante debe quedar registrado en auditoría.

### Paquetes y membresías

Los paquetes no deben manejarse únicamente mediante un saldo editable. Deben utilizar un libro de movimientos auditable.

Tipos contemplados:

- Noches de pensión.
- Días de guardería.
- Visitas de grooming.
- Baños.
- Sesiones de entrenamiento.
- Consultas.
- Servicios combinados.
- Membresías recurrentes.

Cada movimiento deberá registrar:

- Saldo anterior.
- Cantidad consumida o abonada.
- Saldo resultante.
- Motivo.
- Reservación o servicio relacionado.
- Usuario responsable.
- Fecha y hora.
- Ajustes y cancelaciones.

Automatizaciones previstas:

- Aviso de saldo bajo.
- Aviso de última sesión o noche.
- Aviso de agotamiento.
- Aviso de vencimiento próximo.
- Oferta de renovación.
- Tarea de seguimiento para recepción o ventas.

## Datara Pets

Datara Pets debe funcionar como plataforma modular para veterinarias, guarderías, pensiones, grooming y otros negocios de mascotas.

### Datara Pets Core

- Tutores y familias.
- Mascotas.
- Prospectos.
- Agenda y actividades.
- Documentos.
- Productos y servicios.
- Automatizaciones.
- Integraciones.
- Comunicación con el tutor.

### Booking para mascotas

- Reservas en línea.
- Calendario por sucursal.
- Disponibilidad por recurso, área o colaborador.
- Confirmación, cancelación y reprogramación.
- Anticipos.
- Lista de espera.
- Reglas de capacidad.
- Recordatorios.

### Check-in para mascotas

- QR individual por mascota.
- QR digital e imprimible.
- Opción de placa o credencial.
- Registro de llegada y salida.
- Persona autorizada para entregar o recoger.
- Condición de ingreso.
- Fotografías de entrada y salida.
- Pertenencias.
- Alimentación y medicamentos.
- Instrucciones del tutor.
- Firma o aceptación.
- Incidentes y observaciones.
- Historial de escaneos.

### Expansión Grooming

- Servicios de baño y estética.
- Razas, tamaños y tipos de pelaje.
- Paquetes.
- Preferencias del tutor.
- Indicaciones especiales.
- Fotografías antes y después.
- Groomer asignado.
- Tiempo estimado.
- Consumo de productos.
- Próxima cita sugerida.

### Expansión Guardería

- Control diario de asistencia.
- Grupos, áreas y capacidad.
- Alimentación y medicamentos.
- Actividades.
- Conducta y compatibilidad.
- Incidentes.
- Reporte diario para el tutor.
- Check-in y check-out.
- Consumo de días o visitas disponibles.

### Expansión Pensión

- Reservaciones por noche.
- Habitaciones, jaulas o espacios.
- Calendario de ocupación.
- Tarifas por temporada.
- Entrada y salida.
- Alimentación y medicamentos.
- Servicios adicionales.
- Evidencias y reportes durante la estancia.
- Depósitos, saldos y cargos adicionales.
- Cálculo configurable de noches.
- Consumo automático del paquete contratado.

Dependencias previstas:

- Datara Pets Core.
- Booking.
- Check-in.
- Paquetes y membresías.

### Expansión Veterinaria

- Expediente médico por mascota.
- Consultas.
- Vacunas y desparasitación.
- Alergias y antecedentes.
- Diagnósticos.
- Recetas.
- Estudios y resultados.
- Hospitalización.
- Consentimientos.
- Seguimientos clínicos.

La expansión veterinaria requerirá una revisión específica de privacidad, seguridad, documentación y operación clínica antes de implementarse.

## Datara Dental

Datara Dental debe tratarse como producto clínico especializado, no como un simple cambio de terminología del CRM.

Alcance previsto:

- Pacientes.
- Expediente clínico.
- Historia médica.
- Odontograma.
- Periodontograma.
- Diagnósticos.
- Planes de tratamiento.
- Tratamientos realizados y pendientes.
- Consentimientos informados.
- Recetas.
- Estudios e imágenes.
- Citas.
- Presupuestos.
- Pagos.
- Check-in mediante QR.
- Cola de atención.
- Auditoría de accesos clínicos.

Después del check-in, cada rol deberá ver únicamente su contexto autorizado:

- Recepción: cita y datos operativos.
- Odontólogo: expediente y tratamiento.
- Caja: presupuesto, pagos y saldo.
- Paciente: confirmación de llegada e información permitida.

Antes de iniciar esta vertical se deberá revisar la normativa mexicana aplicable al expediente clínico, salud bucal, privacidad, conservación documental y sistemas electrónicos de salud.

## Datara Seguros

Datara Seguros estará dirigido inicialmente a agentes, despachos y promotorías, no a aseguradoras ni a la sustitución de sus sistemas centrales.

Alcance previsto:

- Prospectos.
- Asegurados.
- Pólizas.
- Coberturas.
- Aseguradoras.
- Cotizaciones.
- Renovaciones y vencimientos.
- Comisiones.
- Documentos.
- Seguimiento de trámites.
- Seguimiento de siniestros.
- Citas.
- Check-in en sucursal.
- Recordatorios automáticos.
- Tareas comerciales.
- Auditoría y control documental.

Antes de su implementación deberán revisarse las obligaciones aplicables a agentes, despachos, protección de datos, expedientes y documentación del sector asegurador.

## Alcance congelado de la V1

Quedan fuera de la V1 y no deben bloquear su lanzamiento:

- Datara Pets.
- QR por mascota o persona.
- Booking transversal.
- Check-in y check-out.
- Paquetes y membresías.
- Guardería.
- Pensión.
- Grooming.
- Expediente veterinario.
- Datara Dental.
- Datara Seguros.
- Nuevos templates verticales distintos de los ya disponibles.
- Cobro y aprovisionamiento automático de estas capacidades futuras.

La V1 continuará únicamente con las industrias ya funcionales:

- Agencia de motocicletas.
- Servicios profesionales.

## Regla de alcance

Toda nueva función que surja durante el cierre de la V1 debe evaluarse así:

1. Si corrige un error del flujo actual, pertenece a la V1.
2. Si es indispensable para operar correctamente una función ya incluida, pertenece a la V1.
3. Si amplía el flujo, agrega automatización avanzada o introduce una integración nueva, pasa a este backlog de V2.
4. Ninguna ampliación de V2 modifica el porcentaje de avance de la V1.

## Historial

- 2026-08-06: Se separó formalmente el alcance avanzado de Inventarios para evitar que siga creciendo la V1.
- 2026-08-12: Se cerró Usuarios y permisos con control por producto, módulo, acción y sucursal.
- 2026-08-12: Se cerró Configuración del CRM con orden, renombrado y visibilidad personalizada del menú.
- 2026-08-12: Se incorporó licenciamiento modular, separando contratación de empresa y permisos de usuario.
- 2026-08-12: Se definió Contratación automática como el siguiente módulo de trabajo.
- 2026-08-13: Se congeló el alcance vertical de la V1 en Agencia de motocicletas y Servicios profesionales.
- 2026-08-13: Se trasladaron a V2 Datara Pets, Datara Dental, Datara Seguros y las capacidades transversales de Booking, Check-in, QR, Paquetes y Membresías.
- 2026-08-13: Se definió el diseño conceptual de QR seguro, check-in inteligente y consumo auditable de paquetes.

