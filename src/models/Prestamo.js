// Colección: prestamos
// Un préstamo une a un lector con un ejemplar concreto de un libro.
// Se guardan copias pequeñas (título, categoría, nombre del lector) para que
// el historial siga legible aunque el libro o el lector cambien después.
import mongoose from 'mongoose';

export const ESTADOS_PRESTAMO = ['Activo', 'Devuelto', 'Extraviado'];

const prestamoSchema = new mongoose.Schema(
  {
    lector: { type: mongoose.Schema.Types.ObjectId, ref: 'Lector', required: true },
    libro: { type: mongoose.Schema.Types.ObjectId, ref: 'Libro', required: true },
    codigoEjemplar: { type: String, required: true },
    tituloLibro: String,
    categoria: String,
    sala: String,
    nombreLector: String,
    fechaPrestamo: { type: Date, default: Date.now },
    fechaVencimiento: { type: Date, required: true },
    fechaDevolucion: { type: Date, default: null },
    renovaciones: { type: Number, default: 0, min: 0, max: 2 },
    estado: { type: String, enum: ESTADOS_PRESTAMO, default: 'Activo' },
    condicionDevolucion: { type: String, enum: ['Buena', 'Dañado', null], default: null },
    atendidoPor: { type: String, default: 'Mostrador' },
    observaciones: { type: String, default: '' },
  },
  { timestamps: true, collection: 'prestamos' }
);

prestamoSchema.index({ estado: 1, fechaVencimiento: 1 });
prestamoSchema.index({ lector: 1, fechaPrestamo: -1 });
prestamoSchema.index({ libro: 1, fechaPrestamo: -1 });

export const Prestamo = mongoose.model('Prestamo', prestamoSchema);
