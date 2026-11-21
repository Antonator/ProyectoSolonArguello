// Prueba las 30 consultas complejas SIN servidor de MongoDB:
// genera los mismos datos del seed y ejecuta cada aggregation pipeline con
// "mingo", un motor que implementa el lenguaje de agregación de MongoDB en JS.
// Uso: npm run probar:consultas
import { aggregate } from 'mingo';
import mongoose from 'mongoose';
import { generarDatos } from '../seed/generar.js';
import { consultasAntony } from '../src/graphql/consultas/antony.js';
import { consultasVictor } from '../src/graphql/consultas/victor.js';
import { consultasPablo } from '../src/graphql/consultas/pablo.js';

const ahora = new Date('2026-11-21T18:00:00Z');
const crudo = generarDatos({ ahora });

// Los ObjectId se convierten a texto para que el motor en memoria los compare por valor.
const aTexto = (v) => {
  if (v instanceof mongoose.Types.ObjectId) return v.toHexString();
  if (Array.isArray(v)) return v.map(aTexto);
  if (v && typeof v === 'object' && !(v instanceof Date)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, aTexto(x)]));
  return v;
};
const datos = Object.fromEntries(Object.entries(crudo).map(([k, v]) => [k, aTexto(v)]));
const opciones = { collectionResolver: (nombre) => datos[nombre] };
const ctx = { ahora, oid: (x) => String(x) };

const lectorActivo = datos.prestamos.reduce((m, p) => ((m[p.lector] = (m[p.lector] || 0) + 1), m), {});
const lectorTop = Object.entries(lectorActivo).sort((a, b) => b[1] - a[1])[0][0];
const credencialTop = datos.lectores.find((l) => l._id === lectorTop).credencial;
const libroCola = datos.reservas.find((r) => r.estado === 'Pendiente')?.libro;

const argumentos = {
  librosMasPrestados: { limite: 5 },
  librosSinMovimiento: { meses: 12, limite: 5 },
  autoresMasLeidos: { limite: 5 },
  busquedaAvanzada: { filtro: { texto: 'soledad', soloDisponibles: false }, pagina: 1, porPagina: 5 },
  autoresPorNacionalidad: { limite: 5 },
  lectoresMasActivos: { limite: 5 },
  credencialesPorVencer: { dias: 30 },
  lectoresInactivos: { meses: 6, limite: 5 },
  historialLector: { credencial: credencialTop },
  recomendacionesParaLector: { lectorId: lectorTop, limite: 5 },
  registrosPorMes: { anio: 2026 },
  lectoresPorColonia: { municipio: 'Tepic', limite: 5 },
  prestamosVencidos: { diasMinimos: 1 },
  estadisticasMensuales: { anio: 2026 },
  colaReservas: {},
  colaReservasDeUnLibro: { libroId: libroCola },
  pronosticoDisponibilidad: { dias: 7 },
  librosConMasRenovaciones: { limite: 5 },
};

const todas = { ...consultasAntony, ...consultasVictor, ...consultasPablo };
todas.colaReservasDeUnLibro = consultasPablo.colaReservas;

let fallas = 0;
const resumen = [];
for (const [nombre, c] of Object.entries(todas)) {
  const args = argumentos[nombre] ?? {};
  try {
    const filas = aggregate(datos[c.coleccion], c.pipeline(args, ctx), opciones);
    const salida = c.transformar ? c.transformar(filas, args, ctx) : filas;
    const n = Array.isArray(salida) ? salida.length : salida ? 1 : 0;
    resumen.push({ nombre, filas: n });
    const muestra = Array.isArray(salida) ? salida.slice(0, 2) : salida;
    const texto = JSON.stringify(muestra, (k, v) => (k === 'prestamos' && Array.isArray(v) ? `[${v.length} préstamos]` : k === 'libros' && Array.isArray(v) && v.length > 2 ? `[${v.length} libros]` : v));
    console.log(`\n✔ ${nombre} (${n})\n  ${texto.slice(0, 600)}`);
    if (n === 0) console.log('  ⚠ sin resultados');
  } catch (e) {
    fallas++;
    console.log(`\n✘ ${nombre}: ${e.message}`);
  }
}
console.log(`\n${resumen.length}/${Object.keys(todas).length} consultas ejecutadas, ${fallas} con error.`);
console.log('Sin resultados:', resumen.filter((r) => r.filas === 0).map((r) => r.nombre).join(', ') || 'ninguna');
process.exit(fallas ? 1 : 0);
