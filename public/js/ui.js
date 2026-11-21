// Utilidades de interfaz compartidas: avisos, modales, formato y escape de HTML.
export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const nf = new Intl.NumberFormat('es-MX');
export const numero = (n) => nf.format(n ?? 0);

const ZONA = 'America/Mazatlan';
export const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: ZONA }) : '—');
export const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: ZONA }) : '—');
export const fechaInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export function aviso(texto, tipo = '') {
  let caja = $('.avisos');
  if (!caja) {
    caja = document.createElement('div');
    caja.className = 'avisos';
    caja.setAttribute('role', 'status');
    caja.setAttribute('aria-live', 'polite');
    document.body.append(caja);
  }
  const el = document.createElement('div');
  el.className = `aviso ${tipo}`;
  el.textContent = texto;
  caja.append(el);
  setTimeout(() => el.remove(), tipo === 'error' ? 6000 : 4000);
}

// Abre un <dialog> con título, cuerpo HTML y botones. Devuelve el elemento.
export function modal({ titulo, cuerpo, pie = '', ancho }) {
  const d = document.createElement('dialog');
  if (ancho) d.style.width = `min(${ancho}px, calc(100vw - 24px))`;
  d.innerHTML = `
    <div class="modal-cab"><h2>${esc(titulo)}</h2><button class="cerrar" aria-label="Cerrar" data-cerrar>&times;</button></div>
    <div class="modal-cuerpo">${cuerpo}</div>
    ${pie ? `<div class="modal-pie">${pie}</div>` : ''}`;
  document.body.append(d);
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-cerrar]')) d.close();
  });
  d.addEventListener('close', () => d.remove());
  d.showModal();
  return d;
}

export function confirmar(texto, { boton = 'Confirmar', peligro = false } = {}) {
  return new Promise((resolve) => {
    const d = modal({
      titulo: 'Confirmar',
      cuerpo: `<p style="margin:0">${esc(texto)}</p>`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn ${peligro ? 'btn-azul' : 'btn-primario'}" data-ok>${esc(boton)}</button>`,
      ancho: 460,
    });
    let ok = false;
    d.querySelector('[data-ok]').addEventListener('click', () => { ok = true; d.close(); });
    d.addEventListener('close', () => resolve(ok));
  });
}

// Lee un formulario a un objeto; los campos con data-num se convierten a número.
export function leerFormulario(form) {
  const datos = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    let v = el.type === 'checkbox' ? el.checked : el.value.trim();
    if (el.dataset.num !== undefined) v = v === '' ? null : Number(v);
    else if (v === '' && el.type !== 'checkbox') v = null;
    const partes = el.name.split('.');
    let obj = datos;
    while (partes.length > 1) {
      const p = partes.shift();
      obj[p] = obj[p] ?? {};
      obj = obj[p];
    }
    obj[partes[0]] = v;
  }
  return datos;
}

export function insigniaSituacion(s) {
  const clase = { Activa: 'verde', Activo: 'verde', Disponible: 'verde', Devuelto: 'gris', Atendida: 'gris', Vencida: 'ambar', Vencido: 'rojo-i', Suspendida: 'rojo-i', Cancelada: 'gris', Extraviado: 'rojo-i', Prestado: 'rojo-i', Agotado: 'rojo-i', 'En reparación': 'ambar', Pendiente: 'ambar', 'Lista para recoger': 'azul-i', Expirada: 'gris', Cancelado: 'gris' }[s] ?? 'gris';
  return `<span class="insignia ${clase}">${esc(s)}</span>`;
}

export function paginacion(cont, { pagina, paginas, total }, alCambiar) {
  cont.innerHTML = paginas > 1
    ? `<button class="btn btn-chico" ${pagina <= 1 ? 'disabled' : ''} data-p="${pagina - 1}">Anterior</button>
       <span>Página ${pagina} de ${paginas} · ${numero(total)} registros</span>
       <button class="btn btn-chico" ${pagina >= paginas ? 'disabled' : ''} data-p="${pagina + 1}">Siguiente</button>`
    : `<span>${numero(total)} registro(s)</span>`;
  cont.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => alCambiar(Number(b.dataset.p))));
}

export function retrasar(fn, ms = 300) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
