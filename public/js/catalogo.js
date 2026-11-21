// Catálogo público: búsqueda con disponibilidad en tiempo real (sin iniciar sesión).
import { gql } from './api.js';
import { $, esc, numero, modal, aviso } from './ui.js';
import { BIBLIOTECA } from './config.js';

const CAMPOS_LIBRO = `id titulo autorNombre categoria sala editorial anioPublicacion anioPrimeraEdicion isbn
  clasificacion paginas descripcion ejemplaresTotales ejemplaresDisponibles reservasPendientes ediciones`;

const Q_CATALOGO = `query Catalogo($filtro: FiltroLibros, $pagina: Int, $porPagina: Int) {
  catalogo(filtro: $filtro, pagina: $pagina, porPagina: $porPagina) {
    total pagina paginas
    libros { ${CAMPOS_LIBRO} }
  }
}`;

const CHIPS = [
  { etiqueta: 'Todos', filtro: {} },
  { etiqueta: 'Literatura mexicana', filtro: { categoria: 'Literatura mexicana' } },
  { etiqueta: 'Literatura universal', filtro: { categoria: 'Literatura universal' } },
  { etiqueta: 'Historia', filtro: { categoria: 'Historia' } },
  { etiqueta: 'Ciencias', filtro: { categoria: 'Ciencias' } },
  { etiqueta: 'Infantil', filtro: { categoria: 'Infantil' } },
  { etiqueta: 'Fondo Nayarita', filtro: { sala: 'Fondo Nayarita' } },
  { etiqueta: 'Solo disponibles', filtro: { soloDisponibles: true }, alterna: true },
];

const estado = { texto: '', categoria: '', chip: 0, soloDisponibles: false, pagina: 1 };

function tarjeta(l) {
  const disp = l.ejemplaresDisponibles > 0;
  const tono = ['', 'c1', 'c2', 'c3'][l.titulo.length % 4];
  return `<button class="tarjeta-libro" data-id="${esc(l.id)}">
    <div class="portada ${tono}" aria-hidden="true">${esc(l.titulo.replace(/^(El|La|Los|Las) /, '').charAt(0).toUpperCase())}</div>
    <h3>${esc(l.titulo)}</h3>
    <p class="meta">${esc(l.autorNombre)} · ${esc(l.categoria)}</p>
    ${l.sala === 'Consulta'
      ? '<span class="insignia azul-i">Solo consulta en sala</span>'
      : `<span class="insignia ${disp ? 'verde' : 'rojo-i'}">${disp ? 'Disponible' : 'Prestado'} · ${l.ejemplaresDisponibles} de ${l.ejemplaresTotales} ejemplares</span>`}
  </button>`;
}

function verDetalle(l) {
  const disp = l.ejemplaresDisponibles > 0;
  modal({
    titulo: l.titulo,
    ancho: 560,
    cuerpo: `
      <p style="margin-top:0">${esc(l.descripcion || '')}</p>
      <dl class="lista-datos">
        <dt>Autor</dt><dd>${esc(l.autorNombre)}</dd>
        <dt>Editorial</dt><dd>${esc(l.editorial || '—')}${l.anioPublicacion ? `, ${l.anioPublicacion}` : ''}${l.ediciones > 1 ? ` <small>(y ${l.ediciones - 1} edición(es) más)</small>` : ''}</dd>
        ${l.anioPrimeraEdicion ? `<dt>Primera edición</dt><dd>${l.anioPrimeraEdicion}</dd>` : ''}
        <dt>Categoría</dt><dd>${esc(l.categoria)}</dd>
        <dt>Sala</dt><dd>${esc(l.sala)}</dd>
        <dt>Clasificación</dt><dd>${esc(l.clasificacion || '—')}</dd>
        <dt>ISBN</dt><dd>${esc(l.isbn)}</dd>
        <dt>Páginas</dt><dd>${l.paginas ?? '—'}</dd>
        <dt>Disponibilidad</dt><dd>${l.ejemplaresDisponibles} de ${l.ejemplaresTotales} ejemplares${l.reservasPendientes ? ` · ${l.reservasPendientes} persona(s) en espera` : ''}</dd>
      </dl>
      <p style="margin-bottom:0;color:var(--texto-2)">${l.sala === 'Consulta'
        ? 'Este material se consulta dentro de la biblioteca.'
        : disp ? 'Pídelo en el mostrador con tu credencial de préstamo a domicilio.' : 'Todos los ejemplares están prestados. En el mostrador pueden apartártelo.'}</p>`,
  });
}

async function buscar() {
  const filtro = { ...CHIPS[estado.chip].filtro };
  if (estado.texto) filtro.texto = estado.texto;
  if (estado.categoria) filtro.categoria = estado.categoria;
  if (estado.soloDisponibles) filtro.soloDisponibles = true;
  $('#info').textContent = 'Buscando…';
  try {
    const { catalogo } = await gql(Q_CATALOGO, { filtro, pagina: estado.pagina, porPagina: 12 });
    const cont = $('#libros');
    cont.innerHTML = catalogo.libros.map(tarjeta).join('') || '<p class="vacio">No encontramos libros con esos filtros.</p>';
    cont.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => verDetalle(catalogo.libros.find((x) => x.id === b.dataset.id))));
    $('#info').textContent = `${numero(catalogo.total)} resultado(s)`;
    const pag = $('#paginacion');
    pag.innerHTML = catalogo.paginas > 1
      ? `<button class="btn btn-chico" ${catalogo.pagina <= 1 ? 'disabled' : ''} data-p="-1">Anterior</button>
         <span>Página ${catalogo.pagina} de ${catalogo.paginas}</span>
         <button class="btn btn-chico" ${catalogo.pagina >= catalogo.paginas ? 'disabled' : ''} data-p="1">Siguiente</button>` : '';
    pag.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
      estado.pagina += Number(b.dataset.p);
      buscar();
      $('#catalogo').scrollIntoView({ behavior: 'smooth' });
    }));
  } catch (e) {
    $('#info').textContent = '';
    aviso(e.message, 'error');
  }
}

function pintarChips() {
  $('#chips').innerHTML = CHIPS.map((c, i) => {
    const activo = c.alterna ? estado.soloDisponibles : i === estado.chip;
    return `<button class="chip" aria-pressed="${activo}" data-i="${i}">${esc(c.etiqueta)}</button>`;
  }).join('');
  $('#chips').querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    if (CHIPS[i].alterna) estado.soloDisponibles = !estado.soloDisponibles;
    else { estado.chip = i; estado.categoria = ''; $('#categoria').value = ''; }
    estado.pagina = 1;
    pintarChips();
    buscar();
  }));
}

async function iniciar() {
  $('#dato-direccion').textContent = `${BIBLIOTECA.direccion}, ${BIBLIOTECA.ciudad}`;
  $('#dato-horario').textContent = BIBLIOTECA.horario;
  $('#dato-reglas').textContent = BIBLIOTECA.reglas.join(' ');
  $('#dato-pie').textContent = `${BIBLIOTECA.direccion} · ${BIBLIOTECA.horario} · ${BIBLIOTECA.telefono}`;

  const { categorias, novedades } = await gql(`{ categorias novedades(limite: 4) { ${CAMPOS_LIBRO} } }`).catch((e) => {
    aviso(e.message, 'error');
    return { categorias: [], novedades: [] };
  });
  $('#categoria').insertAdjacentHTML('beforeend', categorias.map((c) => `<option>${esc(c)}</option>`).join(''));
  const nov = $('#lista-novedades');
  nov.innerHTML = novedades.map(tarjeta).join('');
  nov.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => verDetalle(novedades.find((x) => x.id === b.dataset.id))));

  $('#form-busqueda').addEventListener('submit', (e) => {
    e.preventDefault();
    estado.texto = $('#q').value.trim();
    estado.categoria = $('#categoria').value;
    if (estado.categoria) estado.chip = 0;
    estado.pagina = 1;
    pintarChips();
    buscar();
    $('#catalogo').scrollIntoView({ behavior: 'smooth' });
  });
  pintarChips();
  buscar();
}

iniciar();
