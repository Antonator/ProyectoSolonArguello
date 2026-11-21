// Menú lateral común del panel del personal + protección de las páginas.
import { sesion, cerrarSesion } from './api.js';
import { esc } from './ui.js';

const icono = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONOS = {
  libros: icono('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
  lectores: icono('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  prestamos: icono('<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
  consultas: icono('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
  sandbox: icono('<polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/>'),
  catalogo: icono('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  salir: icono('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
};

export function montarPanel(actual) {
  const s = sesion();
  if (!s?.token) {
    location.href = `/login.html?volver=${encodeURIComponent(location.pathname)}`;
    return null;
  }
  const enlace = (href, clave, texto) =>
    `<a href="${href}" ${actual === clave ? 'aria-current="page"' : ''}>${ICONOS[clave]}${texto}</a>`;
  const lateral = document.getElementById('lateral');
  lateral.innerHTML = `
    <a class="logo" href="/" aria-label="Ir al catálogo público"><img src="/img/logo.png" alt="Solón Argüello"></a>
    ${enlace('/admin/libros.html', 'libros', 'Inventario de libros')}
    ${enlace('/admin/lectores.html', 'lectores', 'Lectores')}
    ${enlace('/admin/prestamos.html', 'prestamos', 'Préstamos y reservas')}
    <div class="seccion">Análisis</div>
    ${enlace('/admin/consultas.html', 'consultas', 'Consultas y reportes')}
    <a href="/graphql" target="_blank" rel="noopener">${ICONOS.sandbox}Apollo Sandbox</a>
    <a href="/" >${ICONOS.catalogo}Catálogo público</a>
    <button class="item" id="salir">${ICONOS.salir}Cerrar sesión</button>
    <div class="usuario">Sesión: <b>${esc(s.nombre)}</b></div>`;
  document.getElementById('salir').addEventListener('click', cerrarSesion);
  document.getElementById('abrir-menu')?.addEventListener('click', () => lateral.classList.toggle('abierto'));
  return s;
}
