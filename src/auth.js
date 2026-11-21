// Acceso del personal con JSON Web Tokens.
// Las cuentas se definen en .env (no hay contraseñas en el código).
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';

let secreto = process.env.JWT_SECRETO;
if (!secreto) {
  secreto = crypto.randomBytes(32).toString('hex');
  console.warn('⚠ JWT_SECRETO no está definido: se generó uno temporal; las sesiones se perderán al reiniciar.');
}

// PERSONAL="usuario:contraseña:Nombre completo:rol;otro:...". Si no existe,
// se usa la cuenta ADMIN_USUARIO / ADMIN_CONTRASENA.
function cuentas() {
  const lista = [];
  if (process.env.PERSONAL) {
    for (const item of process.env.PERSONAL.split(';')) {
      const [usuario, contrasena, nombre, rol = 'bibliotecario'] = item.split(':');
      if (usuario && contrasena) lista.push({ usuario, contrasena, nombre: nombre || usuario, rol });
    }
  }
  if (process.env.ADMIN_USUARIO && process.env.ADMIN_CONTRASENA) {
    lista.push({ usuario: process.env.ADMIN_USUARIO, contrasena: process.env.ADMIN_CONTRASENA, nombre: process.env.ADMIN_NOMBRE || 'Administración', rol: 'admin' });
  }
  return lista;
}

const iguales = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function iniciarSesion(usuario, contrasena) {
  const cuenta = cuentas().find((c) => c.usuario === usuario);
  if (!cuenta || !iguales(cuenta.contrasena, contrasena)) {
    throw new GraphQLError('Usuario o contraseña incorrectos', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  const datos = { usuario: cuenta.usuario, nombre: cuenta.nombre, rol: cuenta.rol };
  return { ...datos, token: jwt.sign(datos, secreto, { expiresIn: '10h' }) };
}

export function usuarioDesdeEncabezado(encabezado = '') {
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : '';
  if (!token) return null;
  try {
    const { usuario, nombre, rol } = jwt.verify(token, secreto);
    return { usuario, nombre, rol };
  } catch {
    return null;
  }
}

export function requerirPersonal(ctx) {
  if (process.env.REQUIERE_LOGIN === 'false') return { usuario: 'demo', nombre: 'Demo', rol: 'admin' };
  if (!ctx.usuario) {
    throw new GraphQLError('Inicia sesión como personal de la biblioteca', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.usuario;
}
