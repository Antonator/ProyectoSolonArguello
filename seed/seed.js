// Carga 1,000 documentos en cada colección (autores, libros, lectores,
// prestamos, reservas). BORRA el contenido actual de esas colecciones.
// Uso: npm run seed
import 'dotenv/config';
import mongoose from 'mongoose';
import { conectar } from '../src/db.js';
import { Autor } from '../src/models/Autor.js';
import { Libro } from '../src/models/Libro.js';
import { Lector } from '../src/models/Lector.js';
import { Prestamo } from '../src/models/Prestamo.js';
import { Reserva } from '../src/models/Reserva.js';
import { generarDatos } from './generar.js';

if (!process.argv.includes('--reiniciar')) {
  console.error('Este script borra y vuelve a llenar la base de datos. Ejecútalo con: npm run seed');
  process.exit(1);
}

await conectar();
const datos = generarDatos({ ahora: new Date() });
const pares = [
  [Autor, datos.autores],
  [Libro, datos.libros],
  [Lector, datos.lectores],
  [Prestamo, datos.prestamos],
  [Reserva, datos.reservas],
];

for (const [Modelo, docs] of pares) {
  await Modelo.deleteMany({});
  await Modelo.syncIndexes();
  // Lotes de 250 para no rebasar los límites del clúster gratuito M0.
  for (let i = 0; i < docs.length; i += 250) {
    await Modelo.insertMany(docs.slice(i, i + 250), { ordered: true });
  }
  console.log(`✔ ${Modelo.collection.collectionName}: ${await Modelo.countDocuments()} documentos`);
}

await mongoose.disconnect();
console.log('Listo. Inicia el servidor con: npm start');
