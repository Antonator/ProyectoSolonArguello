// Pantalla de Víctor: CRUD de lectores, credenciales, suspensiones e historial.
import { gql } from './api.js';
import { $, esc, numero, fecha, fechaInput, modal, aviso, confirmar, leerFormulario, insigniaSituacion, paginacion, retrasar } from './ui.js';
import { montarPanel } from './panel.js';

if (!montarPanel('lectores')) throw new Error('sin sesión');

const CAMPOS = `id credencial nombre apellidos nombreCompleto fechaNacimiento edad sexo telefono email ocupacion tipo
  domicilio { calle colonia municipio codigoPostal } fiador { nombre telefono parentesco domicilio }
  intereses fechaRegistro vigencia estado suspendidoHasta situacion prestamosActivos`;

const OCUPACIONES = ['Estudiante', 'Docente', 'Empleado', 'Comerciante', 'Profesionista', 'Hogar', 'Jubilado', 'Investigador', 'Otro'];
const TIPOS = ['General', 'Infantil', 'Estudiante', 'Investigador'];
const MUNICIPIOS = ['Tepic', 'Xalisco', 'San Blas', 'Compostela', 'Santiago Ixcuintla', 'Santa María del Oro', 'Bahía de Banderas', 'Otro'];
let CATEGORIAS = [];
const estado = { texto: '', situacion: '', pagina: 1 };

async function cargarResumen() {
  const q = `{
    a: lectores(situacion: "Activa", porPagina: 1) { total }
    v: lectores(situacion: "Vencida", porPagina: 1) { total }
    s: lectores(situacion: "Suspendida", porPagina: 1) { total }
    p: credencialesPorVencer(dias: 30) { lectorId }
  }`;
  const r = await gql(q);
  const poner = (k, n) => { document.querySelector(`[data-k="${k}"]`).textContent = numero(n); };
  poner('Activa', r.a.total);
  poner('Vencida', r.v.total);
  poner('Suspendida', r.s.total);
  poner('porVencer', r.p.length);
}

async function cargar() {
  try {
    const { lectores: r } = await gql(
      `query($b: String, $s: String, $p: Int) { lectores(busqueda: $b, situacion: $s, pagina: $p, porPagina: 15) {
        total pagina paginas lectores { id credencial nombreCompleto tipo ocupacion telefono email vigencia situacion suspendidoHasta prestamosActivos }
      } }`,
      { b: estado.texto || null, s: estado.situacion || null, p: estado.pagina }
    );
    $('#filas').innerHTML = r.lectores.map((l) => `<tr>
      <td><b>${esc(l.nombreCompleto)}</b><span class="sec">${esc(l.credencial)}</span></td>
      <td>${esc(l.tipo)}<span class="sec">${esc(l.ocupacion)}</span></td>
      <td>${esc(l.telefono ?? '—')}<span class="sec">${esc(l.email ?? '')}</span></td>
      <td>${fecha(l.vigencia)}</td>
      <td class="num">${l.prestamosActivos}</td>
      <td>${insigniaSituacion(l.situacion)}${l.situacion === 'Suspendida' ? `<span class="sec">hasta ${fecha(l.suspendidoHasta)}</span>` : ''}</td>
      <td class="acciones">
        <button class="enlace" data-accion="editar" data-id="${l.id}">Editar</button>
        <button class="enlace" data-accion="historial" data-id="${l.id}">Historial</button>
        <button class="enlace" data-accion="renovar" data-id="${l.id}">Renovar</button>
        ${l.situacion === 'Suspendida'
          ? `<button class="enlace" data-accion="reactivar" data-id="${l.id}">Reactivar</button>`
          : `<button class="enlace" data-accion="suspender" data-id="${l.id}">Suspender</button>`}
        <button class="enlace rojo" data-accion="eliminar" data-id="${l.id}" data-nombre="${esc(l.nombreCompleto)}">Eliminar</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" class="vacio">No hay lectores con esos filtros.</td></tr>';
    paginacion($('#paginacion'), r, (p) => { estado.pagina = p; cargar(); });
  } catch (e) {
    aviso(e.message, 'error');
  }
}

const opciones = (lista, actual) => lista.map((v) => `<option ${v === actual ? 'selected' : ''}>${esc(v)}</option>`).join('');

async function abrirFormulario(id) {
  const lector = id ? (await gql(`query($id: ID) { lector(id: $id) { ${CAMPOS} } }`, { id })).lector : null;
  const v = (ruta) => esc(ruta.split('.').reduce((o, k) => o?.[k], lector) ?? '');
  const d = modal({
    titulo: lector ? `Editar lector · ${lector.credencial}` : 'Nuevo lector',
    ancho: 820,
    cuerpo: `<form id="form-lector" class="rejilla-form">
      <div class="campo"><label for="nombre">Nombre(s)</label><input class="input" id="nombre" name="nombre" required value="${v('nombre')}"></div>
      <div class="campo"><label for="apellidos">Apellidos</label><input class="input" id="apellidos" name="apellidos" required value="${v('apellidos')}"></div>
      <div class="campo"><label for="nac">Fecha de nacimiento</label><input class="input" id="nac" name="fechaNacimiento" type="date" required value="${fechaInput(lector?.fechaNacimiento)}"></div>
      <div class="campo"><label for="sexo">Sexo</label><select class="input" id="sexo" name="sexo"><option value="F" ${lector?.sexo === 'F' ? 'selected' : ''}>Mujer</option><option value="M" ${lector?.sexo === 'M' ? 'selected' : ''}>Hombre</option><option value="X" ${lector?.sexo === 'X' ? 'selected' : ''}>No binario / prefiere no decir</option></select></div>
      <div class="campo"><label for="tel">Teléfono</label><input class="input" id="tel" name="telefono" inputmode="tel" value="${v('telefono')}"></div>
      <div class="campo"><label for="email">Correo</label><input class="input" id="email" name="email" type="email" value="${v('email')}"></div>
      <div class="campo"><label for="ocupacion">Ocupación</label><select class="input" id="ocupacion" name="ocupacion">${opciones(OCUPACIONES, lector?.ocupacion ?? 'Estudiante')}</select></div>
      <div class="campo"><label for="tipo">Tipo de lector</label><select class="input" id="tipo" name="tipo"><option value="">Automático por edad</option>${opciones(TIPOS, lector?.tipo)}</select></div>
      <fieldset class="ancho"><legend>Domicilio</legend><div class="rejilla-form">
        <div class="campo ancho"><label for="calle">Calle y número</label><input class="input" id="calle" name="domicilio.calle" value="${v('domicilio.calle')}"></div>
        <div class="campo"><label for="colonia">Colonia</label><input class="input" id="colonia" name="domicilio.colonia" value="${v('domicilio.colonia')}"></div>
        <div class="campo"><label for="municipio">Municipio</label><select class="input" id="municipio" name="domicilio.municipio">${opciones(MUNICIPIOS, lector?.domicilio?.municipio ?? 'Tepic')}</select></div>
        <div class="campo"><label for="cp">Código postal</label><input class="input" id="cp" name="domicilio.codigoPostal" inputmode="numeric" value="${v('domicilio.codigoPostal')}"></div>
      </div></fieldset>
      <fieldset class="ancho"><legend>Fiador (obligatorio para préstamo a domicilio)</legend><div class="rejilla-form">
        <div class="campo"><label for="f-nombre">Nombre completo</label><input class="input" id="f-nombre" name="fiador.nombre" required value="${v('fiador.nombre')}"></div>
        <div class="campo"><label for="f-par">Parentesco</label><input class="input" id="f-par" name="fiador.parentesco" value="${v('fiador.parentesco')}"></div>
        <div class="campo"><label for="f-tel">Teléfono</label><input class="input" id="f-tel" name="fiador.telefono" value="${v('fiador.telefono')}"></div>
        <div class="campo"><label for="f-dom">Domicilio</label><input class="input" id="f-dom" name="fiador.domicilio" value="${v('fiador.domicilio')}"></div>
      </div></fieldset>
      <div class="campo ancho"><label for="intereses">Intereses (para recomendaciones)</label>
        <select class="input" id="intereses" name="intereses" multiple size="5">${CATEGORIAS.map((c) => `<option ${lector?.intereses?.includes(c) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    </form>`,
    pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn btn-primario" id="guardar">${lector ? 'Guardar cambios' : 'Registrar y emitir credencial'}</button>`,
  });
  $('#guardar', d).addEventListener('click', async () => {
    const form = $('#form-lector', d);
    if (!form.reportValidity()) return;
    const input = leerFormulario(form);
    input.intereses = [...$('#intereses', d).selectedOptions].map((o) => o.value);
    if (!input.tipo) delete input.tipo;
    // Mediodía en Tepic: evita que la fecha cambie de día por la zona horaria.
    input.fechaNacimiento = `${input.fechaNacimiento}T12:00:00-07:00`;
    try {
      if (lector) {
        await gql('mutation($id: ID!, $input: LectorInput!) { actualizarLector(id: $id, input: $input) { id } }', { id: lector.id, input });
        aviso('Lector actualizado', 'ok');
      } else {
        const { crearLector } = await gql('mutation($input: LectorInput!) { crearLector(input: $input) { credencial } }', { input });
        aviso(`Credencial emitida: ${crearLector.credencial}`, 'ok');
      }
      d.close();
      cargar();
      cargarResumen();
    } catch (e) {
      aviso(e.message, 'error');
    }
  });
}

async function verHistorial(id) {
  const { lector } = await gql('query($id: ID) { lector(id: $id) { credencial } }', { id });
  const q = `query($c: String!, $id: ID!) {
    historialLector(credencial: $c) {
      lector { nombreCompleto credencial situacion vigencia edad ocupacion fiador { nombre telefono } }
      totalPrestamos activos devueltosATiempo devueltosTarde porcentajePuntualidad
      categorias { valor cantidad }
      prestamos { tituloLibro fechaPrestamo fechaVencimiento fechaDevolucion situacion diasAtraso }
    }
    recomendacionesParaLector(lectorId: $id, limite: 5) { titulo autor disponible motivo }
  }`;
  const { historialLector: h, recomendacionesParaLector: rec } = await gql(q, { c: lector.credencial, id });
  modal({
    titulo: `${h.lector.nombreCompleto} · ${h.lector.credencial}`,
    ancho: 860,
    cuerpo: `
      <div class="stats">
        <div class="stat"><div class="etq">Préstamos</div><div class="num">${h.totalPrestamos}</div></div>
        <div class="stat"><div class="etq">Activos</div><div class="num">${h.activos}</div></div>
        <div class="stat"><div class="etq">Devueltos tarde</div><div class="num">${h.devueltosTarde}</div></div>
        <div class="stat"><div class="etq">Puntualidad</div><div class="num">${h.porcentajePuntualidad == null ? '—' : `${h.porcentajePuntualidad}%`}</div></div>
      </div>
      <div class="dos-col">
        <div>
          <dl class="lista-datos">
            <dt>Situación</dt><dd>${insigniaSituacion(h.lector.situacion)}</dd>
            <dt>Vigencia</dt><dd>${fecha(h.lector.vigencia)}</dd>
            <dt>Edad</dt><dd>${h.lector.edad} años · ${esc(h.lector.ocupacion)}</dd>
            <dt>Fiador</dt><dd>${esc(h.lector.fiador?.nombre ?? '—')} ${h.lector.fiador?.telefono ? `· ${esc(h.lector.fiador.telefono)}` : ''}</dd>
            <dt>Categorías</dt><dd>${h.categorias.map((c) => `${esc(c.valor)} (${c.cantidad})`).join(', ') || '—'}</dd>
          </dl>
        </div>
        <div>
          <b>Recomendaciones para este lector</b>
          <ul style="margin:6px 0 0;padding-left:18px">${rec.map((r) => `<li>${esc(r.titulo)} — ${esc(r.autor)} ${r.disponible ? insigniaSituacion('Disponible') : ''}<br><small style="color:var(--texto-2)">${esc(r.motivo)}</small></li>`).join('') || '<li>Sin recomendaciones todavía</li>'}</ul>
        </div>
      </div>
      <h3 style="margin:18px 0 8px;font-size:17px">Préstamos</h3>
      <div class="tabla-caja"><table>
        <thead><tr><th>Libro</th><th>Prestado</th><th>Vence</th><th>Devuelto</th><th>Situación</th></tr></thead>
        <tbody>${h.prestamos.map((p) => `<tr><td>${esc(p.tituloLibro)}</td><td>${fecha(p.fechaPrestamo)}</td><td>${fecha(p.fechaVencimiento)}</td>
          <td>${fecha(p.fechaDevolucion)}${p.diasAtraso && p.fechaDevolucion ? `<span class="sec">${p.diasAtraso} día(s) tarde</span>` : ''}</td><td>${insigniaSituacion(p.situacion)}</td></tr>`).join('')
          || '<tr><td colspan="5" class="vacio">Sin préstamos</td></tr>'}</tbody>
      </table></div>`,
  });
}

async function accion(nombre, id, extra) {
  try {
    if (nombre === 'renovar') {
      if (!(await confirmar('¿Renovar la credencial por 2 años más?', { boton: 'Renovar' }))) return;
      const { renovarCredencial: r } = await gql('mutation($id: ID!) { renovarCredencial(id: $id) { vigencia } }', { id });
      aviso(`Vigente hasta ${fecha(r.vigencia)}`, 'ok');
    }
    if (nombre === 'suspender') {
      const dias = Number(prompt('¿Cuántos días de suspensión?', '7'));
      if (!dias) return;
      await gql('mutation($id: ID!, $d: Int!) { suspenderLector(id: $id, dias: $d) { id } }', { id, d: dias });
      aviso('Credencial suspendida', 'ok');
    }
    if (nombre === 'reactivar') {
      await gql('mutation($id: ID!) { reactivarLector(id: $id) { id } }', { id });
      aviso('Credencial reactivada', 'ok');
    }
    if (nombre === 'eliminar') {
      if (!(await confirmar(`¿Eliminar a ${extra}? Su historial de préstamos se conserva sin datos personales.`, { boton: 'Eliminar', peligro: true }))) return;
      await gql('mutation($id: ID!) { eliminarLector(id: $id) }', { id });
      aviso('Lector eliminado', 'ok');
    }
    cargar();
    cargarResumen();
  } catch (e) {
    aviso(e.message, 'error');
  }
}

$('#filas').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-accion]');
  if (!b) return;
  const { accion: a, id, nombre } = b.dataset;
  if (a === 'editar') abrirFormulario(id).catch((err) => aviso(err.message, 'error'));
  else if (a === 'historial') verHistorial(id).catch((err) => aviso(err.message, 'error'));
  else accion(a, id, nombre);
});
$('#nuevo').addEventListener('click', () => abrirFormulario());
$('#buscar').addEventListener('input', retrasar((e) => { estado.texto = e.target.value.trim(); estado.pagina = 1; cargar(); }));
$('#f-situacion').addEventListener('change', (e) => { estado.situacion = e.target.value; estado.pagina = 1; cargar(); });

(async () => {
  try {
    CATEGORIAS = (await gql('{ categorias }')).categorias;
    await Promise.all([cargarResumen(), cargar()]);
  } catch (e) {
    aviso(e.message, 'error');
  }
})();
