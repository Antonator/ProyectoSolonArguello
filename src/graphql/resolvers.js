// Resolvers: Queries, Mutations y campos calculados.
import mongoose from 'mongoose';
import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';
import { Autor } from '../models/Autor.js';
import { Libro, CATEGORIAS, SALAS, ESTADOS_EJEMPLAR } from '../models/Libro.js';
import { Lector } from '../models/Lector.js';
import { Prestamo } from '../models/Prestamo.js';
import { Reserva } from '../models/Reserva.js';
import { iniciarSesion, requerirPersonal } from '../auth.js';
import { enTransaccion } from '../utils/transaccion.js';
import { escaparRegex } from '../utils/texto.js';
import { consultasAntony, pipelineCatalogo } from './consultas/antony.js';
import { consultasVictor } from './consultas/victor.js';
import { consultasPablo } from './consultas/pablo.js';

// ── Reglas del servicio de préstamo a domicilio (ajustables en .env) ──
const REGLAS = {
  maxLibros: Number(process.env.MAX_LIBROS_POR_LECTOR ?? 3),
  diasPrestamo: Number(process.env.DIAS_PRESTAMO ?? 7),
  maxRenovaciones: Number(process.env.MAX_RENOVACIONES ?? 2),
  diasParaRecoger: Number(process.env.DIAS_PARA_RECOGER ?? 3),
  diasSuspensionPorDiaAtraso: Number(process.env.DIAS_SUSPENSION_POR_DIA ?? 1),
  aniosVigencia: 2,
};
const DIA = 24 * 3600 * 1000;

const MODELOS = { autores: Autor, libros: Libro, lectores: Lector, prestamos: Prestamo, reservas: Reserva };

const error = (mensaje, code = 'BAD_USER_INPUT') => {
  throw new GraphQLError(mensaje, { extensions: { code } });
};
const oid = (id) => {
  if (!mongoose.isValidObjectId(id)) error(`Identificador inválido: ${id}`);
  return new mongoose.Types.ObjectId(String(id));
};
const paginar = (pagina, porPagina) => ({
  salto: (Math.max(1, pagina) - 1) * Math.min(100, porPagina),
  limite: Math.min(100, Math.max(1, porPagina)),
});

// Ejecuta una de las 30 consultas complejas (aggregation pipeline).
async function ejecutarConsulta(consulta, args, ctx, { publica = false } = {}) {
  if (!publica) requerirPersonal(ctx);
  const contexto = { ahora: new Date(), oid };
  const filas = await MODELOS[consulta.coleccion].aggregate(consulta.pipeline(args, contexto));
  return consulta.transformar ? consulta.transformar(filas, args, contexto) : filas;
}

const resolverConsultas = (grupo) =>
  Object.fromEntries(Object.entries(grupo).map(([nombre, c]) => [nombre, (_p, args, ctx) => ejecutarConsulta(c, args, ctx)]));

// Situación de la credencial calculada con la fecha de hoy.
function situacionLector(l, ahora = new Date()) {
  if (l.estado === 'Cancelada') return 'Cancelada';
  if (l.suspendidoHasta && new Date(l.suspendidoHasta) > ahora) return 'Suspendida';
  if (new Date(l.vigencia) < ahora) return 'Vencida';
  return 'Activa';
}

function filtroSituacionLector(situacion, ahora = new Date()) {
  switch (situacion) {
    case 'Activa':
      return { estado: { $ne: 'Cancelada' }, vigencia: { $gte: ahora }, $or: [{ suspendidoHasta: null }, { suspendidoHasta: { $lte: ahora } }] };
    case 'Vencida':
      return { estado: { $ne: 'Cancelada' }, vigencia: { $lt: ahora } };
    case 'Suspendida':
      return { estado: { $ne: 'Cancelada' }, suspendidoHasta: { $gt: ahora } };
    case 'Cancelada':
      return { estado: 'Cancelada' };
    default:
      return {};
  }
}

function filtroSituacionPrestamo(situacion, ahora = new Date()) {
  switch (situacion) {
    case 'Abiertos':
      return { estado: 'Activo' };
    case 'Activo':
      return { estado: 'Activo', fechaVencimiento: { $gte: ahora } };
    case 'Vencido':
      return { estado: 'Activo', fechaVencimiento: { $lt: ahora } };
    case 'Devuelto':
    case 'Extraviado':
      return { estado: situacion };
    default:
      return {};
  }
}

// Busca por id usando una caché por petición (evita consultas repetidas en listas).
async function porId(ctx, Modelo, id) {
  if (!id) return null;
  const clave = `${Modelo.modelName}:${id}`;
  if (!ctx.cache.has(clave)) ctx.cache.set(clave, Modelo.findById(id).lean().exec());
  return ctx.cache.get(clave);
}

async function siguienteCodigoEjemplar(cantidad) {
  const [ultimo] = await Libro.aggregate([
    { $unwind: '$ejemplares' },
    { $sort: { 'ejemplares.codigo': -1 } },
    { $limit: 1 },
    { $project: { codigo: '$ejemplares.codigo' } },
  ]);
  let n = ultimo ? Number(ultimo.codigo.replace(/\D/g, '')) : 0;
  return Array.from({ length: cantidad }, () => `BPSA-${String(++n).padStart(6, '0')}`);
}

async function siguienteCredencial() {
  const anio = new Date().getFullYear();
  const [ultimo] = await Lector.find({ credencial: new RegExp(`^BPSA-${anio}-`) }).sort({ credencial: -1 }).limit(1).lean();
  const n = ultimo ? Number(ultimo.credencial.split('-')[2]) + 1 : 1;
  return `BPSA-${anio}-${String(n).padStart(5, '0')}`;
}

function validarLibroInput(input) {
  if (!CATEGORIAS.includes(input.categoria)) error(`Categoría no válida. Opciones: ${CATEGORIAS.join(', ')}`);
  if (input.sala && !SALAS.includes(input.sala)) error(`Sala no válida. Opciones: ${SALAS.join(', ')}`);
  const isbn = input.isbn.replace(/[^0-9Xx]/g, '');
  if (isbn.length !== 10 && isbn.length !== 13) error('El ISBN debe tener 10 o 13 dígitos');
}

const edadEn = (fechaNacimiento, ahora = new Date()) => Math.floor((ahora - new Date(fechaNacimiento)) / (365.25 * DIA));

// ─────────────────────────────── Resolvers ───────────────────────────────
export const resolvers = {
  Fecha: new GraphQLScalarType({
    name: 'Fecha',
    serialize: (v) => (v instanceof Date ? v.toISOString() : v == null ? null : new Date(v).toISOString()),
    parseValue: (v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) error(`Fecha inválida: ${v}`);
      return d;
    },
    parseLiteral: (ast) => {
      if (ast.kind !== Kind.STRING) error('La fecha debe ser texto ISO, p. ej. "2026-11-21"');
      return resolvers.Fecha.parseValue(ast.value);
    },
  }),

  Query: {
    // ── Públicas ──
    catalogo: (_p, { filtro, pagina, porPagina }, ctx) =>
      ejecutarConsulta(
        { coleccion: 'libros', pipeline: pipelineCatalogo, transformar: consultasAntony.busquedaAvanzada.transformar },
        { filtro: filtro ?? {}, pagina, porPagina: Math.min(48, porPagina) },
        ctx,
        { publica: true }
      ),
    libro: (_p, { id }) => Libro.findOne({ _id: oid(id), activo: true }).lean().exec(),
    novedades: (_p, { limite }) =>
      Libro.aggregate([
        { $match: { activo: true, ejemplaresTotales: { $gt: 0 }, sala: { $ne: 'Consulta' } } },
        { $addFields: { ultimaAdquisicion: { $max: '$ejemplares.fechaAdquisicion' } } },
        { $sort: { ultimaAdquisicion: -1 } },
        { $limit: Math.min(24, limite) },
      ]),
    categorias: () => CATEGORIAS,
    salas: () => SALAS,

    // ── Personal ──
    yo: (_p, _a, ctx) => (ctx.usuario ? { ...ctx.usuario, token: '' } : null),

    resumenInventario: async (_p, _a, ctx) => {
      requerirPersonal(ctx);
      const ahora = new Date();
      const [inv] = await Libro.aggregate([
        { $match: { activo: true } },
        { $group: { _id: null, titulos: { $sum: 1 }, ejemplaresTotales: { $sum: '$ejemplaresTotales' }, disponibles: { $sum: '$ejemplaresDisponibles' } } },
      ]);
      const [enPrestamo, prestamosVencidos, lectoresActivos] = await Promise.all([
        Prestamo.countDocuments({ estado: 'Activo' }).exec(),
        Prestamo.countDocuments({ estado: 'Activo', fechaVencimiento: { $lt: ahora } }).exec(),
        Lector.countDocuments(filtroSituacionLector('Activa', ahora)).exec(),
      ]);
      return { titulos: inv?.titulos ?? 0, ejemplaresTotales: inv?.ejemplaresTotales ?? 0, disponibles: inv?.disponibles ?? 0, enPrestamo, prestamosVencidos, lectoresActivos };
    },

    autores: (_p, { busqueda, limite }, ctx) => {
      requerirPersonal(ctx);
      const f = busqueda ? { nombre: { $regex: escaparRegex(busqueda), $options: 'i' } } : {};
      return Autor.find(f).sort({ nombre: 1 }).limit(Math.min(100, limite)).lean().exec();
    },
    autor: (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      return Autor.findById(oid(id)).lean().exec();
    },

    lectores: async (_p, { busqueda, situacion, pagina, porPagina }, ctx) => {
      requerirPersonal(ctx);
      const f = { ...filtroSituacionLector(situacion) };
      if (busqueda?.trim()) {
        const rx = { $regex: escaparRegex(busqueda.trim()), $options: 'i' };
        f.$and = [{ $or: [{ nombre: rx }, { apellidos: rx }, { credencial: rx }, { telefono: rx }, { email: rx }] }];
      }
      const { salto, limite } = paginar(pagina, porPagina);
      const [total, lectores] = await Promise.all([
        Lector.countDocuments(f).exec(),
        Lector.find(f).sort({ apellidos: 1, nombre: 1 }).skip(salto).limit(limite).lean().exec(),
      ]);
      return { total, pagina, paginas: Math.max(1, Math.ceil(total / limite)), lectores };
    },
    lector: (_p, { id, credencial }, ctx) => {
      requerirPersonal(ctx);
      if (id) return Lector.findById(oid(id)).lean().exec();
      if (credencial) return Lector.findOne({ credencial: credencial.trim().toUpperCase() }).lean().exec();
      return null;
    },

    prestamos: async (_p, { situacion, busqueda, pagina, porPagina }, ctx) => {
      requerirPersonal(ctx);
      const f = { ...filtroSituacionPrestamo(situacion) };
      if (busqueda?.trim()) {
        const rx = { $regex: escaparRegex(busqueda.trim()), $options: 'i' };
        f.$or = [{ tituloLibro: rx }, { nombreLector: rx }, { codigoEjemplar: rx }];
      }
      const { salto, limite } = paginar(pagina, porPagina);
      const orden = situacion === 'Vencido' ? { fechaVencimiento: 1 } : { fechaPrestamo: -1 };
      const [total, prestamos] = await Promise.all([
        Prestamo.countDocuments(f).exec(),
        Prestamo.find(f).sort(orden).skip(salto).limit(limite).lean().exec(),
      ]);
      return { total, pagina, paginas: Math.max(1, Math.ceil(total / limite)), prestamos };
    },
    prestamo: (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      return Prestamo.findById(oid(id)).lean().exec();
    },
    reservas: (_p, { estado, libroId, limite }, ctx) => {
      requerirPersonal(ctx);
      const f = {};
      if (estado) f.estado = estado;
      if (libroId) f.libro = oid(libroId);
      return Reserva.find(f).sort({ fechaSolicitud: estado === 'Pendiente' ? 1 : -1 }).limit(Math.min(200, limite)).lean().exec();
    },

    // ── 30 consultas complejas ──
    ...resolverConsultas(consultasAntony),
    ...resolverConsultas(consultasVictor),
    ...resolverConsultas(consultasPablo),

    // La consulta de recomendaciones tiene un plan B para lectores sin historial.
    recomendacionesParaLector: async (_p, args, ctx) => {
      const r = await ejecutarConsulta(consultasVictor.recomendacionesParaLector, args, ctx);
      if (r.length) return r;
      const lector = await Lector.findById(oid(args.lectorId)).lean();
      if (!lector) error('El lector no existe', 'NOT_FOUND');
      const populares = await Libro.find({ activo: true, categoria: { $in: lector.intereses }, ejemplaresDisponibles: { $gt: 0 } })
        .sort({ ejemplaresTotales: -1 }).limit(args.limite).lean();
      return populares.map((l) => ({
        libroId: l._id, titulo: l.titulo, autor: l.autorNombre, categoria: l.categoria, lectoresEnComun: 0,
        disponible: true, motivo: `Coincide con su interés en ${l.categoria}`,
      }));
    },
  },

  Mutation: {
    login: (_p, { usuario, contrasena }) => iniciarSesion(usuario, contrasena),

    // ───── Autores ─────
    crearAutor: (_p, { input }, ctx) => {
      requerirPersonal(ctx);
      return Autor.create(input);
    },
    actualizarAutor: async (_p, { id, input }, ctx) => {
      requerirPersonal(ctx);
      const autor = await Autor.findByIdAndUpdate(oid(id), input, { new: true, runValidators: true });
      if (!autor) error('El autor no existe', 'NOT_FOUND');
      await Libro.updateMany({ autor: autor._id }, { $set: { autorNombre: autor.nombre } });
      return autor;
    },
    eliminarAutor: async (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      const libros = await Libro.countDocuments({ autor: oid(id) });
      if (libros) error(`No se puede eliminar: el autor tiene ${libros} libro(s) en el acervo`);
      const r = await Autor.deleteOne({ _id: oid(id) });
      return r.deletedCount === 1;
    },

    // ───── Libros ─────
    crearLibro: async (_p, { input }, ctx) => {
      requerirPersonal(ctx);
      validarLibroInput(input);
      const autor = await Autor.findById(oid(input.autorId));
      if (!autor) error('El autor no existe; regístralo primero');
      if (await Libro.exists({ isbn: input.isbn.trim() })) error('Ya existe un libro con ese ISBN');
      const cantidad = Math.max(0, Math.min(50, input.ejemplaresIniciales ?? 1));
      const codigos = await siguienteCodigoEjemplar(cantidad);
      const { autorId, ejemplaresIniciales, origen, ...datos } = input;
      const libro = new Libro({
        ...datos,
        autor: autor._id,
        autorNombre: autor.nombre,
        ejemplares: codigos.map((codigo) => ({ codigo, estado: 'Disponible', origen: origen || 'Compra', fechaAdquisicion: new Date() })),
      });
      await libro.save();
      return libro;
    },
    actualizarLibro: async (_p, { id, input }, ctx) => {
      requerirPersonal(ctx);
      validarLibroInput(input);
      const libro = await Libro.findById(oid(id));
      if (!libro) error('El libro no existe', 'NOT_FOUND');
      if (input.isbn.trim() !== libro.isbn && (await Libro.exists({ isbn: input.isbn.trim() }))) error('Ya existe otro libro con ese ISBN');
      if (String(libro.autor) !== String(input.autorId)) {
        const autor = await Autor.findById(oid(input.autorId));
        if (!autor) error('El autor no existe');
        libro.autor = autor._id;
        libro.autorNombre = autor.nombre;
      }
      const { autorId, ejemplaresIniciales, origen, ...datos } = input;
      libro.set(datos);
      await libro.save();
      return libro;
    },
    eliminarLibro: async (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      const libro = await Libro.findById(oid(id));
      if (!libro) error('El libro no existe', 'NOT_FOUND');
      if (libro.ejemplares.some((e) => e.estado === 'Prestado')) error('No se puede dar de baja: tiene ejemplares prestados');
      await Reserva.updateMany({ libro: libro._id, estado: { $in: ['Pendiente', 'Lista para recoger'] } }, { $set: { estado: 'Cancelada', fechaAtencion: new Date(), notas: 'Libro dado de baja' } });
      if (await Prestamo.exists({ libro: libro._id })) {
        // Tiene historial: baja lógica para no romper los reportes.
        libro.activo = false;
        await libro.save();
      } else {
        await libro.deleteOne();
      }
      return true;
    },
    agregarEjemplares: async (_p, { id, cantidad, origen }, ctx) => {
      requerirPersonal(ctx);
      if (cantidad < 1 || cantidad > 50) error('La cantidad debe estar entre 1 y 50');
      const libro = await Libro.findById(oid(id));
      if (!libro) error('El libro no existe', 'NOT_FOUND');
      const codigos = await siguienteCodigoEjemplar(cantidad);
      for (const codigo of codigos) libro.ejemplares.push({ codigo, estado: 'Disponible', origen: origen || 'Compra', fechaAdquisicion: new Date() });
      await libro.save();
      return libro;
    },
    cambiarEstadoEjemplar: async (_p, { id, codigo, estado }, ctx) => {
      requerirPersonal(ctx);
      if (!ESTADOS_EJEMPLAR.includes(estado) || estado === 'Prestado') error('Estado no válido (el estado Prestado lo asigna el préstamo)');
      const libro = await Libro.findById(oid(id));
      const ej = libro?.ejemplares.find((e) => e.codigo === codigo);
      if (!ej) error('Ejemplar no encontrado', 'NOT_FOUND');
      if (ej.estado === 'Prestado') error('El ejemplar está prestado; regístralo como devuelto primero');
      ej.estado = estado;
      await libro.save();
      return libro;
    },

    // ───── Lectores ─────
    crearLector: async (_p, { input }, ctx) => {
      requerirPersonal(ctx);
      const ahora = new Date();
      const edad = edadEn(input.fechaNacimiento, ahora);
      if (edad < 0 || edad > 120) error('Fecha de nacimiento no válida');
      if (!input.fiador?.nombre?.trim()) error('El préstamo a domicilio requiere un fiador');
      const vigencia = new Date(ahora);
      vigencia.setFullYear(vigencia.getFullYear() + REGLAS.aniosVigencia);
      return Lector.create({
        ...input,
        tipo: input.tipo || (edad < 13 ? 'Infantil' : input.ocupacion === 'Estudiante' ? 'Estudiante' : 'General'),
        credencial: await siguienteCredencial(),
        fechaRegistro: ahora,
        vigencia,
      });
    },
    actualizarLector: async (_p, { id, input }, ctx) => {
      requerirPersonal(ctx);
      const lector = await Lector.findById(oid(id));
      if (!lector) error('El lector no existe', 'NOT_FOUND');
      lector.set(input);
      await lector.save();
      await Prestamo.updateMany({ lector: lector._id, estado: 'Activo' }, { $set: { nombreLector: `${lector.nombre} ${lector.apellidos}` } });
      return lector;
    },
    eliminarLector: async (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      const _id = oid(id);
      const activos = await Prestamo.countDocuments({ lector: _id, estado: 'Activo' });
      if (activos) error(`No se puede eliminar: tiene ${activos} préstamo(s) sin devolver`);
      await Reserva.updateMany({ lector: _id, estado: { $in: ['Pendiente', 'Lista para recoger'] } }, { $set: { estado: 'Cancelada', fechaAtencion: new Date() } });
      // El historial de préstamos se conserva para las estadísticas, sin el nombre.
      await Prestamo.updateMany({ lector: _id }, { $set: { nombreLector: 'Lector eliminado' } });
      await Reserva.updateMany({ lector: _id }, { $set: { nombreLector: 'Lector eliminado' } });
      const r = await Lector.deleteOne({ _id });
      return r.deletedCount === 1;
    },
    renovarCredencial: async (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      const lector = await Lector.findById(oid(id));
      if (!lector) error('El lector no existe', 'NOT_FOUND');
      const base = new Date(Math.max(Date.now(), lector.vigencia.getTime()));
      base.setFullYear(base.getFullYear() + REGLAS.aniosVigencia);
      lector.vigencia = base;
      if (lector.estado === 'Cancelada') lector.estado = 'Activa';
      await lector.save();
      return lector;
    },
    suspenderLector: async (_p, { id, dias }, ctx) => {
      requerirPersonal(ctx);
      if (dias < 1 || dias > 365) error('Los días de suspensión deben estar entre 1 y 365');
      const lector = await Lector.findByIdAndUpdate(oid(id), { estado: 'Suspendida', suspendidoHasta: new Date(Date.now() + dias * DIA) }, { new: true });
      if (!lector) error('El lector no existe', 'NOT_FOUND');
      return lector;
    },
    reactivarLector: async (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      const lector = await Lector.findByIdAndUpdate(oid(id), { estado: 'Activa', suspendidoHasta: null }, { new: true });
      if (!lector) error('El lector no existe', 'NOT_FOUND');
      return lector;
    },

    // ───── Préstamos ─────
    registrarPrestamo: (_p, { lectorId, libroId }, ctx) => {
      const usuario = requerirPersonal(ctx);
      return enTransaccion(async (session) => {
        const ahora = new Date();
        const lector = await Lector.findById(oid(lectorId)).session(session);
        if (!lector) error('El lector no existe', 'NOT_FOUND');
        const situacion = situacionLector(lector, ahora);
        if (situacion !== 'Activa') {
          const detalle = situacion === 'Suspendida' ? ` hasta el ${lector.suspendidoHasta.toLocaleDateString('es-MX')}` : '';
          error(`La credencial ${lector.credencial} está ${situacion.toLowerCase()}${detalle}`);
        }
        const [activos, vencidos] = await Promise.all([
          Prestamo.countDocuments({ lector: lector._id, estado: 'Activo' }).session(session).exec(),
          Prestamo.countDocuments({ lector: lector._id, estado: 'Activo', fechaVencimiento: { $lt: ahora } }).session(session).exec(),
        ]);
        if (vencidos) error('El lector tiene libros vencidos; debe devolverlos antes de pedir otro');
        if (activos >= REGLAS.maxLibros) error(`El lector ya tiene ${activos} libros (máximo ${REGLAS.maxLibros})`);

        const libro = await Libro.findOne({ _id: oid(libroId), activo: true }).session(session);
        if (!libro) error('El libro no existe', 'NOT_FOUND');
        if (libro.sala === 'Consulta') error('Los libros de la sala de Consulta solo se leen dentro de la biblioteca');
        const apartados = await Reserva.countDocuments({ libro: libro._id, estado: 'Lista para recoger', lector: { $ne: lector._id } }).session(session);
        if (libro.ejemplaresDisponibles - apartados <= 0) {
          error(apartados ? 'Los ejemplares disponibles están apartados para otros lectores' : 'No hay ejemplares disponibles; puedes registrar una reserva');
        }
        const copia = libro.ejemplares.find((e) => e.estado === 'Disponible');
        // Actualización atómica: solo toma la copia si sigue disponible.
        const tomado = await Libro.findOneAndUpdate(
          { _id: libro._id, ejemplares: { $elemMatch: { codigo: copia.codigo, estado: 'Disponible' } } },
          { $set: { 'ejemplares.$.estado': 'Prestado' }, $inc: { ejemplaresDisponibles: -1 } },
          { new: true, session }
        );
        if (!tomado) error('Ese ejemplar se acaba de prestar en otro mostrador; intenta de nuevo', 'CONFLICT');

        const [prestamo] = await Prestamo.create(
          [{
            lector: lector._id,
            libro: libro._id,
            codigoEjemplar: copia.codigo,
            tituloLibro: libro.titulo,
            categoria: libro.categoria,
            sala: libro.sala,
            nombreLector: `${lector.nombre} ${lector.apellidos}`,
            fechaPrestamo: ahora,
            fechaVencimiento: new Date(ahora.getTime() + REGLAS.diasPrestamo * DIA),
            atendidoPor: usuario.nombre,
          }],
          { session }
        );
        await Reserva.updateMany(
          { lector: lector._id, libro: libro._id, estado: { $in: ['Pendiente', 'Lista para recoger'] } },
          { $set: { estado: 'Atendida', fechaAtencion: ahora } },
          { session }
        );
        return prestamo;
      });
    },

    devolverPrestamo: (_p, { id, condicion, observaciones }, ctx) => {
      requerirPersonal(ctx);
      if (!['Buena', 'Dañado'].includes(condicion)) error('La condición debe ser "Buena" o "Dañado"');
      return enTransaccion(async (session) => {
        const ahora = new Date();
        const p = await Prestamo.findById(oid(id)).session(session);
        if (!p) error('El préstamo no existe', 'NOT_FOUND');
        if (p.estado !== 'Activo') error('Este préstamo ya está cerrado');
        const diasAtraso = Math.max(0, Math.ceil((ahora - p.fechaVencimiento) / DIA));
        p.set({ fechaDevolucion: ahora, estado: 'Devuelto', condicionDevolucion: condicion });
        if (observaciones) p.observaciones = observaciones;
        await p.save({ session });

        const nuevoEstado = condicion === 'Dañado' ? 'En reparación' : 'Disponible';
        await Libro.updateOne(
          { _id: p.libro, 'ejemplares.codigo': p.codigoEjemplar },
          { $set: { 'ejemplares.$.estado': nuevoEstado }, $inc: { ejemplaresDisponibles: nuevoEstado === 'Disponible' ? 1 : 0 } },
          { session }
        );

        let diasSuspension = 0;
        if (diasAtraso > 0) {
          diasSuspension = diasAtraso * REGLAS.diasSuspensionPorDiaAtraso;
          const lector = await Lector.findById(p.lector).session(session);
          if (lector && lector.estado !== 'Cancelada') {
            const hasta = new Date(ahora.getTime() + diasSuspension * DIA);
            if (!lector.suspendidoHasta || lector.suspendidoHasta < hasta) lector.suspendidoHasta = hasta;
            lector.estado = 'Suspendida';
            await lector.save({ session });
          }
        }

        // Si alguien esperaba este libro, se le aparta el ejemplar.
        let reservaNotificada = null;
        if (nuevoEstado === 'Disponible') {
          reservaNotificada = await Reserva.findOneAndUpdate(
            { libro: p.libro, estado: 'Pendiente' },
            { $set: { estado: 'Lista para recoger', fechaLimiteRecoger: new Date(ahora.getTime() + REGLAS.diasParaRecoger * DIA) } },
            { sort: { fechaSolicitud: 1 }, new: true, session }
          );
        }
        const partes = [diasAtraso ? `Devuelto con ${diasAtraso} día(s) de atraso: credencial suspendida ${diasSuspension} día(s).` : 'Devuelto a tiempo.'];
        if (condicion === 'Dañado') partes.push('El ejemplar pasó a reparación.');
        if (reservaNotificada) partes.push(`Apartado para ${reservaNotificada.nombreLector} (tiene ${REGLAS.diasParaRecoger} días para recogerlo).`);
        return { prestamo: p, diasAtraso, diasSuspension, reservaNotificada, mensaje: partes.join(' ') };
      });
    },

    renovarPrestamo: async (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      const p = await Prestamo.findById(oid(id));
      if (!p) error('El préstamo no existe', 'NOT_FOUND');
      if (p.estado !== 'Activo') error('Solo se renuevan préstamos activos');
      if (p.fechaVencimiento < new Date()) error('El préstamo está vencido; primero debe devolverse');
      if (p.renovaciones >= REGLAS.maxRenovaciones) error(`Ya se renovó ${p.renovaciones} veces (máximo ${REGLAS.maxRenovaciones})`);
      if (await Reserva.exists({ libro: p.libro, estado: 'Pendiente' })) error('No se puede renovar: otro lector reservó este libro');
      p.fechaVencimiento = new Date(p.fechaVencimiento.getTime() + REGLAS.diasPrestamo * DIA);
      p.renovaciones += 1;
      await p.save();
      return p;
    },

    actualizarPrestamo: async (_p, { id, input }, ctx) => {
      requerirPersonal(ctx);
      const p = await Prestamo.findById(oid(id));
      if (!p) error('El préstamo no existe', 'NOT_FOUND');
      if (input.fechaVencimiento) {
        if (p.estado !== 'Activo') error('Solo se cambia la fecha de préstamos activos');
        if (input.fechaVencimiento <= p.fechaPrestamo) error('La fecha de vencimiento debe ser posterior a la del préstamo');
        p.fechaVencimiento = input.fechaVencimiento;
      }
      if (input.observaciones != null) p.observaciones = input.observaciones;
      await p.save();
      return p;
    },

    marcarExtraviado: (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      return enTransaccion(async (session) => {
        const p = await Prestamo.findById(oid(id)).session(session);
        if (!p) error('El préstamo no existe', 'NOT_FOUND');
        if (p.estado !== 'Activo') error('Solo se marca como extraviado un préstamo activo');
        p.estado = 'Extraviado';
        p.fechaDevolucion = new Date();
        p.observaciones = [p.observaciones, 'Ejemplar reportado como extraviado.'].filter(Boolean).join(' ');
        await p.save({ session });
        await Libro.updateOne(
          { _id: p.libro, 'ejemplares.codigo': p.codigoEjemplar },
          { $set: { 'ejemplares.$.estado': 'Extraviado' }, $inc: { ejemplaresTotales: -1 } },
          { session }
        );
        return p;
      });
    },

    eliminarPrestamo: (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      return enTransaccion(async (session) => {
        const p = await Prestamo.findById(oid(id)).session(session);
        if (!p) error('El préstamo no existe', 'NOT_FOUND');
        if (p.estado === 'Activo') {
          // Corrige un registro hecho por error: el ejemplar vuelve a estar disponible.
          await Libro.updateOne(
            { _id: p.libro, ejemplares: { $elemMatch: { codigo: p.codigoEjemplar, estado: 'Prestado' } } },
            { $set: { 'ejemplares.$.estado': 'Disponible' }, $inc: { ejemplaresDisponibles: 1 } },
            { session }
          );
        }
        await Prestamo.deleteOne({ _id: p._id }, { session });
        return true;
      });
    },

    // ───── Reservas ─────
    crearReserva: async (_p, { lectorId, libroId }, ctx) => {
      requerirPersonal(ctx);
      const [lector, libro] = await Promise.all([Lector.findById(oid(lectorId)), Libro.findOne({ _id: oid(libroId), activo: true })]);
      if (!lector) error('El lector no existe', 'NOT_FOUND');
      if (!libro) error('El libro no existe', 'NOT_FOUND');
      if (situacionLector(lector) !== 'Activa') error(`La credencial está ${situacionLector(lector).toLowerCase()}`);
      if (libro.sala === 'Consulta') error('Los libros de Consulta no se reservan');
      if (libro.ejemplaresDisponibles > 0) error('Hay ejemplares disponibles: registra el préstamo directamente');
      if (await Reserva.exists({ lector: lector._id, libro: libro._id, estado: { $in: ['Pendiente', 'Lista para recoger'] } })) {
        error('El lector ya está en la cola de este libro');
      }
      return Reserva.create({ lector: lector._id, libro: libro._id, tituloLibro: libro.titulo, nombreLector: `${lector.nombre} ${lector.apellidos}` });
    },
    cancelarReserva: async (_p, { id }, ctx) => {
      requerirPersonal(ctx);
      const r = await Reserva.findById(oid(id));
      if (!r) error('La reserva no existe', 'NOT_FOUND');
      if (!['Pendiente', 'Lista para recoger'].includes(r.estado)) error('La reserva ya está cerrada');
      const estabaLista = r.estado === 'Lista para recoger';
      r.estado = 'Cancelada';
      r.fechaAtencion = new Date();
      await r.save();
      if (estabaLista) {
        // El ejemplar apartado pasa al siguiente de la cola.
        await Reserva.findOneAndUpdate(
          { libro: r.libro, estado: 'Pendiente' },
          { $set: { estado: 'Lista para recoger', fechaLimiteRecoger: new Date(Date.now() + REGLAS.diasParaRecoger * DIA) } },
          { sort: { fechaSolicitud: 1 } }
        );
      }
      return r;
    },
  },

  // ───────────────────────── Campos calculados ─────────────────────────
  Autor: {
    id: (a) => String(a._id ?? a.id),
    generos: (a) => a.generos ?? [],
    esNayarita: (a) => Boolean(a.esNayarita),
    libros: (a) => Libro.find({ autor: a._id, activo: true }).sort({ anioPublicacion: -1 }).lean().exec(),
    totalLibros: (a) => Libro.countDocuments({ autor: a._id, activo: true }).exec(),
  },
  Libro: {
    id: (l) => String(l._id ?? l.id),
    autor: (l, _a, ctx) => porId(ctx, Autor, l.autor),
    palabrasClave: (l) => l.palabrasClave ?? [],
    ejemplares: (l) => l.ejemplares ?? [],
    activo: (l) => l.activo !== false,
    ediciones: (l) => l.ediciones ?? 1,
    reservasPendientes: (l) => Reserva.countDocuments({ libro: l._id, estado: 'Pendiente' }).exec(),
  },
  Lector: {
    id: (l) => String(l._id ?? l.id),
    nombreCompleto: (l) => `${l.nombre} ${l.apellidos}`,
    edad: (l) => edadEn(l.fechaNacimiento),
    intereses: (l) => l.intereses ?? [],
    situacion: (l) => situacionLector(l),
    prestamosActivos: (l) => Prestamo.countDocuments({ lector: l._id, estado: 'Activo' }).exec(),
  },
  Prestamo: {
    id: (p) => String(p._id ?? p.id),
    lector: (p, _a, ctx) => porId(ctx, Lector, p.lector),
    libro: (p, _a, ctx) => porId(ctx, Libro, p.libro),
    situacion: (p) => (p.estado === 'Activo' && new Date(p.fechaVencimiento) < new Date() ? 'Vencido' : p.estado),
    diasAtraso: (p) => {
      const fin = p.fechaDevolucion ? new Date(p.fechaDevolucion) : new Date();
      return Math.max(0, Math.ceil((fin - new Date(p.fechaVencimiento)) / DIA));
    },
  },
  Reserva: {
    id: (r) => String(r._id ?? r.id),
    lector: (r, _a, ctx) => porId(ctx, Lector, r.lector),
    libro: (r, _a, ctx) => porId(ctx, Libro, r.libro),
  },
};