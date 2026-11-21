// Pantalla de Pablo: CRUD de préstamos, devoluciones, renovaciones y reservas.
import { gql } from './api.js';
import { $, $$, esc, numero, fecha, fechaInput, modal, aviso, confirmar, insigniaSituacion, paginacion, retrasar } from './ui.js';
import { montarPanel } from './panel.js';

if (!montarPanel('prestamos')) throw new Error('sin sesión');

const estado = { situacion: 'Abiertos', texto: '', pagina: 1, lector: null, libro: null };

async function cargarTablero() {
  const { tableroOperativo: t } = await gql('{ tableroOperativo { prestamosHoy devolucionesHoy activos vencidos reservasPendientes reservasPorRecoger } }');
  for (const k of ['prestamosHoy', 'devolucionesHoy', 'activos', 'vencidos']) document.querySelector(`[data-k="${k}"]`).textContent = numero(t[k]);
  $('[data-s="reservas"]').textContent = `Reservas (${t.reservasPendientes + t.reservasPorRecoger})`;
}

async function cargar() {
  try {
    const { prestamos: r } = await gql(
      `query($s: String, $b: String, $p: Int) { prestamos(situacion: $s, busqueda: $b, pagina: $p, porPagina: 15) {
        total pagina paginas
        prestamos { id tituloLibro codigoEjemplar nombreLector lector { credencial telefono } fechaPrestamo fechaVencimiento fechaDevolucion renovaciones situacion diasAtraso observaciones }
      } }`,
      { s: estado.situacion || null, b: estado.texto || null, p: estado.pagina }
    );
    $('#filas').innerHTML = r.prestamos.map((p) => {
      const abierto = p.situacion === 'Activo' || p.situacion === 'Vencido';
      return `<tr>
        <td><b>${esc(p.tituloLibro)}</b><span class="sec">${esc(p.codigoEjemplar)}${p.renovaciones ? ` · renovado ${p.renovaciones}×` : ''}</span></td>
        <td>${esc(p.nombreLector)}<span class="sec">${esc(p.lector?.credencial ?? '')} ${p.lector?.telefono ? `· ${esc(p.lector.telefono)}` : ''}</span></td>
        <td>${fecha(p.fechaPrestamo)}</td>
        <td>${fecha(p.fechaVencimiento)}${p.fechaDevolucion ? `<span class="sec">devuelto ${fecha(p.fechaDevolucion)}</span>` : ''}</td>
        <td>${insigniaSituacion(p.situacion)}${p.diasAtraso ? `<span class="sec">${p.diasAtraso} día(s) de atraso</span>` : ''}</td>
        <td class="acciones">
          ${abierto ? `<button class="enlace" data-accion="devolver" data-id="${p.id}">Devolver</button>` : ''}
          ${p.situacion === 'Activo' ? `<button class="enlace" data-accion="renovar" data-id="${p.id}">Renovar</button>` : ''}
          <button class="enlace" data-accion="editar" data-id="${p.id}" data-venc="${p.fechaVencimiento}" data-obs="${esc(p.observaciones ?? '')}" data-abierto="${abierto}">Editar</button>
          ${abierto ? `<button class="enlace" data-accion="extraviado" data-id="${p.id}">Extraviado</button>` : ''}
          <button class="enlace rojo" data-accion="eliminar" data-id="${p.id}" data-abierto="${abierto}">Eliminar</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="vacio">No hay préstamos en esta vista.</td></tr>';
    paginacion($('#paginacion'), r, (p) => { estado.pagina = p; cargar(); });
  } catch (e) {
    aviso(e.message, 'error');
  }
}

async function cargarReservas() {
  try {
    const { listas, colaReservas } = await gql(`{
      listas: reservas(estado: "Lista para recoger", limite: 100) { id tituloLibro nombreLector fechaLimiteRecoger lector { id credencial } libro { id } }
      colaReservas { reservaId libroId titulo lector credencial fechaSolicitud posicion totalEnCola diasEsperando }
    }`);
    $('#filas-listas').innerHTML = listas.map((r) => `<tr>
      <td><b>${esc(r.tituloLibro)}</b></td>
      <td>${esc(r.nombreLector)}<span class="sec">${esc(r.lector?.credencial ?? '')}</span></td>
      <td>${fecha(r.fechaLimiteRecoger)}</td>
      <td class="acciones">
        ${r.lector && r.libro ? `<button class="enlace" data-accion="entregar" data-lector="${r.lector.id}" data-libro="${r.libro.id}">Entregar en préstamo</button>` : ''}
        <button class="enlace rojo" data-accion="cancelar" data-id="${r.id}">Cancelar</button>
      </td></tr>`).join('') || '<tr><td colspan="4" class="vacio">No hay apartados esperando.</td></tr>';
    $('#filas-cola').innerHTML = colaReservas.map((r) => `<tr>
      <td><b>${esc(r.titulo)}</b></td>
      <td class="num">${r.posicion} de ${r.totalEnCola}</td>
      <td>${esc(r.lector)}<span class="sec">${esc(r.credencial)}</span></td>
      <td>${fecha(r.fechaSolicitud)}</td>
      <td class="num">${r.diasEsperando}</td>
      <td class="acciones"><button class="enlace rojo" data-accion="cancelar" data-id="${r.reservaId}">Cancelar</button></td>
    </tr>`).join('') || '<tr><td colspan="6" class="vacio">Nadie está esperando un libro.</td></tr>';
  } catch (e) {
    aviso(e.message, 'error');
  }
}

function refrescar() {
  cargarTablero().catch(() => {});
  if (estado.situacion === 'reservas') cargarReservas();
  else cargar();
}

// ───── Registrar préstamo: selección de lector y libro ─────
function pintarElegidos() {
  const l = estado.lector;
  const b = estado.libro;
  $('#lector-elegido').innerHTML = l
    ? `<div class="elegido"><b>${esc(l.nombreCompleto)}</b> · ${esc(l.credencial)} ${insigniaSituacion(l.situacion)}<br><small>${l.prestamosActivos} de 3 libros en préstamo</small></div>` : '';
  $('#libro-elegido').innerHTML = b
    ? `<div class="elegido"><b>${esc(b.titulo)}</b> · ${esc(b.autorNombre)}<br><small>${b.sala === 'Consulta' ? 'Solo consulta en sala' : `${b.ejemplaresDisponibles} de ${b.ejemplaresTotales} disponibles${b.reservasPendientes ? ` · ${b.reservasPendientes} en espera` : ''}`}</small></div>` : '';
  const listos = Boolean(l && b);
  $('#registrar').disabled = !(listos && b.ejemplaresDisponibles > 0);
  $('#reservar').disabled = !(listos && b.ejemplaresDisponibles === 0 && b.sala !== 'Consulta');
}

function selector(input, caja, buscar, render, alElegir) {
  const ejecutar = retrasar(async () => {
    const texto = input.value.trim();
    if (texto.length < 2) return caja.classList.add('oculto');
    try {
      const items = await buscar(texto);
      caja.innerHTML = items.map((it, i) => `<button type="button" class="opcion" data-i="${i}">${render(it)}</button>`).join('') || '<div class="opcion">Sin coincidencias</div>';
      caja.classList.remove('oculto');
      caja.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
        alElegir(items[Number(b.dataset.i)]);
        caja.classList.add('oculto');
        input.value = '';
      }));
    } catch (e) {
      aviso(e.message, 'error');
    }
  });
  input.addEventListener('input', ejecutar);
  document.addEventListener('click', (e) => { if (!caja.contains(e.target) && e.target !== input) caja.classList.add('oculto'); });
}

const CAMPOS_LIBRO = 'id titulo autorNombre sala ejemplaresTotales ejemplaresDisponibles reservasPendientes';

selector($('#buscar-lector'), $('#op-lector'),
  async (b) => (await gql('query($b: String) { lectores(busqueda: $b, porPagina: 8) { lectores { id credencial nombreCompleto situacion prestamosActivos } } }', { b })).lectores.lectores,
  (l) => `${esc(l.nombreCompleto)}<small>${esc(l.credencial)} · ${esc(l.situacion)} · ${l.prestamosActivos} en préstamo</small>`,
  (l) => { estado.lector = l; pintarElegidos(); });

selector($('#buscar-libro'), $('#op-libro'),
  async (t) => (await gql(`query($f: FiltroLibros!) { busquedaAvanzada(filtro: $f, porPagina: 8) { libros { ${CAMPOS_LIBRO} } } }`, { f: { texto: t } })).busquedaAvanzada.libros,
  (b) => `${esc(b.titulo)}<small>${esc(b.autorNombre)} · ${b.ejemplaresDisponibles}/${b.ejemplaresTotales} disponibles · ${esc(b.sala)}</small>`,
  (b) => { estado.libro = b; pintarElegidos(); });

$('#registrar').addEventListener('click', async () => {
  try {
    const { registrarPrestamo: p } = await gql(
      'mutation($l: ID!, $b: ID!) { registrarPrestamo(lectorId: $l, libroId: $b) { codigoEjemplar fechaVencimiento } }',
      { l: estado.lector.id, b: estado.libro.id }
    );
    aviso(`Préstamo registrado: ejemplar ${p.codigoEjemplar}, vence el ${fecha(p.fechaVencimiento)}`, 'ok');
    estado.lector = null;
    estado.libro = null;
    pintarElegidos();
    refrescar();
  } catch (e) {
    aviso(e.message, 'error');
  }
});
$('#reservar').addEventListener('click', async () => {
  try {
    await gql('mutation($l: ID!, $b: ID!) { crearReserva(lectorId: $l, libroId: $b) { id } }', { l: estado.lector.id, b: estado.libro.id });
    aviso('Reserva registrada: se le apartará cuando regrese un ejemplar', 'ok');
    estado.libro = null;
    pintarElegidos();
    refrescar();
  } catch (e) {
    aviso(e.message, 'error');
  }
});

// ───── Acciones sobre préstamos ─────
function devolver(id) {
  const d = modal({
    titulo: 'Registrar devolución',
    ancho: 520,
    cuerpo: `<form id="f-dev" class="rejilla-form">
      <div class="campo ancho"><label for="cond">Condición del ejemplar</label>
        <select class="input" id="cond"><option value="Buena">Buena</option><option value="Dañado">Dañado (pasa a reparación)</option></select></div>
      <div class="campo ancho"><label for="obs">Observaciones</label><textarea class="input" id="obs"></textarea></div>
    </form>`,
    pie: '<button class="btn" data-cerrar>Cancelar</button><button class="btn btn-primario" id="ok">Registrar devolución</button>',
  });
  $('#ok', d).addEventListener('click', async () => {
    try {
      const { devolverPrestamo: r } = await gql(
        'mutation($id: ID!, $c: String, $o: String) { devolverPrestamo(id: $id, condicion: $c, observaciones: $o) { mensaje } }',
        { id, c: $('#cond', d).value, o: $('#obs', d).value || null }
      );
      aviso(r.mensaje, 'ok');
      d.close();
      refrescar();
    } catch (e) {
      aviso(e.message, 'error');
    }
  });
}

function editar(b) {
  const abierto = b.dataset.abierto === 'true';
  const d = modal({
    titulo: 'Editar préstamo',
    ancho: 520,
    cuerpo: `<form class="rejilla-form">
      ${abierto ? `<div class="campo ancho"><label for="venc">Fecha de vencimiento</label><input class="input" id="venc" type="date" value="${fechaInput(b.dataset.venc)}"></div>` : ''}
      <div class="campo ancho"><label for="obs2">Observaciones</label><textarea class="input" id="obs2">${esc(b.dataset.obs)}</textarea></div>
    </form>`,
    pie: '<button class="btn" data-cerrar>Cancelar</button><button class="btn btn-primario" id="ok">Guardar</button>',
  });
  $('#ok', d).addEventListener('click', async () => {
    const input = { observaciones: $('#obs2', d).value };
    if (abierto && $('#venc', d).value) input.fechaVencimiento = `${$('#venc', d).value}T19:00:00-07:00`;
    try {
      await gql('mutation($id: ID!, $i: PrestamoUpdateInput!) { actualizarPrestamo(id: $id, input: $i) { id } }', { id: b.dataset.id, i: input });
      aviso('Préstamo actualizado', 'ok');
      d.close();
      refrescar();
    } catch (e) {
      aviso(e.message, 'error');
    }
  });
}

$('main').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-accion]');
  if (!b) return;
  const { accion, id } = b.dataset;
  try {
    if (accion === 'devolver') return devolver(id);
    if (accion === 'editar') return editar(b);
    if (accion === 'renovar') {
      const { renovarPrestamo: p } = await gql('mutation($id: ID!) { renovarPrestamo(id: $id) { fechaVencimiento } }', { id });
      aviso(`Renovado hasta el ${fecha(p.fechaVencimiento)}`, 'ok');
    }
    if (accion === 'extraviado') {
      if (!(await confirmar('¿Marcar el ejemplar como extraviado? Se descuenta del inventario.', { boton: 'Marcar extraviado', peligro: true }))) return;
      await gql('mutation($id: ID!) { marcarExtraviado(id: $id) { id } }', { id });
      aviso('Ejemplar marcado como extraviado', 'ok');
    }
    if (accion === 'eliminar') {
      const texto = b.dataset.abierto === 'true'
        ? '¿Eliminar este préstamo registrado por error? El ejemplar vuelve a estar disponible.'
        : '¿Eliminar este registro del historial?';
      if (!(await confirmar(texto, { boton: 'Eliminar', peligro: true }))) return;
      await gql('mutation($id: ID!) { eliminarPrestamo(id: $id) }', { id });
      aviso('Préstamo eliminado', 'ok');
    }
    if (accion === 'cancelar') {
      if (!(await confirmar('¿Cancelar esta reserva?', { boton: 'Cancelar reserva', peligro: true }))) return;
      await gql('mutation($id: ID!) { cancelarReserva(id: $id) { id } }', { id });
      aviso('Reserva cancelada', 'ok');
    }
    if (accion === 'entregar') {
      const { registrarPrestamo: p } = await gql(
        'mutation($l: ID!, $b: ID!) { registrarPrestamo(lectorId: $l, libroId: $b) { codigoEjemplar fechaVencimiento } }',
        { l: b.dataset.lector, b: b.dataset.libro }
      );
      aviso(`Entregado: ${p.codigoEjemplar}, vence el ${fecha(p.fechaVencimiento)}`, 'ok');
    }
    refrescar();
  } catch (err) {
    aviso(err.message, 'error');
  }
});

$$('.pestana').forEach((t) => t.addEventListener('click', () => {
  $$('.pestana').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
  estado.situacion = t.dataset.s;
  estado.pagina = 1;
  const reservas = estado.situacion === 'reservas';
  $('#vista-prestamos').classList.toggle('oculto', reservas);
  $('#vista-reservas').classList.toggle('oculto', !reservas);
  refrescar();
}));
$('#buscar').addEventListener('input', retrasar((e) => { estado.texto = e.target.value.trim(); estado.pagina = 1; cargar(); }));

(async () => {
  const libroId = new URLSearchParams(location.search).get('libro');
  if (libroId) {
    try {
      estado.libro = (await gql(`query($id: ID!) { libro(id: $id) { ${CAMPOS_LIBRO} } }`, { id: libroId })).libro;
      pintarElegidos();
      $('#buscar-lector').focus();
    } catch (e) {
      aviso(e.message, 'error');
    }
  }
  refrescar();
})();
