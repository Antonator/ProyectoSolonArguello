# Biblioteca Solón Argüello · Sistema web

Sistema para la **Biblioteca Pública Central Estatal Solón Argüello** (Tepic, Nayarit): catálogo público con disponibilidad en tiempo real y panel del personal para administrar libros, lectores, préstamos y reservas.

**Equipo:** Ocegueda Ruelas Antony Daniel · Ibarra García Víctor Alberto · Calleros Cortés Pablo Iván

| Capa | Tecnología |
| --- | --- |
| Datos | MongoDB Atlas (Mongoose 9) — 5 colecciones con 1,000 documentos cada una |
| API | Express 5 + Apollo Server 5 + GraphQL — endpoint único `POST /graphql`, Apollo Sandbox en `GET /graphql` |
| Frontend | HTML, CSS y JavaScript (módulos ES) con `fetch()` a GraphQL |

## Puesta en marcha

1. Instala Node.js 20 o superior.
2. Crea un clúster gratuito **M0** en [MongoDB Atlas](https://www.mongodb.com/atlas), un usuario de base de datos y permite tu IP en *Network Access*. Copia la cadena de conexión.
3. En la carpeta del proyecto:

   ```bash
   npm install
   cp .env.example .env      # en Windows: copy .env.example .env
   # edita .env: MONGODB_URI, JWT_SECRETO, ADMIN_USUARIO y ADMIN_CONTRASENA
   npm run seed              # carga 1,000 documentos por colección (borra lo que haya)
   npm start
   ```

4. Abre:
   - `http://localhost:4000/` — catálogo público
   - `http://localhost:4000/login.html` — acceso del personal (usuario y contraseña del `.env`)
   - `http://localhost:4000/graphql` — Apollo Sandbox

### Probar en Apollo Sandbox

Las consultas del personal piden token. Ejecuta primero:

```graphql
mutation { login(usuario: "admin", contrasena: "tu-contraseña") { token } }
```

Copia el token y agrégalo en **Headers** como `Authorization: Bearer <token>`. Para una demostración rápida puedes poner `REQUIERE_LOGIN=false` en `.env` (no lo dejes así en producción).

## Pantallas (una por integrante)

| Pantalla | Responsable | Qué hace |
| --- | --- | --- |
| `admin/libros.html` | Antony | Alta, edición y baja de libros; registro de autores; ejemplares físicos y su estado |
| `admin/lectores.html` | Víctor | Alta, edición y baja de lectores; credencial y fiador; renovar, suspender, historial y recomendaciones |
| `admin/prestamos.html` | Pablo | Registrar préstamo, devolver, renovar, editar, marcar extraviado, eliminar; reservas y su cola |
| `admin/consultas.html` | Todos | Ejecuta las 30 consultas complejas y muestra su GraphQL |
| `index.html` | Todos | Catálogo público con búsqueda, filtros, novedades y disponibilidad |

## Colecciones

| Colección | Documentos | Contenido |
| --- | --- | --- |
| `autores` | 1,000 | 109 autores reales con 164 obras (Amado Nervo, Alí Chumacero, Rulfo, Paz…) + autores sintéticos |
| `libros` | 1,000 | Cada edición con su ISBN; los **ejemplares van incrustados** con código, estado y origen |
| `lectores` | 1,000 | Padrón con credencial, domicilio y **fiador incrustados**, vigencia de 2 años |
| `prestamos` | 1,000 | Historial desde julio de 2024 + préstamos activos y vencidos |
| `reservas` | 1,000 | Colas actuales e historial (atendidas, expiradas, canceladas) |

Los datos personales son ficticios (correos `@example.com`, teléfonos aleatorios).

## Reglas de negocio

Configurables en `.env`: hasta 3 libros por lector, 7 días de préstamo, 2 renovaciones, 3 días para recoger un apartado y un día de suspensión por cada día de atraso. Además: la credencial debe estar vigente y sin suspensión, no se presta con libros vencidos, la sala de Consulta no sale de la biblioteca y no se renueva un libro que otro lector reservó.

El préstamo descuenta el ejemplar con una **actualización atómica** sobre el documento del libro (`$elemMatch` + operador posicional `$`) dentro de una **transacción ACID** junto con el alta del préstamo. Atlas siempre admite transacciones; con un `mongod` local sin replica set el sistema funciona igual, sin transacción.

## Las 30 consultas complejas

Todas son *aggregation pipelines* en `src/graphql/consultas/` y se pueden ejecutar desde la pantalla de consultas o desde Apollo Sandbox.

- **Antony** (`antony.js`): inventario por categoría, libros más prestados, libros sin movimiento, autores más leídos, agotados con demanda, antigüedad de las obras, búsqueda avanzada con facetas, origen del acervo, aporte por nacionalidad, índice de rotación.
- **Víctor** (`victor.js`): lectores más activos, lectores con atrasos, credenciales por vencer, perfil demográfico, lectores inactivos, historial de un lector, recomendaciones, registros por mes, puntualidad por ocupación, lectores por colonia.
- **Pablo** (`pablo.js`): préstamos vencidos, estadística mensual, afluencia por día y hora, duración por categoría, cola de reservas, desempeño de reservas, sala × tipo de lector, pronóstico de devoluciones, libros que más se renuevan, tablero del día.

Para probarlas sin base de datos: `npm run probar:consultas` (usa los mismos datos del seed en memoria).

## Estructura

```
src/
  server.js            Express + Apollo Server
  db.js · auth.js      conexión y acceso del personal (JWT)
  models/              Autor, Libro, Lector, Prestamo, Reserva (Mongoose)
  graphql/typeDefs.js  esquema GraphQL
  graphql/resolvers.js queries, mutations y reglas de negocio
  graphql/consultas/   las 30 consultas complejas
seed/                  generador de datos y carga
public/                frontend (HTML, CSS, JS) y logo
```

## Pendiente con la biblioteca

Confirmar dirección, horario y teléfono (`public/js/config.js`) y las reglas de préstamo durante la visita para el Vo.Bo.
