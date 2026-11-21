import mongoose from 'mongoose';

export async function conectar() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Falta MONGODB_URI en el archivo .env (cadena de conexión de MongoDB Atlas).');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'biblioteca_solon_arguello' });
  console.log(`✔ Conectado a MongoDB (${mongoose.connection.name})`);
  return mongoose.connection;
}
