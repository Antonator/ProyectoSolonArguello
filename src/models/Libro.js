// Colección: libros
// Cada documento es un título (una edición con su ISBN). Los ejemplares físicos
// van INCRUSTADOS en el documento: así, prestar un ejemplar y descontar la
// disponibilidad es una sola operación atómica sobre un solo documento.
import mongoose from 'mongoose';
import { normalizar } from '../utils/texto.js';

export const CATEGORIAS = [
  'Literatura mexicana',
  'Literatura universal',
  'Poesía',
  'Infantil',
  'Juvenil',
  'Ensayo',
  'Historia',
  'Historia de Nayarit',
  'Ciencias',
  'Matemáticas',
  'Tecnología',
  'Filosofía',
  'Psicología',
  'Arte',
  'Derecho',
  'Economía',
  'Salud',
  'Geografía',
  'Biografía',
  'Consulta',
];

export const SALAS = ['General', 'Infantil', 'Consulta', 'Fondo Nayarita'];
export const ESTADOS_EJEMPLAR = ['Disponible', 'Prestado', 'En reparación', 'Extraviado'];

const ejemplarSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true }, // código de barras del ejemplar
    estado: { type: String, enum: ESTADOS_EJEMPLAR, default: 'Disponible' },
    fechaAdquisicion: { type: Date, default: Date.now },
    origen: { type: String, enum: ['Compra', 'Donación', 'Dotación DGB'], default: 'Dotación DGB' },
  },
  { _id: false }
);

const libroSchema = new mongoose.Schema(
  {
    isbn: { type: String, required: true, unique: true, trim: true },
    titulo: { type: String, required: true, trim: true },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Autor', required: true },
    autorNombre: { type: String, required: true }, // dato desnormalizado para el catálogo
    editorial: { type: String, default: '' },
    anioPublicacion: { type: Number }, // año de esta edición
    anioPrimeraEdicion: { type: Number, default: null }, // año original de la obra
    categoria: { type: String, enum: CATEGORIAS, required: true },
    clasificacion: { type: String, default: '' }, // número Dewey + clave de autor
    idioma: { type: String, default: 'Español' },
    paginas: { type: Number, min: 1 },
    sala: { type: String, enum: SALAS, default: 'General' },
    descripcion: { type: String, default: '' },
    palabrasClave: { type: [String], default: [] },
    ejemplares: { type: [ejemplarSchema], default: [] },
    ejemplaresTotales: { type: Number, default: 0, min: 0 },
    ejemplaresDisponibles: { type: Number, default: 0, min: 0 },
    activo: { type: Boolean, default: true },
    busqueda: { type: String, index: true }, // título+autor+ISBN sin acentos, para buscar
  },
  { timestamps: true, collection: 'libros' }
);

libroSchema.index({ categoria: 1, ejemplaresDisponibles: -1 });
libroSchema.index({ autor: 1 });

// Mantiene los contadores y el campo de búsqueda coherentes con los ejemplares.
libroSchema.pre('save', function () {
  this.ejemplaresTotales = this.ejemplares.filter((e) => e.estado !== 'Extraviado').length;
  this.ejemplaresDisponibles = this.ejemplares.filter((e) => e.estado === 'Disponible').length;
  this.busqueda = normalizar(
    [this.titulo, this.autorNombre, this.isbn, this.editorial, ...(this.palabrasClave || [])].join(' ')
  );
});

export const Libro = mongoose.model('Libro', libroSchema);
