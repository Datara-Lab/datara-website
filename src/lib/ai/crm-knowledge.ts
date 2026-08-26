export type CRMKnowledgeArticle = {
  id: string;
  title: string;
  keywords: string[];
  matchTerms: string[];
  content: string;
};

const CRM_KNOWLEDGE_ARTICLE_MODULES:
  Record<string, string[]> = {
  "organization-structure-module": [
    "organization-structure",
  ],

  "catalog-module": [
    "products",
  ],

  "leads-module": [
    "leads",
  ],

  "automations-module": [
    "automations",
  ],

  "customers-module": [
    "contacts",
  ],

  "deals-module": [
    "deals",
  ],

  "settings-module": [
    "crm-settings",
  ],

    "users-module": [
      "crm-users",
  ],

    "roles-module": [
      "crm-users",
  ],

  "inventory-module": [
    "inventory",
  ],

  "quotes-module": [
    "quotes",
  ],

  "sales-orders-module": [
    "sales-orders",
  ],

  "services-module": [
    "services",
  ],

  "activities-module": [
    "activities",
  ],

  "promotions-module": [
    "promotions",
  ],

  "documents-module": [
    "documents",
  ],
};

const CRM_ADMIN_ONLY_ARTICLE_IDS =
  new Set<string>([
    "users-module",
    "roles-module",
    "organization-structure-module",
    "settings-module",
  ]);

const CRM_KNOWLEDGE_ARTICLES:
  CRMKnowledgeArticle[] = [
    {
      id:
        "catalog-module",

      title:
        "Uso del módulo Catálogo",

      keywords: [
        "alta de modelo",
        "dar de alta un modelo",
        "crear modelo",
        "nuevo modelo",
        "registrar modelo",
        "agregar modelo",
        "crear producto",
        "nuevo producto",
        "registrar producto",
        "agregar moto",
        "nueva moto",
        "registrar moto",
        "agregar motocicleta",
        "agregar al catalogo",
        "elemento de catalogo",
        "filtrar catalogo",
        "buscar producto",
        "producto descontinuado",
        "descontinue un producto",
        "reactivar producto",
        "activar producto",
        "ver descontinuados",
        "mostrar columna",
        "agregar columna",
        "quitar columna",
        "configurar columnas",
        "tipo de elemento",
        "categoria de producto",
        "categoria no aparece",
        "editar producto",
        "eliminar producto",
      ],

      matchTerms: [
        "catalogo",
        "producto",
        "productos",
        "modelo",
        "modelos",
        "moto",
        "motos",
        "motocicleta",
        "motocicletas",
        "sku",
        "descontinuado",
        "descontinuados",
        "reactivar",
      ],

      content: `
MÓDULO CATÁLOGO

Ruta interna: /crm/productos.

El nombre visible de la sección Catálogo puede ser personalizado por la
empresa. La ruta interna permanece igual. El botón para crear un registro
se llama Nuevo elemento de catálogo y ese nombre no cambia cuando se
personaliza el nombre de la sección.

FINALIDAD DEL MÓDULO

Catálogo administra los modelos, productos o servicios que la empresa
ofrece. Aquí se capturan sus datos generales, clasificación, ficha técnica
e información comercial.

Catálogo no es lo mismo que Inventarios. Catálogo define qué se vende o
maneja; Inventarios administra existencias, ubicaciones, movimientos,
reservas y conteos de los elementos que controlan inventario.

DAR DE ALTA UNA MOTO, MODELO O PRODUCTO

1. En el menú del CRM, entra a Catálogo. La empresa puede haber
   personalizado el nombre visible de esta sección.
2. Selecciona Nuevo elemento de catálogo.
3. En Información general, captura el Nombre.
4. Si aplica, captura el Código o SKU.
5. En Tipo de elemento, selecciona Modelo o el tipo correspondiente.
6. Selecciona una Categoría compatible con el tipo elegido.
7. Opcionalmente captura una Descripción.
8. Para una empresa de motocicletas, completa los campos disponibles de
   la Ficha técnica, como Año del modelo, Colores disponibles, Motor,
   Cilindrada, Potencia y demás especificaciones mostradas.
9. Completa la Información comercial, como precio, moneda y
   disponibilidad.
10. Guarda el elemento.

Tipo de elemento y Categoría son obligatorios. Las categorías disponibles
cambian según el Tipo de elemento seleccionado.

BUSCAR UN ELEMENTO

Utiliza el buscador de la tabla. Permite buscar por nombre, código o SKU,
tipo de elemento y categoría.

VER ACTIVOS, DESCONTINUADOS O TODOS

Encima de la tabla existen tres vistas:

- Activos: muestra únicamente elementos activos.
- Descontinuados: muestra únicamente elementos inactivos.
- Todos: muestra ambos estados.

Si un producto no aparece en Activos, revisa Descontinuados o Todos antes
de intentar registrarlo nuevamente.

CONFIGURAR LAS COLUMNAS VISIBLES

1. En la parte superior de la tabla, selecciona Columnas.
2. En Columnas visibles, marca los campos que quieres mostrar y desmarca
   los que quieras ocultar.
3. Cierra el selector al terminar.
4. Para recuperar la configuración original, selecciona Restablecer.

Cada vista conserva sus propias preferencias de columnas. Cambiar columnas
en Activos no necesariamente cambia las columnas de Descontinuados o Todos.

La columna de estado se muestra en la vista Todos. En Activos y
Descontinuados el estado se oculta porque ya está indicado por la vista
seleccionada.

EDITAR UN ELEMENTO

1. Busca el elemento y abre su registro.
2. Selecciona Editar.
3. Modifica los campos necesarios.
4. Guarda los cambios.

Una categoría o tipo inactivo puede conservarse en un producto que ya lo
utilizaba, pero no puede seleccionarse para una asignación nueva.

DESCONTINUAR UN ELEMENTO

Abre el registro del elemento y utiliza la acción para descontinuarlo.
Solo un administrador global de la empresa puede descontinuar o reactivar
elementos del catálogo.

Descontinuar no elimina el registro. El elemento pasa a la vista
Descontinuados.

REACTIVAR UN ELEMENTO DESCONTINUADO POR ERROR

1. En Catálogo, abre la vista Descontinuados.
2. Busca y abre el elemento.
3. Utiliza la acción Reactivar.
4. Confirma la operación.

El elemento volverá a aparecer en Activos. Esta operación requiere ser
administrador global de la empresa.

ELIMINAR UN ELEMENTO

El módulo no permite eliminar elementos del catálogo. Para retirarlos de
la operación se deben descontinuar. Esto conserva su historial y sus
relaciones comerciales.

ADMINISTRAR TIPOS Y CATEGORÍAS

Configuración > Categorías del catálogo se utiliza para administrar tipos
de elemento y sus categorías. No se utiliza para registrar una moto,
modelo o producto vendible específico.

Si una categoría no aparece al crear o editar un elemento:

1. Verifica el Tipo de elemento seleccionado.
2. Recuerda que cada tipo muestra únicamente sus categorías asociadas.
3. Revisa en Configuración > Categorías del catálogo que el tipo y la
   categoría estén activos.
4. Si no tienes acceso a Configuración, solicita ayuda a un administrador.
      `.trim(),
    },
    {
      id:
        "users-module",

      title:
        "Administración de usuarios",

      keywords: [
        "administrar usuarios",
        "usuarios del crm",
        "invitar usuario",
        "invitar miembro",
        "crear usuario",
        "agregar usuario",
        "editar usuario",
        "cambiar rol usuario",
        "rol global usuario",
        "rol por producto",
        "acceso por producto",
        "quitar acceso producto",
        "acceso a sucursales",
        "todas las sucursales",
        "sucursal principal",
        "acceso por region",
        "eliminar usuario",
        "remover usuario",
        "usuario eliminado",
        "invitacion usuario",
        "invitacion pendiente",
        "invitacion expira",
      ],

      matchTerms: [
        "usuario",
        "usuarios",
        "miembro",
        "miembros",
        "invitacion",
        "invitaciones",
        "rol",
        "roles",
        "acceso",
        "accesos",
        "producto",
        "productos",
        "sucursal",
        "sucursales",
        "region",
        "regiones",
      ],

      content: `
ADMINISTRACIÓN DE USUARIOS

Ruta: Administración > Usuarios.

Esta función es administrativa y está disponible para usuarios con
permisos administrativos suficientes.

FINALIDAD

Usuarios permite administrar los miembros de la organización y sus accesos
a los productos contratados.

La pantalla puede mostrar información como:

- Nombre.
- Correo electrónico.
- Estado.
- Rol global.
- Accesos por producto.

INVITAR UN USUARIO

1. Entra a Administración.
2. Selecciona Usuarios.
3. Selecciona Invitar usuario.
4. Captura Nombre, Apellidos y Correo electrónico.
5. Configura el rol global cuando corresponda.
6. Configura los productos a los que tendrá acceso.
7. Selecciona el rol correspondiente para cada producto.
8. Envía la invitación.

Datara valida el formato del correo electrónico antes de crear la
invitación.

PRODUCTOS Y ROLES EN LA INVITACIÓN

Solo pueden asignarse productos que estén habilitados para la empresa.

El rol seleccionado para cada producto debe pertenecer a ese mismo
producto.

Por ejemplo, un rol de Datara CRM no puede utilizarse como rol de Datara
Analytics o Datara Cloud.

El rol global, cuando se selecciona, también debe ser un rol global válido.

VIGENCIA DE LA INVITACIÓN

Las invitaciones se crean con una vigencia de 30 días.

Mientras no haya sido aceptada, Datara conserva la invitación con estado
Pendiente.

Si se vuelve a generar una invitación para el mismo correo dentro de la
misma empresa, Datara actualiza la invitación pendiente con la nueva
configuración de accesos.

CONFIGURAR UN USUARIO EXISTENTE

Un administrador puede modificar los accesos de un miembro existente.

Entre las opciones administrables pueden encontrarse:

- Rol global.
- Rol por producto.
- Acceso a Datara CRM.
- Acceso a Datara Analytics.
- Acceso a Datara Cloud.
- Acceso a todas las sucursales.
- Acceso a regiones específicas.
- Acceso a sucursales específicas.
- Sucursal principal.

Los productos disponibles dependen de los productos habilitados para la
empresa.

QUITAR EL ACCESO A UN PRODUCTO

Si se elimina el rol asignado a un producto, Datara elimina el acceso del
usuario a ese producto.

También se eliminan las asignaciones de regiones y sucursales relacionadas
con ese producto.

ACCESO POR SUCURSAL

Cuando el usuario no tiene acceso a todas las sucursales, pueden asignarse
regiones y sucursales específicas.

Datara valida que las regiones y sucursales seleccionadas pertenezcan a la
misma organización.

Para cada producto solo puede existir una sucursal principal.

ELIMINAR UN USUARIO

Un administrador puede eliminar a otro usuario de la organización.

Al eliminarlo:

- Se elimina su membresía activa de la organización.
- Se eliminan sus roles por producto.
- Se eliminan sus accesos por región.
- Se eliminan sus accesos por sucursal.
- El usuario queda registrado en Datara con estado Removed para conservar
  trazabilidad administrativa.

RESTRICCIONES DE ELIMINACIÓN

Un administrador no puede eliminar su propio usuario.

El propietario de la organización no puede ser eliminado.

Si el usuario ya se encontraba eliminado, Datara no vuelve a procesar la
operación.

PERMISOS

La administración de usuarios requiere permisos administrativos.

No debe indicarse a un usuario operativo que puede administrar miembros,
roles o accesos si su perfil no cuenta con ese nivel de autorización.
      `.trim(),
    },
    {
      id:
        "roles-module",

      title:
        "Administración de roles y permisos",

      keywords: [
        "roles y permisos",
        "crear rol",
        "nuevo rol",
        "editar rol",
        "eliminar rol",
        "rol personalizado",
        "rol del sistema",
        "rol global",
        "rol de crm",
        "rol de analytics",
        "rol de cloud",
        "permisos por modulo",
        "permiso de lectura",
        "permiso para crear",
        "permiso para editar",
        "permiso para eliminar",
        "permiso de gestion",
        "can view",
        "can create",
        "can edit",
        "can delete",
        "can manage",
        "rol asignado usuario",
        "no puedo eliminar rol",
      ],

      matchTerms: [
        "rol",
        "roles",
        "permiso",
        "permisos",
        "acceso",
        "accesos",
        "modulo",
        "modulos",
        "administrador",
        "personalizado",
        "sistema",
      ],

      content: `
ADMINISTRACIÓN DE ROLES Y PERMISOS

Ruta: Administración > Roles y permisos.

Esta función es administrativa.

FINALIDAD

Roles y permisos permite definir qué acciones puede realizar un usuario
dentro del Workspace y de los productos de Datara.

Los roles pueden ser:

- Globales.
- Específicos de Datara CRM.
- Específicos de Datara Analytics.
- Específicos de Datara Cloud.

CREAR UN ROL

1. Entra a Administración.
2. Selecciona Roles y permisos.
3. Selecciona Nuevo rol.
4. Captura el Nombre.
5. Opcionalmente captura una Descripción.
6. Selecciona el producto al que pertenece el rol.
7. Configura los permisos por módulo.
8. Guarda el rol.

El nombre del rol es obligatorio y no puede superar 100 caracteres.

PRODUCTO DEL ROL

Un rol puede ser global o pertenecer a uno de estos productos:

- Datara CRM.
- Datara Analytics.
- Datara Cloud.

Los permisos disponibles dependen del producto seleccionado.

Datara no permite asignar a un rol permisos de módulos que pertenecen a
otro producto.

PERMISOS POR MÓDULO

Cada módulo puede administrar los siguientes niveles:

- Ver.
- Crear.
- Editar.
- Eliminar.
- Gestionar.

Los permisos superiores incluyen automáticamente los anteriores.

Esto significa:

Gestionar
incluye Eliminar, Editar, Crear y Ver.

Eliminar
incluye Editar, Crear y Ver.

Editar
incluye Crear y Ver.

Crear
incluye Ver.

No puede repetirse el mismo módulo más de una vez dentro de la
configuración de un mismo rol.

ROLES DEL SISTEMA

Datara puede incluir roles del sistema.

Los roles del sistema están protegidos.

En un rol del sistema:

- El nombre no se modifica.
- La descripción no se modifica.
- Sus permisos sí pueden actualizarse cuando la interfaz lo permita.
- El rol no puede eliminarse.

ROLES PERSONALIZADOS

Los roles creados por la empresa son roles personalizados.

En ellos pueden modificarse:

- Nombre.
- Descripción.
- Permisos por módulo.

EDITAR UN ROL

1. Entra a Administración > Roles y permisos.
2. Selecciona el rol.
3. Selecciona Editar rol.
4. Modifica los permisos disponibles.
5. Si es un rol personalizado, también puedes modificar nombre y
   descripción.
6. Guarda los cambios.

Al guardar, Datara reemplaza la configuración de permisos anterior por la
nueva configuración seleccionada.

ELIMINAR UN ROL

Solo pueden eliminarse roles personalizados.

Datara bloquea la eliminación cuando:

- El rol es un rol del sistema.
- El rol está asignado como rol global a uno o más usuarios.
- El rol está asignado a uno o más usuarios dentro de algún producto.

Si un rol está en uso, primero debe retirarse o cambiarse la asignación de
los usuarios correspondientes.

RELACIÓN CON USUARIOS

Los roles se asignan posteriormente desde la administración de Usuarios.

Un usuario puede tener:

- Un rol global.
- Un rol específico por producto.

El rol seleccionado para un producto debe pertenecer a ese mismo producto.

IMPORTANTE

No debe indicarse a usuarios operativos que pueden administrar roles,
permisos o asignaciones administrativas.

Estas funciones requieren privilegios administrativos suficientes.
      `.trim(),
    },
    {
      id:
        "organization-structure-module",

      title:
        "Administración de regiones y sucursales",

      keywords: [
        "regiones y sucursales",
        "estructura organizacional",
        "estructura de la empresa",
        "crear region",
        "nueva region",
        "editar region",
        "eliminar region",
        "desactivar region",
        "region inactiva",
        "crear sucursal",
        "nueva sucursal",
        "editar sucursal",
        "eliminar sucursal",
        "desactivar sucursal",
        "sucursal inactiva",
        "codigo de sucursal",
        "codigo de region",
        "prefijo de folio",
        "folio sucursal",
        "zona horaria sucursal",
        "direccion sucursal",
        "usuario por sucursal",
        "usuario por region",
        "sucursal principal",
        "organizar sucursales",
      ],

      matchTerms: [
        "region",
        "regiones",
        "sucursal",
        "sucursales",
        "estructura",
        "territorial",
        "zona",
        "codigo",
        "folio",
        "direccion",
        "usuario",
        "usuarios",
      ],

      content: `
ADMINISTRACIÓN DE REGIONES Y SUCURSALES

Ruta: Administración > Regiones y sucursales.

Esta función es administrativa.

FINALIDAD

Regiones y sucursales permite organizar territorialmente la operación de
la empresa y utilizar esa estructura para controlar el alcance de los
usuarios.

Las regiones pueden agrupar sucursales por criterios geográficos o
comerciales.

REGIONES

Una región puede almacenar:

- Nombre.
- Código.
- Descripción.
- Estado Activo o Inactivo.

CREAR UNA REGIÓN

1. Entra a Administración.
2. Selecciona Regiones y sucursales.
3. Selecciona Nueva región.
4. Captura el Nombre.
5. Captura el Código.
6. Opcionalmente captura una Descripción.
7. Define si la región estará Activa.
8. Guarda la región.

El Nombre y el Código son obligatorios.

Datara normaliza el Código de la región a mayúsculas.

EDITAR UNA REGIÓN

1. Entra a Administración > Regiones y sucursales.
2. Localiza la región.
3. Selecciona la opción de edición.
4. Modifica Nombre, Código, Descripción o Estado.
5. Guarda los cambios.

REGIONES INACTIVAS

Una región puede marcarse como Inactiva sin eliminarla.

Las regiones inactivas no están disponibles para nuevas asignaciones
operativas desde las interfaces correspondientes.

Desactivar una región no equivale a eliminarla.

ELIMINAR UNA REGIÓN

Datara permite eliminar físicamente una región únicamente cuando no tiene
relaciones que impidan la operación.

No puede eliminarse una región cuando:

- Tiene una o más sucursales asociadas.
- Tiene uno o más usuarios asignados mediante acceso regional.

En esos casos, primero deben corregirse o retirarse las relaciones
correspondientes.

SUCURSALES

Una sucursal puede almacenar:

- Nombre.
- Código.
- Región.
- Prefijo de folio.
- Teléfono.
- Correo electrónico.
- Zona horaria.
- Estado Activo o Inactivo.
- Dirección.

La Dirección puede incluir:

- País.
- Estado.
- Ciudad.
- Código postal.
- Calle.
- Número exterior.
- Número interior.
- Colonia.
- Referencia.

CREAR UNA SUCURSAL

1. Entra a Administración > Regiones y sucursales.
2. En la sección Sucursales selecciona Nueva sucursal.
3. Captura el Nombre.
4. Captura el Código.
5. Opcionalmente selecciona una Región.
6. Completa los demás datos administrativos y de ubicación que
   correspondan.
7. Define si la sucursal estará Activa.
8. Guarda la sucursal.

El Nombre y el Código son obligatorios.

Datara normaliza el Código de la sucursal a mayúsculas.

La sucursal puede existir sin estar relacionada con una región.

REGIÓN DE UNA SUCURSAL

Cuando se selecciona una región, Datara valida que esa región pertenezca a
la misma organización.

No puede relacionarse una sucursal con una región de otra empresa.

PREFIJO DE FOLIO

La sucursal puede almacenar un Prefijo de folio.

Cuando se captura, Datara lo normaliza a mayúsculas.

DIRECCIÓN Y CÓDIGO POSTAL

La interfaz permite capturar manualmente la información de dirección.

También puede consultarse un código postal utilizando el País y Código
postal.

Cuando la consulta encuentra información disponible, Datara puede
completar datos como:

- País.
- Estado.
- Ciudad.
- Zona horaria.

Estos datos pueden revisarse antes de guardar la sucursal.

EDITAR UNA SUCURSAL

1. Entra a Administración > Regiones y sucursales.
2. Localiza la sucursal.
3. Selecciona la opción de edición.
4. Modifica la información requerida.
5. Guarda los cambios.

La región asignada también puede cambiarse o retirarse.

SUCURSALES INACTIVAS

Una sucursal puede marcarse como Inactiva sin eliminarla.

Desactivar una sucursal no equivale a eliminarla físicamente.

ELIMINAR UNA SUCURSAL

Datara no permite eliminar una sucursal cuando existen usuarios asignados
directamente a ella.

Primero deben modificarse los accesos de los usuarios correspondientes.

Si no existen asignaciones que bloqueen la operación, la sucursal puede
eliminarse físicamente.

RELACIÓN CON USUARIOS

La estructura de Regiones y sucursales se utiliza en la administración de
accesos.

Según su configuración, un usuario puede tener:

- Acceso a todas las sucursales.
- Acceso a regiones específicas.
- Acceso a sucursales específicas.
- Una sucursal principal por producto.

Eliminar o modificar una región o sucursal puede afectar la estructura
utilizada para controlar esos accesos.

RECOMENDACIÓN OPERATIVA

Cuando una región o sucursal dejará de utilizarse pero todavía tiene
relaciones operativas, es preferible revisar primero si debe marcarse como
Inactiva en lugar de eliminarla.

No deben eliminarse estructuras únicamente para ocultarlas de nuevas
operaciones.

PERMISOS

La administración de regiones y sucursales requiere privilegios
administrativos.

No debe indicarse a usuarios operativos que pueden crear, modificar,
eliminar o reorganizar la estructura territorial de la empresa.
      `.trim(),
    },

    {
      id:
        "settings-module",

      title:
        "Uso de Configuración",

      keywords: [
        "configurar crm",
        "configuracion del crm",
        "configurar empresa",
        "datos de la empresa",
        "editar empresa",
        "cambiar nombre de empresa",
        "cambiar logo",
        "subir logo",
        "logo de la empresa",
        "configurar menu",
        "personalizar menu",
        "cambiar nombre de modulo",
        "renombrar modulo",
        "ocultar modulo",
        "mostrar modulo",
        "orden del menu",
        "categorias del catalogo",
        "configurar categorias",
        "crear categoria",
        "crear tipo de elemento",
        "reservas de inventario",
        "configurar reservas",
        "configurar asistente",
        "nombre del asistente",
        "personalizar asistente",
        "no veo configuracion",
        "no puedo entrar a configuracion",
      ],

      matchTerms: [
        "configuracion",
        "configurar",
        "ajustes",
        "preferencias",
        "empresa",
        "branding",
        "logo",
        "menu",
        "categoria",
        "categorias",
        "reserva",
        "reservas",
        "asistente",
      ],

      content: `
CONFIGURACIÓN

Ruta: Configuración (/crm/configuracion).

FINALIDAD DE CONFIGURACIÓN

Configuración concentra opciones administrativas del CRM. Desde esta
sección se administran parámetros generales de la empresa y opciones que
afectan el comportamiento o la presentación de distintos módulos.

Las opciones visibles pueden depender de los permisos del usuario y de
las funciones habilitadas para la empresa.

CONFIGURAR DATOS DE LA EMPRESA

1. En el menú del CRM, entra a Configuración.
2. Selecciona Empresa.
3. Revisa y modifica los datos disponibles de la organización.
4. Guarda los cambios.

Desde esta sección pueden administrarse datos generales e información de
identidad empresarial disponible en el sistema.

CAMBIAR EL LOGO DE LA EMPRESA

1. Entra a Configuración.
2. Selecciona Empresa.
3. Localiza la sección correspondiente al logo o identidad empresarial.
4. Carga o reemplaza la imagen.
5. Guarda los cambios cuando corresponda.

El logo configurado puede utilizarse en distintas áreas del CRM que
admitan identidad empresarial.

CONFIGURAR EL MENÚ DEL CRM

Configuración > Menú abre la configuración de navegación del CRM.

Desde esta sección se puede administrar:

- El orden de los módulos.
- El nombre visible de los módulos.
- La visibilidad de módulos configurables.
- El orden recomendado.

ORDEN DE NAVEGACIÓN

Los módulos se organizan por secciones.

Utiliza las flechas para mover cada módulo dentro de su propia sección.

Después de realizar cambios selecciona Guardar orden.

RENOMBRAR MÓDULOS

El nombre visible de un módulo puede modificarse desde esta pantalla.

El nuevo nombre puede tener hasta 60 caracteres.

Cambiar el nombre visible no modifica necesariamente:

- La ruta interna.
- El identificador del módulo.
- Sus permisos.
- Su funcionamiento.

OCULTAR O MOSTRAR MÓDULOS

Los módulos configurables pueden ocultarse o mostrarse en la navegación.

Ocultar un módulo del menú no significa eliminarlo del sistema ni retirar
automáticamente sus permisos.

Algunos elementos están protegidos y no pueden ocultarse desde esta
pantalla.

Entre ellos:

- Inicio.
- Usuarios del CRM.
- Configuración del CRM.

RESTAURAR ORDEN RECOMENDADO

La acción Restaurar orden recomendado permite recuperar la organización
predeterminada disponible para el menú.

Después de restaurar, guarda los cambios para conservar la configuración.

PERMISOS DEL MENÚ

Los usuarios autorizados pueden consultar el orden configurado.

Solo el dueño o un administrador pueden modificarlo desde esta pantalla.

CATEGORÍAS DEL CATÁLOGO

Configuración > Categorías del catálogo permite administrar tipos de
elemento y categorías utilizadas por el módulo Catálogo.

Esta sección no se utiliza para crear productos, modelos, motos o
servicios vendibles específicos.

Para registrar un elemento vendible debes utilizar el módulo Catálogo.

Si una categoría no aparece al crear o editar un elemento:

1. Revisa el Tipo de elemento seleccionado.
2. Verifica que la categoría esté asociada a ese tipo.
3. Confirma que el tipo y la categoría estén activos.
4. Si no tienes acceso a Configuración, solicita ayuda a un administrador.

CONFIGURACIÓN DE RESERVAS DE INVENTARIO

Configuración > Reservas abre la Política de reservas.

Esta sección define cuánto tiempo puede permanecer apartado el inventario
antes de volver a estar disponible.

DURACIÓN POR ETAPA

Datara permite configurar plazos independientes, expresados en horas, para:

- Reserva manual.
- Oportunidad calificada.
- Propuesta o cotización.
- Negociación.
- Anticipo confirmado.

La interfaz muestra también el equivalente aproximado del plazo en días.

PLAZO MÁXIMO

La política incluye un Plazo máximo permitido.

Los plazos configurados para cada etapa no deben superar ese máximo.

El plazo máximo permitido por la interfaz puede configurarse hasta 2160
horas.

EXTENSIONES

La opción Permitir extensiones determina si los usuarios autorizados pueden
ampliar la duración de una reserva activa.

Una extensión no debe superar el plazo máximo configurado.

LIBERACIÓN AUTOMÁTICA

La opción Liberar automáticamente al vencer permite que las unidades de una
reserva vencida vuelvan a estar disponibles sin intervención manual.

Si esta opción no está habilitada, no debe asumirse que una reserva vencida
se libera automáticamente.

PERMISOS DE LA POLÍTICA

Los usuarios con acceso de consulta pueden visualizar la política.

Solo el dueño o un administrador pueden modificarla desde esta pantalla.

No deben modificarse estos parámetros sin considerar su efecto sobre la
disponibilidad de Inventarios y los procesos comerciales.

CONFIGURAR EL ASISTENTE

Configuración > Asistente permite administrar la inteligencia artificial
relacionada con Datara CRM.

IDENTIDAD DEL ASISTENTE

La empresa puede personalizar el Nombre público del asistente.

El nombre debe tener entre 2 y 40 caracteres.

Ese nombre se utiliza tanto para el asistente interno como para el chatbot
público.

Cambiar el nombre no modifica sus permisos, su alcance ni le concede
acceso adicional a información de la empresa.

CRÉDITOS DE INTELIGENCIA ARTIFICIAL

La pantalla muestra dos tipos de créditos:

- Créditos mensuales.
- Créditos extra.

El asistente interno y el chatbot público consumen primero los créditos
mensuales y después los créditos extra.

CRÉDITOS MENSUALES

La interfaz muestra:

- Créditos utilizados.
- Créditos disponibles.
- Límite mensual.

La bolsa mensual se restablece en cada periodo mensual.

Los créditos mensuales no utilizados no se acumulan para el siguiente
periodo.

CRÉDITOS EXTRA

Los créditos extra se utilizan después de agotar los créditos mensuales.

La interfaz puede mostrar:

- Créditos originales.
- Créditos utilizados.
- Créditos disponibles.
- Próxima fecha de vencimiento de una bolsa extra.

ASISTENTE INTERNO

La opción del asistente interno permite activar o desactivar la guía de
Datara CRM disponible para los empleados.

Cuando está activo, los usuarios que además cumplen las reglas de acceso
del asistente pueden consultarlo desde el CRM.

Desactivar esta opción impide el uso del asistente interno aunque el
usuario tenga permisos operativos.

CHATBOT PÚBLICO

La opción Chatbot público permite activar o desactivar la atención
automatizada para visitantes desde el sitio web autorizado de la empresa.

El chatbot público y el asistente interno comparten el consumo de créditos
de inteligencia artificial.

ACTIVAR O DESACTIVAR

Desde esta pantalla pueden administrarse por separado:

- Asistente interno.
- Chatbot público.

No debe asumirse que activar uno activa automáticamente el otro.

ACCESO A CONFIGURACIÓN

Si no puedes ver Configuración o alguna de sus secciones, puede deberse a
los permisos asignados a tu usuario.

Solicita apoyo a un administrador de tu empresa para revisar tu acceso.

NO INVENTAR OPCIONES

Si una pregunta solicita una opción de Configuración que no aparece
descrita en esta guía, no debe asumirse que esa función existe. La
disponibilidad de opciones puede variar según la configuración y versión
del CRM.
      `.trim(),
    },
    {
      id:
        "automations-module",

      title:
        "Uso del módulo Automatizaciones",

      keywords: [
        "crear automatizacion",
        "nueva automatizacion",
        "editar automatizacion",
        "eliminar automatizacion",
        "activar automatizacion",
        "desactivar automatizacion",
        "regla automatica",
        "disparador automatizacion",
        "condicion automatizacion",
        "accion automatizacion",
        "acciones programadas",
        "automatizacion con retraso",
        "enviar correo automaticamente",
        "crear actividad automaticamente",
        "crear notificacion automaticamente",
        "cambiar estado automaticamente",
        "asignar responsable automaticamente",
        "historial automatizaciones",
      ],

      matchTerms: [
        "automatizacion",
        "automatizaciones",
        "regla",
        "reglas",
        "disparador",
        "disparadores",
        "condicion",
        "condiciones",
        "accion",
        "acciones",
        "programada",
        "programadas",
        "correo",
        "notificacion",
      ],

      content: `
MÓDULO AUTOMATIZACIONES

Ruta: Automatizaciones (/crm/automatizaciones).

FINALIDAD DEL MÓDULO

Automatizaciones permite crear reglas que reaccionan a eventos del CRM y
ejecutan una o más acciones cuando se cumplen las condiciones configuradas.

Una automatización puede utilizarse para automatizar seguimientos, tareas,
cambios de estado, notificaciones y correos.

ENTIDADES DISPONIBLES

Las automatizaciones pueden configurarse sobre:

- Prospectos.
- Clientes.
- Oportunidades.
- Actividades.
- Órdenes de venta.

DISPARADORES

Los disparadores disponibles son:

- Al crear.
- Al actualizar.
- Al cambiar estado.

El disparador determina qué evento inicia la evaluación de la regla.

CONDICIONES

Una automatización puede incluir condiciones adicionales.

Los operadores disponibles son:

- Es igual a.
- No es igual a.
- Contiene.
- No contiene.
- Está vacío.
- No está vacío.
- Es mayor que.
- Es menor que.
- Cambió.

Algunas condiciones no requieren un valor adicional, por ejemplo:

- Está vacío.
- No está vacío.
- Cambió.

Las condiciones pueden utilizar campos del registro como:

- Estado.
- Etapa.
- Origen.
- Tipo de cliente.
- Consentimiento comercial.
- Canal de adquisición.
- Método de pago.
- Prioridad.
- Tipo.
- Nombre del cliente.
- Correo del cliente.
- Total.
- Fecha estimada de cierre.
- Fecha de cierre.
- Fecha de confirmación.
- Fecha de entrega.
- Fecha de inicio.
- Fecha de fin.
- Fecha de vencimiento.
- Fecha de conclusión.
- Fecha de creación.
- Fecha de actualización.

ACCIONES

Toda automatización debe incluir al menos una acción.

Una automatización puede tener como máximo 10 acciones.

Las acciones disponibles son:

- Asignar responsable.
- Actualizar campo.
- Cambiar estado.
- Crear actividad.
- Crear notificación.
- Enviar correo.

ASIGNAR RESPONSABLE

La acción Asignar responsable requiere seleccionar un usuario válido de la
empresa.

Datara valida que el usuario utilizado en la acción pertenezca a la misma
empresa.

ACTUALIZAR CAMPO

Actualizar campo permite modificar un campo del registro utilizando el
valor configurado en la acción.

CAMBIAR ESTADO

Cambiar estado permite asignar un nuevo estado al registro cuando se
ejecuta la automatización.

CREAR ACTIVIDAD

La acción Crear actividad puede definir:

- Tipo de actividad.
- Asunto.
- Descripción.
- Prioridad.
- Vencimiento.
- Responsable.

El Tipo de actividad y el Asunto son obligatorios.

El vencimiento opcional se expresa en minutos y no puede superar 525600
minutos.

CREAR NOTIFICACIÓN

La acción Crear notificación requiere:

- Título.
- Mensaje.

También puede definirse un destinatario específico.

ENVIAR CORREO

La acción Enviar correo puede dirigir el mensaje a:

- El correo del registro.
- El cliente relacionado.
- El responsable.
- Un correo fijo.

Cuando se utiliza un correo fijo, debe capturarse una dirección válida.

La acción puede configurar:

- Destinatario.
- Asunto.
- Mensaje.
- Correo de respuesta.

El Asunto y el Mensaje son obligatorios.

PROGRAMACIÓN DE ACCIONES

Las acciones pueden ejecutarse:

- Inmediatamente.
- Con retraso.

El retraso puede expresarse en:

- Minutos.
- Horas.
- Días.
- Meses.

El retraso debe ser un número entero mayor que cero.

Los máximos permitidos son:

- 5256000 minutos.
- 87600 horas.
- 3650 días.
- 120 meses.

La programación puede calcularse a partir del momento del evento o de un
campo de fecha válido del registro.

ACTIVAR O DESACTIVAR UNA AUTOMATIZACIÓN

Una automatización puede estar Activa o Inactiva.

Desactivarla evita nuevas ejecuciones de la regla sin necesidad de
eliminarla.

EDITAR UNA AUTOMATIZACIÓN

Una regla existente puede modificarse para cambiar:

- Nombre.
- Descripción.
- Sucursal.
- Entidad.
- Disparador.
- Condiciones.
- Acciones.
- Estado Activo o Inactivo.
- Comportamiento ante errores.

ELIMINAR UNA AUTOMATIZACIÓN

La interfaz permite eliminar una automatización.

Al eliminarla, también se cancelan sus trabajos pendientes.

La eliminación pide confirmación antes de continuar.

HISTORIAL

Automatizaciones incluye un historial de ejecuciones.

El historial permite revisar información como:

- Regla ejecutada.
- Disparador.
- Resultados de las acciones.
- Estado de ejecución.

La interfaz también puede mostrar la próxima acción programada de una
regla cuando existen trabajos pendientes.

IMPORTANTE

Una automatización no debe considerarse una sustitución de permisos.

Las acciones se ejecutan dentro de las reglas y validaciones disponibles
en Datara.

No deben configurarse automatizaciones con usuarios, correos o campos que
no correspondan a la empresa o al registro esperado.
      `.trim(),
    },
    {
      id:
        "inventory-module",

      title:
        "Uso del módulo Inventarios",

      keywords: [
        "ver inventario",
        "consultar inventario",
        "existencias",
        "ver existencias",
        "stock disponible",
        "inventario disponible",
        "stock bajo",
        "stock agotado",
        "cantidad reservada",
        "cantidad disponible",
        "valor del inventario",
        "costo promedio",
        "costo unitario",
        "reservar inventario",
        "reserva de inventario",
        "reservas de inventario",
        "reserva manual",
        "reserva oportunidad",
        "liberar reserva",
        "cancelar reserva",
        "extender reserva",
        "reactivar reserva",
        "reserva vencida",
        "confirmar entrega",
        "entregar reserva",
        "movimiento de inventario",
        "entrada inventario",
        "salida inventario",
        "ajuste inventario",
        "kardex",
        "transferencia de inventario",
        "ubicacion de inventario",
        "bodega",
        "conteo de inventario",
        "conteo fisico",
        "auditoria inventario",
        "reabastecimiento",
        "reposicion",
        "solicitud de reposicion",
        "recibir reposicion",
        "recepcion parcial",
        "recepcion completa",
        "inventario insuficiente",
        "inventario reservado",
        "inventario por sucursal",
        "punto de reorden",
        "existencia minima",
        "existencia maxima",
      ],

      matchTerms: [
        "inventario",
        "inventarios",
        "existencia",
        "existencias",
        "stock",
        "reserva",
        "reservas",
        "movimiento",
        "movimientos",
        "kardex",
        "transferencia",
        "transferencias",
        "ubicacion",
        "ubicaciones",
        "bodega",
        "bodegas",
        "conteo",
        "conteos",
        "auditoria",
        "reabastecimiento",
        "reposicion",
        "reposiciones",
        "recepcion",
        "recibir",
      ],

      content: `
MÓDULO INVENTARIOS

Ruta: Inventarios (/crm/inventarios).

FINALIDAD DEL MÓDULO

Inventarios administra las existencias físicas de los elementos del
Catálogo cuyo tipo tiene habilitado el control de inventario.

Catálogo e Inventarios no son lo mismo:

- Catálogo define los productos, modelos, servicios o elementos que maneja
  la empresa.
- Inventarios controla las existencias físicas de los elementos que
  administran inventario.
- Inventarios también administra ubicaciones, reservas, movimientos,
  transferencias, reposición, conteos físicos y auditoría.

Un elemento puede existir correctamente en Catálogo y no aparecer como
inventariable si su Tipo de elemento no tiene habilitado el control de
inventario.

VISTAS PRINCIPALES

El módulo cuenta con diferentes vistas operativas:

- Existencias.
- Kardex.
- Reservas.
- Reposición.
- Conteos físicos.
- Auditoría, cuando el usuario cuenta con permisos de gestión.

EXISTENCIAS

La vista Existencias muestra el inventario por producto y permite revisar
su distribución por ubicación.

Entre la información disponible pueden encontrarse:

- Producto o modelo.
- Código.
- Tipo de producto.
- Categoría.
- Existencia física.
- Cantidad reservada.
- Cantidad disponible.
- Número de ubicaciones.
- Existencia mínima.
- Existencia máxima.
- Punto de reorden.
- Posición física.
- Estado del inventario.
- Valor comercial.
- Valor de inventario a costo, cuando el usuario tiene permiso para
  consultar costos.

La disponibilidad se calcula considerando:

Existencia física - Cantidad reservada.

Por ello, la existencia física no necesariamente representa la cantidad
que puede utilizarse para una nueva operación.

ESTADOS DE EXISTENCIA

Datara puede mostrar los siguientes estados:

- Disponible.
- Bajo.
- Agotado.
- Sin inicializar.

Sin inicializar significa que el producto controla inventario pero todavía
no tiene una existencia creada para esa ubicación.

Stock Bajo se determina utilizando los niveles configurados para la
existencia.

RESUMEN DEL INVENTARIO

La parte superior del módulo puede mostrar indicadores como:

- Existencia total.
- Unidades disponibles.
- Unidades reservadas.
- Valor del inventario.
- Alertas de stock bajo.
- Productos agotados.

El valor a costo solo se muestra a usuarios con los permisos
correspondientes.

INVENTARIO POR SUCURSAL Y UBICACIÓN

Las existencias se administran por ubicación física.

Una ubicación puede estar relacionada con:

- Una sucursal.
- Una bodega independiente.

Un mismo producto puede tener existencias en distintas ubicaciones.

Cuando una operación comercial utiliza inventario, revisa siempre la
ubicación concreta donde se encuentran las unidades.

UBICACIONES Y BODEGAS

Desde Administrar ubicaciones, los usuarios con permiso pueden crear y
editar ubicaciones de inventario.

Una ubicación puede guardar:

- Nombre.
- Código.
- Tipo.
- Sucursal relacionada.
- Estado activa o inactiva.
- Si es ubicación predeterminada.
- Dirección.
- Ciudad.
- Estado.
- Código postal.
- País.

Los tipos disponibles pueden incluir:

- Bodega.
- Sucursal.
- Patio.
- Taller.
- Tránsito.

Una ubicación puede quedar sin sucursal cuando funciona como bodega
independiente.

Desactivar una ubicación conserva su historial y sus existencias, pero
impide utilizarla normalmente para nuevas operaciones.

CONFIGURAR NIVELES DE INVENTARIO

En una existencia inicializada pueden configurarse:

- Existencia mínima.
- Existencia máxima.
- Punto de reorden.
- Posición física.

Estos valores sirven para control operativo y alertas.

Modificar estos parámetros no cambia por sí mismo la cantidad física
existente.

La existencia máxima no puede ser menor que la mínima.

El punto de reorden no puede superar la existencia máxima cuando esta se
encuentra configurada.

REGISTRAR MOVIMIENTOS

La acción Registrar movimiento permite capturar movimientos manuales.

Los tipos principales son:

- Entrada.
- Salida.
- Ajuste.

Una Entrada aumenta la existencia.

Una Salida disminuye la existencia.

Un Ajuste establece la existencia final deseada.

El movimiento puede almacenar:

- Sucursal.
- Ubicación.
- Producto.
- Cantidad.
- Costo unitario en entradas, según permisos.
- Motivo.
- Referencia.
- Usuario.
- Fecha y hora.

Datara registra también:

- Existencia anterior.
- Existencia resultante.
- Costo del movimiento.
- Costo promedio resultante.

SALIDAS Y RESERVAS

Datara no permite que una salida deje la existencia física por debajo de
las unidades que continúan reservadas.

Por ejemplo, si existen 10 unidades físicas y 4 están reservadas, una salida
manual no puede dejar menos de 4 unidades físicas.

AJUSTES

Un Ajuste captura la existencia final, no la diferencia.

Ejemplo:

Existencia actual: 10.
Existencia física encontrada: 8.

El Ajuste debe capturarse como 8.

Datara calcula internamente la diferencia del movimiento.

No se permite un ajuste que deje la existencia por debajo de las cantidades
reservadas.

COSTOS DE INVENTARIO

Las entradas pueden capturar costo unitario cuando el usuario tiene los
permisos necesarios.

Datara utiliza esos costos para mantener un costo promedio de inventario.

El valor contable del inventario se obtiene utilizando el costo promedio.

Los usuarios sin permiso para consultar costos no deben ver esta
información.

KARDEX

La vista Kardex muestra el historial de movimientos.

Puede incluir:

- Fecha.
- Tipo de movimiento.
- Producto.
- Ubicación.
- Sucursal.
- Cantidad.
- Existencia anterior.
- Existencia resultante.
- Motivo.
- Referencia.
- Usuario que realizó la operación.

Las entregas de productos reservados también generan movimientos de
inventario.

TRANSFERENCIAS

Transferir inventario mueve existencias de una ubicación de origen hacia
una ubicación de destino.

La transferencia requiere:

- Ubicación de origen.
- Ubicación de destino.
- Producto.
- Cantidad.
- Motivo.
- Referencia opcional.

Datara valida que:

- Origen y destino sean diferentes.
- Exista inventario en el origen.
- La cantidad sea válida.
- La cantidad no supere las unidades disponibles.

Las unidades reservadas no se consideran transferibles.

La transferencia registra una salida en el origen y una entrada en el
destino conservando trazabilidad.

RESERVAS DE INVENTARIO

Una reserva separa unidades disponibles para una operación sin descontarlas
todavía de la existencia física.

Cuando se crea una reserva:

- La existencia física no cambia.
- Aumenta la cantidad reservada.
- Disminuye la cantidad disponible.

Una reserva puede ser:

- Manual.
- Relacionada con una oportunidad.

ESTADOS DE LAS RESERVAS

Las reservas pueden encontrarse en estados como:

- Activa.
- Liberada.
- Cancelada.
- Consumida.
- Vencida.

Una reserva Activa continúa comprometiendo inventario.

Una reserva Consumida representa una entrega confirmada.

CREAR UNA RESERVA MANUAL

Desde Inventarios puede utilizarse Reservar inventario.

Para una reserva manual se seleccionan:

- Ubicación.
- Producto.
- Cantidad.
- Referencia.
- Cliente.
- Fecha y hora de vencimiento.
- Notas.

Datara valida que exista disponibilidad suficiente.

RESERVAR PARA UNA OPORTUNIDAD

Las oportunidades pueden reservar uno o varios productos desde Inventarios.

La reserva toma como origen la oportunidad.

Datara puede utilizar la etapa de la oportunidad para calcular el plazo
inicial de la reserva.

Las oportunidades en etapas tempranas como Prospecto o Contactado no deben
reservar inventario.

Al seleccionar una oportunidad, Datara puede preparar automáticamente sus
productos y cantidades para crear las reservas.

Cada producto puede reservarse desde una ubicación diferente.

La reserva no puede superar la disponibilidad de la ubicación seleccionada.

PLAZOS DE RESERVA

Datara permite configurar tiempos distintos para reservas según el contexto
comercial.

Pueden existir parámetros para:

- Reserva manual.
- Oportunidad calificada.
- Propuesta o cotización.
- Negociación.
- Anticipo.
- Plazo máximo.

Estas opciones se administran desde:

Configuración > Reservas.

VENCIMIENTO AUTOMÁTICO

Si la liberación automática está habilitada, Datara identifica reservas
activas cuya fecha de vencimiento ya pasó.

Esas reservas pasan a:

Vencida.

También:

- Se reduce la cantidad reservada del stock.
- Las unidades vuelven a estar disponibles.
- Se registra el vencimiento automático.

EXTENDER UNA RESERVA

Cuando la política de reservas permite extensiones, una reserva Activa puede
extenderse.

La nueva fecha:

- Debe estar en el futuro.
- Debe ser posterior al vencimiento actual.
- Debe respetar el plazo máximo configurado desde la creación de la
  reserva.

Datara conserva historial de las extensiones.

También pueden extenderse conjuntamente las reservas activas relacionadas
con una misma oportunidad.

LIBERAR UNA RESERVA

Liberar una reserva:

- Cambia su estado a Liberada.
- Reduce la cantidad reservada.
- Devuelve las unidades a disponibilidad.
- No disminuye la existencia física.
- Conserva usuario, fecha y motivo.

CANCELAR UNA RESERVA

Cancelar una reserva:

- Cambia su estado a Cancelada.
- Reduce la cantidad reservada.
- Devuelve las unidades a disponibilidad.
- Conserva el historial de la operación.

CONFIRMAR ENTREGA

Confirmar entrega consume una reserva.

Al hacerlo:

- La reserva cambia a Consumida.
- Disminuye la existencia física.
- Disminuye la cantidad reservada.
- Se registra una Salida reservada en el Kardex.
- Se conserva usuario, fecha, motivo y referencia.

Una misma reserva no puede entregarse dos veces.

ENTREGA DE VARIOS PRODUCTOS

Cuando varias reservas pertenecen a la misma oportunidad, Datara permite
realizar acciones sobre el grupo.

Entre ellas pueden encontrarse:

- Entregar.
- Liberar.
- Cancelar.
- Extender.

Confirmar la entrega del grupo consume las reservas activas correspondientes
y genera los movimientos de salida necesarios.

MARCAR UNA OPORTUNIDAD COMO GANADA

Una oportunidad que utiliza inventario no puede marcarse como Ganada sin
reservas activas suficientes.

Datara compara los productos y cantidades requeridos con las reservas
activas de la oportunidad.

Después de marcarla como Ganada, las reservas permanecen activas.

La interfaz puede mostrar:

Revisar reservas y confirmar entrega.

Este botón dirige a Inventarios mostrando las reservas relacionadas con la
oportunidad.

MARCAR UNA OPORTUNIDAD COMO PERDIDA O CANCELADA

Cuando una oportunidad cambia a Perdida o Cancelada, Datara libera sus
reservas activas.

Las cantidades vuelven a disponibilidad.

Las reservas pasan a Liberada y se conserva el motivo asociado con el cierre
de la oportunidad.

REACTIVAR RESERVAS DE UNA OPORTUNIDAD

Si una oportunidad Ganada tiene reservas previamente:

- Liberadas.
- Canceladas.
- Vencidas.

Datara puede permitir reactivarlas desde Inventarios.

Para reactivarlas:

- La oportunidad debe estar Ganada.
- No debe tener ya reservas activas.
- Debe existir disponibilidad suficiente para todas las reservas.
- El usuario debe tener acceso a las ubicaciones correspondientes.

Cuando se reactivan:

- Las reservas vuelven a Activa.
- Aumenta nuevamente la cantidad reservada.
- Se establece una nueva fecha de vencimiento.

CONTEOS FÍSICOS

La vista Conteos físicos permite comparar las cantidades registradas en
Datara contra las existencias encontradas físicamente.

Un conteo puede encontrarse en estados:

- Borrador.
- En revisión.
- Aprobado.
- Cancelado.

CREAR UN CONTEO

Para iniciar un conteo:

1. Entra a Inventarios.
2. Selecciona Conteos físicos.
3. Selecciona Nuevo conteo.
4. Elige una ubicación.
5. Agrega notas si son necesarias.
6. Inicia el conteo.

Datara carga los productos inicializados en esa ubicación.

CAPTURAR EL CONTEO

Para cada producto se captura la cantidad física encontrada.

También pueden agregarse notas.

Si durante el conteo aparece físicamente un producto que no estaba incluido
en la ubicación, puede utilizarse:

Agregar modelo encontrado.

ENVIAR A REVISIÓN

Después de capturar las cantidades, el conteo puede enviarse a revisión.

APROBAR UN CONTEO

Aprobar un conteo aplica las diferencias encontradas.

Las diferencias modifican las existencias y generan movimientos en el
Kardex.

Por ello, una aprobación debe utilizarse únicamente después de validar las
cantidades físicas capturadas.

CANCELAR UN CONTEO

Un conteo puede cancelarse sin aplicar las diferencias.

Datara conserva su historial y motivo de cancelación.

AUDITORÍA DE INVENTARIO

Los usuarios con permiso de gestión pueden consultar Auditoría.

La auditoría registra operaciones importantes realizadas sobre Inventarios.

Puede mostrar:

- Fecha.
- Tipo de registro.
- Acción.
- Descripción.
- Ubicación.
- Producto.
- Usuario.
- Valores anteriores.
- Valores posteriores.
- Motivo.

Entre las operaciones auditables se encuentran cambios relacionados con:

- Movimientos.
- Reservas.
- Configuración de existencias.
- Transferencias.
- Conteos.
- Ubicaciones.
- Reposición.

La comparación Antes y Después permite identificar qué valores fueron
modificados.

REPOSICIÓN

La vista Reposición identifica existencias que alcanzaron su punto de
reorden o su existencia mínima.

Datara puede calcular una compra sugerida.

El cálculo utiliza:

- Disponibilidad actual.
- Punto de reorden o existencia mínima.
- Existencia máxima como objetivo.

Si no existe una existencia máxima configurada, Datara puede solicitar que
se configure antes de determinar una cantidad sugerida.

SOLICITUDES DE REPOSICIÓN

Desde una sugerencia puede generarse una solicitud de reposición.

La solicitud registra:

- Referencia.
- Fecha.
- Sucursal o destino.
- Partidas.
- Cantidades solicitadas.
- Estado.
- Información de integración.
- Costo estimado cuando el usuario tiene permiso.
- Usuario que realizó la solicitud.

Las referencias internas utilizan un identificador REP.

Datara evita generar más de una solicitud abierta para la misma existencia
desde las sugerencias.

REPOSICIÓN E INTEGRACIONES

Una solicitud de reposición puede almacenar información para integraciones
externas, como:

- Sistema externo.
- Identificador externo.
- Referencia externa.
- Estado de sincronización.
- Error de sincronización.

Por ello, la solicitud de reposición funciona también como punto de
integración futura con un ERP o sistema de compras.

GENERAR UNA SOLICITUD NO AUMENTA INVENTARIO

Crear una solicitud de reposición no representa una recepción física.

Al generarla:

- No aumenta la existencia.
- No crea una Entrada en el Kardex.
- Solo registra la necesidad o solicitud de reposición.

RECIBIR UNA SOLICITUD DE REPOSICIÓN

Las solicitudes de reposición pueden registrar recepción física.

En cada partida se controla:

- Cantidad solicitada.
- Cantidad recibida.
- Cantidad pendiente.
- Costo unitario.
- Costo total.

Datara valida que una recepción no supere la cantidad pendiente.

RECEPCIÓN PARCIAL

Una solicitud puede recibirse parcialmente.

Ejemplo:

Solicitado: 10 unidades.
Recibido anteriormente: 0.
Recepción actual: 4.

Después de registrar la recepción:

- La existencia aumenta 4 unidades.
- Se registra una Entrada en el Kardex.
- La partida registra 4 unidades recibidas.
- Quedan 6 pendientes.
- La solicitud queda en estado Recibida parcialmente.

Posteriormente pueden recibirse las unidades restantes.

RECEPCIÓN COMPLETA

Cuando todas las partidas alcanzan su cantidad solicitada, la solicitud
cambia a:

Recibida.

También se registra la fecha de recepción.

EFECTO DE LA RECEPCIÓN SOBRE INVENTARIO

Cada cantidad recibida:

- Aumenta la existencia física.
- Genera una Entrada en el Kardex.
- Registra costo unitario.
- Actualiza el último costo.
- Recalcula el costo promedio del inventario.
- Registra la cantidad recibida en la solicitud.
- Genera trazabilidad de auditoría.

Por lo tanto, la entrada física proveniente de una reposición debe
registrarse mediante su recepción y no creando manualmente otra entrada por
las mismas unidades.

COSTO EN RECEPCIONES

El usuario puede capturar el costo unitario recibido.

Si no se proporciona un nuevo costo, Datara puede utilizar información de
costo ya registrada para la partida o la existencia.

El costo recibido participa en el nuevo costo promedio del stock.

PROBLEMAS AL RECIBIR UNA REPOSICIÓN

Si Datara no permite registrar una recepción, revisa:

- Que la solicitud exista.
- Que no esté Cancelada.
- Que no esté completamente Recibida.
- Que el usuario tenga acceso a la sucursal.
- Que las partidas pertenezcan a la solicitud.
- Que la cantidad recibida no supere la pendiente.
- Que los costos capturados sean válidos.

INVENTARIO INSUFICIENTE

Cuando Datara indique que no existe inventario suficiente:

1. Revisa el producto involucrado.
2. Verifica la sucursal.
3. Verifica la ubicación.
4. Revisa la existencia física.
5. Revisa la cantidad reservada.
6. Revisa la cantidad disponible.
7. Confirma si existen otras reservas activas.
8. Corrige la operación o el inventario antes de continuar.

Nunca asumas que toda la existencia física se encuentra disponible.

PERMISOS

Las acciones disponibles dependen de los permisos del usuario.

Según el nivel de acceso, un usuario puede:

- Consultar inventario.
- Registrar movimientos.
- Reservar inventario.
- Modificar reservas.
- Transferir existencias.
- Configurar niveles.
- Gestionar ubicaciones.
- Crear solicitudes de reposición.
- Consultar costos.
- Consultar auditoría.

Si una acción no aparece, revisa primero los permisos del usuario.

ACCESO POR SUCURSAL

Datara también limita Inventarios según las sucursales que el usuario puede
consultar.

Una persona puede tener permiso sobre el módulo y aun así no poder operar
una ubicación perteneciente a otra sucursal.

Las bodegas independientes requieren acceso compatible con la configuración
del usuario.

RELACIÓN CON CATÁLOGO

Para administrar existencias de un elemento, primero debe existir en
Catálogo.

Además, su Tipo de elemento debe administrar inventario.

Si necesitas crear un nuevo producto, modelo o elemento comercial, utiliza
Catálogo.

Inventarios se utiliza después para administrar sus existencias físicas.

RELACIÓN CON OPORTUNIDADES

Oportunidades utiliza Inventarios para reservar productos durante el proceso
comercial.

Las reservas se conservan mientras la oportunidad continúe requiriendo esas
unidades.

Una oportunidad Ganada conserva sus reservas hasta que la entrega sea
confirmada.

Una oportunidad Perdida o Cancelada libera sus reservas activas.

RELACIÓN CON ÓRDENES DE VENTA

Cuando una orden utiliza reservas provenientes de una oportunidad, la
confirmación de entrega puede consumir esas reservas y registrar las salidas
correspondientes.

No confundas:

- Confirmar una orden.
- Confirmar la entrega física.

Confirmar la orden no descuenta por sí solo inventario.

CONFIGURACIÓN DE RESERVAS

Los parámetros administrativos relacionados con reservas se encuentran en:

Configuración > Reservas.

Pueden controlar:

- Plazo de reserva manual.
- Plazo de oportunidad calificada.
- Plazo de propuesta.
- Plazo de negociación.
- Plazo con anticipo.
- Plazo máximo.
- Si se permiten extensiones.
- Si se liberan automáticamente reservas vencidas.

No modifiques estos parámetros sin conocer su efecto operativo.

HISTORIAL Y TRAZABILIDAD

Inventarios conserva trazabilidad mediante:

- Kardex.
- Reservas.
- Conteos.
- Solicitudes de reposición.
- Auditoría.

Cuando exista una diferencia, evita corregirla directamente sin identificar
antes qué operación la generó.

Revisa primero si el cambio provino de:

- Entrada.
- Salida.
- Ajuste.
- Reserva.
- Entrega.
- Transferencia.
- Conteo físico.
- Reposición.

Esto permite corregir el proceso sin perder el historial operativo.
      `.trim(),
    },
    {
      id:
        "quotes-module",

      title:
        "Uso del módulo Cotizaciones",

      keywords: [
        "nueva cotizacion",
        "crear cotizacion",
        "registrar cotizacion",
        "hacer cotizacion",
        "generar cotizacion",
        "editar cotizacion",
        "buscar cotizacion",
        "filtrar cotizaciones",
        "cotizacion para cliente",
        "cotizacion para prospecto",
        "cotizacion desde oportunidad",
        "agregar producto a cotizacion",
        "quitar producto de cotizacion",
        "descuento en cotizacion",
        "promocion en cotizacion",
        "enviar cotizacion",
        "mandar cotizacion",
        "pdf de cotizacion",
        "descargar cotizacion",
        "estado de cotizacion",
        "vigencia de cotizacion",
        "cotizacion vencida",
        "aceptar cotizacion",
        "rechazar cotizacion",
        "eliminar cotizacion",
        "columnas de cotizaciones",
      ],

      matchTerms: [
        "cotizacion",
        "cotizaciones",
        "quote",
        "quotes",
        "cotizar",
        "cotizo",
      ],

      content: `
MÓDULO COTIZACIONES

Ruta: Cotizaciones (/crm/cotizaciones).

El nombre visible del módulo puede ser personalizado por la empresa. La
ruta interna permanece en /crm/cotizaciones.

FINALIDAD DEL MÓDULO

Cotizaciones permite crear y administrar propuestas económicas para
clientes o prospectos.

Una cotización puede incluir productos o servicios, promociones,
condiciones de pago, impuestos, vigencia, direcciones y condiciones
comerciales.

También puede relacionarse con una oportunidad existente.

CREAR UNA COTIZACIÓN

1. En el menú del CRM, entra a Cotizaciones.
2. Selecciona Nueva cotización.
3. Captura el Asunto.
4. Selecciona la Sucursal.
5. Selecciona el Responsable.
6. Selecciona un Cliente o un Prospecto.
7. Opcionalmente selecciona una Oportunidad relacionada.
8. Define la vigencia.
9. Agrega los productos o servicios de la cotización.
10. Configura forma de pago, promociones, impuestos y condiciones
    financieras cuando correspondan.
11. Opcionalmente captura direcciones y condiciones comerciales.
12. Revisa el resumen de importes.
13. Selecciona Crear cotización.

Para guardar una cotización son obligatorios:

- Asunto.
- Sucursal.
- Cliente o Prospecto.
- Responsable.
- Fecha de vigencia.
- Producto en cada partida.
- Cantidad mayor que cero en cada partida.

CLIENTE Y PROSPECTO

Una cotización debe estar relacionada al menos con un Cliente o un
Prospecto.

Cliente y Prospecto son opciones mutuamente excluyentes. Al seleccionar
un Cliente se limpia el Prospecto seleccionado y al seleccionar un
Prospecto se limpia el Cliente.

OPORTUNIDAD RELACIONADA

La cotización puede relacionarse opcionalmente con una Oportunidad.

Al seleccionar una oportunidad, Datara puede utilizar la información
comercial disponible en esa oportunidad para preparar la cotización.

Puede traer:

- Cliente o Prospecto relacionado.
- Nombre de la oportunidad como Asunto cuando el asunto esté vacío.
- Productos.
- Cantidades.
- Precios.
- Forma de pago.
- Enganche.
- Plazo de financiamiento.
- Promociones relacionadas con las partidas.

Si después de seleccionar una oportunidad se cambia manualmente el Cliente
o el Prospecto, Datara elimina la relación con esa oportunidad y reinicia
las partidas de la cotización.

ESTADOS DE LA COTIZACIÓN

Los estados disponibles son:

- Borrador.
- Enviada.
- Aceptada.
- Rechazada.
- Vencida.
- Convertida.
- Cancelada.

Una cotización nueva inicia en estado Borrador.

El estado puede modificarse al editar la cotización.

VIGENCIA

La cotización permite seleccionar una vigencia de:

- 7 días.
- 15 días.
- 30 días.
- 60 días.
- Fecha personalizada.

La vigencia predeterminada de una cotización nueva es de 15 días.

Si una promoción seleccionada termina antes que la fecha de vigencia de
la cotización, Datara limita automáticamente la vigencia a la fecha de
finalización de esa promoción.

PRODUCTOS Y SERVICIOS

La sección Productos y servicios contiene las partidas incluidas en la
cotización.

Cada partida permite configurar:

- Producto.
- Cantidad.
- Precio unitario.
- Forma de pago.
- Impuesto.
- Promociones disponibles.
- Plazo de financiamiento cuando corresponda.
- Enganche del cliente cuando corresponda.

Siempre debe existir al menos una partida.

Utiliza + Agregar partida para incluir productos adicionales.

La última partida no puede quitarse; debe existir al menos una partida en
la cotización.

PRECIO UNITARIO

El Precio unitario se obtiene del producto seleccionado y se muestra como
un campo de solo lectura.

No se captura manualmente desde la cotización.

Si el precio debe modificarse, revisa la información comercial del
producto correspondiente en Catálogo.

FORMA DE PAGO

Las opciones disponibles son:

- Por definir.
- Contado.
- Financiamiento.

Una promoción seleccionada también puede establecer automáticamente la
forma de pago correspondiente.

PROMOCIONES

Al seleccionar un producto, Datara consulta las promociones compatibles
con esa partida.

La elegibilidad puede depender de información como:

- Producto.
- Tipo de cliente.
- Canal de adquisición de la oportunidad relacionada.
- Forma de pago.
- Reglas configuradas en la promoción.

Las promociones compatibles aparecen en la sección Promociones
disponibles de cada partida.

Algunas promociones pueden ser excluyentes entre sí cuando pertenecen al
mismo grupo o requieren una selección específica.

Datara también evita conservar promociones con formas de pago
incompatibles entre sí.

Si una promoción deja de ser elegible, se elimina de la selección de la
partida.

FINANCIAMIENTO

Cuando una partida utiliza Financiamiento, puede configurarse:

- Plazo de financiamiento.
- Enganche del cliente.

Las promociones seleccionadas pueden limitar los plazos disponibles.

Cuando no existe una restricción de meses proveniente de promociones, el
formulario puede ofrecer:

- 6 meses.
- 12 meses.
- 18 meses.
- 24 meses.
- 36 meses.
- 48 meses.
- 60 meses.

Datara calcula el saldo a financiar y una mensualidad estimada según las
condiciones de la partida.

La mensualidad mostrada es un cálculo dentro de la cotización y depende de
los datos comerciales capturados.

IMPUESTOS

Cada partida permite capturar una tasa de Impuesto en porcentaje.

Datara calcula automáticamente el importe del impuesto correspondiente
para esa partida.

CÁLCULOS DE LA COTIZACIÓN

Datara calcula automáticamente los importes de las partidas y el resumen
general.

El resumen puede mostrar:

- Subtotal.
- Descuentos.
- Impuestos.
- Ajuste.
- Total.

También muestra las condiciones de pago de cada partida.

Cuando existe financiamiento puede mostrar:

- Total de la partida.
- Plazo.
- Enganche.
- Saldo a financiar.
- Mensualidad estimada.

El Precio unitario y los descuentos provenientes de promociones forman
parte de estos cálculos.

AJUSTE

El resumen de la cotización incluye un campo Ajuste.

El ajuste se incorpora al cálculo general junto con subtotal, descuentos
e impuestos.

DIRECCIÓN DE FACTURACIÓN Y ENVÍO

La cotización puede almacenar una Dirección de facturación y una
Dirección de envío.

Los campos disponibles incluyen información como:

- País.
- Estado.
- Ciudad.
- Código postal.
- Calle y número.

La opción Usar la dirección de facturación para envío permite utilizar la
misma información para ambas direcciones.

Si se desactiva, puede capturarse una Dirección de envío independiente.

CONDICIONES COMERCIALES

La cotización permite capturar información adicional en:

- Resumen comercial.
- Términos y condiciones.
- Descripción interna.

Estos campos son opcionales.

BUSCAR Y FILTRAR COTIZACIONES

El buscador permite localizar cotizaciones utilizando información como:

- Número o folio de cotización.
- Asunto.
- Cliente o relación.
- Estado.
- Responsable.

También existe un filtro específico por Estado.

VER UNA COTIZACIÓN

1. Entra a Cotizaciones.
2. Busca la cotización.
3. Selecciona Ver o selecciona su Asunto.

El detalle muestra información como:

- Número de cotización.
- Estado.
- Sucursal.
- Relación.
- Vigencia.
- Responsable.
- Partidas.
- Promociones aplicadas.
- Condiciones de pago.
- Subtotal.
- Descuentos.
- Impuestos.
- Ajuste.
- Total.
- Condiciones comerciales.

EDITAR UNA COTIZACIÓN

Si tu usuario cuenta con permiso de edición:

1. Busca la cotización.
2. Selecciona Editar.
3. Modifica los datos necesarios.
4. Revisa nuevamente productos, promociones y cálculos.
5. Selecciona Guardar cambios.

DESCARGAR PDF

Las cotizaciones pueden descargarse en formato PDF.

1. Busca o abre la cotización.
2. Selecciona Descargar PDF.

La opción está disponible tanto desde la tabla como desde el detalle de la
cotización.

ENVIAR UNA COTIZACIÓN POR CORREO

Si tu usuario cuenta con permiso de edición:

1. Busca o abre la cotización.
2. Selecciona Enviar o Enviar por correo.
3. Revisa el correo electrónico del destinatario.
4. Modifícalo si es necesario.
5. Confirma el envío.

Si el envío se completa correctamente, Datara actualiza la cotización a
estado Enviada y registra la fecha de envío.

Si no existe un correo válido, debes capturarlo antes de confirmar.

PERMISOS

La disponibilidad de acciones depende de los permisos asignados al
usuario.

Por ejemplo:

- Nueva cotización requiere permiso para crear.
- Editar requiere permiso de edición.
- Enviar por correo requiere permiso de edición.

Si una acción no aparece, revisa tus permisos con un administrador de la
empresa.
      `.trim(),
    },
    {
      id:
        "sales-orders-module",

      title:
        "Uso del módulo Órdenes de venta",

      keywords: [
        "nueva orden de venta",
        "crear orden de venta",
        "generar orden de venta",
        "crear orden",
        "generar orden",
        "orden desde oportunidad",
        "orden desde cotizacion",
        "oportunidad a orden",
        "cotizacion a orden",
        "confirmar orden",
        "confirmar orden de venta",
        "entregar orden",
        "confirmar entrega",
        "cancelar orden",
        "cancelar orden de venta",
        "estado de orden",
        "estado de orden de venta",
        "orden borrador",
        "orden confirmada",
        "orden entregada",
        "orden cancelada",
        "historial de orden",
        "trazabilidad de orden",
        "orden no aparece",
        "no puedo generar orden",
        "no puedo entregar orden",
        "reserva para orden",
        "inventario de orden",
        "venta entregada",
      ],

      matchTerms: [
        "orden",
        "ordenes",
        "venta",
        "ventas",
        "sales",
        "order",
        "orders",
        "entrega",
        "entregada",
        "confirmada",
      ],

      content: `
MÓDULO ÓRDENES DE VENTA

Ruta: Órdenes de venta (/crm/ordenes-de-venta).

FINALIDAD DEL MÓDULO

Órdenes de venta administra la etapa operativa de una venta después de
que una oportunidad ha sido ganada o una cotización ha sido aceptada.

Una orden conserva información comercial de la operación de origen y
permite darle seguimiento hasta su entrega o cancelación.

ESTADOS DE UNA ORDEN

Los estados disponibles son:

- Borrador.
- Confirmada.
- Entregada.
- Cancelada.

El flujo normal es:

Borrador -> Confirmada -> Entregada.

Una orden en Borrador o Confirmada también puede ser Cancelada cuando el
usuario cuenta con los permisos correspondientes.

CREAR UNA ORDEN DE VENTA

1. En el menú del CRM, entra a Órdenes de venta.
2. Selecciona Nueva orden.
3. En Operación de origen, selecciona una operación disponible.
4. Opcionalmente captura Notas internas.
5. Selecciona Generar orden.

Una orden debe generarse desde exactamente uno de estos orígenes:

- Una Oportunidad ganada.
- Una Cotización aceptada.

No es posible generar una orden seleccionando simultáneamente una oportunidad
y una cotización como orígenes independientes.

Tampoco se crea una orden capturando manualmente todos sus productos e importes
desde cero. Datara toma una fotografía de la información comercial de la
operación de origen.

ESTADO INICIAL

Toda nueva orden de venta se crea en estado:

Borrador.

Datara genera automáticamente una referencia para la orden.

QUÉ INFORMACIÓN CONSERVA LA ORDEN

Al generar la orden, Datara conserva información de la operación de origen,
incluyendo cuando esté disponible:

- Cliente.
- Sucursal.
- Responsable.
- Moneda.
- Subtotal.
- Descuentos.
- Total.
- Forma de pago.
- Partidas.
- Productos.
- Cantidades.
- Precios.
- Descuentos por partida.
- Notas internas.
- Oportunidad de origen.
- Cotización de origen.

Las partidas son copiadas desde la operación de origen y forman parte del
historial operativo de la orden.

REQUISITOS GENERALES DEL ORIGEN

Antes de crear la orden, Datara valida que:

- La operación exista.
- El usuario tenga acceso a su sucursal.
- La operación tenga un cliente válido.
- Exista al menos una partida.
- Las cantidades de las partidas sean enteros mayores que cero.
- El mismo origen no haya generado previamente otra orden de venta.

OPORTUNIDAD COMO ORIGEN

Para generar una orden directamente desde una oportunidad:

- La oportunidad debe estar en estado Ganada.
- Debe tener un cliente.
- Debe contener al menos una partida válida.
- El usuario debe tener acceso a la sucursal de la oportunidad.

Cuando la oportunidad tiene inventario relacionado, Datara verifica las
reservas asociadas a esa oportunidad.

Debe existir al menos una reserva y las reservas encontradas deben continuar
en estado Activa.

Si alguna reserva ya fue entregada, consumida, liberada, cancelada, vencida o
procesada de otra forma, Datara bloquea la creación de una nueva orden para
evitar procesar nuevamente el inventario.

COTIZACIÓN COMO ORIGEN

Una cotización puede generar una orden cuando Datara la reconoce como aceptada.

Esto ocurre cuando:

- Su estado es Aceptada, o
- Existe una fecha de aceptación registrada.

La cotización también debe tener cliente, partidas válidas y una sucursal a
la que el usuario tenga acceso.

Si la cotización está relacionada con una oportunidad, Datara conserva también
esa relación.

Cuando existe una oportunidad relacionada, las reservas de inventario de esa
oportunidad deben continuar disponibles y activas para que la orden pueda
generarse y posteriormente entregarse.

Al crear correctamente una orden desde una cotización, Datara registra la fecha
en que esa cotización fue convertida en orden.

No debe asumirse que este proceso cambia automáticamente el estado textual de
la cotización.

PREVENCIÓN DE DUPLICADOS

Una misma operación de origen no debe generar más de una orden de venta.

Si Datara detecta que la oportunidad o cotización ya generó una orden, bloquea
la creación y conserva la orden existente.

Si aparece un mensaje indicando que el origen ya generó una orden, busca la
orden existente en Órdenes de venta en lugar de intentar crear otra.

NO SE PUEDE GENERAR LA ORDEN

Si Datara no permite crear la orden, revisa:

1. Que la Oportunidad esté Ganada o la Cotización haya sido aceptada.
2. Que exista un cliente asociado.
3. Que existan partidas válidas.
4. Que las cantidades sean mayores que cero.
5. Que tengas acceso a la sucursal.
6. Que el origen no haya generado ya otra orden.
7. Si existe una oportunidad relacionada, que sus reservas de inventario
   continúen activas.

CONFIRMAR UNA ORDEN

Solo una orden en estado Borrador puede confirmarse.

Si tu usuario cuenta con permiso de edición:

1. Abre la orden.
2. Verifica cliente, sucursal, partidas, importes y forma de pago.
3. Selecciona Confirmar orden.

Al confirmarla, el estado cambia de Borrador a Confirmada.

Datara registra:

- Quién confirmó la orden.
- Fecha y hora de confirmación.

Confirmar una orden no equivale a entregar el inventario.

ENTREGAR UNA ORDEN

Solo una orden en estado Confirmada puede marcarse como Entregada.

La acción requiere permisos de gestión sobre Órdenes de venta y permiso
de edición sobre Inventario.

1. Abre una orden Confirmada.
2. Opcionalmente captura un motivo o referencia de la entrega.
3. Selecciona Confirmar entrega.

Si no se captura un motivo, Datara utiliza una referencia automática
basada en la orden.

ENTREGA E INVENTARIO

Cuando una orden está relacionada con una oportunidad que utiliza
inventario, Datara verifica sus reservas antes de completar la entrega.

La entrega solo puede continuar si las reservas relacionadas continúan
activas.

Si las reservas ya fueron entregadas, liberadas o canceladas, Datara
bloquea una nueva confirmación de entrega.

Al completar correctamente la entrega:

- La orden cambia a Entregada.
- Las reservas activas utilizadas pasan a Consumida.
- Se descuenta la cantidad correspondiente de las existencias.
- Se descuenta también la cantidad reservada.
- Se registra un movimiento de inventario de tipo Salida reservada.
- Se registra quién realizó la entrega.
- Se registra la fecha y hora.
- Se conserva el motivo o referencia de entrega.
- Se ejecutan las automatizaciones configuradas para el cambio de estado.

La misma reserva no puede entregarse dos veces.

PROBLEMAS AL CONFIRMAR ENTREGA

Si Datara indica que la orden no puede entregarse:

1. Confirma que la orden esté en estado Confirmada.
2. Revisa que la oportunidad relacionada tenga reservas activas.
3. Verifica que esas reservas no hayan sido consumidas, liberadas o
   canceladas anteriormente.
4. Revisa Inventarios para confirmar las existencias y cantidades
   reservadas.
5. Verifica que tu usuario tenga permisos suficientes en Órdenes de venta
   e Inventario.

CANCELAR UNA ORDEN

Una orden puede cancelarse cuando está:

- Borrador.
- Confirmada.

La cancelación requiere capturar un motivo.

1. Abre la orden.
2. Captura el Motivo o referencia de la acción.
3. Selecciona Cancelar orden.

Al cancelar, Datara registra:

- Estado Cancelada.
- Usuario que realizó la cancelación.
- Fecha y hora.
- Motivo de cancelación.

Cancelar una orden Confirmada requiere permiso de gestión sobre Órdenes
de venta.

IMPORTANTE SOBRE CANCELACIÓN E INVENTARIO

Cancelar una orden de venta no debe interpretarse como una liberación
automática de sus reservas de inventario.

La cancelación de la orden registra el cierre operativo de la orden, pero
las reservas deben revisarse en Inventarios según el flujo que originó la
operación.

No asumas que cancelar una orden devuelve automáticamente cantidades
reservadas a disponibilidad.

VER UNA ORDEN

1. Entra a Órdenes de venta.
2. Busca la orden.
3. Selecciona Ver.

El detalle puede mostrar:

- Referencia.
- Estado.
- Cliente.
- Sucursal.
- Responsable.
- Subtotal.
- Descuento.
- Total.
- Forma de pago.
- Oportunidad de origen.
- Cotización de origen.
- Partidas.
- Cantidades.
- Precios.
- Descuentos por partida.
- Notas.
- Trazabilidad.

TRAZABILIDAD

Datara conserva información de las principales acciones realizadas sobre
la orden.

Puede mostrar:

- Quién creó la orden y cuándo.
- Quién la confirmó y cuándo.
- Quién la entregó y cuándo.
- Motivo de entrega cuando exista.
- Quién la canceló y cuándo.
- Motivo de cancelación.

BUSCAR Y FILTRAR ÓRDENES

El historial permite buscar utilizando información como:

- Referencia.
- Cliente.
- Sucursal.
- Responsable.
- Forma de pago.

También puede filtrarse por estado:

- Borrador.
- Confirmada.
- Entregada.
- Cancelada.

RESUMEN DEL MÓDULO

La pantalla muestra indicadores como:

- Órdenes totales.
- Borradores.
- Confirmadas.
- Entregadas.
- Venta entregada.

Venta entregada representa el importe acumulado de órdenes que se
encuentran en estado Entregada.

PERMISOS

Las acciones disponibles dependen de los permisos asignados al usuario.

Nueva orden requiere permiso para crear.

Confirmar una orden en Borrador requiere permiso de edición.

Cancelar una orden en Borrador requiere permiso de edición.

Cancelar una orden Confirmada requiere permiso de gestión.

Confirmar entrega requiere:

- Permiso de gestión en Órdenes de venta.
- Permiso de edición en Inventario.

Si una acción no aparece o Datara rechaza la operación, revisa los
permisos del usuario y su acceso a la sucursal correspondiente.

ACCESO POR SUCURSAL

Datara valida que el usuario tenga acceso a la sucursal asociada con la
orden.

Si el usuario no tiene acceso a esa sucursal, no podrá realizar acciones
operativas sobre la orden.
      `.trim(),
    },

    {
      id:
        "services-module",

      title:
        "Uso del módulo Servicios",

      keywords: [
        "nueva orden de servicio",
        "crear orden de servicio",
        "crear servicio",
        "programar servicio",
        "iniciar servicio",
        "reanudar servicio",
        "pausar servicio",
        "solicitar autorizacion",
        "autorizar trabajo",
        "servicio realizado",
        "devolver al taller",
        "autorizar cierre",
        "completar servicio",
        "cancelar servicio",
        "cancelar orden de servicio",
        "transferir orden de servicio",
        "transferir servicio",
        "cambiar mecanico",
        "cambiar responsable de servicio",
        "diagnostico del servicio",
        "resultado del servicio",
        "acciones y refacciones",
        "agregar refaccion",
        "agregar mano de obra",
        "prioridad del servicio",
        "fecha programada",
        "fecha compromiso",
        "orden de servicio pausada",
        "orden de servicio completada",
        "orden de servicio cancelada",
        "orden pendiente de autorizacion",
        "orden pendiente de cierre",
        "servicio de taller",
      ],

      matchTerms: [
        "servicio",
        "servicios",
        "taller",
        "mecanico",
        "mecanicos",
        "diagnostico",
        "refaccion",
        "refacciones",
        "mantenimiento",
        "reparacion",
        "reparaciones",
      ],

      content: `
MÓDULO SERVICIOS

Ruta: Servicios (/crm/servicios).

FINALIDAD DEL MÓDULO

Servicios administra órdenes de taller y el seguimiento operativo de las
unidades atendidas.

Una orden de servicio puede relacionarse con un Cliente, una Oportunidad
y una Orden de venta.

También permite registrar:

- Tipo de servicio.
- Prioridad.
- Modelo de la unidad.
- Placa.
- NIV o número de serie.
- Problema reportado.
- Responsable.
- Fechas de programación y compromiso.
- Diagnóstico.
- Resultado.
- Mano de obra.
- Refacciones.
- Notas.
- Trazabilidad de las principales acciones.

ESTADOS DE UNA ORDEN DE SERVICIO

Los estados disponibles son:

- Borrador.
- Programada.
- En proceso.
- Pausada.
- Pendiente de autorización.
- Pendiente de cierre.
- Completada.
- Cancelada.

El flujo puede avanzar de la siguiente manera:

Borrador -> Programada -> En proceso.

Desde En proceso puede:

- Pausarse.
- Solicitar autorización.
- Continuar después de una autorización.

Después de completar el trabajo:

En proceso -> Pendiente de cierre -> Completada.

Una orden Pendiente de cierre también puede devolverse al taller, en cuyo
caso regresa a En proceso.

CREAR UNA ORDEN DE SERVICIO

1. Entra a Servicios.
2. Selecciona Nueva orden de servicio.
3. Selecciona la Sucursal.
4. Selecciona el Cliente.
5. Opcionalmente relaciona una Oportunidad.
6. Opcionalmente relaciona una Orden de venta.
7. Selecciona el Tipo de servicio.
8. Selecciona la Prioridad.
9. Selecciona o captura el Modelo.
10. Opcionalmente captura Placa.
11. Opcionalmente captura NIV o número de serie.
12. Captura el Problema reportado.
13. Selecciona el Responsable.
14. Captura la Fecha programada.
15. Opcionalmente captura la Fecha compromiso.
16. Opcionalmente agrega Notas.
17. Selecciona Crear orden.

Los campos obligatorios en la interfaz son:

- Sucursal.
- Cliente.
- Tipo de servicio.
- Prioridad.
- Modelo.
- Problema reportado.
- Responsable.
- Fecha programada.

TIPOS DE SERVICIO

La configuración visible incluye:

- Mantenimiento preventivo.
- Mantenimiento correctivo.
- Diagnóstico.
- Garantía.
- Instalación de accesorios.
- Otro.

PRIORIDADES

Las prioridades disponibles son:

- Baja.
- Normal.
- Alta.
- Urgente.

La prioridad predeterminada al crear una orden es Normal.

MODELO DE LA UNIDAD

El Modelo puede seleccionarse desde los productos activos disponibles en
el sistema.

También existe la opción Capturar otro modelo manualmente.

Esto permite registrar una unidad aunque el modelo requerido no esté
disponible en el selector.

RESPONSABLE

El responsable de la orden se selecciona entre los miembros disponibles
para el rol operativo correspondiente.

La interfaz solicita responsables mediante el rol de mecánico.

Si no existen responsables disponibles, revisa la configuración de
usuarios, roles y miembros activos de la empresa.

FECHAS

La orden utiliza:

- Fecha programada.
- Fecha compromiso.

La Fecha compromiso no puede ser anterior a la Fecha programada.

Para Programar una orden debe existir una Fecha programada válida.

PROGRAMAR UNA ORDEN

Solo una orden en Borrador puede programarse.

Si tienes permiso de edición:

1. Abre la orden.
2. Revisa su programación.
3. Selecciona Programar servicio.

La orden cambia a Programada.

INICIAR UNA ORDEN

Una orden puede iniciarse cuando está:

- Programada.
- Pausada.

Si estaba Programada, selecciona Iniciar servicio.

Si estaba Pausada, selecciona Reanudar servicio.

En ambos casos el estado pasa a En proceso.

La primera vez que se inicia, Datara registra la fecha de inicio.

DIAGNÓSTICO

Cuando la orden está En proceso o Pausada y todavía no ha sido autorizada,
puede capturarse el Diagnóstico.

El diagnóstico es obligatorio antes de solicitar autorización.

Después de que el trabajo fue autorizado, el diagnóstico queda bloqueado
en la interfaz.

PAUSAR UN SERVICIO

Solo una orden En proceso puede pausarse.

1. Abre la orden.
2. Selecciona Pausar servicio.
3. Captura el motivo.
4. Confirma la pausa.

El motivo es obligatorio.

La orden cambia a Pausada y Datara conserva el historial de pausas.

ACCIONES Y REFACCIONES

Antes de solicitar autorización pueden agregarse partidas de:

- Mano de obra.
- Refacción.

Cada partida permite capturar:

- Tipo.
- Nombre.
- Cantidad.
- Precio unitario.
- Descripción opcional.

La cantidad debe ser mayor que cero.

El precio unitario no puede ser negativo.

Las partidas pueden quitarse mientras todavía se encuentran en la etapa
previa a autorización.

SOLICITAR AUTORIZACIÓN

Solo puede solicitarse autorización cuando la orden está En proceso.

Antes de solicitarla se requiere:

- Diagnóstico registrado.
- Al menos una acción o refacción.

1. Registra el diagnóstico.
2. Agrega las acciones o refacciones necesarias.
3. Revisa cantidades y precios.
4. Selecciona Solicitar autorización.

La orden cambia a Pendiente de autorización.

Datara registra:

- Fecha de solicitud.
- Usuario que solicitó la autorización.

AUTORIZAR TRABAJO

Una orden Pendiente de autorización puede ser autorizada por un usuario
con permiso de gestión.

Selecciona Autorizar trabajo.

La orden vuelve a En proceso.

Al autorizar, las partidas registradas pasan a estado Autorizada y su
cantidad autorizada toma la cantidad completa registrada en la partida.

La autorización registra usuario y fecha.

AUTORIZACIÓN NO DESCUENTA INVENTARIO

Autorizar una refacción dentro de Servicios no debe interpretarse como una
salida automática de Inventario.

En la lógica verificada de este módulo, autorizar o completar una orden de
servicio no registra por sí solo movimientos de inventario para las
refacciones.

No asumas que una refacción fue descontada de existencias únicamente por
haber sido autorizada en la orden de servicio.

RESULTADO DEL SERVICIO

Cuando la orden está En proceso y ya fue autorizada, puede capturarse el
Resultado del servicio.

El resultado es obligatorio antes de seleccionar Servicio realizado.

SERVICIO REALIZADO

Para marcar el trabajo como realizado:

1. La orden debe estar En proceso.
2. Debe existir una autorización previa.
3. Debe existir un Resultado del servicio.
4. Selecciona Servicio realizado.

La orden cambia a Pendiente de cierre.

Datara registra quién envió el servicio a cierre y en qué fecha.

PENDIENTE DE CIERRE

Cuando una orden está Pendiente de cierre, un usuario con permiso de
gestión puede:

- Devolver al taller.
- Autorizar cierre.

DEVOLVER AL TALLER

Si el trabajo requiere correcciones:

1. Abre una orden Pendiente de cierre.
2. Selecciona Devolver al taller.
3. Captura qué debe corregirse o completarse.
4. Confirma.

El motivo es obligatorio.

La orden vuelve a En proceso.

Datara conserva un historial de devoluciones, por lo que una misma orden
puede registrar más de una devolución al taller.

AUTORIZAR CIERRE

Una orden Pendiente de cierre puede completarse mediante Autorizar cierre.

Esta acción requiere permiso de gestión.

Al completarla:

- El estado cambia a Completada.
- Datara registra la fecha de finalización.

Una orden Completada ya no puede modificarse.

CANCELAR UNA ORDEN

Una orden puede cancelarse mientras no esté Completada ni Cancelada.

La cancelación requiere permiso de gestión.

1. Abre la orden.
2. Selecciona Cancelar orden.
3. Captura el motivo.
4. Confirma la cancelación.

El motivo es obligatorio.

La orden cambia a Cancelada y Datara registra:

- Fecha de cancelación.
- Motivo.

Una orden Cancelada ya no puede modificarse.

TRANSFERIR UNA ORDEN

Una orden que no esté Completada ni Cancelada puede transferirse a otro
responsable cuando el usuario tiene permiso de gestión.

1. Abre la orden.
2. Selecciona Transferir orden.
3. Selecciona el Nuevo responsable.
4. Captura el Motivo.
5. Selecciona Confirmar transferencia.

El nuevo responsable debe ser un miembro activo de la empresa.

No puede seleccionarse al mismo responsable actual como una nueva
transferencia.

El motivo es obligatorio.

Datara conserva historial de transferencias, incluyendo:

- Responsable anterior.
- Nuevo responsable.
- Usuario que realizó la transferencia.
- Fecha.
- Motivo.

RESTRICCIÓN POR RESPONSABLE

Un usuario sin permiso de gestión solo puede realizar acciones operativas
sobre órdenes que estén asignadas a él.

Si una orden pertenece a otro responsable, Datara bloquea la operación.

Los usuarios con permiso de gestión pueden administrar órdenes de otros
responsables.

ACCESO POR SUCURSAL

Datara valida el acceso del usuario a la sucursal de la orden.

Si el usuario no tiene acceso a esa sucursal, no puede realizar acciones
sobre la orden.

RELACIÓN CON CLIENTES

Toda orden de servicio requiere un Cliente.

Al seleccionar un cliente, las opciones relacionadas de Oportunidades y
Órdenes de venta se filtran según el cliente cuando existe información de
relación disponible.

RELACIÓN CON OPORTUNIDADES

La Oportunidad relacionada es opcional.

El selector muestra oportunidades compatibles con el cliente seleccionado
cuando existe relación de cliente.

RELACIÓN CON ÓRDENES DE VENTA

La Orden de venta relacionada es opcional.

El selector excluye Órdenes de venta Canceladas.

Cuando existe información de cliente, las órdenes disponibles se filtran
para mantener consistencia con el cliente seleccionado.

VER UNA ORDEN DE SERVICIO

Selecciona una fila en Servicios para abrir el detalle.

El detalle muestra información como:

- Referencia.
- Estado.
- Cliente.
- Sucursal.
- Tipo de servicio.
- Prioridad.
- Programación.
- Fecha compromiso.
- Modelo.
- Placa.
- NIV o número de serie.
- Problema reportado.
- Diagnóstico.
- Resultado.
- Notas.
- Responsable.
- Oportunidad relacionada.
- Orden de venta relacionada.
- Acciones y refacciones.
- Trazabilidad.

TRAZABILIDAD

La orden conserva información sobre eventos importantes.

Puede mostrar:

- Creación.
- Última actualización.
- Inicio.
- Solicitud de autorización.
- Tiempo de espera de autorización.
- Autorización.
- Envío a cierre.
- Devoluciones al taller.
- Finalización.
- Cancelación.

Además se conserva historial de pausas, transferencias y devoluciones.

BUSCAR Y FILTRAR SERVICIOS

El buscador permite localizar órdenes utilizando información como:

- Referencia.
- Cliente.
- Modelo.
- Placa.
- NIV o identificador.
- Tipo de servicio.
- Responsable.
- Sucursal.

También puede filtrarse por estado.

INDICADORES DEL MÓDULO

La pantalla muestra indicadores como:

- Total.
- Programadas.
- En proceso.
- Por autorizar.
- Por cerrar.
- Completadas.

PERMISOS

Las acciones dependen de los permisos del usuario.

Permiso de edición permite acciones como:

- Programar.
- Iniciar.
- Reanudar.
- Pausar.
- Actualizar diagnóstico o resultado.
- Solicitar autorización.
- Marcar Servicio realizado.

Permiso de gestión se requiere para:

- Autorizar trabajo.
- Devolver al taller.
- Autorizar cierre.
- Cancelar.
- Transferir una orden.

Si una acción no aparece o Datara la rechaza, revisa los permisos, el
responsable asignado, el estado actual de la orden y el acceso a la
sucursal.
      `.trim(),
    },


    {
      id:
        "activities-module",

      title:
        "Uso de Agenda y Actividades",

      keywords: [
        "crear tarea",
        "nueva tarea",
        "editar tarea",
        "completar tarea",
        "cancelar tarea",
        "aplazar tarea",
        "crear llamada",
        "programar llamada",
        "registrar llamada",
        "editar llamada",
        "llamada entrante",
        "llamada saliente",
        "resultado de llamada",
        "duracion de llamada",
        "grabacion de llamada",
        "crear reunion",
        "nueva reunion",
        "editar reunion",
        "reunion todo el dia",
        "participantes de reunion",
        "agregar participante",
        "quitar participante",
        "agenda",
        "calendario",
        "vista kanban",
        "recordatorio",
        "repetir actividad",
        "actividad recurrente",
        "actividad duplicada",
        "conflicto de horario",
        "traslape de agenda",
        "responsable ocupado",
        "relacionar actividad con cliente",
        "relacionar actividad con prospecto",
        "relacionar actividad con oportunidad",
        "cambiar estado de actividad",
      ],

      matchTerms: [
        "actividad",
        "actividades",
        "agenda",
        "tarea",
        "tareas",
        "llamada",
        "llamadas",
        "reunion",
        "reuniones",
        "calendario",
        "kanban",
        "recordatorio",
        "recordatorios",
        "participante",
        "participantes",
      ],

      content: `
AGENDA Y ACTIVIDADES

La interfaz operativa de Actividades se encuentra actualmente en:

Agenda (/crm/agenda).

La ruta /crm/actividades todavía muestra una pantalla informativa y no
debe utilizarse como procedimiento operativo para administrar actividades.

FINALIDAD DE AGENDA

Agenda permite administrar y consultar actividades comerciales desde una
vista central.

Los tipos de actividad disponibles son:

- Tareas.
- Llamadas.
- Reuniones.

Las actividades pueden relacionarse con Prospectos, Clientes u
Oportunidades y asignarse a un responsable.

VISTAS DISPONIBLES

Agenda cuenta con tres vistas:

- Lista.
- Kanban.
- Calendario.

VISTA LISTA

La vista Lista muestra información como:

- Asunto.
- Fecha.
- Estado.
- Prioridad.
- Relación.
- Responsable.
- Acciones.

Desde esta vista puede abrirse el detalle y, cuando el usuario tiene
permiso, editar la actividad.

VISTA KANBAN

La vista Kanban organiza las actividades por estado.

Cada tipo de actividad utiliza sus propios estados.

Las tarjetas pueden arrastrarse entre columnas para cambiar su estado.

También puede abrirse una actividad para verla o editarla.

Mover una tarjeta a otra columna actualiza el estado de la actividad.

VISTA CALENDARIO

La vista Calendario muestra las actividades según su fecha.

Permite:

- Navegar entre meses.
- Regresar al mes actual mediante Hoy.
- Filtrar por Todas.
- Filtrar por Tareas.
- Filtrar por Llamadas.
- Filtrar por Reuniones.

Selecciona una actividad dentro del calendario para abrir su detalle.

BUSCAR ACTIVIDADES

El buscador puede localizar actividades utilizando información como:

- Asunto.
- Estado.
- Prioridad.
- Prospecto, Cliente u Oportunidad relacionada.
- Responsable.

RELACIONAR UNA ACTIVIDAD

Una actividad puede relacionarse opcionalmente con:

- Un Prospecto.
- Un Cliente.
- Una Oportunidad.

Solo puede existir una de estas relaciones en una misma actividad.

Datara valida que el registro relacionado pertenezca a la empresa.

RESPONSABLE

Toda actividad requiere un Responsable.

El responsable seleccionado debe ser un miembro activo de la empresa.

ESTADOS DE TAREAS

Los estados disponibles para Tareas son:

- No iniciada.
- En curso.
- Aplazada.
- Completada.
- Cancelada.

Una tarea nueva inicia normalmente en No iniciada.

ESTADOS DE LLAMADAS

Los estados disponibles para Llamadas son:

- Programada.
- Completada.
- No contestó.
- Cancelada.

Una llamada programada inicia normalmente en Programada.

Una llamada registrada como realizada inicia normalmente en Completada.

ESTADOS DE REUNIONES

Los estados disponibles para Reuniones son:

- Programada.
- Realizada.
- Cancelada.
- No asistió.

Una reunión nueva inicia normalmente en Programada.

PRIORIDADES

Las prioridades disponibles son:

- Baja.
- Normal.
- Alta.
- Urgente.

La prioridad predeterminada es Normal.

CREAR UNA TAREA

1. Entra a Agenda.
2. Selecciona Tareas.
3. Selecciona Nueva tarea.
4. Captura el Asunto.
5. Selecciona el Responsable.
6. Opcionalmente relaciona un Prospecto, Cliente u Oportunidad.
7. Selecciona Estado y Prioridad.
8. Captura la Fecha y hora de vencimiento.
9. Opcionalmente configura recordatorio.
10. Opcionalmente configura repetición.
11. Opcionalmente captura una Descripción.
12. Selecciona Crear tarea.

Para guardar una tarea son obligatorios:

- Asunto.
- Responsable.
- Fecha y hora de vencimiento.

CREAR UNA LLAMADA PROGRAMADA

1. Entra a Agenda.
2. Selecciona Llamadas.
3. Selecciona Nueva llamada.
4. Elige Programar llamada.
5. Captura el Asunto.
6. Selecciona el Responsable.
7. Opcionalmente relaciona un Prospecto, Cliente u Oportunidad.
8. Selecciona Estado y Prioridad.
9. Captura Inicio.
10. Captura Fin.
11. Configura Dirección si corresponde.
12. Opcionalmente captura Propósito.
13. Opcionalmente configura recordatorio y repetición.
14. Opcionalmente agrega un Enlace de grabación.
15. Guarda la llamada.

La Dirección puede ser:

- Saliente.
- Entrante.

Una llamada programada requiere fecha y hora de inicio.

Si el backend recibe una llamada programada sin hora de fin, puede asignar
automáticamente una duración de 30 minutos.

La interfaz normalmente permite capturar Inicio y Fin.

REGISTRAR UNA LLAMADA REALIZADA

1. Entra a Agenda.
2. Selecciona Llamadas.
3. Selecciona Nueva llamada.
4. Elige Registrar llamada.
5. Captura el Asunto.
6. Selecciona el Responsable.
7. Opcionalmente relaciona un Prospecto, Cliente u Oportunidad.
8. Captura la fecha y hora de la llamada.
9. Selecciona Dirección.
10. Opcionalmente captura Propósito.
11. Opcionalmente captura Duración.
12. Opcionalmente selecciona Resultado.
13. Opcionalmente agrega un Enlace de grabación.
14. Guarda la llamada.

Una llamada registrada como realizada inicia normalmente en estado
Completada.

RESULTADOS DE LLAMADA

Para llamadas registradas, los resultados disponibles incluyen:

- Contactado.
- No contestó.
- Número incorrecto.
- Reprogramar.
- Sin resultado.

La duración se captura en minutos en la interfaz.

La duración no puede ser negativa.

CREAR UNA REUNIÓN

1. Entra a Agenda.
2. Selecciona Reuniones.
3. Selecciona Nueva reunión.
4. Captura el Asunto.
5. Selecciona el Responsable.
6. Opcionalmente relaciona un Prospecto, Cliente u Oportunidad.
7. Selecciona Estado y Prioridad.
8. Captura Inicio.
9. Captura Fin.
10. Opcionalmente marca Todo el día.
11. Configura ubicación si aplica.
12. Agrega participantes cuando corresponda.
13. Opcionalmente configura recordatorio y repetición.
14. Opcionalmente captura una Descripción.
15. Guarda la reunión.

Para guardar una reunión son obligatorios:

- Asunto.
- Responsable.
- Fecha y hora de inicio.
- Fecha y hora de fin.

La fecha de fin debe ser posterior a la fecha de inicio.

UBICACIÓN DE REUNIONES

Los tipos de ubicación disponibles son:

- Ubicación del cliente.
- Oficina.
- Videollamada.
- Otro.

La reunión también puede almacenar:

- Ubicación.
- Enlace de videollamada.

PARTICIPANTES

Las reuniones pueden incluir participantes.

Pueden agregarse desde:

- Usuarios internos.
- Clientes.
- Prospectos.
- Invitados externos.

Para un invitado externo se puede capturar:

- Nombre.
- Correo electrónico.

El nombre del participante es obligatorio cuando se agrega un participante
externo.

Los participantes pueden quitarse antes de guardar.

Datara evita agregar participantes duplicados cuando identifica el mismo
correo o la misma referencia interna.

Cada participante puede conservar información como:

- Nombre.
- Correo.
- Teléfono.
- Estado de respuesta.
- Recordatorio.

RECORDATORIOS

Las actividades permiten activar recordatorios.

Las opciones visibles incluyen:

- 5 minutos antes.
- 15 minutos antes.
- 30 minutos antes.
- 1 hora antes.
- 1 día antes.

El recordatorio no puede utilizar un valor negativo.

REPETICIÓN DE ACTIVIDADES

Las actividades pueden configurarse para repetirse.

Las frecuencias disponibles en la interfaz son:

- Diariamente.
- Semanalmente.
- Mensualmente.
- Anualmente.

CONFLICTOS DE AGENDA

Datara valida conflictos de horario para Llamadas y Reuniones.

Si el mismo Responsable ya tiene otra Llamada o Reunión en un horario que
se traslapa, Datara bloquea la nueva programación o modificación.

Las actividades Canceladas no se consideran como conflicto.

Las Tareas no participan en esta validación de traslape.

Si aparece un mensaje indicando que el responsable ya tiene otra actividad
en ese horario:

1. Revisa la hora de inicio.
2. Revisa la hora de fin.
3. Cambia el horario.
4. O selecciona otro responsable disponible.

EDITAR UNA ACTIVIDAD

Si tienes permiso de edición:

1. Abre la actividad.
2. Selecciona Editar.
3. Modifica los campos necesarios.
4. Guarda los cambios.

Al editar una actividad, Datara vuelve a validar:

- Responsable.
- Relación.
- Fechas.
- Conflictos de agenda.
- Participantes.

CAMBIAR ESTADO DESDE KANBAN

En la vista Kanban puedes arrastrar una tarjeta a otra columna de estado.

Datara actualiza la actividad con el nuevo estado.

La disponibilidad de esta operación depende del permiso de edición.

AUTOMATIZACIONES

Al crear una actividad, Datara puede ejecutar automatizaciones configuradas
para creación de registros.

Al actualizar una actividad, también pueden ejecutarse automatizaciones
relacionadas con actualización y cambio de estado.

PERMISOS

Las acciones disponibles dependen de los permisos asignados al usuario.

Por ejemplo:

- Crear una actividad requiere permiso para crear.
- Editar una actividad requiere permiso de edición.
- Cambiar el estado desde Kanban implica actualizar la actividad y requiere
  permiso de edición.

Si una acción no aparece, revisa los permisos del usuario.
      `.trim(),
    },
    {
      id:
        "promotions-module",

      title:
        "Uso del módulo Promociones",

      keywords: [
        "nueva promocion",
        "crear promocion",
        "editar promocion",
        "promocion activa",
        "promocion programada",
        "promocion expirada",
        "promocion inactiva",
        "pausar promocion",
        "reanudar promocion",
        "producto aplicable",
        "productos aplicables",
        "promocion para producto",
        "promocion no aparece",
        "promocion no disponible",
        "promocion elegible",
        "promocion vigente",
        "vigencia de promocion",
        "fecha inicio promocion",
        "fecha fin promocion",
        "canal de promocion",
        "tipo de cliente promocion",
        "forma de pago promocion",
        "meses disponibles promocion",
        "enganche minimo promocion",
        "limite de beneficios",
        "beneficios disponibles",
        "beneficios usados",
        "prioridad de promocion",
        "grupo de promocion",
        "seleccion requerida",
        "mensaje comercial",
        "condiciones de promocion",
        "descuento promocion",
        "bono promocion",
      ],

      matchTerms: [
        "promocion",
        "promociones",
        "descuento",
        "descuentos",
        "bono",
        "bonos",
        "beneficio",
        "beneficios",
        "vigencia",
        "canal",
        "enganche",
      ],

      content: `
MÓDULO PROMOCIONES

Ruta: Promociones (/crm/promociones).

FINALIDAD DEL MÓDULO

Promociones administra beneficios comerciales que pueden utilizarse en
operaciones como Oportunidades y Cotizaciones.

Las promociones pueden configurarse con condiciones relacionadas con:

- Vigencia.
- Productos.
- Canal.
- Tipo de cliente.
- Forma de pago.
- Grupo de promoción.
- Meses disponibles.
- Enganche mínimo.
- Límite de beneficios.
- Prioridad.
- Selección requerida.
- Mensaje comercial.
- Condiciones.

CREAR UNA PROMOCIÓN

1. Entra a Promociones.
2. Selecciona Nueva promoción.
3. Captura el Nombre de la promoción.
4. Configura los campos comerciales disponibles.
5. Selecciona los productos aplicables cuando corresponda.
6. Revisa las fechas de vigencia.
7. Guarda la promoción.

El Nombre de la promoción es obligatorio.

TIPOS DE BENEFICIO Y VALOR

Algunos tipos de beneficio requieren un valor numérico.

El valor es obligatorio para beneficios como:

- Descuento (%).
- Descuento ($).
- Bono.

Si el beneficio seleccionado requiere valor y no se captura, Datara no
permite guardar la promoción.

ESTADO DE LA PROMOCIÓN

El estado se calcula automáticamente de acuerdo con su vigencia y si está
pausada.

Los estados pueden ser:

- Programada.
- Activa.
- Expirada.
- Inactiva.

Una promoción queda Programada cuando su fecha de inicio todavía no llega.

Una promoción queda Activa cuando la fecha actual se encuentra dentro de
su vigencia y no está pausada.

Una promoción queda Expirada cuando ya alcanzó o superó su fecha de fin.

Una promoción queda Inactiva cuando está pausada o cuando no existe una
vigencia válida.

PAUSAR UNA PROMOCIÓN

Cuando una promoción está pausada no se considera elegible para operaciones
comerciales.

Pausarla no elimina el registro.

PRODUCTOS APLICABLES

Una promoción puede estar asociada con productos específicos.

Si tiene productos relacionados, solo será elegible para los productos
incluidos.

Si no tiene productos específicos relacionados, la regla de producto no
limita por sí sola su elegibilidad.

CREAR PROMOCIONES CON PRODUCTOS INACTIVOS

No se pueden agregar productos inactivos a una promoción nueva.

Si intentas agregar un producto inactivo, Datara rechaza la operación.

EDITAR PROMOCIONES CON PRODUCTOS INACTIVOS

Una promoción existente puede conservar un producto inactivo que ya estaba
relacionado previamente.

Sin embargo, no se puede agregar como nueva relación un producto inactivo.

Al editar, la lista de productos aplicables se reemplaza por la selección
guardada en el formulario.

VIGENCIA

Para que una promoción sea elegible debe tener:

- Fecha de inicio.
- Fecha de fin.

Además, la fecha actual debe encontrarse dentro de ese periodo.

Una promoción no es elegible si:

- Todavía no inicia.
- Ya expiró.
- No tiene fechas válidas.
- Está pausada.

PRIORIDAD

Las promociones pueden tener una prioridad.

Las promociones elegibles se ordenan por prioridad, utilizando primero los
valores de prioridad más bajos.

CANAL

Una promoción puede limitarse a uno o más canales.

Si la promoción tiene canales configurados, el canal de la operación debe
coincidir.

El valor Todos permite aplicar la promoción a cualquier canal.

Si la promoción está restringida a canales específicos y la operación no
tiene un canal compatible, la promoción no aparece como elegible.

TIPO DE CLIENTE

Una promoción puede limitarse por Tipo de cliente.

Si se configuró un tipo específico, el cliente de la operación debe
coincidir.

Los valores Todos o Todo permiten aplicar la promoción a cualquier tipo de
cliente.

Si no existe coincidencia, la promoción no aparece como elegible.

LÍMITE DE BENEFICIOS

Una promoción puede configurarse con un límite máximo de beneficios.

Cuando el límite está activo y los Beneficios usados alcanzan el Máximo de
beneficios, la promoción deja de ser elegible.

Datara puede mostrar los beneficios restantes cuando existe este límite.

POR QUÉ UNA PROMOCIÓN NO APARECE

Si una promoción no aparece disponible en una Oportunidad o Cotización,
revisa:

1. Que no esté pausada.
2. Que tenga fecha de inicio y fin.
3. Que se encuentre dentro de su vigencia.
4. Que todavía tenga beneficios disponibles si existe un límite.
5. Que el producto corresponda con los Productos aplicables.
6. Que el producto esté activo.
7. Que el Canal coincida.
8. Que el Tipo de cliente coincida.

No asumas que una promoción fue eliminada únicamente porque no aparece como
elegible.

PRODUCTO INACTIVO

La consulta de promociones elegibles requiere un producto activo.

Si el producto está inactivo, Datara no devuelve promociones elegibles para
ese producto.

FORMA DE PAGO

Las promociones pueden almacenar una Forma de pago.

La consulta de elegibilidad devuelve esta información para que los flujos
comerciales puedan utilizarla.

La consulta de elegibilidad verificada no descarta por sí sola una
promoción únicamente porque la forma de pago no coincida.

La compatibilidad final puede ser evaluada posteriormente por la lógica de
la operación comercial.

MESES DISPONIBLES

Las promociones pueden incluir Meses disponibles.

Esta información puede utilizarse en operaciones con financiamiento para
mostrar o limitar plazos disponibles.

ENGANCHE MÍNIMO

Las promociones pueden incluir un Enganche mínimo.

La consulta de promociones elegibles devuelve este valor.

La consulta de elegibilidad verificada no descarta por sí sola la promoción
por enganche mínimo; la condición puede ser evaluada posteriormente por el
flujo comercial.

GRUPO DE PROMOCIÓN

Una promoción puede pertenecer a un Grupo de promoción.

Este dato puede utilizarse para administrar compatibilidad o selección entre
beneficios dentro de una operación comercial.

SELECCIÓN REQUERIDA

La propiedad Selección requerida indica que la promoción debe ser tratada
como una opción que requiere selección dentro del flujo comercial.

En Oportunidades y Cotizaciones, esta configuración puede influir en cómo
se combinan promociones del mismo grupo.

MENSAJE COMERCIAL

Una promoción puede incluir un Mensaje comercial.

Este texto puede mostrarse al usuario durante la selección de promociones.

CONDICIONES

La promoción puede incluir Condiciones con información adicional sobre su
aplicación.

CONSULTAR PROMOCIONES ELEGIBLES

La elegibilidad se consulta para un producto específico.

Datara valida:

- Que el producto exista.
- Que pertenezca a la empresa.
- Que esté activo.
- La vigencia de la promoción.
- Que no esté pausada.
- Los límites de uso.
- Los productos aplicables.
- El canal.
- El tipo de cliente.

Las promociones que pasan estas validaciones se devuelven ordenadas por
prioridad.

RELACIÓN CON OPORTUNIDADES

Oportunidades consulta promociones compatibles con los productos incluidos
en la operación.

La disponibilidad puede cambiar según:

- Producto.
- Canal.
- Tipo de cliente.
- Vigencia.
- Límite de beneficios.

Además, la lógica comercial puede considerar forma de pago, grupo,
selección requerida, meses disponibles y otras condiciones.

RELACIÓN CON COTIZACIONES

Cotizaciones consulta promociones compatibles para cada partida.

Las promociones disponibles dependen de las reglas de elegibilidad y de la
información de la operación.

Si una promoción que esperabas no aparece, revisa primero su configuración
en Promociones antes de modificar la Cotización.

BUSCAR PROMOCIONES

La tabla permite buscar utilizando información como:

- Nombre.
- Estado.
- Beneficio.
- Canal.

EDITAR UNA PROMOCIÓN

1. Busca y abre la promoción.
2. Selecciona Editar.
3. Modifica los campos necesarios.
4. Revisa los productos aplicables.
5. Guarda los cambios.

Datara vuelve a calcular su estado según vigencia y pausa al consultarla.

PERMISOS

Crear promociones requiere permiso para crear en el módulo Promociones.

Editar promociones requiere permiso de edición.

Para consultar promociones elegibles desde Oportunidades o Cotizaciones,
el usuario debe tener permisos suficientes sobre alguno de esos módulos.

Si una promoción no aparece o una acción no está disponible, revisa la
configuración comercial y los permisos del usuario.
      `.trim(),
    },
    {
      id:
        "documents-module",

      title:
        "Uso del módulo Documentos",

      keywords: [
        "cargar documento",
        "nuevo documento",
        "subir documento",
        "cargar archivo",
        "subir archivo",
        "editar documento",
        "ver documento",
        "descargar documento",
        "vista previa documento",
        "archivar documento",
        "restaurar documento",
        "documento archivado",
        "documento activo",
        "relacionar documento",
        "documento relacionado con cliente",
        "documento relacionado con prospecto",
        "documento relacionado con oportunidad",
        "documento relacionado con actividad",
        "categoria documento",
        "descripcion documento",
        "nombre documento",
        "tamaño documento",
        "espacio utilizado",
        "archivo de 20 mb",
        "tipo de archivo permitido",
        "pdf documento",
        "imagen documento",
        "word documento",
        "excel documento",
        "powerpoint documento",
        "csv documento",
        "txt documento",
        "archivo protegido",
        "archivo no disponible",
        "documento en r2",
      ],

      matchTerms: [
        "documento",
        "documentos",
        "archivo",
        "archivos",
        "pdf",
        "imagen",
        "word",
        "excel",
        "powerpoint",
        "csv",
        "txt",
        "descargar",
        "archivar",
        "restaurar",
      ],

      content: `
MÓDULO DOCUMENTOS

Ruta: Documentos (/crm/documentos).

FINALIDAD DEL MÓDULO

Documentos permite almacenar y administrar archivos relacionados con la
operación comercial.

Los archivos se almacenan de forma protegida y pueden relacionarse con
registros del CRM.

ACCIONES DISPONIBLES

Según los permisos del usuario, el módulo permite:

- Consultar documentos.
- Cargar documentos.
- Ver detalle.
- Editar información del documento.
- Descargar archivos.
- Abrir vista previa cuando el formato lo permite.
- Archivar documentos.
- Restaurar documentos archivados.

ESTADOS

Los documentos pueden estar en los siguientes estados:

- Activo.
- Archivado.

La interfaz permite filtrar por:

- Activos.
- Archivados.
- Todos.

ARCHIVAR NO ELIMINA EL ARCHIVO

Archivar un documento es una operación lógica.

El archivo físico no se elimina del almacenamiento.

Al archivar:

- El estado cambia a Archivado.
- Se registra la fecha de archivo.
- El documento permanece almacenado.

Al restaurar:

- El estado vuelve a Activo.
- La fecha de archivo se elimina.

Un documento archivado puede seguir consultándose, previsualizándose o
descargándose si el usuario conserva permiso de visualización.

CARGAR UN DOCUMENTO

1. Entra a Documentos.
2. Selecciona Cargar documento.
3. Selecciona o arrastra un archivo.
4. Captura o confirma el Nombre del documento.
5. Selecciona la Categoría.
6. Opcionalmente relaciona el documento con un registro.
7. Opcionalmente captura una Descripción.
8. Selecciona Cargar documento.

CAMPOS DE CARGA

Para cargar un documento se utiliza:

- Archivo.
- Nombre del documento.
- Categoría.
- Relacionado con, opcional.
- Descripción, opcional.

El archivo es obligatorio.

El Nombre del documento es obligatorio.

La Categoría es obligatoria en la interfaz.

Si no se captura un nombre personalizado, Datara utiliza como nombre el
nombre original del archivo sin extensión.

TAMAÑO MÁXIMO

El tamaño máximo permitido es de 20 MB.

La validación se realiza tanto en la interfaz como en el servidor.

Si el archivo supera 20 MB, Datara no permite cargarlo.

ARCHIVOS VACÍOS

Datara no permite cargar archivos con tamaño igual a cero.

TIPOS DE ARCHIVO PERMITIDOS

Los formatos permitidos incluyen:

- PDF.
- JPG.
- JPEG.
- PNG.
- WEBP.
- TXT.
- CSV.
- DOC.
- DOCX.
- XLS.
- XLSX.
- PPT.
- PPTX.

El servidor valida el tipo MIME del archivo.

Si el formato no está permitido, Datara rechaza la carga.

NOMBRE ORIGINAL

Datara conserva el nombre original del archivo además del nombre comercial
asignado al documento.

CATEGORÍA

Cada documento tiene una Categoría.

La lista de categorías depende de la configuración definida por Datara.

Al crear un documento, si el backend no recibe una categoría, utiliza Otro
como valor predeterminado.

RELACIONES

Un documento puede relacionarse con registros del CRM.

Las opciones disponibles en la interfaz incluyen:

- Prospecto.
- Cliente.
- Oportunidad.
- Actividad.

La relación es opcional.

En la interfaz actual se administra una relación principal por documento.

Para guardar una relación, Datara requiere conjuntamente:

- Tipo de entidad.
- Identificador de la entidad.

Si solo se proporciona uno de ellos, la relación se considera incompleta y
Datara rechaza la operación.

EDITAR LA RELACIÓN

Al editar la relación de un documento, Datara reemplaza las relaciones
actuales por la nueva relación seleccionada.

También es posible dejar el documento sin relación.

BUSCAR DOCUMENTOS

El buscador puede localizar documentos utilizando información como:

- Nombre del documento.
- Nombre original del archivo.
- Categoría.
- Usuario que cargó el documento.
- Registro relacionado.

FILTRO POR CATEGORÍA

La interfaz permite filtrar por Categoría.

INDICADORES

El módulo muestra indicadores como:

- Documentos activos.
- Documentos archivados.
- Espacio utilizado por documentos activos.

El espacio utilizado se calcula utilizando el tamaño de los documentos
activos.

DETALLE DEL DOCUMENTO

El detalle puede mostrar:

- Nombre del documento.
- Nombre original del archivo.
- Categoría.
- Estado.
- Relación.
- Tamaño.
- Versión.
- Usuario que lo cargó.
- Fecha de carga.
- Última actualización.
- Descripción.

VERSIÓN

Los documentos nuevos se crean actualmente con Versión 1.

La edición de nombre, categoría, descripción, relación o estado no
reemplaza físicamente el archivo.

EDITAR UN DOCUMENTO

Si tienes permiso de edición:

1. Abre el documento.
2. Selecciona Editar.
3. Modifica el Nombre, Categoría, Descripción o Relación.
4. Guarda los cambios.

El Nombre no puede quedar vacío.

La Categoría no puede quedar vacía cuando se modifica.

La edición de la información no sustituye el archivo almacenado.

ARCHIVAR UN DOCUMENTO

1. Abre el documento.
2. Selecciona Archivar.
3. Datara cambia el estado a Archivado.

Archivar no elimina el archivo.

RESTAURAR UN DOCUMENTO

1. Abre un documento archivado.
2. Selecciona Restaurar.
3. Datara cambia el estado a Activo.

VISTA PREVIA

La opción Vista previa abre el contenido directamente cuando el formato es
compatible.

Los formatos previsualizables incluyen:

- PDF.
- Imágenes.
- Archivos de texto.

Los archivos Word, Excel y PowerPoint no se sirven como vista previa inline
en el flujo verificado y normalmente se descargan.

DESCARGAR UN DOCUMENTO

Selecciona Descargar desde la tabla o desde el detalle.

La descarga utiliza el archivo original almacenado.

El nombre original del archivo se utiliza para la descarga.

PERMISO PARA VER Y DESCARGAR

Consultar el contenido de un documento requiere permiso de visualización
del módulo Documentos.

Esto aplica tanto para:

- Vista previa.
- Descarga.

SEGURIDAD DE ACCESO

Datara valida que el documento pertenezca a la empresa activa.

Un usuario no puede solicitar mediante esta ruta un documento perteneciente
a otro tenant.

ALMACENAMIENTO

Los archivos del módulo Documentos se almacenan en Cloudflare R2.

La información del documento se conserva en la base de datos.

La clave de almacenamiento se organiza utilizando información como:

- Tenant.
- Año.
- Mes.
- Identificador único del archivo.

CHECKSUM

Al cargar un documento, Datara calcula un checksum SHA-256.

Este valor se conserva como información técnica del archivo.

PROTECCIÓN DE CACHÉ

La entrega del contenido utiliza una política privada sin almacenamiento en
caché público.

El archivo se sirve con:

- Cache-Control privado.
- No-store.

ARCHIVO NO DISPONIBLE

Puede ocurrir que exista el registro del documento pero el archivo físico
no esté disponible en el almacenamiento.

En ese caso Datara informa que el archivo no está disponible.

ROLLBACK DE CARGA

Cuando ocurre un error durante la creación del documento después de subir
el archivo, Datara intenta revertir la operación.

Puede eliminar:

- El registro creado en base de datos.
- El archivo recién cargado en R2.

Esto evita dejar archivos o registros incompletos cuando la carga falla.

PERMISOS

Ver documentos requiere permiso de visualización.

Cargar documentos requiere permiso para crear.

Editar información, archivar y restaurar requieren permiso de edición.

Si una acción no aparece, revisa los permisos asignados al usuario.

NO INVENTAR ELIMINACIÓN

El flujo verificado no expone una acción DELETE para eliminar físicamente
documentos desde este módulo.

No debe indicarse al usuario que puede borrar definitivamente un documento
si esa opción no aparece en la interfaz.

La operación disponible para retirar un documento del uso normal es
Archivar.
      `.trim(),
    },
    {
      id:
        "leads-module",

      title:
        "Uso del módulo Prospectos",

      keywords: [
        "crear prospecto",
        "nuevo prospecto",
        "editar prospecto",
        "ver prospecto",
        "convertir prospecto",
        "convertir prospecto en cliente",
        "prospecto convertido",
        "prospecto no aparece",
        "prospecto duplicado",
        "correo duplicado prospecto",
        "telefono duplicado prospecto",
        "movil duplicado prospecto",
        "responsable prospecto",
        "sucursal prospecto",
        "producto prospecto",
        "producto relacionado prospecto",
        "producto inactivo prospecto",
        "origen prospecto",
        "estado prospecto",
        "consentimiento comercial prospecto",
        "notas prospecto",
        "cliente desde prospecto",
        "source lead",
        "prospecto sin sucursal",
        "prospecto sin contacto",
        "correo invalido prospecto",
        "acceso sucursal prospecto",
      ],

      matchTerms: [
        "prospecto",
        "prospectos",
        "lead",
        "leads",
        "convertir",
        "conversion",
        "cliente",
        "contacto",
        "sucursal",
        "responsable",
        "origen",
      ],

      content: `
MÓDULO PROSPECTOS

Ruta: Prospectos (/crm/prospectos).

FINALIDAD DEL MÓDULO

Prospectos permite registrar personas interesadas antes de convertirlas en
clientes.

Cada prospecto puede almacenar información comercial y de contacto, además
de relacionarse con una sucursal, un producto y un responsable.

ACCIONES PRINCIPALES

Según los permisos del usuario, el módulo permite:

- Crear prospectos.
- Ver prospectos.
- Editar prospectos.
- Convertir prospectos en clientes.

CREAR UN PROSPECTO

1. Entra a Prospectos.
2. Selecciona Nuevo prospecto.
3. Captura la información requerida.
4. Selecciona una sucursal.
5. Opcionalmente relaciona un producto.
6. Opcionalmente selecciona un responsable. Si no seleccionas uno, Datara
   asignará automáticamente como responsable al usuario que crea el prospecto.
7. Guarda el prospecto.

VALIDACIONES DE CONTACTO

El Nombre del prospecto es obligatorio.

Además, debe existir al menos uno de los siguientes medios de contacto:

- Correo electrónico.
- Teléfono.
- Móvil.

Si no existe ninguno, Datara no permite guardar el prospecto.

CORREO ELECTRÓNICO

Si se captura correo electrónico, Datara valida que tenga un formato válido.

El correo se normaliza a minúsculas antes de guardarse.

SUCURSAL

El prospecto debe utilizar una sucursal válida dentro del acceso permitido
para el usuario.

Datara valida el acceso a la sucursal tanto al crear como al editar.

La interfaz utiliza la sucursal primaria como valor inicial cuando está
disponible.

Si el usuario no tiene acceso a una sucursal, no puede administrar mediante
este flujo prospectos pertenecientes a esa sucursal.

PRODUCTO RELACIONADO

Un prospecto puede relacionarse con un producto del catálogo.

El producto debe pertenecer a la misma empresa.

No se puede asignar como nueva relación un producto inactivo.

Si un prospecto ya tenía relacionado un producto que posteriormente quedó
inactivo, Datara permite conservar esa relación al editar.

RESPONSABLE

Un prospecto puede tener un responsable.

El responsable seleccionado debe ser un miembro activo de la empresa.

Al crear un prospecto, si no se selecciona un responsable, Datara utiliza
como responsable al usuario que crea el registro.

Al editar, la información del responsable se vuelve a validar.

ESTADO

Si no se especifica otro estado al crear, el estado inicial es:

Nuevo.

La interfaz permite consultar y editar el estado según la configuración del
módulo.

ORIGEN

El prospecto puede guardar un Origen comercial.

Este dato puede utilizarse para identificar de dónde provino el prospecto.

CONSENTIMIENTO COMERCIAL

El prospecto puede almacenar el estado de Consentimiento comercial.

Este valor se conserva también cuando el prospecto se convierte en cliente.

NOTAS

El prospecto puede incluir Notas.

Las notas también se transfieren al cliente durante la conversión.

BUSCAR PROSPECTOS

La tabla permite buscar utilizando información como:

- Nombre.
- Correo.
- Teléfono.
- Estado.
- Origen.

ACCESO POR SUCURSAL

La consulta de Prospectos respeta las sucursales autorizadas para el
usuario.

Un usuario con acceso limitado solo puede consultar prospectos de sus
sucursales permitidas.

Los usuarios con acceso a todas las sucursales pueden consultar todos los
prospectos de la empresa.

PROSPECTOS CONVERTIDOS

La consulta normal de Prospectos excluye los registros cuyo estado es:

Convertido.

Esto significa que un prospecto convertido deja de aparecer en la lista
operativa normal.

El prospecto no se elimina.

Su registro se conserva para mantener la trazabilidad.

EDITAR UN PROSPECTO

1. Busca el prospecto.
2. Ábrelo.
3. Selecciona Editar.
4. Modifica la información necesaria.
5. Guarda los cambios.

Al editar, Datara vuelve a validar:

- Datos obligatorios.
- Medio de contacto.
- Formato del correo.
- Sucursal.
- Producto.
- Responsable.

AUTOMATIZACIONES AL CREAR

Cuando se crea un prospecto, Datara ejecuta automatizaciones asociadas con
el evento:

record_created.

AUTOMATIZACIONES AL EDITAR

Cuando se actualiza un prospecto, Datara invoca automatizaciones para:

- record_updated.
- status_changed.

La ruta de Prospectos invoca ambos tipos de evento durante una
actualización.

CONVERTIR PROSPECTO EN CLIENTE

Para convertir un prospecto:

1. Abre el prospecto.
2. Selecciona la acción Convertir.
3. Confirma la conversión.
4. Datara valida permisos, sucursal y posibles duplicados.
5. Si todo es correcto, crea el cliente.
6. El prospecto cambia a estado Convertido.

La interfaz informa que el prospecto conservará su historial.

PERMISOS PARA CONVERTIR

La conversión requiere:

- Permiso de edición en Prospectos.
- Permiso para crear Clientes.

También requiere acceso a la sucursal del prospecto.

SUCURSAL OBLIGATORIA PARA CONVERTIR

Un prospecto no puede convertirse en cliente si no tiene una sucursal
asignada.

Si falta la sucursal, Datara rechaza la conversión.

PROSPECTO YA CONVERTIDO

Datara verifica si ya existe un cliente cuyo sourceLeadId corresponde al
prospecto.

Si ya existe:

- No crea otro cliente.
- Marca el prospecto como Convertido si fuera necesario.
- Devuelve el cliente existente.

Esto evita duplicar una conversión ya realizada.

VALIDACIÓN DE DUPLICADOS POR CORREO

Antes de convertir, Datara verifica si ya existe un cliente con el mismo
correo electrónico dentro de la empresa.

La comparación normaliza el correo utilizando minúsculas y espacios.

Si existe un cliente con ese correo:

- Datara no crea otro cliente.
- La conversión se detiene.
- Se solicita revisar el cliente existente.

La respuesta utiliza un conflicto 409.

VALIDACIÓN DE DUPLICADOS POR TELÉFONO

Datara también verifica los teléfonos del prospecto.

Se consideran:

- Teléfono.
- Móvil.

Para comparar teléfonos, Datara elimina caracteres que no sean números.

Por ejemplo, formatos distintos con espacios, guiones o paréntesis pueden
considerarse el mismo número si sus dígitos coinciden.

Si existe un cliente con el mismo teléfono o móvil:

- Datara no crea otro cliente.
- La conversión se detiene.
- Se solicita revisar el cliente existente.

CLIENTE CREADO DESDE UN PROSPECTO

Cuando la conversión es correcta, el nuevo cliente se crea actualmente como:

- Tipo de cliente: Persona.
- Estado: Activo.

Datara copia desde el prospecto:

- Sucursal.
- Nombre.
- Apellido.
- Correo electrónico.
- Teléfono.
- Móvil.
- Responsable.
- Consentimiento comercial.
- Notas.

TRAZABILIDAD DE LA CONVERSIÓN

El cliente creado guarda:

sourceLeadId.

Este campo identifica el prospecto que originó al cliente.

Después de crear correctamente el cliente, el prospecto cambia a:

Convertido.

CONVERSIÓN NO ELIMINA EL PROSPECTO

Convertir un prospecto no borra su registro.

El prospecto permanece almacenado y conserva la trazabilidad histórica.

Simplemente deja de mostrarse en la consulta operativa normal de Prospectos
porque su estado pasa a Convertido.

DUPLICADO PROTEGIDO POR BASE DE DATOS

Además de la validación previa, la base de datos cuenta con una restricción
para evitar clientes duplicados por correo dentro del tenant.

Si esa restricción detecta un duplicado durante la conversión, Datara
también responde indicando que ya existe un cliente con ese correo.

RELACIÓN CON CLIENTES

Prospectos representa una etapa previa a Clientes.

La conversión crea una relación explícita entre ambos registros mediante
sourceLeadId.

RELACIÓN CON PRODUCTOS

El producto relacionado ayuda a identificar el interés comercial inicial
del prospecto.

Este campo pertenece al prospecto y no forma parte de los datos que la ruta
verificada copia directamente al cliente durante la conversión.

RELACIÓN CON AUTOMATIZACIONES

Los prospectos pueden disparar automatizaciones cuando se crean o se
actualizan.

Esto permite utilizar el módulo como punto de entrada para seguimientos,
asignaciones u otros procesos configurados en Datara.

PERMISOS

Consultar prospectos requiere permiso de visualización.

Crear prospectos requiere permiso para crear.

Editar prospectos requiere permiso de edición.

Convertir requiere permiso de edición en Prospectos y permiso para crear
Clientes.

Si una acción no aparece o Datara rechaza la operación, revisa:

- Los permisos del usuario.
- El acceso a la sucursal.
- La información de contacto.
- El producto seleccionado.
- El responsable.
- Posibles clientes duplicados por correo o teléfono.
      `.trim(),
    },
    {
      id:
        "customers-module",

      title:
        "Uso del módulo Clientes",

      keywords: [
        "crear cliente",
        "nuevo cliente",
        "editar cliente",
        "ver cliente",
        "cliente persona",
        "cliente empresa",
        "nombre comercial cliente",
        "contacto principal",
        "correo cliente",
        "telefono cliente",
        "movil cliente",
        "rfc cliente",
        "identificacion fiscal cliente",
        "cliente duplicado",
        "correo duplicado cliente",
        "telefono duplicado cliente",
        "rfc duplicado cliente",
        "sucursal cliente",
        "responsable cliente",
        "producto cliente",
        "prospecto de origen",
        "source lead cliente",
        "direccion cliente",
        "consentimiento comercial cliente",
        "estado cliente",
        "cliente activo",
      ],

      matchTerms: [
        "cliente",
        "clientes",
        "contacto",
        "contactos",
        "empresa",
        "persona",
        "rfc",
        "correo",
        "telefono",
        "movil",
        "sucursal",
        "responsable",
      ],

      content: `
MÓDULO CLIENTES

Ruta: Clientes (/crm/clientes).

FINALIDAD DEL MÓDULO

Clientes permite administrar personas y empresas que mantienen una relación
comercial con la organización.

El módulo utiliza internamente la clave:

contacts.

TIPOS DE CLIENTE

Datara admite actualmente dos tipos de cliente:

- Persona.
- Empresa.

CLIENTE TIPO PERSONA

Para un cliente tipo Persona, el nombre es obligatorio.

CLIENTE TIPO EMPRESA

Para un cliente tipo Empresa son obligatorios:

- Nombre del contacto principal.
- Nombre comercial de la empresa.

DATOS DE CONTACTO

Todo cliente debe tener al menos uno de los siguientes medios de contacto:

- Correo electrónico.
- Teléfono.
- Móvil.

Si no existe ninguno, Datara no permite guardar el cliente.

CORREO ELECTRÓNICO

Si se captura correo electrónico:

- Datara valida el formato.
- El correo se normaliza a minúsculas antes de guardarse.

RFC O IDENTIFICACIÓN FISCAL

La identificación fiscal se guarda en mayúsculas.

Datara valida que no exista otro cliente del mismo tenant con el mismo RFC
o identificación fiscal.

DUPLICADOS POR CORREO

Datara evita crear o actualizar un cliente si otro cliente del mismo tenant
ya utiliza el mismo correo electrónico.

La respuesta utiliza un conflicto 409.

Además existe una restricción de base de datos para proteger la unicidad del
correo dentro del tenant.

DUPLICADOS POR RFC

Datara también evita duplicados por RFC o identificación fiscal.

Además de la validación previa, existe una restricción de base de datos para
proteger esa unicidad dentro del tenant.

DUPLICADOS POR TELÉFONO

Datara compara:

- Teléfono.
- Móvil.

Para detectar duplicados elimina caracteres que no sean números.

Por ejemplo, dos números escritos con distintos espacios, guiones o
paréntesis pueden considerarse iguales si sus dígitos coinciden.

Si otro cliente tiene ese número, Datara rechaza la operación con conflicto
409.

EDICIÓN Y DUPLICADOS

Al editar un cliente, Datara excluye al mismo registro de la validación de
duplicados.

Esto permite conservar su propio correo, RFC o teléfono sin que se considere
duplicado consigo mismo.

SUCURSAL

Cada cliente puede estar asociado con una sucursal.

Datara valida la sucursal contra el acceso autorizado del usuario.

La interfaz utiliza la sucursal primaria como valor inicial cuando está
disponible.

La consulta de Clientes también respeta el acceso por sucursal.

Un usuario con acceso limitado solo puede consultar clientes de sus
sucursales autorizadas.

RESPONSABLE

Un cliente puede tener un responsable.

El responsable seleccionado debe ser un miembro activo de la empresa.

Al crear un cliente, si no se selecciona responsable, Datara utiliza al
usuario actual.

Al editar, el responsable también se vuelve a resolver y validar.

PRODUCTO O MODELO RELACIONADO

Un cliente puede relacionarse con un producto o modelo.

El producto debe pertenecer al catálogo de la misma empresa.

PROSPECTO DE ORIGEN

Un cliente puede guardar un Prospecto de origen mediante:

sourceLeadId.

El prospecto relacionado debe pertenecer al mismo tenant.

Esta relación permite conservar trazabilidad entre Prospectos y Clientes.

La conversión automática de Prospecto a Cliente también utiliza este campo.

NOMBRE MOSTRADO

Para clientes tipo Persona, Datara construye el nombre mostrado utilizando:

- Nombre.
- Apellido.

Para clientes tipo Empresa, utiliza principalmente:

- Nombre comercial de la empresa.

DATOS DE EMPRESA

Un cliente tipo Empresa puede almacenar:

- Nombre comercial.
- Razón social.
- RFC o identificación fiscal.
- Contacto principal.

DIRECCIÓN

El cliente puede almacenar información de dirección como:

- Dirección.
- Ciudad.
- Estado.
- Código postal.
- País.

PAÍS POR DEFECTO

Si no se especifica país, Datara utiliza:

MX.

ESTADO DEL CLIENTE

Si no se especifica otro estado, el cliente se crea con:

Activo.

CONSENTIMIENTO COMERCIAL

El cliente puede almacenar el estado de Consentimiento comercial.

Este dato puede provenir también de un prospecto convertido.

NOTAS

El cliente puede guardar Notas comerciales o internas.

CREAR UN CLIENTE

1. Entra a Clientes.
2. Selecciona Nuevo cliente.
3. Selecciona el tipo de cliente.
4. Captura la información obligatoria.
5. Selecciona una sucursal.
6. Opcionalmente relaciona un producto.
7. Opcionalmente selecciona un responsable.
8. Guarda el cliente.

EDITAR UN CLIENTE

1. Busca el cliente.
2. Ábrelo.
3. Selecciona Editar.
4. Modifica la información.
5. Guarda los cambios.

Durante la edición Datara vuelve a validar:

- Tipo de cliente.
- Nombre.
- Nombre comercial si es Empresa.
- Medio de contacto.
- Formato del correo.
- Sucursal.
- Producto relacionado.
- Prospecto de origen.
- Responsable.
- Duplicados por correo.
- Duplicados por RFC.
- Duplicados por teléfono o móvil.

BUSCAR CLIENTES

La interfaz permite buscar utilizando información como:

- Nombre.
- Empresa.
- Correo.
- Teléfono.
- RFC.
- Estado.

AUTOMATIZACIONES AL CREAR

Cuando se crea un cliente, Datara ejecuta automatizaciones asociadas con:

record_created.

AUTOMATIZACIONES AL EDITAR

Cuando se actualiza un cliente, la ruta invoca automatizaciones para:

- record_updated.
- status_changed.

PERMISOS

Consultar Clientes requiere permiso de visualización del módulo contacts.

Crear Clientes requiere permiso para crear.

Editar Clientes requiere permiso de edición.

Si una acción no aparece o Datara rechaza la operación, revisa:

- Los permisos del usuario.
- El acceso a la sucursal.
- El tipo de cliente.
- La información obligatoria.
- Los medios de contacto.
- El responsable.
- El producto relacionado.
- El prospecto de origen.
- Posibles duplicados por correo, RFC, teléfono o móvil.
      `.trim(),
    },
    {
      id:
        "deals-module",

      title:
        "Uso del módulo Oportunidades",

      keywords: [
        "crear oportunidad",
        "nueva oportunidad",
        "editar oportunidad",
        "ver oportunidad",
        "oportunidad comercial",
        "cliente de oportunidad",
        "prospecto de oportunidad",
        "prospecto de origen oportunidad",
        "responsable oportunidad",
        "sucursal oportunidad",
        "etapa oportunidad",
        "estado oportunidad",
        "canal de adquisicion",
        "probabilidad de cierre",
        "fecha estimada de cierre",
        "producto oportunidad",
        "partidas oportunidad",
        "promocion oportunidad",
        "promociones por partida",
        "forma de pago oportunidad",
        "financiamiento oportunidad",
        "enganche oportunidad",
        "meses financiamiento",
        "mensualidad estimada",
        "oportunidad ganada",
        "oportunidad perdida",
        "oportunidad cancelada",
        "reserva inventario oportunidad",
        "reservas de inventario",
        "confirmar entrega oportunidad",
        "siguiente paso oportunidad",
      ],

      matchTerms: [
        "oportunidad",
        "oportunidades",
        "deal",
        "deals",
        "venta",
        "ventas",
        "producto",
        "productos",
        "promocion",
        "promociones",
        "financiamiento",
        "enganche",
        "reserva",
        "reservas",
        "inventario",
      ],

      content: `
MÓDULO OPORTUNIDADES

Ruta: Oportunidades (/crm/oportunidades).

FINALIDAD DEL MÓDULO

Oportunidades administra el seguimiento comercial de una posible venta.

Una oportunidad puede relacionarse con:

- Un Cliente.
- Un Prospecto de origen.
- Una sucursal.
- Un responsable.
- Uno o más productos o servicios.
- Promociones comerciales.

CATÁLOGOS UTILIZADOS

La interfaz carga información de:

- Productos.
- Clientes.
- Prospectos.
- Responsables.
- Sucursales.

La sucursal primaria puede utilizarse como valor inicial.

RELACIÓN CON CLIENTE O PROSPECTO

Toda oportunidad debe tener al menos:

- Un Cliente, o
- Un Prospecto de origen.

Datara valida que los registros relacionados pertenezcan a la misma empresa.

No debe indicarse que una oportunidad puede crearse sin Cliente ni Prospecto.

NOMBRE DE LA OPORTUNIDAD

El nombre es obligatorio.

La interfaz puede generar automáticamente el nombre usando la relación
comercial y los productos seleccionados.

Por ejemplo, puede utilizar:

Cliente - Producto

o, si existen varias partidas:

Cliente - 3 productos

El usuario puede editar manualmente el nombre.

SUCURSAL

La sucursal es obligatoria.

Datara valida que el usuario tenga acceso a la sucursal seleccionada.

Las consultas de oportunidades también respetan el acceso por sucursal.

RESPONSABLE

La oportunidad requiere un responsable.

El responsable debe ser un miembro activo de la empresa.

Si el backend no recibe un responsable al resolver la operación, puede usar
al usuario actual como referencia.

ETAPA

La etapa de la oportunidad es obligatoria.

Las opciones disponibles dependen de la configuración del módulo.

ESTADO

La oportunidad tiene un Estado independiente de la Etapa.

Entre los estados con comportamiento especial están:

- Ganada.
- Perdida.
- Cancelada.

CANAL DE ADQUISICIÓN

La oportunidad puede almacenar un Canal de adquisición.

Este dato también se utiliza para determinar la elegibilidad de promociones.

PROBABILIDAD DE CIERRE

La probabilidad debe estar entre:

0 y 100.

Datara rechaza valores fuera de ese rango.

FECHA ESTIMADA DE CIERRE

La oportunidad puede almacenar una Fecha estimada de cierre.

PRODUCTOS O SERVICIOS

Toda oportunidad debe tener al menos una partida.

Cada partida requiere:

- Producto o servicio.
- Cantidad.

La cantidad debe ser un número entero mayor que cero.

La interfaz no permite eliminar la última partida.

PRODUCTOS ACTIVOS

Los productos seleccionados deben:

- Pertenecer al mismo tenant.
- Estar activos.

Datara rechaza productos inexistentes, inactivos o pertenecientes a otra
empresa.

MONEDA

Todos los productos de una misma oportunidad deben utilizar la misma moneda.

Si las partidas usan monedas diferentes, Datara rechaza la operación.

PROMOCIONES POR PARTIDA

Cada partida puede tener sus propias promociones.

La interfaz consulta promociones elegibles según:

- Producto.
- Canal de adquisición.
- Tipo de cliente.

Si una promoción deja de ser elegible, la interfaz puede retirarla de la
selección.

VALIDACIÓN DE PROMOCIONES

Datara vuelve a validar las promociones en backend.

No se confía únicamente en lo mostrado por la interfaz.

Una promoción puede ser rechazada si:

- Está pausada.
- No está vigente.
- Ya no tiene beneficios disponibles.
- No aplica al producto.
- Debe aplicarse a una partida específica.
- No aplica al canal seleccionado.
- No aplica al tipo de cliente.

PROMOCIONES GENERALES

El backend soporta promociones de alcance general sobre la oportunidad.

Actualmente la interfaz operativa envía:

generalPromotionIds: []

Por lo tanto, el flujo visible usa principalmente promociones por partida.

GRUPOS DE PROMOCIONES

Las promociones pueden pertenecer a grupos.

Cuando existen promociones incompatibles dentro del mismo grupo y alguna
requiere selección, la interfaz evita combinaciones no permitidas.

Antes de aceptar la selección se ejecuta la validación comercial de
promociones.

FORMA DE PAGO

Cada partida puede manejar:

- Por definir.
- Contado.
- Financiamiento.

Una promoción puede determinar o restringir automáticamente la forma de
pago.

MESES DE FINANCIAMIENTO

Cuando una promoción ofrece plazos disponibles, el usuario debe seleccionar
uno de esos plazos.

Los meses deben ser valores enteros válidos y mayores que cero.

ENGANCHE

Para operaciones financiadas Datara puede calcular:

- Enganche mínimo.
- Enganche del cliente.

El enganche del cliente no puede ser negativo.

SALDO A FINANCIAR

Datara calcula el importe restante después del enganche.

MENSUALIDAD ESTIMADA

Cuando existe financiamiento, Datara calcula una mensualidad estimada con
base en las condiciones de la partida.

RESUMEN DE LA OPORTUNIDAD

La interfaz muestra:

- Subtotal.
- Descuentos.
- Total.
- Condiciones de pago por partida.
- Promociones aplicadas.
- Enganche mínimo.
- Enganche del cliente.
- Saldo a financiar.
- Plazo.
- Mensualidad estimada.

CÁLCULO EN BACKEND

Antes de guardar, Datara vuelve a ejecutar el cálculo de la oportunidad.

Si el cálculo devuelve errores, la operación se rechaza.

Datara guarda:

- calculationSnapshot de la oportunidad.
- calculationSnapshot por cada partida.
- snapshot de cada promoción aplicada.

Esto conserva las condiciones comerciales utilizadas al momento del cálculo.

CONSUMO DE PROMOCIONES

Al crear una oportunidad, Datara incrementa usedBenefits según las
promociones aplicadas.

Al editar una oportunidad, Datara compara:

- Uso anterior.
- Uso nuevo.

Después ajusta usedBenefits utilizando únicamente la diferencia.

El contador nunca debe quedar por debajo de cero.

ESTADOS CERRADOS

Datara considera cerrados los estados:

- Ganada.
- Perdida.
- Cancelada.

Cuando una oportunidad entra en uno de esos estados, se registra closedAt.

Si posteriormente deja de estar en un estado cerrado, closedAt puede volver
a quedar vacío.

MARCAR OPORTUNIDAD COMO GANADA

Una oportunidad no puede marcarse como Ganada si no tiene reservas activas
de inventario suficientes.

Datara verifica las reservas asociadas con:

sourceType = Oportunidad

y con el identificador de la oportunidad.

Debe existir al menos una reserva activa.

Además, la cantidad reservada por producto debe cubrir las cantidades
requeridas por las partidas.

Si las reservas son insuficientes, Datara rechaza el cambio con conflicto
409.

El mensaje puede indicar qué producto requiere más unidades reservadas.

RESERVAS AL GANAR

Cuando la oportunidad se marca como Ganada:

- Las reservas NO se liberan.
- Permanecen activas.

El siguiente paso operativo es confirmar la entrega desde Inventarios.

Después de marcar la oportunidad como Ganada, la interfaz ofrece:

Revisar reservas y confirmar entrega.

Ese botón dirige a Inventarios filtrando las reservas de la oportunidad.

OPORTUNIDAD PERDIDA

Cuando una oportunidad cambia a Perdida, Datara libera automáticamente sus
reservas activas de inventario.

Las reservas pasan a estado:

Liberada.

También se registra como motivo:

Oportunidad perdida.

OPORTUNIDAD CANCELADA

Cuando una oportunidad cambia a Cancelada, Datara libera automáticamente sus
reservas activas de inventario.

Las reservas pasan a estado:

Liberada.

También se registra como motivo:

Oportunidad cancelada.

LIBERACIÓN DE INVENTARIO

Cuando se liberan reservas por una oportunidad Perdida o Cancelada, Datara
actualiza también la cantidad reservada del stock correspondiente.

La cantidad reservada del inventario no debe quedar por debajo de cero.

CREAR UNA OPORTUNIDAD

1. Entra a Oportunidades.
2. Selecciona Nueva oportunidad.
3. Selecciona una sucursal.
4. Captura o confirma el nombre.
5. Selecciona Cliente o Prospecto.
6. Selecciona un responsable.
7. Selecciona la Etapa.
8. Selecciona el Estado.
9. Opcionalmente selecciona Canal de adquisición.
10. Agrega al menos una partida.
11. Selecciona los productos.
12. Indica cantidades.
13. Selecciona promociones elegibles si corresponde.
14. Configura las condiciones de pago.
15. Revisa el resumen.
16. Guarda la oportunidad.

EDITAR UNA OPORTUNIDAD

Al editar, Datara vuelve a validar:

- Sucursal.
- Nombre.
- Etapa.
- Cliente o Prospecto.
- Responsable.
- Productos.
- Cantidades.
- Moneda.
- Promociones.
- Elegibilidad de promociones.
- Forma de pago.
- Financiamiento.
- Cálculo comercial.
- Reservas de inventario si se intenta marcar como Ganada.

SIGUIENTE PASO

La oportunidad puede almacenar un campo Siguiente paso.

OBSERVACIONES

También puede almacenar observaciones o notas comerciales.

AUTOMATIZACIONES AL CREAR

Al crear una oportunidad, Datara ejecuta automatizaciones para:

record_created.

AUTOMATIZACIONES AL EDITAR

Al editar una oportunidad, Datara ejecuta automatizaciones para:

- record_updated.
- status_changed.

PERMISOS

Consultar Oportunidades requiere permiso de visualización del módulo deals.

Crear Oportunidades requiere permiso para crear.

Editar Oportunidades requiere permiso de edición.

Además, las operaciones respetan el acceso por sucursal.

SI NO SE PUEDE MARCAR COMO GANADA

Revisa:

- Que exista una reserva activa.
- Que la reserva corresponda a la misma oportunidad.
- Que cada producto tenga cantidad reservada suficiente.
- Que el usuario tenga acceso a la sucursal.
- Que la información comercial siga siendo válida.

SI UNA PROMOCIÓN NO APARECE O ES RECHAZADA

Revisa:

- Vigencia.
- Estado pausado.
- Beneficios disponibles.
- Producto.
- Canal de adquisición.
- Tipo de cliente.
- Grupo de promociones.
- Forma de pago.
- Plazo disponible.

SI UNA ACCIÓN NO APARECE O DATARA RECHAZA LA OPERACIÓN

Revisa:

- Los permisos del usuario.
- El acceso a la sucursal.
- El Cliente o Prospecto relacionado.
- El responsable.
- La Etapa.
- El Estado.
- Los productos.
- Las cantidades.
- La moneda.
- Las promociones.
- Las condiciones de financiamiento.
- Las reservas de inventario.
      `.trim(),
    },

  ];

function normalizeSearchText(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[̀-ͯ]/g,
      "",
    )
    .toLowerCase();
}

function getSearchTokens(
  value: string,
): string[] {
  return normalizeSearchText(
    value,
  )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .split(
      /\s+/,
    )
    .filter(
      (token) =>
        token.length >= 3,
    );
}

function getEditDistance(
  first: string,
  second: string,
): number {
  const previous =
    Array.from(
      {
        length:
          second.length + 1,
      },
      (
        _value,
        index,
      ) =>
        index,
    );

  for (
    let firstIndex = 1;
    firstIndex <= first.length;
    firstIndex += 1
  ) {
    const current = [
      firstIndex,
    ];

    for (
      let secondIndex = 1;
      secondIndex <= second.length;
      secondIndex += 1
    ) {
      const substitutionCost =
        first[
          firstIndex - 1
        ] ===
        second[
          secondIndex - 1
        ]
          ? 0
          : 1;

      current.push(
        Math.min(
          current[
            secondIndex - 1
          ] + 1,

          previous[
            secondIndex
          ] + 1,

          previous[
            secondIndex - 1
          ] +
            substitutionCost,
        ),
      );
    }

    previous.splice(
      0,
      previous.length,
      ...current,
    );
  }

  return previous[
    second.length
  ];
}

function matchesTerm(
  questionTokens: string[],
  term: string,
): boolean {
  const normalizedTerm =
    normalizeSearchText(
      term,
    );

  return questionTokens.some(
    (token) => {
      if (
        token ===
        normalizedTerm
      ) {
        return true;
      }

      if (
        token.length < 5 ||
        normalizedTerm.length < 5
      ) {
        return false;
      }

      const maximumDistance =
        Math.max(
          token.length,
          normalizedTerm.length,
        ) >= 9
          ? 2
          : 1;

      return (
        getEditDistance(
          token,
          normalizedTerm,
        ) <=
        maximumDistance
      );
    },
  );
}

export function getRelevantCRMKnowledge(
  question: string,
  options?: {
    allowedModuleIds?: string[];
    isAdministrator?: boolean;
  },
): CRMKnowledgeArticle[] {
  const normalizedQuestion =
    normalizeSearchText(
      question,
    );

  const questionTokens =
    getSearchTokens(
      question,
    );

  const allowedModuleIds =
    new Set(
      options
        ?.allowedModuleIds ??
        [],
    );

  const isAdministrator =
    options
      ?.isAdministrator ??
    false;

  return CRM_KNOWLEDGE_ARTICLES.filter(
    (article) => {
      if (
        CRM_ADMIN_ONLY_ARTICLE_IDS.has(
          article.id,
        ) &&
        !isAdministrator
      ) {
        return false;
      }

      const articleModuleIds =
        CRM_KNOWLEDGE_ARTICLE_MODULES[
          article.id
        ] ?? [];

      if (
        articleModuleIds.length > 0
      ) {
        const hasModuleAccess =
          articleModuleIds.some(
            (moduleId) =>
              allowedModuleIds.has(
                moduleId,
              ),
          );

        if (!hasModuleAccess) {
          return false;
        }
      }

      const matchesPhrase =
        article.keywords.some(
          (keyword) =>
            normalizedQuestion.includes(
              normalizeSearchText(
                keyword,
              ),
            ),
        );

      if (matchesPhrase) {
        return true;
      }

      return article.matchTerms.some(
        (term) =>
          matchesTerm(
            questionTokens,
            term,
          ),
      );
    },
  );
}
