// ─────────────────────────────────────────────────────────────────────────
// 10 consultas complejas · Pablo Iván Calleros Cortés
// Tema: préstamos, devoluciones y reservas
// ─────────────────────────────────────────────────────────────────────────
import { rango, dividir, porcentaje, redondear, MESES, DIAS, ZONA, DIA_MS, inicioDelDia, inicioDeAnio } from './comun.js';

const reservasPendientesDe = (campoLibro) => ({
  $lookup: {
    from: 'reservas',
    let: { id: campoLibro },
    pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$libro', '$$id'] }, { $eq: ['$estado', 'Pendiente'] }] } } },
      { $sort: { fechaSolicitud: 1 } },
      { $project: { _id: 0, nombreLector: 1 } },
    ],
    as: 'cola',
  },
});

export const consultasPablo = {
  // P1. Préstamos vencidos con días de atraso, teléfono del lector,
  //     reservas en espera del mismo libro y gravedad.
  prestamosVencidos: {
    coleccion: 'prestamos',
    pipeline: ({ diasMinimos = 1 }, { ahora }) => [
      { $match: { estado: 'Activo', fechaVencimiento: { $lt: ahora } } },
      { $addFields: { diasAtraso: { $dateDiff: { startDate: '$fechaVencimiento', endDate: ahora, unit: 'day' } } } },
      { $match: { diasAtraso: { $gte: diasMinimos } } },
      { $lookup: { from: 'lectores', localField: 'lector', foreignField: '_id', as: 'l' } },
      { $unwind: '$l' },
      reservasPendientesDe('$libro'),
      {
        $project: {
          _id: 0,
          prestamoId: '$_id',
          titulo: '$tituloLibro',
          codigoEjemplar: 1,
          lector: { $concat: ['$l.nombre', ' ', '$l.apellidos'] },
          credencial: '$l.credencial',
          telefono: '$l.telefono',
          fechaPrestamo: 1,
          fechaVencimiento: 1,
          diasAtraso: 1,
          reservasEnEspera: { $size: '$cola' },
          gravedad: {
            $switch: {
              branches: [
                { case: { $gte: ['$diasAtraso', 15] }, then: 'Crítica' },
                { case: { $gte: ['$diasAtraso', 7] }, then: 'Alta' },
              ],
              default: 'Moderada',
            },
          },
        },
      },
      { $sort: { diasAtraso: -1, reservasEnEspera: -1 } },
    ],
  },

  // P2. Estadística mensual del año: préstamos, devoluciones, renovaciones
  //     y tasa de atraso. Dos ramas en $facet y se unen mes a mes con $map.
  estadisticasMensuales: {
    coleccion: 'prestamos',
    pipeline: ({ anio }) => {
      const ini = inicioDeAnio(anio);
      const fin = inicioDeAnio(anio + 1);
      const mesDe = (campo) => ({ $month: { date: campo, timezone: ZONA } });
      return [
        {
          $facet: {
            prestados: [
              { $match: { fechaPrestamo: { $gte: ini, $lt: fin } } },
              { $group: { _id: mesDe('$fechaPrestamo'), prestamos: { $sum: 1 }, renovaciones: { $sum: '$renovaciones' } } },
            ],
            devueltos: [
              { $match: { fechaDevolucion: { $gte: ini, $lt: fin } } },
              {
                $group: {
                  _id: mesDe('$fechaDevolucion'),
                  devoluciones: { $sum: 1 },
                  tarde: { $sum: { $cond: [{ $gt: ['$fechaDevolucion', '$fechaVencimiento'] }, 1, 0] } },
                },
              },
            ],
          },
        },
        {
          $project: {
            meses: {
              $map: {
                input: { $range: [1, 13] },
                as: 'm',
                in: {
                  mes: '$$m',
                  p: { $first: { $filter: { input: '$prestados', as: 'x', cond: { $eq: ['$$x._id', '$$m'] } } } },
                  d: { $first: { $filter: { input: '$devueltos', as: 'x', cond: { $eq: ['$$x._id', '$$m'] } } } },
                },
              },
            },
          },
        },
        { $unwind: '$meses' },
        {
          $project: {
            _id: 0,
            mes: '$meses.mes',
            prestamos: { $ifNull: ['$meses.p.prestamos', 0] },
            renovaciones: { $ifNull: ['$meses.p.renovaciones', 0] },
            devoluciones: { $ifNull: ['$meses.d.devoluciones', 0] },
            devueltosTarde: { $ifNull: ['$meses.d.tarde', 0] },
          },
        },
        { $addFields: { tasaAtraso: porcentaje('$devueltosTarde', '$devoluciones') } },
      ];
    },
    transformar: (filas) => filas.map((f) => ({ ...f, nombreMes: MESES[f.mes - 1] })),
  },

  // P3. Afluencia: préstamos por día de la semana y por hora (hora de Tepic),
  //     y la matriz día × hora para planear turnos del mostrador.
  afluenciaPorDiaYHora: {
    coleccion: 'prestamos',
    pipeline: ({ desde, hasta }, { ahora }) => {
      const { inicio, fin } = rango(desde, hasta, ahora);
      return [
        { $match: { fechaPrestamo: { $gte: inicio, $lte: fin } } },
        {
          $project: {
            dia: { $dayOfWeek: { date: '$fechaPrestamo', timezone: ZONA } },
            hora: { $hour: { date: '$fechaPrestamo', timezone: ZONA } },
          },
        },
        {
          $facet: {
            porDia: [{ $group: { _id: '$dia', cantidad: { $sum: 1 } } }, { $sort: { _id: 1 } }],
            porHora: [{ $group: { _id: '$hora', cantidad: { $sum: 1 } } }, { $sort: { _id: 1 } }],
            celdas: [{ $group: { _id: { dia: '$dia', hora: '$hora' }, prestamos: { $sum: 1 } } }, { $sort: { '_id.dia': 1, '_id.hora': 1 } }],
          },
        },
      ];
    },
    transformar: ([r]) => {
      const porDia = (r?.porDia ?? []).map((d) => ({ valor: DIAS[d._id - 1], cantidad: d.cantidad }));
      const porHora = (r?.porHora ?? []).map((h) => ({ valor: `${String(h._id).padStart(2, '0')}:00`, cantidad: h.cantidad }));
      const max = (arr) => (arr.length ? arr.reduce((a, b) => (b.cantidad > a.cantidad ? b : a)).valor : null);
      return {
        porDia,
        porHora,
        celdas: (r?.celdas ?? []).map((c) => ({ dia: DIAS[c._id.dia - 1], hora: c._id.hora, prestamos: c.prestamos })),
        diaPico: max(porDia),
        horaPico: max(porHora),
      };
    },
  },

  // P4. Cuánto tiempo se quedan los libros por categoría y qué tanto se renuevan.
  duracionPorCategoria: {
    coleccion: 'prestamos',
    pipeline: () => [
      { $match: { estado: 'Devuelto', fechaDevolucion: { $ne: null } } },
      { $addFields: { dias: { $dateDiff: { startDate: '$fechaPrestamo', endDate: '$fechaDevolucion', unit: 'day' } } } },
      {
        $group: {
          _id: '$categoria',
          prestamosDevueltos: { $sum: 1 },
          diasPromedio: { $avg: '$dias' },
          diasMaximo: { $max: '$dias' },
          renovados: { $sum: { $cond: [{ $gt: ['$renovaciones', 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          categoria: '$_id',
          prestamosDevueltos: 1,
          diasPromedio: redondear('$diasPromedio', 1),
          diasMaximo: 1,
          porcentajeRenovados: porcentaje('$renovados', '$prestamosDevueltos'),
        },
      },
      { $sort: { diasPromedio: -1 } },
    ],
  },

  // P5. Cola de reservas con la posición de cada lector ($setWindowFields).
  colaReservas: {
    coleccion: 'reservas',
    pipeline: ({ libroId }, { ahora, oid }) => {
      const match = { estado: 'Pendiente' };
      if (libroId) match.libro = oid(libroId);
      return [
        { $match: match },
        {
          $setWindowFields: {
            partitionBy: '$libro',
            sortBy: { fechaSolicitud: 1 },
            output: {
              posicion: { $documentNumber: {} },
              totalEnCola: { $sum: 1, window: { documents: ['unbounded', 'unbounded'] } },
            },
          },
        },
        { $lookup: { from: 'lectores', localField: 'lector', foreignField: '_id', as: 'l' } },
        { $unwind: '$l' },
        {
          $project: {
            _id: 0,
            reservaId: '$_id',
            libroId: '$libro',
            titulo: '$tituloLibro',
            lector: { $concat: ['$l.nombre', ' ', '$l.apellidos'] },
            credencial: '$l.credencial',
            fechaSolicitud: 1,
            posicion: 1,
            totalEnCola: 1,
            diasEsperando: { $dateDiff: { startDate: '$fechaSolicitud', endDate: ahora, unit: 'day' } },
          },
        },
        { $sort: { totalEnCola: -1, titulo: 1, posicion: 1 } },
      ];
    },
  },

  // P6. Qué tan bien se atienden las reservas, por categoría.
  desempenoReservas: {
    coleccion: 'reservas',
    pipeline: ({ desde, hasta }, { ahora }) => {
      const { inicio, fin } = rango(desde, hasta, ahora);
      return [
        { $match: { fechaSolicitud: { $gte: inicio, $lte: fin } } },
        { $lookup: { from: 'libros', localField: 'libro', foreignField: '_id', as: 'l' } },
        { $unwind: '$l' },
        {
          $group: {
            _id: '$l.categoria',
            total: { $sum: 1 },
            atendidas: { $sum: { $cond: [{ $eq: ['$estado', 'Atendida'] }, 1, 0] } },
            expiradas: { $sum: { $cond: [{ $eq: ['$estado', 'Expirada'] }, 1, 0] } },
            canceladas: { $sum: { $cond: [{ $eq: ['$estado', 'Cancelada'] }, 1, 0] } },
            espera: {
              $avg: {
                $cond: [
                  { $eq: ['$estado', 'Atendida'] },
                  { $dateDiff: { startDate: '$fechaSolicitud', endDate: '$fechaAtencion', unit: 'day' } },
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            categoria: '$_id',
            total: 1,
            atendidas: 1,
            expiradas: 1,
            canceladas: 1,
            tasaAtencion: porcentaje('$atendidas', '$total'),
            diasEsperaPromedio: redondear('$espera', 1),
          },
        },
        { $sort: { total: -1 } },
      ];
    },
  },

  // P7. Tabla cruzada sala × tipo de lector, con el peso de cada tipo en su sala.
  prestamosPorSalaYTipo: {
    coleccion: 'prestamos',
    pipeline: ({ desde, hasta }, { ahora }) => {
      const { inicio, fin } = rango(desde, hasta, ahora);
      return [
        { $match: { fechaPrestamo: { $gte: inicio, $lte: fin } } },
        { $lookup: { from: 'lectores', localField: 'lector', foreignField: '_id', as: 'l' } },
        { $unwind: '$l' },
        { $group: { _id: { sala: '$sala', tipo: '$l.tipo' }, prestamos: { $sum: 1 } } },
        {
          $group: {
            _id: '$_id.sala',
            totalSala: { $sum: '$prestamos' },
            tipos: { $push: { tipo: '$_id.tipo', prestamos: '$prestamos' } },
          },
        },
        { $unwind: '$tipos' },
        {
          $project: {
            _id: 0,
            sala: '$_id',
            tipoLector: '$tipos.tipo',
            prestamos: '$tipos.prestamos',
            porcentajeDeSala: porcentaje('$tipos.prestamos', '$totalSala'),
          },
        },
        { $sort: { sala: 1, prestamos: -1 } },
      ];
    },
  },

  // P8. Pronóstico: qué ejemplares deben regresar cada día de los próximos N días
  //     y quién es el siguiente en la cola de cada uno.
  pronosticoDisponibilidad: {
    coleccion: 'prestamos',
    pipeline: ({ dias = 7 }, { ahora }) => [
      {
        $match: {
          estado: 'Activo',
          fechaVencimiento: { $gte: inicioDelDia(ahora), $lt: new Date(inicioDelDia(ahora).getTime() + (dias + 1) * DIA_MS) },
        },
      },
      reservasPendientesDe('$libro'),
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$fechaVencimiento', timezone: ZONA } },
          devolucionesEsperadas: { $sum: 1 },
          libros: {
            $push: {
              titulo: '$tituloLibro',
              codigoEjemplar: '$codigoEjemplar',
              lector: '$nombreLector',
              reservasEnEspera: { $size: '$cola' },
              siguienteEnCola: { $ifNull: [{ $first: '$cola.nombreLector' }, null] },
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, fecha: '$_id', devolucionesEsperadas: 1, libros: 1 } },
    ],
  },

  // P9. Libros que más se renuevan: señal de que hacen falta más ejemplares.
  librosConMasRenovaciones: {
    coleccion: 'prestamos',
    pipeline: ({ limite = 10 }) => [
      { $group: { _id: '$libro', prestamos: { $sum: 1 }, renovacionesTotales: { $sum: '$renovaciones' } } },
      { $match: { renovacionesTotales: { $gt: 0 } } },
      { $sort: { renovacionesTotales: -1, prestamos: -1 } },
      { $limit: limite },
      { $lookup: { from: 'libros', localField: '_id', foreignField: '_id', as: 'l' } },
      { $unwind: '$l' },
      { $addFields: { promedioRenovaciones: redondear(dividir('$renovacionesTotales', '$prestamos'), 2) } },
      {
        $project: {
          _id: 0,
          libroId: '$_id',
          titulo: '$l.titulo',
          categoria: '$l.categoria',
          prestamos: 1,
          renovacionesTotales: 1,
          promedioRenovaciones: 1,
          ejemplaresTotales: '$l.ejemplaresTotales',
          sugerenciaAdquirir: { $and: [{ $gte: ['$promedioRenovaciones', 0.5] }, { $lte: ['$l.ejemplaresTotales', 2] }] },
        },
      },
    ],
  },

  // P10. Tablero del día en UNA consulta: $facet sobre préstamos y
  //      $lookup sin condición de unión para contar las reservas.
  tableroOperativo: {
    coleccion: 'prestamos',
    pipeline: (_args, { ahora }) => {
      const hoy = inicioDelDia(ahora);
      const semana = new Date(ahora.getTime() - 7 * DIA_MS);
      return [
        {
          $facet: {
            prestamosHoy: [{ $match: { fechaPrestamo: { $gte: hoy } } }, { $count: 'n' }],
            devolucionesHoy: [{ $match: { fechaDevolucion: { $gte: hoy } } }, { $count: 'n' }],
            lectoresHoy: [
              { $match: { $or: [{ fechaPrestamo: { $gte: hoy } }, { fechaDevolucion: { $gte: hoy } }] } },
              { $group: { _id: '$lector' } },
              { $count: 'n' },
            ],
            activos: [{ $match: { estado: 'Activo' } }, { $count: 'n' }],
            vencidos: [{ $match: { estado: 'Activo', fechaVencimiento: { $lt: ahora } } }, { $count: 'n' }],
            categoriasSemana: [
              { $match: { fechaPrestamo: { $gte: semana } } },
              { $group: { _id: '$categoria', cantidad: { $sum: 1 } } },
              { $sort: { cantidad: -1 } },
              { $limit: 5 },
              { $project: { _id: 0, valor: '$_id', cantidad: 1 } },
            ],
          },
        },
        {
          $lookup: {
            from: 'reservas',
            pipeline: [
              { $match: { estado: { $in: ['Pendiente', 'Lista para recoger'] } } },
              { $group: { _id: '$estado', n: { $sum: 1 } } },
            ],
            as: 'reservas',
          },
        },
      ];
    },
    transformar: ([r], _args, { ahora }) => {
      const n = (k) => r?.[k]?.[0]?.n ?? 0;
      const res = (estado) => r?.reservas?.find((x) => x._id === estado)?.n ?? 0;
      const local = new Date(ahora.getTime() - 7 * 3600 * 1000);
      return {
        fecha: local.toISOString().slice(0, 10),
        prestamosHoy: n('prestamosHoy'),
        devolucionesHoy: n('devolucionesHoy'),
        lectoresAtendidosHoy: n('lectoresHoy'),
        activos: n('activos'),
        vencidos: n('vencidos'),
        reservasPendientes: res('Pendiente'),
        reservasPorRecoger: res('Lista para recoger'),
        categoriasSemana: r?.categoriasSemana ?? [],
      };
    },
  },
};
