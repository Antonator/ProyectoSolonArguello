// Colección: lectores
// Padrón de usuarios con credencial de préstamo a domicilio. El fiador y el
// domicilio van incrustados porque siempre se consultan junto con el lector.
import mongoose from 'mongoose';

export const OCUPACIONES = [
  'Estudiante',
  'Docente',
  'Empleado',
  'Comerciante',
  'Profesionista',
  'Hogar',
  'Jubilado',
  'Investigador',
  'Otro',
];
export const TIPOS_LECTOR = ['General', 'Infantil', 'Estudiante', 'Investigador'];
export const ESTADOS_CREDENCIAL = ['Activa', 'Suspendida', 'Cancelada'];

const domicilioSchema = new mongoose.Schema(
  {
    calle: String,
    colonia: String,
    municipio: { type: String, default: 'Tepic' },
    codigoPostal: String,
  },
  { _id: false }
);

const fiadorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    telefono: String,
    parentesco: String,
    domicilio: String,
  },
  { _id: false }
);

const lectorSchema = new mongoose.Schema(
  {
    credencial: { type: String, required: true, unique: true }, // p. ej. BPSA-2025-00123
    nombre: { type: String, required: true, trim: true },
    apellidos: { type: String, required: true, trim: true },
    fechaNacimiento: { type: Date, required: true },
    sexo: { type: String, enum: ['F', 'M', 'X'] },
    telefono: String,
    email: { type: String, lowercase: true, trim: true },
    ocupacion: { type: String, enum: OCUPACIONES, default: 'Otro' },
    tipo: { type: String, enum: TIPOS_LECTOR, default: 'General' },
    domicilio: domicilioSchema,
    fiador: fiadorSchema,
    intereses: { type: [String], default: [] },
    fechaRegistro: { type: Date, default: Date.now },
    vigencia: { type: Date, required: true }, // la credencial dura 2 años
    estado: { type: String, enum: ESTADOS_CREDENCIAL, default: 'Activa' },
    suspendidoHasta: { type: Date, default: null },
  },
  { timestamps: true, collection: 'lectores' }
);

lectorSchema.index({ apellidos: 1, nombre: 1 });
lectorSchema.index({ vigencia: 1 });
lectorSchema.index({ 'domicilio.municipio': 1, 'domicilio.colonia': 1 });

export const Lector = mongoose.model('Lector', lectorSchema);
