// Generador determinista de datos de ejemplo: 1,000 documentos por colección.
// Mezcla obras y autores reales con datos sintéticos verosímiles de Tepic.
// Es una función pura: la usan seed.js (para cargar MongoDB) y las pruebas.
import mongoose from 'mongoose';
import { AUTORES_REALES, TEMAS_NO_FICCION, ENFOQUES, TITULOS_NAYARIT, TITULOS_INFANTILES, EDITORIALES } from './obras.js';
import { normalizar } from '../src/utils/texto.js';

export const TOTAL_POR_COLECCION = 1000;
const DIA = 24 * 3600 * 1000;
const OFFSET = 7 * 3600 * 1000; // Tepic = UTC-7

// ── Números aleatorios reproducibles (mulberry32) ──
function crearAzar(semilla) {
  let a = semilla >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (min, max) => min + Math.floor(r() * (max - min + 1));
  const elegir = (arr) => arr[Math.floor(r() * arr.length)];
  const probable = (p) => r() < p;
  const ponderado = (pares) => {
    const total = pares.reduce((s, [, w]) => s + w, 0);
    let x = r() * total;
    for (const [v, w] of pares) if ((x -= w) <= 0) return v;
    return pares[pares.length - 1][0];
  };
  const fecha = (ini, fin) => new Date(ini.getTime() + r() * (fin.getTime() - ini.getTime()));
  return { r, entero, elegir, probable, ponderado, fecha };
}

const NOMBRES_F = ['María', 'Guadalupe', 'Juana', 'Ana', 'Sofía', 'Valeria', 'Ximena', 'Camila', 'Fernanda', 'Daniela', 'Mariana', 'Andrea', 'Alejandra', 'Patricia', 'Rosa', 'Leticia', 'Verónica', 'Gabriela', 'Lucía', 'Regina', 'Itzel', 'Citlali', 'Paola', 'Diana', 'Elena', 'Carmen', 'Silvia', 'Adriana', 'Natalia', 'Renata'];
const NOMBRES_M = ['José', 'Juan', 'Luis', 'Carlos', 'Jorge', 'Miguel', 'Alejandro', 'Fernando', 'Ricardo', 'Eduardo', 'Santiago', 'Mateo', 'Diego', 'Emiliano', 'Leonardo', 'Sebastián', 'Daniel', 'Javier', 'Raúl', 'Héctor', 'Francisco', 'Arturo', 'Manuel', 'Rubén', 'Óscar', 'Iván', 'Pablo', 'Víctor', 'Gerardo', 'Roberto'];
const APELLIDOS = ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Ortiz', 'Medina', 'Castillo', 'Romero', 'Rivera', 'Navarro', 'Ibarra', 'Partida', 'Delgado', 'Robles', 'Becerra', 'Carrillo', 'Lozano', 'Montoya', 'Villaseñor', 'Peña', 'Salazar', 'Ocegueda', 'Calleros', 'Rentería', 'Bernal', 'Luna', 'Arellano'];
const COLONIAS_TEPIC = [
  ['Centro', '63000'], ['San José', '63039'], ['Mololoa', '63010'], ['Los Fresnos', '63190'], ['Lomas de la Cruz', '63110'],
  ['Jardines de la Cruz', '63168'], ['Ciudad del Valle', '63157'], ['Infonavit Los Sauces', '63197'], ['Fovissste', '63175'],
  ['Versalles', '63138'], ['El Rodeo', '63060'], ['Valle de Matatipac', '63195'], ['Morelos', '63070'], ['Insurgentes', '63150'],
  ['Gobernadores', '63136'], ['Indeco', '63170'], ['Burócrata Federal', '63156'], ['Lázaro Cárdenas', '63190'], ['Tierra y Libertad', '63188'],
  ['Las Brisas', '63117'], ['Benito Juárez', '63020'], ['Ojo de Agua', '63167'], ['Puerta de la Laguna', '63192'], ['El Mirador', '63175'],
];
const MUNICIPIOS = [['Tepic', 76], ['Xalisco', 11], ['San Blas', 3], ['Compostela', 3], ['Santiago Ixcuintla', 3], ['Santa María del Oro', 2], ['Bahía de Banderas', 2]];
const COLONIAS_OTRAS = ['Centro', 'Barrio Alto', 'Las Flores', 'Emiliano Zapata', 'Linda Vista', 'El Panteón'];
const CALLES = ['Av. México', 'Av. Insurgentes', 'Calle Hidalgo', 'Calle Morelos', 'Calle Zacatecas', 'Calle Lerdo', 'Av. Allende', 'Calle Amado Nervo', 'Calle Veracruz', 'Av. Jacarandas', 'Calle Durango', 'Calle Puebla', 'Av. Juan Escutia', 'Calle Mina', 'Calle Abasolo'];
const NACIONALIDADES_SINT = [['Mexicana', 70], ['Española', 8], ['Argentina', 6], ['Colombiana', 5], ['Chilena', 4], ['Estadounidense', 4], ['Cubana', 3]];

const DEWEY = {
  'Literatura mexicana': 'M863', 'Literatura universal': '863', Poesía: 'M861', Infantil: 'I863', Juvenil: 'J863', Ensayo: 'M864',
  Historia: '972', 'Historia de Nayarit': '972.34', Ciencias: '500', Matemáticas: '510', Tecnología: '600', Filosofía: '100',
  Psicología: '150', Arte: '700', Derecho: '340', Economía: '330', Salud: '610', Geografía: '910', Biografía: '920', Consulta: '030',
};

function salaPorCategoria(cat) {
  if (cat === 'Infantil' || cat === 'Juvenil') return 'Infantil';
  if (cat === 'Consulta') return 'Consulta';
  if (cat === 'Historia de Nayarit') return 'Fondo Nayarita';
  return 'General';
}

function isbn13(prefijo, n) {
  const cuerpo = (prefijo + String(n).padStart(12 - prefijo.length, '0')).slice(0, 12);
  const suma = [...cuerpo].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  const dv = (10 - (suma % 10)) % 10;
  const s = cuerpo + dv;
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6, 9)}-${s.slice(9, 12)}-${s.slice(12)}`;
}

const clave = (texto) => normalizar(texto).replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();

// Convierte una hora local de Tepic a Date UTC.
function horaLocal(diaUtc, hora, minuto) {
  const local = new Date(diaUtc.getTime() - OFFSET);
  const ymd = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hora, minuto);
  return new Date(ymd + OFFSET);
}
const diaSemanaLocal = (d) => new Date(d.getTime() - OFFSET).getUTCDay(); // 0 = domingo

export function generarDatos({ ahora = new Date(), semilla = 20261125, crearId = () => new mongoose.Types.ObjectId() } = {}) {
  const { r, entero, elegir, probable, ponderado, fecha } = crearAzar(semilla);
  const N = TOTAL_POR_COLECCION;

  // Momento del préstamo dentro del horario: lunes a viernes 9–19 h, sábado 9–13 h.
  const momentoAtencion = (ini, fin) => {
    for (let intento = 0; intento < 20; intento++) {
      const d = fecha(ini, fin);
      const dow = diaSemanaLocal(d);
      if (dow === 0) continue;
      const hora = dow === 6
        ? ponderado([[9, 2], [10, 3], [11, 3], [12, 2]])
        : ponderado([[9, 2], [10, 3], [11, 4], [12, 5], [13, 4], [14, 2], [15, 2], [16, 4], [17, 5], [18, 3]]);
      const m = horaLocal(d, hora, entero(0, 59));
      if (m >= ini && m <= fin) return m;
    }
    return fecha(ini, fin);
  };

  const persona = () => {
    const sexo = probable(0.54) ? 'F' : 'M';
    return { sexo, nombre: elegir(sexo === 'F' ? NOMBRES_F : NOMBRES_M), ap1: elegir(APELLIDOS), ap2: elegir(APELLIDOS) };
  };

  // ───────────── Autores ─────────────
  const autores = [];
  const obrasReales = [];
  for (const [nombre, nacionalidad, nac, fall, esNayarita, generos, obras] of AUTORES_REALES) {
    const _id = crearId();
    autores.push({
      _id, nombre, nacionalidad, anioNacimiento: nac, anioFallecimiento: fall, generos, esNayarita,
      biografia: `${nombre}${nac ? ` (${nac}${fall ? `–${fall}` : ''})` : ''}, autor de nacionalidad ${nacionalidad.toLowerCase()}.`,
    });
    for (const [titulo, anio, categoria, paginas, sala] of obras) {
      obrasReales.push({ autor: autores.at(-1), titulo, anio, categoria, paginas, sala: sala ?? salaPorCategoria(categoria) });
    }
  }
  const autoresSinteticos = [];
  while (autores.length < N) {
    const p = persona();
    const nacionalidad = ponderado(NACIONALIDADES_SINT);
    const nac = entero(1935, 1994);
    const a = {
      _id: crearId(),
      nombre: `${p.nombre} ${p.ap1} ${p.ap2}`,
      nacionalidad,
      anioNacimiento: nac,
      anioFallecimiento: probable(0.08) ? entero(Math.max(nac + 40, 2000), 2025) : null,
      generos: [],
      esNayarita: nacionalidad === 'Mexicana' && probable(0.12),
      biografia: '',
    };
    autores.push(a);
    autoresSinteticos.push(a);
  }

  // ───────────── Libros ─────────────
  const libros = [];
  let consecutivoIsbn = 1000;
  let consecutivoEjemplar = 1;
  const usados = new Set();

  const crearLibro = ({ autor, titulo, anioOriginal, categoria, paginas, sala, popularidad, descripcion, palabras }) => {
    const nac = autor.nacionalidad;
    const region = categoria === 'Historia de Nayarit' || sala === 'Fondo Nayarita' ? 'nay'
      : nac === 'Española' ? 'es' : nac === 'Argentina' ? 'ar' : 'mx';
    const editorial = elegir(probable(0.75) ? EDITORIALES[region] : EDITORIALES.mx);
    const prefijo = region === 'es' ? '97884' : region === 'ar' ? '978950' : '978607';
    const anio = anioOriginal && anioOriginal > 1990 && probable(0.4)
      ? anioOriginal
      : entero(Math.max(1990, anioOriginal ?? 1990), 2025);
    const nEj = Math.max(1, Math.min(6, Math.round(popularidad * 1.2 + r() * 1.4)));
    const ejemplares = [];
    for (let i = 0; i < nEj; i++) {
      const estado = ponderado([['Disponible', 97], ['En reparación', 2], ['Extraviado', 1]]);
      ejemplares.push({
        codigo: `BPSA-${String(consecutivoEjemplar++).padStart(6, '0')}`,
        estado,
        fechaAdquisicion: fecha(new Date(Date.UTC(Math.max(anio, 2008), 0, 1)), new Date(Date.UTC(2026, 5, 30))),
        origen: ponderado([['Dotación DGB', 50], ['Donación', 30], ['Compra', 20]]),
      });
    }
    const isbn = isbn13(prefijo, consecutivoIsbn++ * 7 + 13);
    const apellido = autor.nombre.split(' ').filter((w) => w.length > 2).at(-1) ?? autor.nombre;
    const libro = {
      _id: crearId(),
      isbn,
      titulo,
      autor: autor._id,
      autorNombre: autor.nombre,
      editorial,
      anioPublicacion: anio,
      anioPrimeraEdicion: anioOriginal ?? null,
      categoria,
      clasificacion: `${DEWEY[categoria]} ${clave(apellido)}${clave(titulo).charAt(0)}`,
      idioma: categoria === 'Consulta' && /inglés/.test(titulo) ? 'Bilingüe' : 'Español',
      paginas: Math.max(24, Math.round(paginas * (0.9 + r() * 0.2))),
      sala,
      descripcion,
      palabrasClave: palabras,
      ejemplares,
      activo: true,
      popularidad,
    };
    libros.push(libro);
    return libro;
  };

  // Obras reales: de 2 a 4 ediciones cada una (cada edición tiene su ISBN).
  for (const o of obrasReales) {
    const ediciones = o.sala === 'Fondo Nayarita' || o.categoria === 'Consulta' ? entero(1, 2) : entero(2, 4);
    const popularidad = 0.6 + r() * 1.6 + (['Infantil', 'Juvenil'].includes(o.categoria) ? 0.4 : 0);
    for (let e = 0; e < ediciones; e++) {
      crearLibro({
        autor: o.autor, titulo: o.titulo, anioOriginal: o.anio, categoria: o.categoria, paginas: o.paginas, sala: o.sala,
        popularidad: popularidad * (e === 0 ? 1 : 0.6),
        descripcion: `Obra de ${o.autor.nombre}${o.anio ? `, publicada originalmente en ${o.anio}` : ''}.`,
        palabras: [...new Set([o.categoria, ...o.autor.generos])],
      });
    }
  }
  // Fondo Nayarita: historia regional.
  for (const titulo of TITULOS_NAYARIT) {
    const autor = autoresSinteticos.find((a) => a.esNayarita && !usados.has(a._id)) ?? elegir(autoresSinteticos);
    usados.add(autor._id);
    autor.generos = ['Historia regional'];
    autor.biografia = `Investigador(a) de la historia y la cultura de Nayarit.`;
    for (let e = 0; e < entero(1, 2); e++) {
      crearLibro({
        autor, titulo, anioOriginal: entero(1985, 2022), categoria: 'Historia de Nayarit', paginas: entero(120, 380),
        sala: 'Fondo Nayarita', popularidad: 0.3 + r() * 0.7,
        descripcion: `Estudio sobre ${titulo.toLowerCase()} publicado por instituciones nayaritas.`, palabras: ['Nayarit', 'Historia regional'],
      });
    }
  }
  // Literatura infantil sintética.
  const combos = [];
  for (const p of TITULOS_INFANTILES.personajes) for (const a of TITULOS_INFANTILES.acciones) combos.push(`${p} ${a}`);
  const infantiles = combos.sort(() => r() - 0.5).slice(0, 110);
  // No ficción sintética: tema + enfoque.
  const noFiccion = [];
  for (const [categoria, temas] of Object.entries(TEMAS_NO_FICCION)) {
    for (const tema of temas) for (const enfoque of ENFOQUES) noFiccion.push({ categoria, tema, titulo: `${tema}: ${enfoque}` });
  }
  noFiccion.sort(() => r() - 0.5);
  let iInf = 0;
  let iNF = 0;
  let iAut = 0;
  const siguienteAutor = () => autoresSinteticos[iAut++ % autoresSinteticos.length];
  while (libros.length < N) {
    if (iInf < infantiles.length && probable(0.22)) {
      const autor = siguienteAutor();
      autor.generos = ['Literatura infantil'];
      autor.biografia = 'Autor(a) de literatura para niñas y niños.';
      crearLibro({
        autor, titulo: infantiles[iInf++], anioOriginal: entero(1998, 2024), categoria: 'Infantil', paginas: entero(24, 96),
        sala: 'Infantil', popularidad: 0.5 + r() * 1.0, descripcion: 'Libro álbum ilustrado para lectores de 5 a 10 años.', palabras: ['Infantil', 'Libro álbum'],
      });
    } else {
      const nf = noFiccion[iNF++];
      const autor = siguienteAutor();
      autor.generos = [nf.categoria];
      autor.biografia = `Especialista en ${nf.tema.toLowerCase()}.`;
      crearLibro({
        autor, titulo: nf.titulo, anioOriginal: entero(1995, 2024), categoria: nf.categoria,
        paginas: nf.categoria === 'Consulta' ? entero(400, 1400) : entero(140, 520),
        sala: salaPorCategoria(nf.categoria), popularidad: 0.15 + r() * 0.8,
        descripcion: `Texto de ${nf.tema.toLowerCase()} (${nf.titulo.split(': ')[1]}).`, palabras: [nf.categoria, nf.tema],
      });
    }
  }
  for (const a of autoresSinteticos) {
    if (!a.generos.length) {
      a.generos = [elegir(['Novela', 'Cuento', 'Poesía', 'Ensayo', 'Crónica'])];
      a.biografia = `Autor(a) registrado(a) en el catálogo de autoridades de la biblioteca.`;
    }
  }

  // ───────────── Lectores ─────────────
  const lectores = [];
  const inicioRegistros = new Date(Date.UTC(2023, 0, 9, 16));
  for (let i = 0; i < N; i++) {
    const p = persona();
    const edad = ponderado([[entero(6, 12), 18], [entero(13, 17), 16], [entero(18, 29), 26], [entero(30, 44), 17], [entero(45, 59), 13], [entero(60, 82), 10]]);
    const fechaRegistro = momentoAtencion(inicioRegistros, new Date(ahora.getTime() - DIA));
    const fechaNacimiento = new Date(Date.UTC(new Date(fechaRegistro).getUTCFullYear() - edad, entero(0, 11), entero(1, 28), 12));
    const edadHoy = Math.floor((ahora - fechaNacimiento) / (365.25 * DIA));
    const ocupacion = edadHoy < 23 ? 'Estudiante'
      : edadHoy >= 62 ? ponderado([['Jubilado', 6], ['Hogar', 2], ['Comerciante', 1], ['Otro', 1]])
        : ponderado([['Empleado', 26], ['Docente', 14], ['Comerciante', 10], ['Profesionista', 16], ['Hogar', 12], ['Estudiante', 10], ['Investigador', 4], ['Otro', 8]]);
    const tipo = edadHoy < 13 ? 'Infantil' : ocupacion === 'Estudiante' ? 'Estudiante' : ocupacion === 'Investigador' ? 'Investigador' : 'General';
    const municipio = ponderado(MUNICIPIOS);
    const [colonia, cp] = municipio === 'Tepic' ? elegir(COLONIAS_TEPIC) : [elegir(COLONIAS_OTRAS), ''];
    const intereses = tipo === 'Infantil'
      ? [elegir(['Infantil', 'Infantil', 'Juvenil', 'Ciencias'])]
      : [...new Set([
        elegir(['Literatura mexicana', 'Literatura universal', 'Poesía', 'Historia', 'Ensayo', 'Juvenil', 'Psicología']),
        elegir(['Ciencias', 'Historia de Nayarit', 'Matemáticas', 'Tecnología', 'Salud', 'Economía', 'Literatura universal', 'Filosofía', 'Arte']),
      ])];
    const f = persona();
    const renovo = fechaRegistro < new Date(ahora.getTime() - 730 * DIA) && probable(0.45);
    const vigencia = new Date(fechaRegistro.getTime() + (renovo ? 1460 : 730) * DIA);
    const usuarioCorreo = normalizar(`${p.nombre}.${p.ap1}`).replace(/[^a-z.]/g, '');
    lectores.push({
      _id: crearId(),
      credencial: `BPSA-${fechaRegistro.getUTCFullYear()}-${String(i + 1).padStart(5, '0')}`,
      nombre: p.nombre,
      apellidos: `${p.ap1} ${p.ap2}`,
      fechaNacimiento,
      sexo: probable(0.01) ? 'X' : p.sexo,
      telefono: `311${entero(1000000, 9999999)}`,
      email: tipo === 'Infantil' ? null : `${usuarioCorreo}${entero(1, 99)}@${elegir(['example.com', 'example.org', 'example.net'])}`,
      ocupacion,
      tipo,
      domicilio: { calle: `${elegir(CALLES)} ${entero(10, 1999)}`, colonia, municipio, codigoPostal: cp },
      fiador: tipo === 'Infantil'
        ? { nombre: `${elegir([...NOMBRES_F, ...NOMBRES_M])} ${p.ap1} ${elegir(APELLIDOS)}`, telefono: `311${entero(1000000, 9999999)}`, parentesco: elegir(['Madre', 'Padre']), domicilio: 'Mismo domicilio' }
        : { nombre: `${f.nombre} ${f.ap1} ${f.ap2}`, telefono: `311${entero(1000000, 9999999)}`, parentesco: elegir(['Madre', 'Padre', 'Hermano(a)', 'Cónyuge', 'Amigo(a)', 'Tío(a)', 'Compañero(a) de trabajo']), domicilio: `${elegir(CALLES)} ${entero(10, 1999)}, Tepic` },
      intereses,
      fechaRegistro,
      vigencia,
      estado: probable(0.02) ? 'Cancelada' : 'Activa',
      suspendidoHasta: null,
      actividad: Math.pow(r(), 2.2) * 6, // pocos lectores muy activos, muchos ocasionales
    });
  }

  // ───────────── Préstamos ─────────────
  const prestable = libros.filter((l) => l.sala !== 'Consulta');
  const estadoCopia = new Map(); // codigo -> estado actual
  for (const l of libros) for (const e of l.ejemplares) estadoCopia.set(e.codigo, e.estado);
  const activosPorLector = new Map();
  const prestamos = [];
  const inicioHistorial = new Date(Date.UTC(2024, 6, 1, 15));
  const corteReciente = new Date(ahora.getTime() - 35 * DIA);

  const elegirLector = (cuando, paraActivo) => {
    for (let intento = 0; intento < 200; intento++) {
      const pares = [];
      for (let k = 0; k < 25; k++) {
        const l = elegir(lectores);
        pares.push([l, l.actividad + 0.05]);
      }
      const l = ponderado(pares);
      if (l.estado === 'Cancelada' || l.fechaRegistro > cuando || l.vigencia < cuando) continue;
      if (paraActivo && (activosPorLector.get(l._id) ?? 0) >= 3) continue;
      return l;
    }
    return null;
  };
  const elegirLibro = (lector, requiereDisponible) => {
    for (let intento = 0; intento < 200; intento++) {
      const pares = [];
      for (let k = 0; k < 30; k++) {
        const b = elegir(prestable);
        let w = b.popularidad;
        if (lector.intereses.includes(b.categoria)) w *= 4;
        if (lector.tipo === 'Infantil' && !['Infantil', 'Juvenil', 'Ciencias'].includes(b.categoria)) w *= 0.05;
        pares.push([b, w]);
      }
      const b = ponderado(pares);
      const copias = b.ejemplares.filter((e) => (requiereDisponible ? estadoCopia.get(e.codigo) === 'Disponible' : e.estado !== 'Extraviado'));
      if (copias.length) return { libro: b, copia: elegir(copias) };
    }
    return null;
  };

  const plan = [];
  for (let i = 0; i < 770; i++) plan.push('historico');
  for (let i = 0; i < 220; i++) plan.push('reciente');
  for (let i = 0; i < 10; i++) plan.push('hoy');

  const hoyLocal = horaLocal(ahora, 9, 0);
  for (const tipo of plan) {
    let fechaPrestamo;
    if (tipo === 'historico') fechaPrestamo = momentoAtencion(inicioHistorial, corteReciente);
    else if (tipo === 'reciente') fechaPrestamo = momentoAtencion(corteReciente, new Date(ahora.getTime() - 3600 * 1000));
    else fechaPrestamo = ahora > hoyLocal ? fecha(hoyLocal, ahora) : momentoAtencion(corteReciente, ahora);

    // Solo se renueva lo que ya cumplió su plazo: un préstamo de hoy no tiene renovaciones.
    const semanas = Math.floor((ahora - fechaPrestamo) / (7 * DIA));
    const renovaciones = Math.min(semanas, ponderado([[0, 70], [1, 22], [2, 8]]));
    const fechaVencimiento = new Date(fechaPrestamo.getTime() + 7 * (1 + renovaciones) * DIA);
    let estado = 'Devuelto';
    if (tipo !== 'historico') {
      estado = fechaVencimiento < ahora ? (probable(0.25) ? 'Activo' : 'Devuelto') : probable(0.85) ? 'Activo' : 'Devuelto';
    } else if (probable(0.01)) estado = 'Extraviado';

    const lector = elegirLector(fechaPrestamo, estado === 'Activo');
    if (!lector) continue;
    const sel = elegirLibro(lector, estado === 'Activo');
    if (!sel) continue;
    const { libro, copia } = sel;

    let fechaDevolucion = null;
    let condicionDevolucion = null;
    if (estado === 'Devuelto') {
      const tarde = probable(0.28);
      fechaDevolucion = tarde
        ? new Date(fechaVencimiento.getTime() + Math.ceil(Math.pow(r(), 2) * 20) * DIA + entero(0, 5) * 3600 * 1000)
        : fecha(new Date(fechaPrestamo.getTime() + DIA), fechaVencimiento);
      if (fechaDevolucion > ahora) fechaDevolucion = new Date(ahora.getTime() - entero(1, 5) * 3600 * 1000);
      if (fechaDevolucion <= fechaPrestamo) fechaDevolucion = new Date(fechaPrestamo.getTime() + 2 * 3600 * 1000);
      condicionDevolucion = probable(0.97) ? 'Buena' : 'Dañado';
      // Sanción: un día de suspensión por cada día de atraso.
      const atraso = Math.ceil((fechaDevolucion - fechaVencimiento) / DIA);
      if (atraso > 0) {
        const hasta = new Date(fechaDevolucion.getTime() + atraso * DIA);
        if (hasta > ahora && lector.estado === 'Activa') {
          lector.suspendidoHasta = hasta;
          lector.estado = 'Suspendida';
        }
      }
      if (condicionDevolucion === 'Dañado' && fechaDevolucion > new Date(ahora.getTime() - 20 * DIA)) {
        estadoCopia.set(copia.codigo, 'En reparación');
      }
    }
    if (estado === 'Activo') {
      estadoCopia.set(copia.codigo, 'Prestado');
      activosPorLector.set(lector._id, (activosPorLector.get(lector._id) ?? 0) + 1);
    }
    if (estado === 'Extraviado') estadoCopia.set(copia.codigo, 'Extraviado');

    const horaLoc = new Date(fechaPrestamo.getTime() - OFFSET).getUTCHours();
    prestamos.push({
      _id: crearId(),
      lector: lector._id,
      libro: libro._id,
      codigoEjemplar: copia.codigo,
      tituloLibro: libro.titulo,
      categoria: libro.categoria,
      sala: libro.sala,
      nombreLector: `${lector.nombre} ${lector.apellidos}`,
      fechaPrestamo,
      fechaVencimiento,
      fechaDevolucion,
      renovaciones,
      estado,
      condicionDevolucion,
      atendidoPor: horaLoc < 14 ? 'Turno matutino' : 'Turno vespertino',
      observaciones: estado === 'Extraviado' ? 'El lector reportó el ejemplar como extraviado.' : condicionDevolucion === 'Dañado' ? 'Se devolvió con daño en la encuadernación.' : '',
    });
  }
  // Rellena si alguna iteración no encontró lector o libro.
  while (prestamos.length < N) {
    const fechaPrestamo = momentoAtencion(inicioHistorial, corteReciente);
    const lector = elegirLector(fechaPrestamo, false);
    const sel = lector && elegirLibro(lector, false);
    if (!sel) continue;
    const fechaVencimiento = new Date(fechaPrestamo.getTime() + 7 * DIA);
    prestamos.push({
      _id: crearId(), lector: lector._id, libro: sel.libro._id, codigoEjemplar: sel.copia.codigo, tituloLibro: sel.libro.titulo,
      categoria: sel.libro.categoria, sala: sel.libro.sala, nombreLector: `${lector.nombre} ${lector.apellidos}`,
      fechaPrestamo, fechaVencimiento, fechaDevolucion: new Date(fechaPrestamo.getTime() + entero(2, 7) * DIA), renovaciones: 0,
      estado: 'Devuelto', condicionDevolucion: 'Buena', atendidoPor: 'Turno matutino', observaciones: '',
    });
  }
  prestamos.sort((a, b) => a.fechaPrestamo - b.fechaPrestamo);

  // Aplica el estado final de cada ejemplar y recalcula los contadores.
  for (const l of libros) {
    for (const e of l.ejemplares) e.estado = estadoCopia.get(e.codigo);
    l.ejemplaresTotales = l.ejemplares.filter((e) => e.estado !== 'Extraviado').length;
    l.ejemplaresDisponibles = l.ejemplares.filter((e) => e.estado === 'Disponible').length;
    l.busqueda = normalizar([l.titulo, l.autorNombre, l.isbn, l.editorial, ...l.palabrasClave].join(' '));
  }

  // ───────────── Reservas ─────────────
  const reservas = [];
  const vigentes = lectores.filter((l) => l.estado !== 'Cancelada' && l.vigencia > ahora);
  const nuevaReserva = (lector, libro, extra) => ({
    _id: crearId(), lector: lector._id, libro: libro._id, tituloLibro: libro.titulo,
    nombreLector: `${lector.nombre} ${lector.apellidos}`, notas: '', fechaLimiteRecoger: null, fechaAtencion: null, ...extra,
  });
  // Colas actuales: libros agotados con 1 a 4 lectores esperando.
  const agotados = libros.filter((l) => l.ejemplaresTotales > 0 && l.ejemplaresDisponibles === 0 && l.sala !== 'Consulta');
  for (const libro of agotados) {
    const enCola = new Set();
    const largo = ponderado([[1, 40], [2, 30], [3, 20], [4, 10]]);
    for (let k = 0; k < largo; k++) {
      const lector = elegir(vigentes);
      if (enCola.has(lector._id)) continue;
      enCola.add(lector._id);
      reservas.push(nuevaReserva(lector, libro, { fechaSolicitud: momentoAtencion(new Date(ahora.getTime() - 20 * DIA), ahora), estado: 'Pendiente' }));
    }
  }
  // Reservas listas para recoger (el libro ya regresó y se apartó).
  const conCopia = libros.filter((l) => l.ejemplaresDisponibles > 0 && l.sala !== 'Consulta' && l.popularidad > 1);
  for (let k = 0; k < 18 && conCopia.length; k++) {
    const libro = elegir(conCopia);
    reservas.push(nuevaReserva(elegir(vigentes), libro, {
      fechaSolicitud: momentoAtencion(new Date(ahora.getTime() - 15 * DIA), new Date(ahora.getTime() - 4 * DIA)),
      fechaLimiteRecoger: new Date(ahora.getTime() + entero(1, 3) * DIA),
      estado: 'Lista para recoger',
    }));
  }
  // Historial de reservas.
  while (reservas.length < N) {
    const fechaSolicitud = momentoAtencion(inicioHistorial, new Date(ahora.getTime() - 25 * DIA));
    const libro = ponderado(Array.from({ length: 25 }, () => {
      const b = elegir(prestable);
      return [b, b.popularidad];
    }));
    const lector = elegir(lectores);
    const estado = ponderado([['Atendida', 65], ['Expirada', 20], ['Cancelada', 15]]);
    const fechaAtencion = new Date(fechaSolicitud.getTime() + entero(1, 15) * DIA);
    reservas.push(nuevaReserva(lector, libro, {
      fechaSolicitud, estado, fechaAtencion,
      fechaLimiteRecoger: estado === 'Cancelada' ? null : new Date(fechaAtencion.getTime() - (estado === 'Expirada' ? 0 : 2) * DIA),
      notas: estado === 'Expirada' ? 'No se recogió en el plazo de 3 días.' : estado === 'Cancelada' ? 'Cancelada a petición del lector.' : '',
    }));
  }
  reservas.length = N;

  // Limpia campos auxiliares que no van a la base de datos.
  for (const l of libros) delete l.popularidad;
  for (const l of lectores) delete l.actividad;

  return { autores, libros, lectores, prestamos, reservas };
}
