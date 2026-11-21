// Ejecuta una operación dentro de una transacción ACID de MongoDB.
// En MongoDB Atlas (replica set) las transacciones funcionan siempre. Si se usa
// un mongod local suelto (sin replica set), MongoDB no admite transacciones;
// en ese caso se ejecuta la misma operación sin sesión, apoyándose en que cada
// actualización de un solo documento es atómica.
import mongoose from 'mongoose';

const sinReplicaSet = (e) =>
  e?.code === 20 || /Transaction numbers are only allowed|replica set member or mongos/i.test(e?.message ?? '');

export async function enTransaccion(trabajo) {
  const session = await mongoose.startSession();
  try {
    let resultado;
    await session.withTransaction(async () => {
      resultado = await trabajo(session);
    });
    return resultado;
  } catch (e) {
    if (sinReplicaSet(e)) return trabajo(null);
    throw e;
  } finally {
    await session.endSession();
  }
}
