// Catálogo de las 30 consultas complejas (10 por integrante) tal como las
// envía el frontend a POST /graphql. Cada una indica sus parámetros.
const hoy = new Date();
const anio = hoy.getFullYear();
const haceUnAnio = new Date(hoy.getTime() - 365 * 864e5).toISOString().slice(0, 10);
const hoyTxt = hoy.toISOString().slice(0, 10);

const desdeHasta = [
  { nombre: 'desde', tipo: 'Fecha', etiqueta: 'Desde', defecto: haceUnAnio },
  { nombre: 'hasta', tipo: 'Fecha', etiqueta: 'Hasta', defecto: hoyTxt },
];

export const GRUPOS = [
  {
    integrante: 'Antony Daniel Ocegueda Ruelas',
    tema: 'Libros, autores e inventario',
    consultas: [
      { id: 'inventarioPorCategoria', titulo: 'Inventario por categoría', descripcion: 'Títulos y ejemplares por categoría, separados por estado físico ($unwind de ejemplares + $group con $cond).', params: [],
        query: `query {\n  inventarioPorCategoria {\n    categoria titulos ejemplaresTotales disponibles prestados enReparacion extraviados porcentajeDisponible\n  }\n}` },
      { id: 'librosMasPrestados', titulo: 'Libros más prestados', descripcion: 'Ranking del periodo con lectores distintos y préstamos por ejemplar, para saber dónde hacen falta copias ($group + $lookup).', params: [{ nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántos', defecto: 10 }, ...desdeHasta],
        query: `query ($limite: Int, $desde: Fecha, $hasta: Fecha) {\n  librosMasPrestados(limite: $limite, desde: $desde, hasta: $hasta) {\n    titulo autor categoria prestamos lectoresUnicos ejemplaresTotales prestamosPorEjemplar\n  }\n}` },
      { id: 'librosSinMovimiento', titulo: 'Libros sin movimiento', descripcion: 'Títulos que nadie ha pedido en N meses: candidatos a exhibirse o revisarse ($lookup con pipeline + $dateDiff).', params: [{ nombre: 'meses', tipo: 'Int', etiqueta: 'Meses', defecto: 12 }, { nombre: 'categoria', tipo: 'String', etiqueta: 'Categoría', defecto: '' }, { nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántos', defecto: 30 }],
        query: `query ($meses: Int, $categoria: String, $limite: Int) {\n  librosSinMovimiento(meses: $meses, categoria: $categoria, limite: $limite) {\n    titulo autor categoria sala ejemplaresTotales ultimoPrestamo mesesSinPrestamo\n  }\n}` },
      { id: 'autoresMasLeidos', titulo: 'Autores más leídos', descripcion: 'Préstamos → libro → autor con dos $lookup encadenados.', params: [{ nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántos', defecto: 10 }],
        query: `query ($limite: Int) {\n  autoresMasLeidos(limite: $limite) {\n    nombre nacionalidad prestamos titulosPrestados lectoresUnicos\n  }\n}` },
      { id: 'librosAgotadosConDemanda', titulo: 'Agotados con lectores esperando', descripcion: 'Lista de compras sugerida: libros sin copias disponibles y con reservas pendientes ($lookup + $switch de prioridad).', params: [],
        query: `query {\n  librosAgotadosConDemanda {\n    titulo autor categoria ejemplaresTotales reservasPendientes proximaDevolucion prioridadCompra\n  }\n}` },
      { id: 'distribucionPorPeriodo', titulo: 'Antigüedad de las obras', descripcion: 'Títulos por periodo de primera edición con $bucket.', params: [{ nombre: 'categoria', tipo: 'String', etiqueta: 'Categoría', defecto: '' }],
        query: `query ($categoria: String) {\n  distribucionPorPeriodo(categoria: $categoria) {\n    periodo titulos ejemplares paginasPromedio\n  }\n}` },
      { id: 'busquedaAvanzada', titulo: 'Búsqueda avanzada con facetas', descripcion: 'Resultados, total y facetas por categoría y sala en UNA consulta con $facet.', params: [{ nombre: 'texto', tipo: 'String', etiqueta: 'Texto', defecto: 'historia' }, { nombre: 'anioDesde', tipo: 'Int', etiqueta: 'Año desde', defecto: '' }, { nombre: 'soloDisponibles', tipo: 'Boolean', etiqueta: 'Solo disponibles', defecto: false }],
        armar: (p) => ({ filtro: { texto: p.texto || null, anioDesde: p.anioDesde ?? null, soloDisponibles: p.soloDisponibles } }),
        query: `query ($filtro: FiltroLibros!) {\n  busquedaAvanzada(filtro: $filtro, porPagina: 10) {\n    total paginas\n    facetasCategoria { valor cantidad }\n    facetasSala { valor cantidad }\n    libros { titulo autorNombre categoria anioPublicacion ejemplaresDisponibles ejemplaresTotales }\n  }\n}` },
      { id: 'origenDelAcervo', titulo: 'Origen del acervo por sala', descripcion: 'Compra, donación o dotación de la DGB, con su porcentaje dentro de cada sala (dos $group + $unwind).', params: [],
        query: `query {\n  origenDelAcervo { sala origen ejemplares porcentaje }\n}` },
      { id: 'autoresPorNacionalidad', titulo: 'Aporte por nacionalidad', descripcion: 'Autores, títulos, ejemplares y préstamos por país ($lookup sobre un arreglo de ids).', params: [{ nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántas', defecto: 15 }],
        query: `query ($limite: Int) {\n  autoresPorNacionalidad(limite: $limite) {\n    nacionalidad autores titulos ejemplares prestamos\n  }\n}` },
      { id: 'rotacionPorCategoria', titulo: 'Índice de rotación', descripcion: 'Préstamos del periodo entre ejemplares, por categoría; indicador clásico de uso del acervo.', params: desdeHasta,
        query: `query ($desde: Fecha, $hasta: Fecha) {\n  rotacionPorCategoria(desde: $desde, hasta: $hasta) {\n    categoria prestamos ejemplares indiceRotacion nivel\n  }\n}` },
    ],
  },
  {
    integrante: 'Víctor Alberto Ibarra García',
    tema: 'Lectores y hábitos de lectura',
    consultas: [
      { id: 'lectoresMasActivos', titulo: 'Lectores más activos', descripcion: 'Préstamos, libros distintos, categoría favorita y devoluciones tarde (dos $group + $reduce con $setUnion).', params: [{ nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántos', defecto: 10 }, ...desdeHasta],
        query: `query ($limite: Int, $desde: Fecha, $hasta: Fecha) {\n  lectoresMasActivos(limite: $limite, desde: $desde, hasta: $hasta) {\n    credencial nombre ocupacion prestamos librosDistintos categoriaFavorita devolucionesTarde\n  }\n}` },
      { id: 'lectoresConAtrasos', titulo: 'Lectores con atrasos', descripcion: 'Quién debe libros, cuántos días y el teléfono del fiador para llamarle.', params: [],
        query: `query {\n  lectoresConAtrasos {\n    credencial nombre telefono fiadorNombre fiadorTelefono librosAtrasados diasAtrasoMaximo titulos\n  }\n}` },
      { id: 'credencialesPorVencer', titulo: 'Credenciales por vencer', descripcion: 'Credenciales que vencen pronto y si el lector tiene libros prestados.', params: [{ nombre: 'dias', tipo: 'Int', etiqueta: 'Próximos días', defecto: 30 }],
        query: `query ($dias: Int) {\n  credencialesPorVencer(dias: $dias) {\n    credencial nombre telefono email vigencia diasRestantes prestamosActivos\n  }\n}` },
      { id: 'perfilDemografico', titulo: 'Perfil demográfico del padrón', descripcion: 'Ocupación, edad, municipio, sexo y tipo en una sola pasada ($facet + $bucket por edad).', params: [],
        query: `query {\n  perfilDemografico {\n    total\n    porEdad { valor cantidad }\n    porOcupacion { valor cantidad }\n    porMunicipio { valor cantidad }\n    porSexo { valor cantidad }\n    porTipo { valor cantidad }\n  }\n}` },
      { id: 'lectoresInactivos', titulo: 'Lectores inactivos', descripcion: 'Credencial vigente pero sin préstamos en N meses: base para una campaña de reactivación.', params: [{ nombre: 'meses', tipo: 'Int', etiqueta: 'Meses', defecto: 6 }, { nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántos', defecto: 50 }],
        query: `query ($meses: Int, $limite: Int) {\n  lectoresInactivos(meses: $meses, limite: $limite) {\n    credencial nombre telefono email ultimoPrestamo mesesInactivo totalPrestamos\n  }\n}` },
      { id: 'historialLector', titulo: 'Historial de un lector', descripcion: 'Todos sus préstamos, puntualidad y categorías ($lookup + $filter + $size).', params: [{ nombre: 'credencial', tipo: 'String!', etiqueta: 'Credencial', defecto: '' }],
        query: `query ($credencial: String!) {\n  historialLector(credencial: $credencial) {\n    lector { nombreCompleto credencial situacion }\n    totalPrestamos activos devueltosATiempo devueltosTarde porcentajePuntualidad\n    categorias { valor cantidad }\n    prestamos { tituloLibro fechaPrestamo fechaDevolucion situacion }\n  }\n}` },
      { id: 'recomendacionesParaLector', titulo: 'Recomendaciones', descripcion: '“Quien leyó lo mismo también leyó…”: lector → libros → lectores parecidos → sus otros libros.', params: [{ nombre: 'credencial', tipo: 'String', etiqueta: 'Credencial', defecto: '' }, { nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántas', defecto: 5 }],
        previo: async (p, gql) => {
          const { lector } = await gql('query($c: String) { lector(credencial: $c) { id } }', { c: p.credencial });
          if (!lector) throw new Error('No existe un lector con esa credencial');
          return { lectorId: lector.id, limite: p.limite };
        },
        query: `query ($lectorId: ID!, $limite: Int) {\n  recomendacionesParaLector(lectorId: $lectorId, limite: $limite) {\n    titulo autor categoria lectoresEnComun disponible motivo\n  }\n}` },
      { id: 'registrosPorMes', titulo: 'Credenciales nuevas por mes', descripcion: 'Altas del año por mes y tipo de lector (dos $group con $month en hora de Tepic).', params: [{ nombre: 'anio', tipo: 'Int!', etiqueta: 'Año', defecto: anio }],
        query: `query ($anio: Int!) {\n  registrosPorMes(anio: $anio) {\n    nombreMes total porTipo { valor cantidad }\n  }\n}` },
      { id: 'puntualidadPorOcupacion', titulo: 'Puntualidad por ocupación', descripcion: 'Porcentaje de devoluciones a tiempo y atraso promedio según la ocupación del lector.', params: [],
        query: `query {\n  puntualidadPorOcupacion {\n    ocupacion devoluciones aTiempo tarde porcentajePuntualidad atrasoPromedioDias\n  }\n}` },
      { id: 'lectoresPorColonia', titulo: 'Lectores por colonia', descripcion: 'Dónde vive el público y cuánto lee cada colonia ($lookup con pipeline + $group).', params: [{ nombre: 'municipio', tipo: 'String', etiqueta: 'Municipio', defecto: 'Tepic' }, { nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántas', defecto: 15 }],
        query: `query ($municipio: String, $limite: Int) {\n  lectoresPorColonia(municipio: $municipio, limite: $limite) {\n    colonia lectores lectoresActivos prestamos prestamosPorLector\n  }\n}` },
    ],
  },
  {
    integrante: 'Pablo Iván Calleros Cortés',
    tema: 'Préstamos, devoluciones y reservas',
    consultas: [
      { id: 'prestamosVencidos', titulo: 'Préstamos vencidos', descripcion: 'Atrasos con teléfono del lector, reservas en espera y gravedad ($dateDiff + $switch).', params: [{ nombre: 'diasMinimos', tipo: 'Int', etiqueta: 'Mínimo de días', defecto: 1 }],
        query: `query ($diasMinimos: Int) {\n  prestamosVencidos(diasMinimos: $diasMinimos) {\n    titulo codigoEjemplar lector credencial telefono fechaVencimiento diasAtraso reservasEnEspera gravedad\n  }\n}` },
      { id: 'estadisticasMensuales', titulo: 'Estadística mensual', descripcion: 'Préstamos, devoluciones, renovaciones y tasa de atraso por mes ($facet + $map sobre $range).', params: [{ nombre: 'anio', tipo: 'Int!', etiqueta: 'Año', defecto: anio }],
        query: `query ($anio: Int!) {\n  estadisticasMensuales(anio: $anio) {\n    nombreMes prestamos devoluciones renovaciones devueltosTarde tasaAtraso\n  }\n}` },
      { id: 'afluenciaPorDiaYHora', titulo: 'Afluencia por día y hora', descripcion: 'Cuándo se presta más, en hora de Tepic, para planear turnos ($dayOfWeek, $hour con zona horaria).', params: desdeHasta,
        query: `query ($desde: Fecha, $hasta: Fecha) {\n  afluenciaPorDiaYHora(desde: $desde, hasta: $hasta) {\n    diaPico horaPico\n    porDia { valor cantidad }\n    porHora { valor cantidad }\n  }\n}` },
      { id: 'duracionPorCategoria', titulo: 'Duración de los préstamos', descripcion: 'Días promedio y máximo que se queda un libro, y cuántos se renuevan, por categoría.', params: [],
        query: `query {\n  duracionPorCategoria {\n    categoria prestamosDevueltos diasPromedio diasMaximo porcentajeRenovados\n  }\n}` },
      { id: 'colaReservas', titulo: 'Cola de reservas', descripcion: 'Turno de cada lector en la cola de cada libro con $setWindowFields y $documentNumber.', params: [],
        query: `query {\n  colaReservas {\n    titulo posicion totalEnCola lector credencial fechaSolicitud diasEsperando\n  }\n}` },
      { id: 'desempenoReservas', titulo: 'Desempeño de las reservas', descripcion: 'Atendidas, expiradas y canceladas por categoría, con días de espera.', params: desdeHasta,
        query: `query ($desde: Fecha, $hasta: Fecha) {\n  desempenoReservas(desde: $desde, hasta: $hasta) {\n    categoria total atendidas expiradas canceladas tasaAtencion diasEsperaPromedio\n  }\n}` },
      { id: 'prestamosPorSalaYTipo', titulo: 'Sala × tipo de lector', descripcion: 'Tabla cruzada con el peso de cada tipo de lector dentro de cada sala.', params: desdeHasta,
        query: `query ($desde: Fecha, $hasta: Fecha) {\n  prestamosPorSalaYTipo(desde: $desde, hasta: $hasta) {\n    sala tipoLector prestamos porcentajeDeSala\n  }\n}` },
      { id: 'pronosticoDisponibilidad', titulo: 'Pronóstico de devoluciones', descripcion: 'Qué ejemplares deben regresar cada día y quién sigue en la cola ($group por $dateToString).', params: [{ nombre: 'dias', tipo: 'Int', etiqueta: 'Próximos días', defecto: 7 }],
        query: `query ($dias: Int) {\n  pronosticoDisponibilidad(dias: $dias) {\n    fecha devolucionesEsperadas\n    libros { titulo codigoEjemplar lector reservasEnEspera siguienteEnCola }\n  }\n}` },
      { id: 'librosConMasRenovaciones', titulo: 'Libros que más se renuevan', descripcion: 'Señal de que hacen falta más copias; sugiere adquirir cuando hay pocas.', params: [{ nombre: 'limite', tipo: 'Int', etiqueta: 'Cuántos', defecto: 10 }],
        query: `query ($limite: Int) {\n  librosConMasRenovaciones(limite: $limite) {\n    titulo categoria prestamos renovacionesTotales promedioRenovaciones ejemplaresTotales sugerenciaAdquirir\n  }\n}` },
      { id: 'tableroOperativo', titulo: 'Tablero del día', descripcion: 'Préstamos y devoluciones de hoy, vencidos y reservas en UNA consulta ($facet + $lookup sin condición).', params: [],
        query: `query {\n  tableroOperativo {\n    fecha prestamosHoy devolucionesHoy lectoresAtendidosHoy activos vencidos reservasPendientes reservasPorRecoger\n    categoriasSemana { valor cantidad }\n  }\n}` },
    ],
  },
];
