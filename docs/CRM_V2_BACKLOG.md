# CRM — Estado de V1 y backlog de V2

Este documento concentra el estado verificable de la V1 y las funciones que se posponen para la V2 del CRM.

Su objetivo es proteger el alcance de la V1, distinguir código existente de funcionalidad liberada y evitar que los pendientes de V2 bloqueen el lanzamiento.

Última conciliación técnica: 2026-08-28.

## Criterios de estado

- **Cerrado:** implementado, integrado, validado y disponible en los ambientes correspondientes.
- **Implementado en la rama:** existe código y validación estática, pero todavía requiere consolidación, migraciones o pruebas por ambiente.
- **Pendiente V1:** necesario para cerrar o liberar correctamente una capacidad comprometida en V1.
- **V2:** ampliación que no debe bloquear el cierre de V1.
- La existencia de una página, API, tabla o migración no equivale por sí sola a una función cerrada.

## Resumen ejecutivo

### Cerrado en V1

- CRM Core: prospectos, clientes, oportunidades, productos, actividades, agenda y documentos.
- Ventas: cotizaciones, PDF y envío, promociones y órdenes de venta.
- Inventario base: existencias, movimientos, transferencias, reservas, conteos, auditoría y reposición.
- Servicios para agencias de motocicletas.
- Usuarios, roles, permisos y alcance por sucursal.
- Configuración, navegación y licenciamiento modular.
- Automatizaciones inmediatas y diferidas, historial, reintentos y notificaciones internas/correo.
- Contratación, demos, suscripciones y sincronización mediante Stripe.
- Datara AI: acceso, créditos, consumo y controles de uso base.
- Integración de Facebook para captura de leads, sujeta a la configuración y revisión externa de Meta.
- Analytics operativo base con dashboard y endpoint de resumen.

### Implementado en la rama y pendiente de liberación integral

- Operaciones comerciales consolidadas y ordenamiento Kanban independiente de Oportunidades.
- Ciclo comercial de motocicletas: pagos, financiamiento, apartados, unidad/VIN, venta, factura y entrega.
- Inventario por unidad serializada, detalle, liberación de reservas y ciclo comercial de unidad.
- Control de facturas comerciales y consulta de consumo fiscal.
- Administración fiscal de plataforma, cuentas de timbres, recargas, ledger e idempotencia.
- Template generalizado de Servicios profesionales y operaciones adaptadas por industria.
- Migraciones `0061`, `0063` y `0064` y sus snapshots.

Este bloque no se considera cerrado hasta consolidar los archivos no versionados, ejecutar el preflight completo, aplicar migraciones por ambiente y validar flujos reales en desarrollo, demo y producción.

### Pendiente crítico de V1

- Integración real con Finkok para timbrado y cancelación de CFDI.
- Generación y resguardo de XML timbrado, UUID, sellos y respuesta del PAC.
- PDF fiscal generado por Datara a partir del CFDI timbrado.
- Pruebas de idempotencia, errores, reintentos, cancelación y conciliación de timbres.
- Consolidar y versionar el bloque comercial/fiscal actualmente presente como cambios locales.
- Migrar y probar separadamente desarrollo, demo y producción.
- Confirmar la lista de salida productiva: Clerk, documentos legales, secretos, webhooks, Meta, Stripe, Finkok y observabilidad.
- Ejecutar pruebas end-to-end de los dos templates V1: Agencia de motocicletas y Servicios profesionales.

## Actividades

### Recordatorios y notificaciones

- Canales adicionales y preferencias avanzadas por usuario.
- Recordatorios previos con múltiples ventanas configurables.
- Notificaciones externas por WhatsApp y otros canales.
- Plantillas administrables por tenant para cada tipo de recordatorio.
- Escalamiento de actividades vencidas o reasignadas.

La ejecución diferida, los reintentos, las notificaciones internas y el correo automatizado base ya forman parte de V1.

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

- Manejo de lotes.
- Fechas de fabricación y caducidad.
- Reglas FEFO/FIFO y alertas de caducidad.
- Trazabilidad compuesta lote + serie cuando una industria la requiera.

El manejo individual de unidades, número de serie/VIN, reservas, venta, entrega e historial comercial ya está implementado en la rama de V1 para el template de motocicletas.

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

## Inteligencia comercial, Analytics y AI V2

El Analytics operativo base pertenece a V1. La evolución predictiva y accionable queda en V2 y debe utilizar cálculos determinísticos y auditables antes de recurrir a explicaciones generadas por IA.

### Motor de recomendaciones

- Inventario envejecido y baja rotación.
- Sobreinventario y riesgo de agotamiento.
- Reabastecimiento y transferencias sugeridas entre sucursales.
- Modelos con muchas cotizaciones y baja conversión.
- Promociones y descuentos sujetos a margen mínimo configurable.
- Rendimiento por sucursal, vendedor y financiera.
- Comparación de contado contra financiado.
- Recomendaciones de compra.

### Recomendaciones accionables

- Flujo Insight → Recomendación → Simulación → Acción → Medición.
- Crear promociones conservando la relación con la recomendación original.
- Descartar, posponer o justificar recomendaciones.
- Medir posteriormente el resultado y la precisión de cada recomendación.
- Prohibir recomendaciones financieras sin respaldo de datos o que violen reglas de margen.

### Datara AI avanzada

- Consultas conversacionales sobre datos autorizados del tenant.
- Explicación de métricas y recomendaciones determinísticas.
- Acciones con autorización explícita, permisos y confirmación.
- Agentes especializados únicamente después de contar con auditoría, límites y controles de seguridad.

## Integraciones ERP V2

- Capa de integración desacoplada: ERP ↔ Integration Layer ↔ Datara.
- Adaptadores por proveedor sin contaminar los módulos principales.
- Sincronización de productos, inventarios, ventas, facturas y estados disponibles.
- Idempotencia, conciliación, reintentos y resolución de conflictos.
- Registro del origen y última sincronización de cada dato externo.
- Datara como interfaz operativa principal sin intentar reemplazar inicialmente la contabilidad completa del ERP.

## Pendientes para cerrar el CRM V1

Analytics base dejó de ser un módulo pendiente: existe la página `/crm/analytics`, el endpoint `/api/crm/analytics/overview` y utilidades de periodos. Los análisis predictivos, recomendaciones y simulaciones permanecen en V2.

### Orden de ejecución actualizado

1. Consolidar el bloque comercial, fiscal y de templates que actualmente está implementado en la rama de trabajo.
2. Terminar la integración real de Finkok y el flujo CFDI end-to-end.
3. Ejecutar preflight completo: formato dirigido, ESLint, TypeScript, build y pruebas de regresión.
4. Aplicar migraciones y configuración específica en desarrollo.
5. Desplegar y validar demo con datos representativos.
6. Desplegar producción únicamente después de validar secretos, webhooks, migraciones y rollback.
7. Completar la lista de salida productiva y declarar V1 cerrada.

### Lista de salida a producción de CRM V1

- [ ] Confirmar instancia productiva, claves, dominios, redirecciones, organizaciones y sesiones de Clerk.
- [ ] Confirmar que no exista advertencia de claves de desarrollo en producción.
- [ ] Confirmar Términos de Servicio y Política de Privacidad publicados y versionados.
- [ ] Confirmar aceptación expresa y evidencia auditable de documentos legales y cobros recurrentes.
- [ ] Confirmar secretos y webhooks separados para Stripe, Meta, AI y Finkok en cada ambiente.
- [ ] Aplicar y verificar migraciones pendientes en desarrollo, demo y producción, sin reutilizar comandos o archivos de entorno incorrectos.
- [ ] Validar contratación nueva, conversión de demo, renovación, cambio de plan y recuperación de pago.
- [ ] Validar conexión de Facebook y recepción de un lead real en el tenant correcto.
- [ ] Validar operación comercial completa de contado y financiada para motocicletas.
- [ ] Validar operación completa de Servicios profesionales.
- [ ] Validar control de facturas y, cuando Finkok esté terminado, timbrado y cancelación CFDI.
- [ ] Validar permisos, aislamiento multi-tenant y alcance por sucursal en todas las APIs nuevas.
- [ ] Confirmar logs, alertas, manejo de errores, idempotencia y procedimiento de rollback.

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
- Automatizaciones, con reglas por empresa y sucursal, condiciones configurables, asignaciones, actualización de campos, cambios de estado, actividades, notificaciones internas y correos electrónicos identificados con la empresa.
- Automatizaciones diferidas, con programación por minutos, horas, días o meses, fechas base configurables, reintentos, cancelación y reprogramación de trabajos, historial de ejecuciones y prevención de duplicados.
- Recordatorios posteriores a la entrega de órdenes de venta, incluyendo el caso de servicio de motocicleta 180 días después de la fecha de entrega.
- Analytics operativo base, con dashboard, periodos y resumen de indicadores.
- Integración de Facebook para leads, incluyendo OAuth, página conectada y persistencia multi-tenant.
- Datara AI base, con configuración, créditos, consumo e indicadores de uso.

## Capacidades V1 implementadas en la rama, pendientes de liberación

- Vista consolidada de Operaciones separada de Oportunidades.
- Flujo comercial configurable por industria y orden manual persistente del Kanban.
- Pagos y cancelación de pagos comerciales.
- Solicitudes de financiamiento, catálogo financiero y cambios de estado.
- Apartado condicionado de unidades y liberación de reservas.
- Inventario físico por unidad, número de serie/VIN y ciclo de disponible a entregada.
- Línea de vida auditable mediante eventos reales de la operación.
- Registro y control de facturas comerciales.
- Contratos internos para proveedor fiscal.
- Administración de cuentas, saldos, recargas y consumo de timbres.
- Panel de uso fiscal para el cliente.
- Template generalizado de Servicios profesionales.

Pendiente para cerrar estas capacidades:

- Versionar todos los archivos fuente y migraciones correspondientes.
- Ejecutar build y pruebas integradas después de consolidar el worktree.
- Aplicar migraciones y smoke tests por ambiente.
- Completar Finkok antes de presentar Timbrado CFDI como funcional.

### Arquitectura comercial definida

- CRM Core: Prospectos, Clientes, Oportunidades, Productos, Agenda y Documentos.
- Capacidades de plataforma: Usuarios del CRM y Configuración.
- Complemento Ventas: Cotizaciones, Órdenes de venta y Promociones.
- Complemento Inventarios.
- Complemento Servicios.
- Complemento Automatizaciones.
- Complemento Control de facturas.
- Complemento Timbrado CFDI, todavía pendiente de integración real con Finkok.
- Complementos futuros: Campañas y Analytics avanzado.
- Las empresas existentes conservan acceso completo mientras no tengan una contratación modular configurada.
- El menú y las APIs validan tanto la contratación del módulo como los permisos del usuario.

> El CRM V1 todavía no está completo. El siguiente bloque de trabajo es consolidar y liberar el ciclo comercial/fiscal, terminando Finkok y las pruebas por ambiente.

## Verticales y capacidades transversales V2

Las siguientes verticales y capacidades se diseñaron durante el cierre de la V1, pero quedan formalmente fuera de su alcance para proteger la fecha de lanzamiento.

### Arquitectura de industrias, perfiles y capacidades

Las nuevas verticales no deben implementarse como forks ni como conjuntos de condiciones hardcodeadas por cliente. El modelo objetivo será:

`Industria → Perfil de negocio → Capacidades activas → Configuración por empresa`

La industria agrupa negocios relacionados; el perfil define terminología, catálogos, campos sugeridos, pipeline y reglas iniciales; las capacidades determinan los módulos funcionales disponibles; y cada tenant conserva sus propias personalizaciones sin modificar la plantilla global.

Principios:

- Mantener compatibilidad con los identificadores de industria existentes.
- Compartir capacidades entre perfiles y cambiar su presentación mediante configuración.
- Permitir que una empresa active capacidades opcionales sin crear una vertical nueva.
- Conservar trazabilidad e integridad histórica cuando cambie un perfil o su configuración.
- No reservar ni desarrollar por ahora un perfil de agencia automotriz.

Perfiles prioritarios para la familia de agencias y distribución:

1. Motocicletas, adaptando el template actual sin romper tenants existentes.
2. Bicicletas.
3. Scooters, incluyendo variantes eléctricas.

Capacidades compartidas previstas:

- Inventario por unidad o identificador serial.
- Apartados, pagos y enganches.
- Cotizaciones, órdenes, facturas y entrega.
- Financiamiento opcional.
- Taller, servicio y postventa.
- Garantías.
- Pruebas de manejo.
- Accesorios y refacciones.
- CFDI y múltiples sucursales como capacidades contratables.

Perfiles posteriores de Servicios profesionales:

- Software y SaaS.
- Cloud e infraestructura.
- Consultoría.
- Agencia y servicios creativos.

Después se evaluarán perfiles para Retail, Bienes raíces y otras industrias conforme a validación comercial.

### Fichas técnicas configurables

La ficha técnica deberá ser un esquema configurable por tenant, basado en una plantilla inicial del perfil de negocio. No deberá codificarse una ficha distinta por cliente.

Alcance previsto:

- Agregar, editar, ordenar, ocultar y marcar campos como obligatorios.
- Tipos de campo: texto, número, moneda, fecha, selección, booleano y unidad de medida.
- Opciones, unidades y validaciones configurables.
- Aplicación de campos por categoría o tipo de producto.
- Visibilidad independiente en inventario, cotizaciones, fichas públicas y comparadores.
- Conservación de datos históricos cuando un campo se oculte o deje de utilizarse.
- Plantillas iniciales diferentes para motocicletas, bicicletas y scooters.
- Identificador serial genérico interno cuya etiqueta pueda mostrarse como VIN, número de serie u otra denominación.

Los campos estructurales controlados por la plataforma —identificador interno, producto, sucursal, estado, costo y precio— no dependerán del esquema personalizado.

Orden propuesto:

1. Definir el contrato de perfiles y capacidades.
2. Adaptar el perfil de motocicletas.
3. Crear los perfiles de bicicletas y scooters.
4. Implementar el motor configurable de fichas técnicas.
5. Extenderlo a los siguientes templates.

### Mejoras de Automatizaciones

- Incorporar una vista compacta.
- Permitir alternar entre vista de tarjetas y vista de lista.
- Permitir expandir las tarjetas para consultar detalles sin abrir el editor.
- Agregar búsqueda, filtros, agrupación y controles de densidad.

### Priorización de verticales

Orden propuesto de desarrollo:

1. Arquitectura de perfiles, capacidades y configuración por tenant.
2. Perfiles de bicicletas y scooters reutilizando la base de Agencia de motocicletas.
3. Motor configurable de fichas técnicas.
4. Módulo transversal de códigos QR.
5. Perfiles de Servicios profesionales: Software/SaaS, Cloud e infraestructura, Consultoría y Agencia creativa.
6. Retail.
7. Bienes raíces.
8. Datara Pets, comenzando por la validación de Veterinaria, Grooming, Guardería y Pensión.
9. Datara Seguros para agentes, despachos y promotorías.
10. Datara Dental.
11. Nuevas verticales según validación comercial.

La vertical Agencia automotriz queda despriorizada. Actualmente existe únicamente el identificador técnico `automotive_dealership` con una plantilla placeholder sin configuración funcional; no debe presentarse como vertical disponible. Su mercado objetivo suele operar con sistemas DMS, integraciones financieras y procesos impuestos por las marcas, lo que incrementa considerablemente la complejidad y el ciclo comercial.

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
- `qr-codes`

Los nombres definitivos deberán validarse antes de crear migraciones, permisos o contratos públicos de API.

### Módulo transversal de códigos QR

Los códigos QR deberán implementarse como un servicio central, multi-tenant y reutilizable por CRM, Inventarios, Ventas, Servicio, Facturación y futuras verticales. No deberán limitarse al check-in de personas o mascotas.

Casos de uso previstos:

- Identificación y consulta de unidades serializadas, inventario y activos.
- Fichas públicas de productos, motocicletas, bicicletas, scooters o equipos.
- Recepción, movimiento, apartado, entrega y auditoría de inventario.
- Órdenes de servicio, garantías y expedientes.
- Acceso autorizado a cotizaciones, órdenes, facturas y documentos.
- Registro de visitas, campañas, formularios y captura de prospectos.
- Identificación de sucursales, ubicaciones y anaqueles.

Contrato funcional:

- Códigos estáticos o dinámicos.
- Destino configurable, reemplazable y revocable.
- Token opaco; nunca exponer identificadores internos, datos personales ni secretos.
- Permisos, vencimiento y alcance por tenant y sucursal.
- Plantillas visuales y descarga para impresión.
- Historial de generación, activación, desactivación y escaneos.
- Métricas de uso y atribución.
- Acciones posteriores al escaneo sujetas a autenticación, permisos y reglas de negocio.

Primera entrega propuesta:

1. Registro central de códigos y destinos.
2. Generación, descarga, revocación y resolución segura.
3. QR para unidad de inventario y ficha pública.
4. Registro de escaneos y métricas básicas.
5. Integraciones posteriores con check-in, servicio, documentos, campañas y automatizaciones.

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
- 2026-08-28: Se definió la arquitectura Industria → Perfil → Capacidades → Configuración por empresa, priorizando motocicletas, bicicletas y scooters.
- 2026-08-28: Se incorporaron al backlog el motor de fichas técnicas configurables y el módulo transversal de códigos QR.
- 2026-08-28: Se concilió el backlog contra páginas, APIs, catálogo modular, esquema y migraciones actuales. Analytics base y unidades serializadas dejaron de clasificarse como V2; el bloque comercial/fiscal quedó como implementado en rama y pendiente de liberación integral; Finkok quedó identificado como pendiente crítico de V1.
