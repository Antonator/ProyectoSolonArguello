// Servidor de la Biblioteca Solón Argüello
// Express sirve el frontend (carpeta public) y Apollo Server atiende GraphQL
// en un solo endpoint: POST /graphql. Abrir /graphql en el navegador muestra
// Apollo Sandbox para explorar el esquema y probar queries y mutations.
import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { conectar } from './db.js';
import { usuarioDesdeEncabezado } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT || 4000);

const app = express();
const httpServer = http.createServer(app);

const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    // Apollo Sandbox embebido en GET /graphql (también en producción, para la evaluación).
    ApolloServerPluginLandingPageLocalDefault({ embed: true, includeCookies: false }),
  ],
  formatError: (formateado, original) => {
    // No exponer detalles internos de la base de datos al navegador.
    if (formateado.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      console.error(original);
      return { message: 'Error interno del servidor', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
    }
    return formateado;
  },
});

await conectar();
await apollo.start();

app.use(
  '/graphql',
  cors(),
  express.json({ limit: '1mb' }),
  expressMiddleware(apollo, {
    context: async ({ req }) => ({
      usuario: usuarioDesdeEncabezado(req.headers.authorization),
      cache: new Map(),
    }),
  })
);

app.get('/salud', (_req, res) => res.json({ ok: true, hora: new Date().toISOString() }));
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

await new Promise((resolve) => httpServer.listen({ port: PUERTO }, resolve));
console.log(`✔ Sitio:   http://localhost:${PUERTO}/`);
console.log(`✔ GraphQL: http://localhost:${PUERTO}/graphql (Apollo Sandbox)`);
