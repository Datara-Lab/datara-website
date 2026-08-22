export type CRMKnowledgeArticle = {
  id: string;
  title: string;
  keywords: string[];
  matchTerms: string[];
  content: string;
};

const CRM_KNOWLEDGE_ARTICLES:
  CRMKnowledgeArticle[] = [
    {
      id:
        "deals-module",

      title:
        "Uso del módulo Oportunidades",

      keywords: [
        "nueva oportunidad",
        "crear oportunidad",
        "registrar oportunidad",
        "agregar oportunidad",
        "editar oportunidad",
        "buscar oportunidad",
        "filtrar oportunidades",
        "etapa de oportunidad",
        "estado de oportunidad",
        "responsable de oportunidad",
        "asignar oportunidad",
        "oportunidad desde prospecto",
        "oportunidad para cliente",
        "prospecto a oportunidad",
        "agregar producto a oportunidad",
        "quitar producto de oportunidad",
        "promocion en oportunidad",
        "descuento en oportunidad",
        "marcar oportunidad ganada",
        "ganar oportunidad",
        "perder oportunidad",
        "cancelar oportunidad",
        "oportunidad perdida",
        "reserva de oportunidad",
        "entregar oportunidad",
        "columnas de oportunidades",
        "eliminar oportunidad",
      ],

      matchTerms: [
        "oportunidad",
        "oportunidades",
        "deal",
        "deals",
        "negociacion",
        "negociaciones",
      ],

      content: `
MÓDULO OPORTUNIDADES

Ruta: Oportunidades (/crm/oportunidades).

El nombre singular y plural del módulo puede ser personalizado por la
empresa. Esta guía utiliza los nombres predeterminados Oportunidad y
Oportunidades.

FINALIDAD DEL MÓDULO

Oportunidades administra procesos comerciales con posibilidad de
convertirse en una venta. Una oportunidad puede relacionarse con un
cliente o con un prospecto de origen, incluir productos, promociones,
condiciones de pago y seguimiento comercial.

CREAR UNA OPORTUNIDAD

1. En el menú del CRM, entra a Oportunidades.
2. Selecciona Nueva oportunidad. El texto utiliza el nombre singular
   configurado por la empresa.
3. Selecciona la Sucursal.
4. Captura el Nombre de la oportunidad.
5. Selecciona un Cliente o un Prospecto de origen. Es obligatorio elegir
   al menos uno de los dos.
6. Selecciona el Responsable.
7. Selecciona la Etapa y el Estado.
8. Si aplica, captura canal de adquisición, probabilidad, fecha estimada
   de cierre, siguiente paso y notas.
9. Agrega los productos o servicios de la operación y sus cantidades.
10. Configura método de pago, enganche o meses de financiamiento cuando
    corresponda.
11. Revisa las promociones disponibles y selecciona las aplicables.
12. Revisa el resumen y guarda la oportunidad.

Son obligatorios el nombre, la sucursal, un cliente o prospecto, el
responsable, la etapa y el estado.

CREARLA DESDE UN PROSPECTO

1. Entra a Oportunidades.
2. Selecciona Nueva oportunidad.
3. En Prospecto de origen, selecciona el prospecto.
4. Completa los demás datos y guarda.

La acción Convertir en cliente del módulo Prospectos no crea una
oportunidad automáticamente.

ETAPA Y ESTADO NO SON LO MISMO

Etapa representa el avance comercial. La configuración puede incluir
etapas como Propuesta, Negociación, Ganada o Perdida y puede ser
personalizada por la empresa.

Estado indica si la oportunidad está:

- Abierta.
- Ganada.
- Perdida.
- Cancelada.

BUSCAR, FILTRAR Y CAMBIAR COLUMNAS

El buscador permite localizar oportunidades por nombre, cliente, etapa,
responsable o producto.

Utiliza los filtros disponibles para limitar por campos como etapa,
estado, responsable, sucursal o fechas.

Para cambiar columnas:

1. Selecciona Columnas.
2. Marca los campos que quieres mostrar.
3. Desmarca los que quieres ocultar.
4. Selecciona Restablecer para recuperar la vista original.

EDITAR UNA OPORTUNIDAD

1. Busca y abre la oportunidad.
2. Selecciona Editar.
3. Modifica relaciones, responsable, etapa, estado, productos,
   promociones, condiciones comerciales o seguimiento.
4. Guarda los cambios.

PRODUCTOS Y CÁLCULOS

Cada partida permite seleccionar un producto, cantidad y condiciones de
pago. Los importes se calculan a partir de los datos vigentes del
Catálogo y de las promociones aplicables.

Subtotal, descuento aplicado y total son resultados calculados; no se
capturan manualmente como importes independientes.

PROMOCIONES

Las promociones compatibles se consultan para cada partida y para la
operación general. La disponibilidad puede depender del producto,
cliente, canal, método de pago y reglas configuradas. Si una promoción no
aparece, revisa esas condiciones y su vigencia en el módulo Promociones.

MARCAR UNA OPORTUNIDAD COMO GANADA

1. Abre y edita la oportunidad.
2. Cambia su Estado a Ganada.
3. Guarda los cambios.
4. Si existen productos con control de inventario, utiliza Revisar
   reservas y confirmar entrega para continuar en Inventarios.

Marcarla como Ganada no equivale por sí solo a confirmar la entrega
física del inventario.

MARCARLA COMO PERDIDA O CANCELADA

Al guardar una oportunidad con estado Perdida o Cancelada, Datara libera
las reservas activas de inventario asociadas a esa oportunidad y devuelve
las cantidades reservadas a la disponibilidad.

Si el cambio fue un error, edita nuevamente la oportunidad y corrige el
estado. Después revisa el inventario, porque las reservas liberadas no se
deben considerar restauradas automáticamente.

PROBLEMAS DE INVENTARIO AL GUARDAR

Si la oportunidad requiere productos controlados por inventario, Datara
valida las reservas activas relacionadas. Revisa existencias, sucursal,
cantidades y reservas desde Inventarios cuando el sistema indique una
insuficiencia o una entrega pendiente.

ELIMINAR UNA OPORTUNIDAD

El módulo no permite eliminar oportunidades desde su configuración
normal. Utiliza los estados Perdida o Cancelada para cerrar procesos que
no continuarán y conservar su historial.
      `.trim(),
    },

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
        "leads-module",

      title:
        "Uso del módulo Prospectos",

      keywords: [
        "nuevo prospecto",
        "crear prospecto",
        "registrar prospecto",
        "agregar prospecto",
        "dar de alta prospecto",
        "editar prospecto",
        "buscar prospecto",
        "filtrar prospectos",
        "estado del prospecto",
        "origen del prospecto",
        "responsable del prospecto",
        "asignar prospecto",
        "producto de interes",
        "consentimiento comercial",
        "convertir prospecto en cliente",
        "pasar prospecto a cliente",
        "hacer cliente a prospecto",
        "prospecto convertido",
        "eliminar prospecto",
        "columnas de prospectos",
      ],

      matchTerms: [
        "prospecto",
        "prospectos",
        "lead",
        "leads",
        "interesado",
        "interesados",
      ],

      content: `
MÓDULO PROSPECTOS

Ruta: Prospectos (/crm/prospectos).

El nombre singular y plural del módulo puede ser personalizado por la
empresa. Esta guía utiliza los nombres predeterminados Prospecto y
Prospectos.

FINALIDAD DEL MÓDULO

Prospectos registra, asigna y da seguimiento a personas interesadas en
los productos o servicios de la empresa.

CREAR UN PROSPECTO

1. En el menú del CRM, entra a Prospectos.
2. Selecciona Nuevo prospecto. El texto utiliza el nombre singular
   configurado por la empresa.
3. Captura el Nombre.
4. Captura al menos un Correo electrónico, Teléfono o Teléfono móvil.
5. Selecciona la Sucursal responsable.
6. Revisa el Estado del prospecto. El valor inicial predeterminado es
   Nuevo.
7. Opcionalmente captura Apellidos, Empresa, Origen del prospecto,
   Producto de interés, Responsable, consentimiento comercial y Notas.
8. Guarda el prospecto.

El nombre, la sucursal y al menos un medio de contacto son obligatorios.
El correo, cuando se captura, debe tener un formato válido.

ESTADOS DISPONIBLES

La configuración predeterminada incluye:

- Nuevo.
- Contactado.
- En seguimiento.
- Calificado.
- No interesado.
- Convertido.

La empresa puede proporcionar opciones personalizadas de estado.

ORÍGENES PREDETERMINADOS

Los orígenes pueden incluir Sitio web, Tienda física, WhatsApp, Facebook,
Instagram, TikTok, Llamada telefónica, Correo electrónico, Referido,
Evento, Campaña, Publicidad y Otro. La empresa puede personalizarlos.

BUSCAR UN PROSPECTO

Utiliza el buscador de la tabla. Permite buscar por nombre, apellidos,
correo, teléfono, teléfono móvil, empresa, origen y estado.

FILTRAR Y PERSONALIZAR LA TABLA

Utiliza los filtros disponibles para campos como estado, origen, sucursal,
producto de interés, responsable o consentimiento cuando aparezcan en la
configuración del módulo.

Para cambiar las columnas:

1. Selecciona Columnas en la parte superior de la tabla.
2. Marca los campos que quieres mostrar.
3. Desmarca los que quieras ocultar.
4. Selecciona Restablecer para recuperar la configuración original.

EDITAR UN PROSPECTO

1. Busca y abre el prospecto.
2. Selecciona Editar.
3. Actualiza los datos de contacto, estado, origen, producto de interés,
   responsable, consentimiento o notas.
4. Guarda los cambios.

ASIGNAR UN RESPONSABLE

Al crear o editar el prospecto, utiliza el campo Responsable. Solo se
pueden seleccionar miembros activos de la empresa disponibles para la
sucursal y el contexto del usuario.

RELACIONAR UN PRODUCTO DE INTERÉS

Al crear o editar el prospecto, utiliza Producto de interés. El selector
carga elementos disponibles del Catálogo.

CONVERTIR UN PROSPECTO EN CLIENTE

1. Busca y abre el registro del prospecto.
2. Selecciona Convertir en cliente.
3. Lee el mensaje de confirmación.
4. Confirma la conversión.

La conversión:

- Crea el cliente o reconoce que ya había sido convertido.
- Marca el prospecto como Convertido.
- Conserva el historial del prospecto.
- Transfiere al cliente los datos disponibles de contacto, empresa,
  responsable, consentimiento comercial y notas.
- No crea una oportunidad automáticamente.

Para crear una oportunidad relacionada, entra a Oportunidades, selecciona
Nueva oportunidad y elige el Prospecto de origen.

SI EL PROSPECTO YA ESTABA CONVERTIDO

Al intentar convertirlo nuevamente, Datara reconoce al cliente existente
y no debe crear otro cliente por la misma conversión.

ELIMINAR UN PROSPECTO

El módulo no permite eliminar prospectos desde su configuración normal.
Actualiza su estado para conservar el historial comercial.

CONSENTIMIENTO COMERCIAL

Activa Autoriza comunicaciones comerciales únicamente cuando la persona
haya autorizado recibir mensajes, llamadas o correos comerciales. El
campo no se activa de manera predeterminada.
      `.trim(),
    },

  {
    id:
      "customers-module",

    title:
      "Uso del módulo Clientes",

    keywords: [
      "nuevo cliente",
      "crear cliente",
      "registrar cliente",
      "agregar cliente",
      "dar de alta cliente",
      "editar cliente",
      "buscar cliente",
      "filtrar clientes",
      "estado del cliente",
      "asignar cliente",
      "responsable del cliente",
      "sucursal del cliente",
      "cliente persona",
      "cliente empresa",
      "cliente inactivo",
      "suspender cliente",
      "activar cliente",
      "correo duplicado",
      "email duplicado",
      "cliente duplicado",
      "rfc duplicado",
      "telefono duplicado",
      "numero repetido",
      "ya existe el cliente",
      "no puedo convertir prospecto",
      "prospecto con cliente existente",
      "columnas de clientes",
      "eliminar cliente",
      "consentimiento comercial del cliente",
    ],

    matchTerms: [
      "cliente",
      "clientes",
      "customer",
      "customers",
      "comprador",
      "compradores",
      "duplicado",
      "duplicados",
      "repetido",
      "repetidos",
      "rfc",
    ],

    content: `
MÓDULO CLIENTES

Ruta: Clientes (/crm/clientes).

El nombre singular y plural del módulo puede ser personalizado por la
empresa. Esta guía utiliza los nombres predeterminados Cliente y Clientes.

FINALIDAD DEL MÓDULO

Clientes conserva la información de las personas y empresas que mantienen
una relación comercial con el negocio. Los registros pueden relacionarse
con prospectos, productos, responsables, sucursales y operaciones
comerciales.

CREAR UN CLIENTE

1. En el menú del CRM, entra a Clientes.
2. Selecciona Nuevo cliente. El texto utiliza el nombre singular
   configurado por la empresa.
3. Selecciona el tipo Persona o Empresa.
4. Captura el Nombre.
5. Si seleccionaste Empresa, captura también la Razón social o nombre de
   la empresa solicitado por el formulario.
6. Captura al menos un Correo electrónico, Teléfono o Teléfono móvil.
7. Selecciona la Sucursal responsable.
8. Opcionalmente completa responsable, producto relacionado, RFC o
   identificación fiscal, dirección, consentimiento comercial y notas.
9. Guarda el cliente.

El correo, cuando se captura, debe tener un formato válido.

PERSONA Y EMPRESA

Utiliza Persona para clientes individuales. Utiliza Empresa cuando el
registro representa una organización o negocio. El formulario puede
mostrar campos adicionales según el tipo seleccionado.

BUSCAR UN CLIENTE

Utiliza el buscador de la tabla para localizar clientes por los campos
disponibles, como nombre, empresa, correo electrónico, teléfono, RFC o
estado.

FILTRAR Y PERSONALIZAR LA TABLA

Utiliza los filtros disponibles para limitar los resultados por campos como
estado, tipo de cliente, sucursal, responsable o producto relacionado.

Para cambiar las columnas:

1. Selecciona Columnas en la parte superior de la tabla.
2. Marca los campos que quieres mostrar.
3. Desmarca los que quieras ocultar.
4. Selecciona Restablecer para recuperar la configuración original.

EDITAR UN CLIENTE

1. Busca y abre el cliente.
2. Selecciona Editar.
3. Actualiza sus datos de contacto, fiscales, comerciales, sucursal,
   responsable, estado o notas.
4. Guarda los cambios.

ESTADO DEL CLIENTE

El cliente puede utilizar estados como Activo, Inactivo o Suspendido según
la configuración disponible. Para corregir un estado equivocado, abre el
cliente, selecciona Editar, elige el estado correcto y guarda los cambios.

PREVENCIÓN DE CLIENTES DUPLICADOS

Dentro de una misma empresa, Datara evita crear o guardar dos clientes con
el mismo:

- Correo electrónico.
- RFC o identificación fiscal.
- Número de Teléfono o Teléfono móvil.

Los correos se comparan sin distinguir mayúsculas y minúsculas. Los RFC se
normalizan en mayúsculas. Los teléfonos se comparan utilizando sus dígitos,
por lo que espacios, guiones o paréntesis no permiten registrar el mismo
número dos veces.

La comparación telefónica es cruzada: un número guardado como Teléfono
también impide registrar ese mismo número como Teléfono móvil en otro
cliente.

QUÉ HACER SI APARECE UN DUPLICADO

1. No intentes crear otro registro con datos ligeramente modificados.
2. Busca al cliente por correo, teléfono, nombre o RFC.
3. Abre el registro existente.
4. Verifica que corresponda a la misma persona o empresa.
5. Edita el cliente existente si necesitas actualizar sus datos.
6. Si realmente son clientes diferentes que comparten un teléfono o correo,
   solicita apoyo a un administrador antes de cambiar información.

CONVERSIÓN DE PROSPECTOS Y DUPLICADOS

Cuando se convierte un prospecto en cliente, Datara primero verifica si ese
mismo prospecto ya había sido convertido. Si es así, reconoce al cliente
existente y no crea otro.

Si el correo o teléfono del prospecto ya pertenece a otro cliente, la
conversión se detiene y muestra un conflicto. Debes revisar el cliente
existente; Datara no vincula automáticamente registros distintos porque
compartir un dato de contacto no garantiza que sean la misma persona.

RELACIÓN CON EL PROSPECTO DE ORIGEN

Un cliente creado mediante conversión conserva la relación con su prospecto
de origen y recibe los datos disponibles de contacto, responsable,
consentimiento y notas. Convertir el prospecto no crea una oportunidad
automáticamente.

SUCURSAL Y RESPONSABLE

La Sucursal identifica el ámbito operativo del cliente. El Responsable es
el miembro encargado de su seguimiento comercial. Las opciones disponibles
dependen del acceso y de los miembros activos de la empresa.

CONSENTIMIENTO COMERCIAL

Activa la autorización de comunicaciones comerciales únicamente cuando el
cliente haya aceptado recibir mensajes, llamadas o correos comerciales.

ELIMINAR UN CLIENTE

El módulo no permite eliminar clientes desde su configuración normal.
Actualiza su estado para conservar el historial y las relaciones
comerciales.
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
): CRMKnowledgeArticle[] {
  const normalizedQuestion =
    normalizeSearchText(
      question,
    );

  const questionTokens =
    getSearchTokens(
      question,
    );

  return CRM_KNOWLEDGE_ARTICLES.filter(
    (article) => {
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
