// ─────────────────────────────────────────────────────────────────────────
// 10 consultas complejas · Víctor Alberto Ibarra García
// Tema: lectores, credenciales y hábitos de lectura
// ─────────────────────────────────────────────────────────────────────────
import { rango, dividir, porcentaje, redondear, MESES, ZONA, DIA_MS, inicioDeAnio } from './comun.js';

const nombreCompleto = (campo = '') => ({ $concat: [`$${campo}nombre`, ' ', `$${campo}apellidos`] });

export const consultasVictor = {
  // V1. Lectores más activos del periodo, con libros distintos, su categoría
  //     favorita y cuántas veces devolvieron tarde.
  lectoresMasActivos: {
    coleccion: 'prestamos',
    pipeline: ({ limite = 10, desde, hasta }, { ahora }) => {
      const { inicio, fin } = rango(desde, hasta, ahora);
      return [
        { $match: { fechaPrestamo: { $gte: inicio, $lte: fin } } },
        {
          $group: {
            _id: { lector: '$lector', categoria: '$categoria' },
            n: { $sum: 1 },
            libros: { $addToSet: '$libro' },
            tarde: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$fechaDevolucion', null] }, { $gt: ['$fechaDevolucion', '$fechaVencimiento'] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        // Ordenar antes de agrupar hace que $first tome la categoría con más préstamos.
        { $sort: { n: -1, '_id.categoria': 1 } },
        {
          $group: {
            _id: '$_id.lector',
            prestamos: { $sum: '$n' },
            categoriaFavorita: { $first: '$_id.categoria' },
            librosPorCategoria: { $push: '$libros' },
            devolucionesTarde: { $sum: '$tarde' },
          },
        },
        {
          $addFields: {
            librosDistintos: {
              $size: { $reduce: { input: '$librosPorCategoria', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
            },
          },
        },
        { $sort: { prestamos: -1, librosDistintos: -1, _id: 1 } },
        { $limit: limite },
        { $lookup: { from: 'lectores', localField: '_id', foreignField: '_id', as: 'l' } },
        { $unwind: '$l' },
        {
          $project: {
            _id: 0,
            lectorId: '$_id',
            credencial: '$l.credencial',
            nombre: nombreCompleto('l.'),
            ocupacion: '$l.ocupacion',
            prestamos: 1,
            librosDistintos: 1,
            categoriaFavorita: 1,
            devolucionesTarde: 1,
          },
        },
      ];
    },
  },

  // V2. Lectores con libros vencidos, con datos del fiador para llamarle.
  lectoresConAtrasos: {
    coleccion: 'prestamos',
    pipeline: (_args, { ahora }) => [
      { $match: { estado: 'Activo', fechaVencimiento: { $lt: ahora } } },
      { $addFields: { dias: { $dateDiff: { startDate: '$fechaVencimiento', endDate: ahora, unit: 'day' } } } },
      {
        $group: {
          _id: '$lector',
          librosAtrasados: { $sum: 1 },
          diasAtrasoMaximo: { $max: '$dias' },
          titulos: { $push: '$tituloLibro' },
        },
      },
      { $lookup: { from: 'lectores', localField: '_id', foreignField: '_id', as: 'l' } },
      { $unwind: '$l' },
      { $sort: { diasAtrasoMaximo: -1, librosAtrasados: -1 } },
      {
        $project: {
          _id: 0,
          lectorId: '$_id',
          credencial: '$l.credencial',
          nombre: nombreCompleto('l.'),
          telefono: '$l.telefono',
          fiadorNombre: '$l.fiador.nombre',
          fiadorTelefono: '$l.fiador.telefono',
          librosAtrasados: 1,
          diasAtrasoMaximo: 1,
          titulos: 1,
        },
      },
    ],
  },

  // V3. Credenciales que vencen en los próximos N días (para avisar y renovar).
  credencialesPorVencer: {
    coleccion: 'lectores',
    pipeline: ({ dias = 30 }, { ahora }) => [
      {
        $match: {
          estado: { $ne: 'Cancelada' },
          vigencia: { $gte: ahora, $lte: new Date(ahora.getTime() + dias * DIA_MS) },
        },
      },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$lector', '$$id'] }, { $eq: ['$estado', 'Activo'] }] } } },
            { $count: 'n' },
          ],
          as: 'act',
        },
      },
      {
        $project: {
          _id: 0,
          lectorId: '$_id',
          credencial: 1,
          nombre: nombreCompleto(),
          telefono: 1,
          email: 1,
          vigencia: 1,
          diasRestantes: { $dateDiff: { startDate: ahora, endDate: '$vigencia', unit: 'day' } },
          prestamosActivos: { $ifNull: [{ $arrayElemAt: ['$act.n', 0] }, 0] },
        },
      },
      { $sort: { diasRestantes: 1 } },
    ],
  },

  // V4. Perfil demográfico del padrón en una sola pasada ($facet + $bucket por edad).
  perfilDemografico: {
    coleccion: 'lectores',
    pipeline: (_args, { ahora }) => {
      const contar = (campo) => [
        { $group: { _id: campo, cantidad: { $sum: 1 } } },
        { $sort: { cantidad: -1 } },
        { $project: { _id: 0, valor: { $ifNull: ['$_id', 'Sin dato'] }, cantidad: 1 } },
      ];
      return [
        { $match: { estado: { $ne: 'Cancelada' } } },
        { $addFields: { edad: { $dateDiff: { startDate: '$fechaNacimiento', endDate: ahora, unit: 'year' } } } },
        {
          $facet: {
            total: [{ $count: 'n' }],
            porOcupacion: contar('$ocupacion'),
            porMunicipio: contar('$domicilio.municipio'),
            porSexo: contar('$sexo'),
            porTipo: contar('$tipo'),
            porEdad: [
              {
                $bucket: {
                  groupBy: '$edad',
                  boundaries: [0, 13, 18, 30, 45, 60, 130],
                  default: 'Sin dato',
                  output: { cantidad: { $sum: 1 } },
                },
              },
            ],
          },
        },
      ];
    },
    transformar: ([r]) => {
      const edades = { 0: '0–12 años', 13: '13–17 años', 18: '18–29 años', 30: '30–44 años', 45: '45–59 años', 60: '60 años o más' };
      return {
        total: r?.total?.[0]?.n ?? 0,
        porOcupacion: r?.porOcupacion ?? [],
        porMunicipio: r?.porMunicipio ?? [],
        porSexo: (r?.porSexo ?? []).map((f) => ({ ...f, valor: { F: 'Mujeres', M: 'Hombres', X: 'No binario' }[f.valor] ?? f.valor })),
        porTipo: r?.porTipo ?? [],
        porEdad: (r?.porEdad ?? []).map((b) => ({ valor: edades[b._id] ?? String(b._id), cantidad: b.cantidad })),
      };
    },
  },

  // V5. Lectores con credencial activa que no piden libros desde hace N meses
  //     (o nunca): base para una campaña de reactivación.
  lectoresInactivos: {
    coleccion: 'lectores',
    pipeline: ({ meses = 6, limite = 50 }, { ahora }) => {
      const corte = new Date(ahora);
      corte.setUTCMonth(corte.getUTCMonth() - meses);
      return [
        { $match: { estado: 'Activa', vigencia: { $gte: ahora }, fechaRegistro: { $lt: corte } } },
        {
          $lookup: {
            from: 'prestamos',
            let: { id: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$lector', '$$id'] } } },
              { $group: { _id: null, ultimo: { $max: '$fechaPrestamo' }, total: { $sum: 1 } } },
            ],
            as: 'p',
          },
        },
        {
          $addFields: {
            ultimoPrestamo: { $ifNull: [{ $arrayElemAt: ['$p.ultimo', 0] }, null] },
            totalPrestamos: { $ifNull: [{ $arrayElemAt: ['$p.total', 0] }, 0] },
          },
        },
        { $match: { $or: [{ ultimoPrestamo: null }, { ultimoPrestamo: { $lt: corte } }] } },
        {
          $addFields: {
            mesesInactivo: {
              $dateDiff: { startDate: { $ifNull: ['$ultimoPrestamo', '$fechaRegistro'] }, endDate: ahora, unit: 'month' },
            },
          },
        },
        { $sort: { totalPrestamos: -1, mesesInactivo: -1 } },
        { $limit: limite },
        {
          $project: {
            _id: 0,
            lectorId: '$_id',
            credencial: 1,
            nombre: nombreCompleto(),
            telefono: 1,
            email: 1,
            ultimoPrestamo: 1,
            mesesInactivo: 1,
            totalPrestamos: 1,
          },
        },
      ];
    },
  },

  // V6. Historial completo de un lector con su puntualidad y sus categorías.
  historialLector: {
    coleccion: 'lectores',
    pipeline: ({ credencial }) => [
      { $match: { credencial } },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$lector', '$$id'] } } }, { $sort: { fechaPrestamo: -1 } }],
          as: 'prestamos',
        },
      },
      {
        $lookup: {
          from: 'prestamos',
          let: { id: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$lector', '$$id'] } } },
            { $group: { _id: '$categoria', cantidad: { $sum: 1 } } },
            { $sort: { cantidad: -1 } },
            { $project: { _id: 0, valor: '$_id', cantidad: 1 } },
          ],
          as: 'categorias',
        },
      },
      {
        $addFields: {
          devueltos: { $filter: { input: '$prestamos', as: 'p', cond: { $eq: ['$$p.estado', 'Devuelto'] } } },
        },
      },
      {
        $project: {
          _id: 0,
          lector: {
            _id: '$_id', credencial: '$credencial', nombre: '$nombre', apellidos: '$apellidos',
            fechaNacimiento: '$fechaNacimiento', sexo: '$sexo', telefono: '$telefono', email: '$email',
            ocupacion: '$ocupacion', tipo: '$tipo', domicilio: '$domicilio', fiador: '$fiador',
            intereses: '$intereses', fechaRegistro: '$fechaRegistro', vigencia: '$vigencia',
            estado: '$estado', suspendidoHasta: '$suspendidoHasta',
          },
          prestamos: 1,
          categorias: 1,
          totalPrestamos: { $size: '$prestamos' },
          activos: { $size: { $filter: { input: '$prestamos', as: 'p', cond: { $eq: ['$$p.estado', 'Activo'] } } } },
          devueltosATiempo: {
            $size: { $filter: { input: '$devueltos', as: 'p', cond: { $lte: ['$$p.fechaDevolucion', '$$p.fechaVencimiento'] } } },
          },
          devueltosTarde: {
            $size: { $filter: { input: '$devueltos', as: 'p', cond: { $gt: ['$$p.fechaDevolucion', '$$p.fechaVencimiento'] } } },
          },
          totalDevueltos: { $size: '$devueltos' },
        },
      },
      {
        $addFields: {
          porcentajePuntualidad: {
            $cond: [{ $eq: ['$totalDevueltos', 0] }, null, porcentaje('$devueltosATiempo', '$totalDevueltos')],
          },
        },
      },
    ],
    transformar: (filas) => filas[0] ?? null,
  },

  // V7. Recomendaciones "quien leyó lo mismo que tú también leyó…".
  //     Es el caso típico de un grafo; aquí se resuelve con dos $lookup
  //     (lector → sus libros → otros lectores → sus otros libros).
  recomendacionesParaLector: {
    coleccion: 'prestamos',
    pipeline: ({ lectorId, limite = 5 }, { oid }) => {
      const id = oid(lectorId);
      return [
        { $match: { lector: id } },
        { $group: { _id: null, misLibros: { $addToSet: '$libro' } } },
        {
          $lookup: {
            from: 'prestamos',
            let: { libros: '$misLibros' },
            pipeline: [
              { $match: { $expr: { $and: [{ $in: ['$libro', '$$libros'] }, { $ne: ['$lector', id] }] } } },
              { $group: { _id: '$lector' } },
            ],
            as: 'similares',
          },
        },
        {
          $lookup: {
            from: 'prestamos',
            let: { otros: '$similares._id', mis: '$misLibros' },
            pipeline: [
              {
                $match: {
                  $expr: { $and: [{ $in: ['$lector', '$$otros'] }, { $not: [{ $in: ['$libro', '$$mis'] }] }] },
                },
              },
              { $group: { _id: '$libro', lectores: { $addToSet: '$lector' } } },
              { $project: { lectoresEnComun: { $size: '$lectores' } } },
              { $sort: { lectoresEnComun: -1, _id: 1 } },
              { $limit: limite },
            ],
            as: 'candidatos',
          },
        },
        { $unwind: '$candidatos' },
        { $replaceRoot: { newRoot: '$candidatos' } },
        { $lookup: { from: 'libros', localField: '_id', foreignField: '_id', as: 'l' } },
        { $unwind: '$l' },
        {
          $project: {
            _id: 0,
            libroId: '$_id',
            titulo: '$l.titulo',
            autor: '$l.autorNombre',
            categoria: '$l.categoria',
            lectoresEnComun: 1,
            disponible: { $gt: ['$l.ejemplaresDisponibles', 0] },
            motivo: {
              $cond: [
                { $eq: ['$lectoresEnComun', 1] },
                'Lo leyó un lector con gustos parecidos',
                { $concat: ['Lo leyeron ', { $toString: '$lectoresEnComun' }, ' lectores con gustos parecidos'] },
              ],
            },
          },
        },
      ];
    },
  },

  // V8. Credenciales nuevas por mes de un año, desglosadas por tipo de lector.
  registrosPorMes: {
    coleccion: 'lectores',
    pipeline: ({ anio }) => [
      { $match: { fechaRegistro: { $gte: inicioDeAnio(anio), $lt: inicioDeAnio(anio + 1) } } },
      {
        $group: {
          _id: { mes: { $month: { date: '$fechaRegistro', timezone: ZONA } }, tipo: '$tipo' },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { cantidad: -1 } },
      { $group: { _id: '$_id.mes', total: { $sum: '$cantidad' }, porTipo: { $push: { valor: '$_id.tipo', cantidad: '$cantidad' } } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, mes: '$_id', total: 1, porTipo: 1 } },
    ],
    transformar: (filas) => filas.map((f) => ({ ...f, nombreMes: MESES[f.mes - 1] })),
  },

  // V9. Puntualidad de devolución por ocupación del lector.
  puntualidadPorOcupacion: {
    coleccion: 'prestamos',
    pipeline: () => [
      { $match: { estado: 'Devuelto', fechaDevolucion: { $ne: null } } },
      { $lookup: { from: 'lectores', localField: 'lector', foreignField: '_id', as: 'l' } },
      { $unwind: '$l' },
      {
        $addFields: {
          atraso: { $max: [0, { $dateDiff: { startDate: '$fechaVencimiento', endDate: '$fechaDevolucion', unit: 'day' } }] },
        },
      },
      {
        $group: {
          _id: '$l.ocupacion',
          devoluciones: { $sum: 1 },
          tarde: { $sum: { $cond: [{ $gt: ['$atraso', 0] }, 1, 0] } },
          atrasoPromedioDias: { $avg: '$atraso' },
        },
      },
      {
        $project: {
          _id: 0,
          ocupacion: '$_id',
          devoluciones: 1,
          tarde: 1,
          aTiempo: { $subtract: ['$devoluciones', '$tarde'] },
          porcentajePuntualidad: porcentaje({ $subtract: ['$devoluciones', '$tarde'] }, '$devoluciones'),
          atrasoPromedioDias: redondear('$atrasoPromedioDias', 2),
        },
      },
      { $sort: { porcentajePuntualidad: -1 } },
    ],
  },

  // V10. Lectores y préstamos por colonia: dónde está el público y dónde no.
  lectoresPorColonia: {
    coleccion: 'lectores',
    pipeline: ({ municipio = 'Tepic', limite = 15 }, { ahora }) => {
      const hace6Meses = new Date(ahora.getTime() - 182 * DIA_MS);
      return [
        { $match: { 'domicilio.municipio': municipio, estado: { $ne: 'Cancelada' } } },
        {
          $lookup: {
            from: 'prestamos',
            let: { id: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$lector', '$$id'] } } },
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  recientes: { $sum: { $cond: [{ $gte: ['$fechaPrestamo', hace6Meses] }, 1, 0] } },
                },
              },
            ],
            as: 'p',
          },
        },
        {
          $addFields: {
            prestamos: { $ifNull: [{ $arrayElemAt: ['$p.total', 0] }, 0] },
            activo: { $gt: [{ $ifNull: [{ $arrayElemAt: ['$p.recientes', 0] }, 0] }, 0] },
          },
        },
        {
          $group: {
            _id: '$domicilio.colonia',
            lectores: { $sum: 1 },
            lectoresActivos: { $sum: { $cond: ['$activo', 1, 0] } },
            prestamos: { $sum: '$prestamos' },
          },
        },
        {
          $project: {
            _id: 0,
            colonia: '$_id',
            municipio,
            lectores: 1,
            lectoresActivos: 1,
            prestamos: 1,
            prestamosPorLector: redondear(dividir('$prestamos', '$lectores'), 2),
          },
        },
        { $sort: { lectores: -1, prestamos: -1 } },
        { $limit: limite },
      ];
    },
  },
};
