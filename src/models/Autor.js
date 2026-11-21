// Colección: autores
// Un autor puede tener muchos libros (relación 1:N por referencia desde Libro.autor).
import mongoose from 'mongoose';

const autorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    nacionalidad: { type: String, required: true, trim: true },
    anioNacimiento: { type: Number, min: 1000, max: 2025 },
    anioFallecimiento: { type: Number, default: null },
    generos: { type: [String], default: [] },
    esNayarita: { type: Boolean, default: false }, // para el Fondo Nayarita
    biografia: { type: String, default: '' },
  },
  { timestamps: true, collection: 'autores' }
);

autorSchema.index({ nombre: 1 });
autorSchema.index({ nacionalidad: 1 });

export const Autor = mongoose.model('Autor', autorSchema);
