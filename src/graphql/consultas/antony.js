// ─────────────────────────────────────────────────────────────────────────
// 10 consultas complejas · Antony Daniel Ocegueda Ruelas
// Tema: libros, autores e inventario del acervo
// Cada consulta declara su colección de origen y su aggregation pipeline.
// ─────────────────────────────────────────────────────────────────────────
import { rango, dividir, porcentaje, redondear } from './comun.js';
import { normalizar, escaparRegex } from '../../utils/texto.js';

// Filtro reutilizable para el catálogo y la búsqueda avanzada.
export function filtroLibros(f = {}) {
  const m = { activo: true };
  if (f.texto && f.texto.trim()) {
    m.busqueda = { $regex: escaparRegex(normalizar(f.texto)) };
  }
  if (f.categoria) m.categoria = f.categoria;
  if (f.sala) m.sala = f.sala;
  if (f.idioma) m.idioma = f.idioma;
  if (f.anioDesde || f.anioHasta) {
    m.anioPublicacion = {};
    if (f.anioDesde) m.anioPublicacion.$gte = f.anioDesde;
    if (f.anioHasta) m.anioPublicacion.$lte = f.anioHasta;
  }
  if (f.soloDisponibles) m.ejemplaresDisponibles = { $gt: 0 };
  else if (f.soloAgotados) m.ejemplaresDisponibles = 0;
  return m;
}

// Catálogo público: agrupa las ediciones de una misma obra (mismo título y
// autor) y suma sus ejemplares, como lo muestra un catálogo en línea.
export function pipelineCatalogo({ filtro = {}, pagina = 1, porPagina = 12 }) {
  const orden = filtro.texto ? { titulo: 1 } : { ejemplaresTotales: -1, titulo: 1 };
  return [
    { $match: filtroLibros(filtro) },
    { $sort: { anioPublicacion: -1 } },
    {
      $group: {
        _id: { titulo: '$titulo', autor: '$autorNombre' },
        doc: { $first: '$$ROOT' },
        ediciones: { $sum: 1 },
        totales: { $sum: '$ejemplaresTotales' },
        disponibles: { $sum: '$ejemplaresDisponibles' },
      },
    },
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: ['$doc', { ediciones: '$ediciones', ejemplaresTotales: '$totales', ejemplaresDisponibles: '$disponibles' }] },
      },
    },
    {
      $facet: {
        libros: [{ $sort: { ...orden, _id: 1 } }, { $skip: Math.max(0, (pagina - 1) * porPagina) }, { $limit: porPagina }],
        total: [{ $count: 'n' }],
        facetasCategoria: [{ $group: { _id: '$categoria', cantidad: { $sum: 1 } } }, { $sort: { cantidad: -1 } }, { $project: { _id: 0, valor: '$_id', cantidad: 1 } }],
        facetasSala: [{ $group: { _id: '$sala', cantidad: { $sum: 1 } } }, { $sort: { cantidad: -1 } }, { $project: { _id: 0, valor: '$_id', cantidad: 1 } }],
      },
    },
  ];
}

export const consultasAntony = {
  // A1. Inventario por categoría: títulos, ejemplares y su estado físico.
  //     Desarma el arreglo de ejemplares ($unwind) y cuenta por estado.
  inventarioPorCategoria: {
    coleccion: 'libros',
    pipeline: () => [
      { $match: { activo: true } },
      { $unwind: '$ejemplares' },
      {
        $group: {
          _id: '$categoria',
          titulos: { $addToSet: '$_id' },
          disponibles: { $sum: { $cond: [{ $eq: ['$ejemplares.estado', 'Disponible'] }, 1, 0] } },
          prestados: { $sum: { $cond: [{ $eq: ['$ejemplares.estado', 'Prestado'] }, 1, 0] } },
          enReparacion: { $sum: { $cond: [{ $eq: ['$ejemplares.estado', 'En reparación'] }, 1, 0] } },
          extraviados: { $sum: { $cond: [{ $eq: ['$ejemplares.estado', 'Extraviado'] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          categoria: '$_id',
          titulos: { $size: '$titulos' },
          disponibles: 1,
          prestados: 1,
          enReparacion: 1,
          extraviados: 1,
          ejemplaresTotales: { $add: ['$disponibles', '$prestados', '$enReparacion'] },
        },
      },
      { $addFields: { porcentajeDisponible: porcentaje('$disponibles', '$ejemplaresTotales') } },
      { $sort: { ejemplaresTotales: -1 } },
    ],
  },

  // A2. Libros más prestados en un periodo, con lectores distintos
  //     y préstamos por ejemplar (para saber si hacen falta más copias).
  librosMasPrestados: {
    coleccion: 'prestamos',
    pipeline: ({ limite = 10, desde, hasta }, { ahora }) => {
      const { inicio, fin } = rango(desde, hasta, ahora);
      return [
        { $match: { fechaPrestamo: { $gte: inicio, $lte: fin } } },
        { $group: { _id: '$libro', prestamos: { $sum: 1 }, lectores: { $addToSet: '$lector' } } },
        { $sort: { prestamos: -1, _id: 1 } },
        { $limit: limite },
        { $lookup: { from: 'libros', localField: '_id', foreignField: '_id', as: 'libro' } },
        { $unwind: '$libro' },
        {
          $project: {
            _id: 0,
            libroId: '$_id',
            titulo: '$libro.titulo',
            autor: '$libro.autorNombre',
            categoria: '$libro.categoria',
            prestamos: 1,
            lectoresUnicos: { $size: '$lectores' },
            ejemplaresTotales: '$libro.ejemplaresTotales',
            prestamosPorEjemplar: redondear(dividir('$prestamos', '$libro.ejemplaresTotales'), 2),
          },
        },
      ];
    },
  },

  // A3. Libros sin préstamos en los últimos N meses: candidatos a exhibirse,
  //     rotar a otra sala o revisar para descarte.
  librosSinMovimiento: {
    coleccion: 'libros',
    pipeline: ({ meses = 12, categoria, limite = 30 }, { ahora }) => {
      const corte = new Date(ahora);
      corte.setUTCMonth(corte.getUTCMonth() - meses);
      const match = { activo: true, ejemplaresTotales: { $gt: 0 }, sala: { $ne: 'Consulta' } };
      if (categoria) match.categoria = categoria;
      return [
        { $match: match },
        {
          $lookup: {
            from: 'prestamos',
            let: { id: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$libro', '$$id'] } } },
              { $sort: { fechaPrestamo: -1 } },
              { $limit: 1 },
              { $project: { _id: 0, fechaPrestamo: 1 } },
            ],
            as: 'ultimo',
          },
        },
        { $addFields: { ultimoPrestamo: { $ifNull: [{ $arrayElemAt: ['$ultimo.fechaPrestamo', 0] }, null] } } },
        { $match: { $or: [{ ultimoPrestamo: null }, { ultimoPrestamo: { $lt: corte } }] } },
        {
          $addFields: {
            mesesSinPrestamo: {
              $cond: [
                { $eq: ['$ultimoPrestamo', null] },
                null,
                { $dateDiff: { startDate: '$ultimoPrestamo', endDate: ahora, unit: 'month' } },
              ],
            },
          },
        },
        // Primero los que nunca se han prestado, luego los más viejos.
        { $sort: { ultimoPrestamo: 1, titulo: 1 } },
        { $limit: limite },
        {
          $project: {
            _id: 0,
            libroId: '$_id',
            titulo: 1,
            autor: '$autorNombre',
            categoria: 1,
            sala: 1,
            ejemplaresTotales: 1,
            ultimoPrestamo: 1,
            mesesSinPrestamo: 1,
          },
        },
      ];
    },
  },

  // A4. Autores más leídos: préstamos → libro → autor (dos $lookup encadenados).
  autoresMasLeidos: {
    coleccion: 'prestamos',
    pipeline: ({ limite = 10 }) => [
      { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
      { $unwind: '$l' },
      {
        $group: {
          _id: '$l.autor',
          prestamos: { $sum: 1 },
          titulos: { $addToSet: '$libro' },
          lectores: { $addToSet: '$lector' },
        },
      },
      { $sort: { prestamos: -1, _id: 1 } },
      { $limit: limite },
      { $lookup: { from: 'autores', localField: '_id', foreignField: '_id', as: 'a' } },
      { $unwind: '$a' },
      {
        $project: {
          _id: 0,
          autorId: '$_id',
          nombre: '$a.nombre',
          nacionalidad: '$a.nacionalidad',
          prestamos: 1,
          titulosPrestados: { $size: '$titulos' },
          lectoresUnicos: { $size: '$lectores' },
        },
      },
    ],
  },

  // A5. Títulos agotados con lectores esperando: lista de compras sugerida.
  librosAgotadosConDemanda: {
    coleccion: 'libros',
    pipeline: () => [
      { $match: { activo: true, ejemplaresDisponibles: 0, ejemplaresTotales: { $gt: 0 } } },
      {
        $lookup: {
          from: 'reservas',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$libro', '$$id'] }, { $eq: ['$estado', 'Pendiente'] }] } } },
            { $count: 'n' },
          ],
          as: 'res',
        },
      },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$libro', '$$id'] }, { $eq: ['$estado', 'Activo'] }] } } },
            { $group: { _id: null, proxima: { $min: '$fechaVencimiento' } } },
          ],
          as: 'act',
        },
      },
      {
        $addFields: {
          reservasPendientes: { $ifNull: [{ $arrayElemAt: ['$res.n', 0] }, 0] },
          proximaDevolucion: { $ifNull: [{ $arrayElemAt: ['$act.proxima', 0] }, null] },
        },
      },
      { $match: { reservasPendientes: { $gt: 0 } } },
      {
        $addFields: {
          prioridadCompra: {
            $switch: {
              branches: [
                { case: { $gte: ['$reservasPendientes', 3] }, then: 'Alta' },
                { case: { $eq: ['$reservasPendientes', 2] }, then: 'Media' },
              ],
              default: 'Baja',
            },
          },
        },
      },
      { $sort: { reservasPendientes: -1, titulo: 1 } },
      {
        $project: {
          _id: 0,
          libroId: '$_id',
          titulo: 1,
          autor: '$autorNombre',
          categoria: 1,
          ejemplaresTotales: 1,
          reservasPendientes: 1,
          proximaDevolucion: 1,
          prioridadCompra: 1,
        },
      },
    ],
  },

  // A6. Antigüedad de las obras: títulos por periodo de su primera edición
  //     ($bucket). Si no se conoce, se usa el año de la edición del acervo.
  distribucionPorPeriodo: {
    coleccion: 'libros',
    pipeline: ({ categoria }) => [
      { $match: categoria ? { activo: true, categoria } : { activo: true } },
      { $addFields: { anioObra: { $ifNull: ['$anioPrimeraEdicion', '$anioPublicacion'] } } },
      {
        $bucket: {
          groupBy: '$anioObra',
          boundaries: [0, 1800, 1900, 1950, 1970, 1990, 2000, 2010, 2020, 2100],
          default: 'Sin fecha',
          output: {
            titulos: { $sum: 1 },
            ejemplares: { $sum: '$ejemplaresTotales' },
            paginasPromedio: { $avg: '$paginas' },
          },
        },
      },
    ],
    transformar: (filas) => {
      const etiquetas = {
        0: 'Antes de 1800', 1800: '1800–1899', 1900: '1900–1949', 1950: '1950–1969', 1970: '1970–1989',
        1990: '1990–1999', 2000: '2000–2009', 2010: '2010–2019', 2020: '2020 en adelante',
      };
      return filas.filter((f) => f.titulos > 0).map((f) => ({
        periodo: etiquetas[f._id] ?? String(f._id),
        titulos: f.titulos,
        ejemplares: f.ejemplares,
        paginasPromedio: f.paginasPromedio == null ? null : Math.round(f.paginasPromedio),
      }));
    },
  },

  // A7. Búsqueda avanzada con paginación y facetas en UNA sola consulta ($facet).
  busquedaAvanzada: {
    coleccion: 'libros',
    pipeline: ({ filtro, pagina = 1, porPagina = 20 }) => {
      const salto = Math.max(0, (pagina - 1) * porPagina);
      return [
        { $match: filtroLibros(filtro) },
        {
          $facet: {
            libros: [{ $sort: { titulo: 1, anioPublicacion: -1 } }, { $skip: salto }, { $limit: porPagina }],
            total: [{ $count: 'n' }],
            facetasCategoria: [
              { $group: { _id: '$categoria', cantidad: { $sum: 1 } } },
              { $sort: { cantidad: -1 } },
              { $project: { _id: 0, valor: '$_id', cantidad: 1 } },
            ],
            facetasSala: [
              { $group: { _id: '$sala', cantidad: { $sum: 1 } } },
              { $sort: { cantidad: -1 } },
              { $project: { _id: 0, valor: '$_id', cantidad: 1 } },
            ],
          },
        },
      ];
    },
    transformar: ([r], { pagina = 1, porPagina = 20 }) => {
      const total = r?.total?.[0]?.n ?? 0;
      return {
        total,
        pagina,
        paginas: Math.max(1, Math.ceil(total / porPagina)),
        libros: r?.libros ?? [],
        facetasCategoria: r?.facetasCategoria ?? [],
        facetasSala: r?.facetasSala ?? [],
      };
    },
  },

  // A8. Origen del acervo por sala (compra, donación, dotación de la DGB),
  //     con el porcentaje que representa dentro de cada sala.
  origenDelAcervo: {
    coleccion: 'libros',
    pipeline: () => [
      { $match: { activo: true } },
      { $unwind: '$ejemplares' },
      { $match: { 'ejemplares.estado': { $ne: 'Extraviado' } } },
      { $group: { _id: { sala: '$sala', origen: '$ejemplares.origen' }, ejemplares: { $sum: 1 } } },
      {
        $group: {
          _id: '$_id.sala',
          totalSala: { $sum: '$ejemplares' },
          origenes: { $push: { origen: '$_id.origen', ejemplares: '$ejemplares' } },
        },
      },
      { $unwind: '$origenes' },
      {
        $project: {
          _id: 0,
          sala: '$_id',
          origen: '$origenes.origen',
          ejemplares: '$origenes.ejemplares',
          porcentaje: porcentaje('$origenes.ejemplares', '$totalSala'),
        },
      },
      { $sort: { sala: 1, ejemplares: -1 } },
    ],
  },

  // A9. Resumen por nacionalidad de los autores: cuántos autores, títulos,
  //     ejemplares y préstamos aporta cada país al acervo.
  autoresPorNacionalidad: {
    coleccion: 'autores',
    pipeline: ({ limite = 15 }) => [
      { $lookup: { from: 'libros', localField: '_id', foreignField: 'autor', as: 'libros' } },
      // localField sobre un arreglo: une con todos los préstamos de todos sus libros.
      { $lookup: { from: 'prestamos', localField: 'libros._id', foreignField: 'libro', as: 'prestamos' } },
      {
        $group: {
          _id: '$nacionalidad',
          autores: { $sum: 1 },
          titulos: { $sum: { $size: '$libros' } },
          ejemplares: { $sum: { $sum: '$libros.ejemplaresTotales' } },
          prestamos: { $sum: { $size: '$prestamos' } },
        },
      },
      { $sort: { prestamos: -1, titulos: -1 } },
      { $limit: limite },
      { $project: { _id: 0, nacionalidad: '$_id', autores: 1, titulos: 1, ejemplares: 1, prestamos: 1 } },
    ],
  },

  // A10. Índice de rotación por categoría = préstamos del periodo / ejemplares.
  //      Indicador estándar en bibliotecas para decidir dónde invertir.
  rotacionPorCategoria: {
    coleccion: 'libros',
    pipeline: ({ desde, hasta }, { ahora }) => {
      const { inicio, fin } = rango(desde, hasta, ahora);
      return [
        { $match: { activo: true } },
        { $group: { _id: '$categoria', ejemplares: { $sum: '$ejemplaresTotales' }, ids: { $push: '$_id' } } },
        {
          $lookup: {
            from: 'prestamos',
            let: { ids: '$ids' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$libro', '$$ids'] },
                      { $gte: ['$fechaPrestamo', inicio] },
                      { $lte: ['$fechaPrestamo', fin] },
                    ],
                  },
                },
              },
              { $count: 'n' },
            ],
            as: 'p',
          },
        },
        { $addFields: { prestamos: { $ifNull: [{ $arrayElemAt: ['$p.n', 0] }, 0] } } },
        { $addFields: { indiceRotacion: redondear(dividir('$prestamos', '$ejemplares'), 2) } },
        {
          $project: {
            _id: 0,
            categoria: '$_id',
            prestamos: 1,
            ejemplares: 1,
            indiceRotacion: 1,
            nivel: {
              $switch: {
                branches: [
                  { case: { $gte: ['$indiceRotacion', 1] }, then: 'Alta' },
                  { case: { $gte: ['$indiceRotacion', 0.4] }, then: 'Media' },
                ],
                default: 'Baja',
              },
            },
          },
        },
        { $sort: { indiceRotacion: -1 } },
      ];
    },
  },
};
