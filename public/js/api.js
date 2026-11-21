// Cliente GraphQL mínimo: todas las pantallas hablan con el backend con fetch()
// a un solo endpoint, POST /graphql.
const ENDPOINT = '/graphql';
const CLAVE_SESION = 'bpsa.sesion';

export function sesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
  } catch {
    return null;
  }
}
export function guardarSesion(datos) {
  try { localStorage.setItem(CLAVE_SESION, JSON.stringify(datos)); } catch { /* modo privado */ }
}
export function cerrarSesion() {
  try { localStorage.removeItem(CLAVE_SESION); } catch { /* nada */ }
  location.href = '/login.html';
}

export async function gql(query, variables = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const s = sesion();
  if (s?.token) headers.Authorization = `Bearer ${s.token}`;
  let respuesta;
  try {
    respuesta = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }
  const json = await respuesta.json().catch(() => ({}));
  if (json.errors?.length) {
    const e = json.errors[0];
    if (e.extensions?.code === 'UNAUTHENTICATED' && !location.pathname.endsWith('login.html') && query.trim().startsWith('mutation login') === false) {
      cerrarSesion();
    }
    throw new Error(e.message);
  }
  return json.data;
}
