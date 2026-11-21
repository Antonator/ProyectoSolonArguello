// Esquema GraphQL de la Biblioteca Solón Argüello.
// Un solo endpoint: POST /graphql. Abrir http://localhost:4000/graphql en el
// navegador muestra Apollo Sandbox para probar todo.
export const typeDefs = /* GraphQL */ `#graphql
  "Fecha en formato ISO 8601 (2026-11-21T17:00:00.000Z)"
  scalar Fecha

  # ───────────────────────── Tipos principales ─────────────────────────

  type Autor {
    id: ID!
    nombre: String!
    nacionalidad: String!
    anioNacimiento: Int
    anioFallecimiento: Int
    generos: [String!]!
    esNayarita: Boolean!
    biografia: String
    "Libros del acervo escritos por este autor"
    libros: [Libro!]!
    totalLibros: Int!
  }

  type Ejemplar {
    codigo: String!
    estado: String!
    fechaAdquisicion: Fecha
    origen: String
  }

  type Libro {
    id: ID!
    isbn: String!
    titulo: String!
    autor: Autor
    autorNombre: String!
    editorial: String
    anioPublicacion: Int
    anioPrimeraEdicion: Int
    categoria: String!
    clasificacion: String
    idioma: String
    paginas: Int
    sala: String!
    descripcion: String
    palabrasClave: [String!]!
    ejemplares: [Ejemplar!]!
    ejemplaresTotales: Int!
    ejemplaresDisponibles: Int!
    activo: Boolean!
    "En el catálogo público: cuántas ediciones de esta obra hay (sus ejemplares se suman)"
    ediciones: Int!
    "Reservas pendientes de este libro (cola de espera)"
    reservasPendientes: Int!
  }

  type Domicilio {
    calle: String
    colonia: String
    municipio: String
    codigoPostal: String
  }

  type Fiador {
    nombre: String!
    telefono: String
    parentesco: String
    domicilio: String
  }

  type Lector {
    id: ID!
    credencial: String!
    nombre: String!
    apellidos: String!
    nombreCompleto: String!
    fechaNacimiento: Fecha!
    edad: Int!
    sexo: String
    telefono: String
    email: String
    ocupacion: String!
    tipo: String!
    domicilio: Domicilio
    fiador: Fiador
    intereses: [String!]!
    fechaRegistro: Fecha!
    vigencia: Fecha!
    estado: String!
    suspendidoHasta: Fecha
    "Activa, Vencida o Suspendida, calculado con la fecha de hoy"
    situacion: String!
    prestamosActivos: Int!
  }

  type Prestamo {
    id: ID!
    lector: Lector
    libro: Libro
    codigoEjemplar: String!
    tituloLibro: String
    categoria: String
    sala: String
    nombreLector: String
    fechaPrestamo: Fecha!
    fechaVencimiento: Fecha!
    fechaDevolucion: Fecha
    renovaciones: Int!
    estado: String!
    "Activo, Vencido, Devuelto o Extraviado, calculado con la fecha de hoy"
    situacion: String!
    diasAtraso: Int!
    condicionDevolucion: String
    atendidoPor: String
    observaciones: String
  }

  type Reserva {
    id: ID!
    lector: Lector
    libro: Libro
    tituloLibro: String
    nombreLector: String
    fechaSolicitud: Fecha!
    fechaLimiteRecoger: Fecha
    fechaAtencion: Fecha
    estado: String!
    notas: String
  }

  type Sesion {
    token: String!
    usuario: String!
    nombre: String!
    rol: String!
  }

  "Par valor-cantidad usado en facetas y distribuciones"
  type Faceta {
    valor: String!
    cantidad: Int!
  }

  type PaginaLibros {
    total: Int!
    pagina: Int!
    paginas: Int!
    libros: [Libro!]!
    facetasCategoria: [Faceta!]!
    facetasSala: [Faceta!]!
  }

  type PaginaLectores {
    total: Int!
    pagina: Int!
    paginas: Int!
    lectores: [Lector!]!
  }

  type PaginaPrestamos {
    total: Int!
    pagina: Int!
    paginas: Int!
    prestamos: [Prestamo!]!
  }

  type ResumenInventario {
    titulos: Int!
    ejemplaresTotales: Int!
    disponibles: Int!
    enPrestamo: Int!
    lectoresActivos: Int!
    prestamosVencidos: Int!
  }

  "Respuesta de una devolución: avisa si el libro ya tiene a alguien esperando"
  type ResultadoDevolucion {
    prestamo: Prestamo!
    diasAtraso: Int!
    diasSuspension: Int!
    reservaNotificada: Reserva
    mensaje: String!
  }

  # ───────────── Tipos de las consultas complejas (Antony) ─────────────

  type InventarioCategoria {
    categoria: String!
    titulos: Int!
    ejemplaresTotales: Int!
    disponibles: Int!
    prestados: Int!
    enReparacion: Int!
    extraviados: Int!
    porcentajeDisponible: Float!
  }

  type LibroRanking {
    libroId: ID!
    titulo: String!
    autor: String!
    categoria: String!
    prestamos: Int!
    lectoresUnicos: Int!
    ejemplaresTotales: Int!
    prestamosPorEjemplar: Float!
  }

  type LibroSinMovimiento {
    libroId: ID!
    titulo: String!
    autor: String!
    categoria: String!
    sala: String!
    ejemplaresTotales: Int!
    ultimoPrestamo: Fecha
    mesesSinPrestamo: Int
  }

  type AutorRanking {
    autorId: ID!
    nombre: String!
    nacionalidad: String!
    prestamos: Int!
    titulosPrestados: Int!
    lectoresUnicos: Int!
  }

  type LibroDemanda {
    libroId: ID!
    titulo: String!
    autor: String!
    categoria: String!
    ejemplaresTotales: Int!
    reservasPendientes: Int!
    proximaDevolucion: Fecha
    prioridadCompra: String!
  }

  type RangoDecada {
    periodo: String!
    titulos: Int!
    ejemplares: Int!
    paginasPromedio: Float
  }

  input FiltroLibros {
    texto: String
    categoria: String
    sala: String
    idioma: String
    anioDesde: Int
    anioHasta: Int
    soloDisponibles: Boolean
    soloAgotados: Boolean
  }

  type OrigenSala {
    sala: String!
    origen: String!
    ejemplares: Int!
    porcentaje: Float!
  }

  type NacionalidadResumen {
    nacionalidad: String!
    autores: Int!
    titulos: Int!
    ejemplares: Int!
    prestamos: Int!
  }

  type RotacionCategoria {
    categoria: String!
    prestamos: Int!
    ejemplares: Int!
    indiceRotacion: Float!
    nivel: String!
  }

  # ───────────── Tipos de las consultas complejas (Víctor) ─────────────

  type LectorRanking {
    lectorId: ID!
    credencial: String!
    nombre: String!
    ocupacion: String!
    prestamos: Int!
    librosDistintos: Int!
    categoriaFavorita: String
    devolucionesTarde: Int!
  }

  type LectorAtraso {
    lectorId: ID!
    credencial: String!
    nombre: String!
    telefono: String
    fiadorNombre: String
    fiadorTelefono: String
    librosAtrasados: Int!
    diasAtrasoMaximo: Int!
    titulos: [String!]!
  }

  type CredencialPorVencer {
    lectorId: ID!
    credencial: String!
    nombre: String!
    telefono: String
    email: String
    vigencia: Fecha!
    diasRestantes: Int!
    prestamosActivos: Int!
  }

  type PerfilDemografico {
    total: Int!
    porOcupacion: [Faceta!]!
    porEdad: [Faceta!]!
    porMunicipio: [Faceta!]!
    porSexo: [Faceta!]!
    porTipo: [Faceta!]!
  }

  type LectorInactivo {
    lectorId: ID!
    credencial: String!
    nombre: String!
    telefono: String
    email: String
    ultimoPrestamo: Fecha
    mesesInactivo: Int
    totalPrestamos: Int!
  }

  type HistorialLector {
    lector: Lector!
    totalPrestamos: Int!
    activos: Int!
    devueltosATiempo: Int!
    devueltosTarde: Int!
    porcentajePuntualidad: Float
    categorias: [Faceta!]!
    prestamos: [Prestamo!]!
  }

  type Recomendacion {
    libroId: ID!
    titulo: String!
    autor: String!
    categoria: String!
    lectoresEnComun: Int!
    disponible: Boolean!
    motivo: String!
  }

  type RegistroMes {
    mes: Int!
    nombreMes: String!
    total: Int!
    porTipo: [Faceta!]!
  }

  type PuntualidadOcupacion {
    ocupacion: String!
    devoluciones: Int!
    aTiempo: Int!
    tarde: Int!
    porcentajePuntualidad: Float!
    atrasoPromedioDias: Float!
  }

  type ColoniaResumen {
    colonia: String!
    municipio: String!
    lectores: Int!
    lectoresActivos: Int!
    prestamos: Int!
    prestamosPorLector: Float!
  }

  # ───────────── Tipos de las consultas complejas (Pablo) ─────────────

  type PrestamoVencido {
    prestamoId: ID!
    titulo: String!
    codigoEjemplar: String!
    lector: String!
    credencial: String!
    telefono: String
    fechaPrestamo: Fecha!
    fechaVencimiento: Fecha!
    diasAtraso: Int!
    reservasEnEspera: Int!
    gravedad: String!
  }

  type EstadisticaMes {
    mes: Int!
    nombreMes: String!
    prestamos: Int!
    devoluciones: Int!
    renovaciones: Int!
    devueltosTarde: Int!
    tasaAtraso: Float!
  }

  type CeldaAfluencia {
    dia: String!
    hora: Int!
    prestamos: Int!
  }

  type Afluencia {
    porDia: [Faceta!]!
    porHora: [Faceta!]!
    celdas: [CeldaAfluencia!]!
    diaPico: String
    horaPico: String
  }

  type DuracionCategoria {
    categoria: String!
    prestamosDevueltos: Int!
    diasPromedio: Float!
    diasMaximo: Int!
    porcentajeRenovados: Float!
  }

  type PosicionCola {
    reservaId: ID!
    libroId: ID!
    titulo: String!
    lector: String!
    credencial: String!
    fechaSolicitud: Fecha!
    posicion: Int!
    totalEnCola: Int!
    diasEsperando: Int!
  }

  type DesempenoReservas {
    categoria: String!
    total: Int!
    atendidas: Int!
    expiradas: Int!
    canceladas: Int!
    tasaAtencion: Float!
    diasEsperaPromedio: Float
  }

  type CruceSalaTipo {
    sala: String!
    tipoLector: String!
    prestamos: Int!
    porcentajeDeSala: Float!
  }

  type LibroEsperado {
    titulo: String!
    codigoEjemplar: String!
    lector: String!
    reservasEnEspera: Int!
    siguienteEnCola: String
  }

  type PronosticoDia {
    fecha: String!
    devolucionesEsperadas: Int!
    libros: [LibroEsperado!]!
  }

  type RenovacionLibro {
    libroId: ID!
    titulo: String!
    categoria: String!
    prestamos: Int!
    renovacionesTotales: Int!
    promedioRenovaciones: Float!
    ejemplaresTotales: Int!
    sugerenciaAdquirir: Boolean!
  }

  type Tablero {
    fecha: String!
    prestamosHoy: Int!
    devolucionesHoy: Int!
    lectoresAtendidosHoy: Int!
    activos: Int!
    vencidos: Int!
    reservasPendientes: Int!
    reservasPorRecoger: Int!
    categoriasSemana: [Faceta!]!
  }

  # ───────────────────────────── Queries ─────────────────────────────

  type Query {
    # Públicas (catálogo en línea)
    catalogo(filtro: FiltroLibros, pagina: Int = 1, porPagina: Int = 12): PaginaLibros!
    libro(id: ID!): Libro
    "Últimas adquisiciones (ejemplares que llegaron más recientemente)"
    novedades(limite: Int = 8): [Libro!]!
    categorias: [String!]!
    salas: [String!]!

    # Personal (requieren token)
    yo: Sesion
    resumenInventario: ResumenInventario!
    autores(busqueda: String, limite: Int = 20): [Autor!]!
    autor(id: ID!): Autor
    lectores(busqueda: String, situacion: String, pagina: Int = 1, porPagina: Int = 15): PaginaLectores!
    lector(id: ID, credencial: String): Lector
    prestamos(situacion: String, busqueda: String, pagina: Int = 1, porPagina: Int = 15): PaginaPrestamos!
    prestamo(id: ID!): Prestamo
    reservas(estado: String, libroId: ID, limite: Int = 50): [Reserva!]!

    # ── 10 consultas complejas · Antony Daniel Ocegueda Ruelas (Libros y autores)
    inventarioPorCategoria: [InventarioCategoria!]!
    librosMasPrestados(limite: Int = 10, desde: Fecha, hasta: Fecha): [LibroRanking!]!
    librosSinMovimiento(meses: Int = 12, categoria: String, limite: Int = 30): [LibroSinMovimiento!]!
    autoresMasLeidos(limite: Int = 10): [AutorRanking!]!
    librosAgotadosConDemanda: [LibroDemanda!]!
    distribucionPorPeriodo(categoria: String): [RangoDecada!]!
    busquedaAvanzada(filtro: FiltroLibros!, pagina: Int = 1, porPagina: Int = 20): PaginaLibros!
    origenDelAcervo: [OrigenSala!]!
    autoresPorNacionalidad(limite: Int = 15): [NacionalidadResumen!]!
    rotacionPorCategoria(desde: Fecha, hasta: Fecha): [RotacionCategoria!]!

    # ── 10 consultas complejas · Víctor Alberto Ibarra García (Lectores)
    lectoresMasActivos(limite: Int = 10, desde: Fecha, hasta: Fecha): [LectorRanking!]!
    lectoresConAtrasos: [LectorAtraso!]!
    credencialesPorVencer(dias: Int = 30): [CredencialPorVencer!]!
    perfilDemografico: PerfilDemografico!
    lectoresInactivos(meses: Int = 6, limite: Int = 50): [LectorInactivo!]!
    historialLector(credencial: String!): HistorialLector
    recomendacionesParaLector(lectorId: ID!, limite: Int = 5): [Recomendacion!]!
    registrosPorMes(anio: Int!): [RegistroMes!]!
    puntualidadPorOcupacion: [PuntualidadOcupacion!]!
    lectoresPorColonia(municipio: String = "Tepic", limite: Int = 15): [ColoniaResumen!]!

    # ── 10 consultas complejas · Pablo Iván Calleros Cortés (Préstamos y reservas)
    prestamosVencidos(diasMinimos: Int = 1): [PrestamoVencido!]!
    estadisticasMensuales(anio: Int!): [EstadisticaMes!]!
    afluenciaPorDiaYHora(desde: Fecha, hasta: Fecha): Afluencia!
    duracionPorCategoria: [DuracionCategoria!]!
    colaReservas(libroId: ID): [PosicionCola!]!
    desempenoReservas(desde: Fecha, hasta: Fecha): [DesempenoReservas!]!
    prestamosPorSalaYTipo(desde: Fecha, hasta: Fecha): [CruceSalaTipo!]!
    pronosticoDisponibilidad(dias: Int = 7): [PronosticoDia!]!
    librosConMasRenovaciones(limite: Int = 10): [RenovacionLibro!]!
    tableroOperativo: Tablero!
  }

  # ──────────────────────────── Mutations ────────────────────────────

  input AutorInput {
    nombre: String!
    nacionalidad: String!
    anioNacimiento: Int
    anioFallecimiento: Int
    generos: [String!]
    esNayarita: Boolean
    biografia: String
  }

  input LibroInput {
    isbn: String!
    titulo: String!
    autorId: ID!
    editorial: String
    anioPublicacion: Int
    anioPrimeraEdicion: Int
    categoria: String!
    clasificacion: String
    idioma: String
    paginas: Int
    sala: String
    descripcion: String
    palabrasClave: [String!]
    "Solo al crear: cuántos ejemplares físicos llegan"
    ejemplaresIniciales: Int
    origen: String
  }

  input DomicilioInput {
    calle: String
    colonia: String
    municipio: String
    codigoPostal: String
  }

  input FiadorInput {
    nombre: String!
    telefono: String
    parentesco: String
    domicilio: String
  }

  input LectorInput {
    nombre: String!
    apellidos: String!
    fechaNacimiento: Fecha!
    sexo: String
    telefono: String
    email: String
    ocupacion: String
    tipo: String
    domicilio: DomicilioInput
    fiador: FiadorInput!
    intereses: [String!]
  }

  input PrestamoUpdateInput {
    fechaVencimiento: Fecha
    observaciones: String
  }

  type Mutation {
    login(usuario: String!, contrasena: String!): Sesion!

    # Autores
    crearAutor(input: AutorInput!): Autor!
    actualizarAutor(id: ID!, input: AutorInput!): Autor!
    eliminarAutor(id: ID!): Boolean!

    # Libros (pantalla de Antony)
    crearLibro(input: LibroInput!): Libro!
    actualizarLibro(id: ID!, input: LibroInput!): Libro!
    eliminarLibro(id: ID!): Boolean!
    agregarEjemplares(id: ID!, cantidad: Int!, origen: String): Libro!
    cambiarEstadoEjemplar(id: ID!, codigo: String!, estado: String!): Libro!

    # Lectores (pantalla de Víctor)
    crearLector(input: LectorInput!): Lector!
    actualizarLector(id: ID!, input: LectorInput!): Lector!
    eliminarLector(id: ID!): Boolean!
    renovarCredencial(id: ID!): Lector!
    suspenderLector(id: ID!, dias: Int!): Lector!
    reactivarLector(id: ID!): Lector!

    # Préstamos y reservas (pantalla de Pablo)
    registrarPrestamo(lectorId: ID!, libroId: ID!): Prestamo!
    devolverPrestamo(id: ID!, condicion: String = "Buena", observaciones: String): ResultadoDevolucion!
    renovarPrestamo(id: ID!): Prestamo!
    actualizarPrestamo(id: ID!, input: PrestamoUpdateInput!): Prestamo!
    marcarExtraviado(id: ID!): Prestamo!
    eliminarPrestamo(id: ID!): Boolean!
    crearReserva(lectorId: ID!, libroId: ID!): Reserva!
    cancelarReserva(id: ID!): Reserva!
  }
`;
