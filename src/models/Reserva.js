// Colección: reservas
// "Apartado" de un libro que está prestado: el lector queda en una cola y
// tiene un plazo para recogerlo cuando se devuelve.
import mongoose from 'mongoose';

export const ESTADOS_RESERVA = ['Pendiente', 'Lista para recoger', 'Atendida', 'Cancelada', 'Expirada'];

const reservaSchema = new mongoose.Schema(
  {
    lector: { type: mongoose.Schema.Types.ObjectId, ref: 'Lector', required: true },
    libro: { type: mongoose.Schema.Types.ObjectId, ref: 'Libro', required: true },
    tituloLibro: String,
    nombreLector: String,
    fechaSolicitud: { type: Date, default: Date.now },
    fechaLimiteRecoger: { type: Date, default: null },
    fechaAtencion: { type: Date, default: null }, // cuándo se entregó o cerró
    estado: { type: String, enum: ESTADOS_RESERVA, default: 'Pendiente' },
    notas: { type: String, default: '' },
  },
  { timestamps: true, collection: 'reservas' }
);

reservaSchema.index({ libro: 1, estado: 1, fechaSolicitud: 1 });
reservaSchema.index({ lector: 1, estado: 1 });

export const Reserva = mongoose.model('Reserva', reservaSchema);
