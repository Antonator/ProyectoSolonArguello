// Ejecuta cualquiera de las 30 consultas complejas y muestra el resultado.
import { gql } from './api.js';
import { $, esc, numero, fecha, aviso } from './ui.js';
import { montarPanel } from './panel.js';
import { GRUPOS } from './consultas-catalogo.js';

if (!montarPanel('consultas')) throw new Error('sin sesión');

const todas = GRUPOS.flatMap((g) => g.consultas.map((c) => ({ ...c, integrante: g.integrante })));
const ETIQUETAS = {
  ejemplaresTotales: 'Ejemplares', porcentajeDisponible: '% disponible', enReparacion: 'En reparación', lectoresUnicos: 'Lectores distintos',
  prestamosPorEjemplar: 'Préstamos por ejemplar', ultimoPrestamo: 'Último préstamo', mesesSinPrestamo: 'Meses sin préstamo', titulosPrestados: 'Títulos prestados',
  reservasPendientes: 'Reservas pendientes', proximaDevolucion: 'Próxima devolución', prioridadCompra: 'Prioridad de compra', paginasPromedio: 'Páginas (prom.)',
  indiceRotacion: 'Índice de rotación', librosDistintos: 'Libros distintos', categoriaFavorita: 'Categoría favorita', devolucionesTarde: 'Devoluciones tarde',
  fiadorNombre: 'Fiador', fiadorTelefono: 'Tel. fiador', librosAtrasados: 'Libros atrasados', diasAtrasoMaximo: 'Máx. días de atraso', diasRestantes: 'Días restantes',
  prestamosActivos: 'Préstamos activos', mesesInactivo: 'Meses inactivo', totalPrestamos: 'Total de préstamos', lectoresEnComun: 'Lectores en común',
  porcentajePuntualidad: '% puntualidad', atrasoPromedioDias: 'Atraso prom. (días)', aTiempo: 'A tiempo', lectoresActivos: 'Lectores activos',
  prestamosPorLector: 'Préstamos por lector', codigoEjemplar: 'Ejemplar', fechaVencimiento: 'Vence', fechaPrestamo: 'Prestado', fechaSolicitud: 'Solicitó',
  diasAtraso: 'Días de atraso', reservasEnEspera: 'En espera', nombreMes: 'Mes', devueltosTarde: 'Devueltos tarde', tasaAtraso: '% atraso',
  prestamosDevueltos: 'Devueltos', diasPromedio: 'Días (prom.)', diasMaximo: 'Días (máx.)', porcentajeRenovados: '% renovados', totalEnCola: 'En cola',
  diasEsperando: 'Días esperando', tasaAtencion: '% atendidas', diasEsperaPromedio: 'Espera prom. (días)', tipoLector: 'Tipo de lector', porcentajeDeSala: '% de la sala',
  devolucionesEsperadas: 'Devoluciones esperadas', renovacionesTotales: 'Renovaciones', promedioRenovaciones: 'Renovaciones por préstamo', sugerenciaAdquirir: '¿Adquirir más?',
  prestamos: 'Préstamos', paginas: 'Páginas', prestamosHoy: 'Préstamos hoy', porOcupacion: 'Por ocupación', porEdad: 'Por edad', porMunicipio: 'Por municipio', porSexo: 'Por sexo', porTipo: 'Por tipo', porDia: 'Por día', porHora: 'Por hora', diaPico: 'Día pico', horaPico: 'Hora pico', categoriasSemana: 'Categorías de la semana', facetasCategoria: 'Por categoría', facetasSala: 'Por sala', celdas: 'Día × hora',
  autorNombre: 'Autor', categoria: 'Categoría', titulos: 'Títulos', titulo: 'Título', ocupacion: 'Ocupación', posicion: 'Turno', telefono: 'Teléfono', periodo: 'Periodo', nacionalidad: 'Nacionalidad', anioPublicacion: 'Año', ejemplaresDisponibles: 'Disponibles', tituloLibro: 'Libro', fechaDevolucion: 'Devuelto',
};
const etiqueta = (k) => ETIQUETAS[k] ?? k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase();
const esFecha = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v);
const esFaceta = (a) => Array.isArray(a) && a.length && a.every((x) => x && 'valor' in x && 'cantidad' in x);

function celda(v) {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return numero(v);
  if (esFecha(v)) return fecha(v);
  if (esFaceta(v)) return v.map((f) => `${esc(f.valor)} (${f.cantidad})`).join(', ');
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? esc(x.titulo ?? x.nombre ?? JSON.stringify(x)) : esc(x))).join(', ');
  if (typeof v === 'object') return esc(Object.values(v).filter((x) => typeof x !== 'object').join(' · '));
  return esc(v);
}

function tabla(filas) {
  if (!filas.length) return '<p class="vacio">Sin resultados con estos parámetros.</p>';
  const cols = Object.keys(filas[0]);
  return `<div class="tabla-caja"><table>
    <thead><tr>${cols.map((c) => `<th class="${typeof filas[0][c] === 'number' ? 'num' : ''}">${esc(etiqueta(c))}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((f) => `<tr>${cols.map((c) => `<td class="${typeof f[c] === 'number' ? 'num' : ''}">${celda(f[c])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function barras(titulo, facetas) {
  const max = Math.max(...facetas.map((f) => f.cantidad), 1);
  return `<div style="margin-bottom:16px"><b>${esc(etiqueta(titulo))}</b>
    ${facetas.map((f) => `<div style="display:grid;grid-template-columns:150px 1fr 56px;gap:8px;align-items:center;margin-top:6px;font-size:14px">
      <span>${esc(f.valor)}</span>
      <span style="background:var(--fondo);border-radius:4px;height:14px"><span style="display:block;height:14px;border-radius:4px;background:var(--azul-2);width:${(f.cantidad / max) * 100}%"></span></span>
      <span style="text-align:right;font-variant-numeric:tabular-nums">${numero(f.cantidad)}</span></div>`).join('')}</div>`;
}

function render(valor) {
  if (valor == null) return '<p class="vacio">Sin resultados.</p>';
  if (Array.isArray(valor)) return tabla(valor);
  const escalares = Object.entries(valor).filter(([, v]) => v == null || typeof v !== 'object');
  const facetas = Object.entries(valor).filter(([, v]) => esFaceta(v));
  const listas = Object.entries(valor).filter(([, v]) => Array.isArray(v) && !esFaceta(v));
  const objetos = Object.entries(valor).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
  return `
    ${escalares.length ? `<div class="stats">${escalares.map(([k, v]) => `<div class="stat"><div class="etq">${esc(etiqueta(k))}</div><div class="num" style="font-size:24px">${celda(v)}</div></div>`).join('')}</div>` : ''}
    ${objetos.map(([k, v]) => `<p><b>${esc(etiqueta(k))}:</b> ${celda(v)}</p>`).join('')}
    ${facetas.length ? `<div class="dos-col">${facetas.map(([k, v]) => barras(k, v)).join('')}</div>` : ''}
    ${listas.map(([k, v]) => `<h3 style="font-size:16px;margin:12px 0 8px">${esc(etiqueta(k))}</h3>${tabla(v.map((x) => (typeof x === 'object' ? x : { valor: x })))}`).join('')}`;
}

function leerParametros(c) {
  const p = {};
  for (const prm of c.params) {
    const el = document.getElementById(`p-${prm.nombre}`);
    if (prm.tipo === 'Boolean') p[prm.nombre] = el.checked;
    else if (prm.tipo.startsWith('Int')) p[prm.nombre] = el.value === '' ? null : Number(el.value);
    else p[prm.nombre] = el.value.trim() === '' ? null : el.value.trim();
  }
  return p;
}

async function ejecutar(c) {
  const salida = $('#salida');
  const vars = leerParametros(c);
  salida.innerHTML = '<p class="vacio">Ejecutando…</p>';
  try {
    const armadas = c.previo ? await c.previo(vars, gql) : c.armar ? c.armar(vars) : vars;
    // Las variables vacías no se envían, para que el servidor use sus valores por omisión.
    const variables = Object.fromEntries(Object.entries(armadas).filter(([, v]) => v != null));
    const t0 = performance.now();
    const datos = await gql(c.query, variables);
    const ms = Math.round(performance.now() - t0);
    const valor = datos[c.id];
    const n = Array.isArray(valor) ? `${valor.length} fila(s)` : '1 resultado';
    salida.innerHTML = `<p class="resultado-info" style="margin:0 0 10px">${n} · ${ms} ms</p>${render(valor)}
      <details><summary>Variables enviadas</summary><pre class="codigo">${esc(JSON.stringify(variables, null, 2))}</pre></details>`;
  } catch (e) {
    salida.innerHTML = `<p class="vacio">${esc(e.message)}</p>`;
    aviso(e.message, 'error');
  }
}

function mostrar(id) {
  const c = todas.find((x) => x.id === id);
  document.querySelectorAll('.item-consulta').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
  history.replaceState(null, '', `#${id}`);
  $('#detalle').innerHTML = `
    <div class="resultado-info" style="margin:0">${esc(c.integrante)}</div>
    <h2 style="font-size:22px;margin:4px 0 6px">${esc(c.titulo)}</h2>
    <p style="margin:0 0 6px;color:var(--texto-2)">${esc(c.descripcion)}</p>
    <form class="params" id="form-params">
      ${c.params.map((p) => p.tipo === 'Boolean'
        ? `<label style="display:flex;gap:6px;align-items:center;padding-bottom:10px"><input type="checkbox" id="p-${p.nombre}" ${p.defecto ? 'checked' : ''}> ${esc(p.etiqueta)}</label>`
        : `<div class="campo"><label for="p-${p.nombre}">${esc(p.etiqueta)}</label><input class="input" id="p-${p.nombre}" type="${p.tipo === 'Fecha' ? 'date' : p.tipo.startsWith('Int') ? 'number' : 'text'}" value="${esc(p.defecto ?? '')}" ${p.tipo.endsWith('!') ? 'required' : ''}></div>`).join('')}
      <button class="btn btn-primario" type="submit">Ejecutar</button>
    </form>
    <details><summary>Ver la consulta GraphQL</summary><pre class="codigo">${esc(c.query)}</pre></details>
    <div id="salida" style="margin-top:12px"></div>`;
  $('#form-params').addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.reportValidity()) ejecutar(c);
  });
  if (!c.params.some((p) => p.tipo.endsWith('!') && !p.defecto)) ejecutar(c);
}

let n = 0;
$('#lista').innerHTML = GRUPOS.map((g) => `<div class="grupo-consultas">
  <h3>${esc(g.integrante)}</h3><span class="tema">${esc(g.tema)}</span>
  ${g.consultas.map((c) => `<button class="item-consulta" data-id="${c.id}"><span class="n">${++n}.</span>${esc(c.titulo)}</button>`).join('')}
</div>`).join('');
$('#lista').addEventListener('click', (e) => {
  const b = e.target.closest('.item-consulta');
  if (b) mostrar(b.dataset.id);
});

// Para el historial y las recomendaciones, sugiere la credencial del lector más activo.
gql('{ lectoresMasActivos(limite: 1) { credencial } }')
  .then(({ lectoresMasActivos: [l] }) => {
    if (!l) return;
    for (const c of todas) for (const p of c.params) if (p.nombre === 'credencial') p.defecto = l.credencial;
  })
  .catch(() => {})
  .finally(() => mostrar(todas.some((c) => c.id === location.hash.slice(1)) ? location.hash.slice(1) : todas[0].id));
