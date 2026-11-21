// Utilidades compartidas por las consultas complejas.
// Tepic usa la hora del Pacífico de México (UTC-7, sin horario de verano desde 2022).
export const ZONA = 'America/Mazatlan';
export const OFFSET_HORAS = -7;

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
// $dayOfWeek de MongoDB: 1 = domingo … 7 = sábado
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const DIA_MS = 24 * 60 * 60 * 1000;

// Rango de fechas por omisión: los últimos 12 meses.
export function rango(desde, hasta, ahora) {
  const fin = hasta ? new Date(hasta) : ahora;
  const inicio = desde ? new Date(desde) : new Date(fin.getTime() - 365 * DIA_MS);
  return { inicio, fin };
}

// Inicio del día local en Tepic, expresado en UTC.
export function inicioDelDia(fecha) {
  const local = new Date(fecha.getTime() + OFFSET_HORAS * 3600 * 1000);
  const ymd = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(ymd - OFFSET_HORAS * 3600 * 1000);
}

export function inicioDeAnio(anio) {
  return new Date(Date.UTC(anio, 0, 1) - OFFSET_HORAS * 3600 * 1000);
}

export const redondear = (expr, dec = 1) => ({ $round: [expr, dec] });

// División que devuelve 0 cuando el divisor es 0.
export const dividir = (a, b) => ({ $cond: [{ $eq: [b, 0] }, 0, { $divide: [a, b] }] });

export const porcentaje = (a, b) => redondear({ $multiply: [dividir(a, b), 100] }, 1);
