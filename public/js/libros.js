// Pantalla de Antony: CRUD de libros, autores y ejemplares.
import { gql } from './api.js';
import { $, esc, numero, modal, aviso, confirmar, leerFormulario, insigniaSituacion, paginacion, retrasar } from './ui.js';
import { montarPanel } from './panel.js';

if (!montarPanel('libros')) throw new Error('sin sesión');

const CAMPOS = `id isbn titulo autorNombre autor { id nombre } editorial anioPublicacion anioPrimeraEdicion categoria sala
  clasificacion idioma paginas descripcion palabrasClave ejemplaresTotales ejemplaresDisponibles reservasPendientes
  ejemplares { codigo estado origen fechaAdquisicion }`;

const Q_LISTA = `query Libros($filtro: FiltroLibros!, $pagina: Int) {
  busquedaAvanzada(filtro: $filtro, pagina: $pagina, porPagina: 15) {
    total pagina paginas
    libros { id isbn titulo autorNombre categoria sala ejemplaresTotales ejemplaresDisponibles reservasPendientes }
  }
}`;

let catalogos = { categorias: [], salas: [] };
const estado = { texto: '', categoria: '', estado: '', pagina: 1 };

async function cargarResumen() {
  const { resumenInventario: r } = await gql('{ resumenInventario { titulos ejemplaresTotales disponibles enPrestamo } }');
  for (const [k, v] of Object.entries(r)) {
    const el = document.querySelector(`[data-k="${k}"]`);
    if (el) el.textContent = numero(v);
  }
}

async function cargar() {
  const filtro = {};
  if (estado.texto) filtro.texto = estado.texto;
  if (estado.categoria) filtro.categoria = estado.categoria;
  if (estado.estado === 'disponible') filtro.soloDisponibles = true;
  if (estado.estado === 'agotado') filtro.soloAgotados = true;
  try {
    const { busquedaAvanzada: r } = await gql(Q_LISTA, { filtro, pagina: estado.pagina });
    $('#filas').innerHTML = r.libros.map((l) => {
      const situacion = l.ejemplaresTotales === 0 ? 'Sin ejemplares' : l.sala === 'Consulta' ? 'Consulta' : l.ejemplaresDisponibles > 0 ? 'Disponible' : 'Prestado';
      return `<tr>
        <td><b>${esc(l.titulo)}</b><span class="sec">${esc(l.autorNombre)} · ISBN ${esc(l.isbn)}</span></td>
        <td>${esc(l.categoria)}</td>
        <td>${esc(l.sala)}</td>
        <td class="num">${l.ejemplaresDisponibles} / ${l.ejemplaresTotales}</td>
        <td>${insigniaSituacion(situacion)}${l.reservasPendientes ? ` <span class="sec">${l.reservasPendientes} en espera</span>` : ''}</td>
        <td class="acciones">
          <button class="enlace" data-accion="editar" data-id="${l.id}">Editar</button>
          <button class="enlace" data-accion="ejemplares" data-id="${l.id}">Ejemplares</button>
          ${l.sala !== 'Consulta' ? `<a class="enlace" href="/admin/prestamos.html?libro=${l.id}">Prestar</a>` : ''}
          <button class="enlace rojo" data-accion="eliminar" data-id="${l.id}" data-titulo="${esc(l.titulo)}">Eliminar</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="vacio">No hay libros con esos filtros.</td></tr>';
    paginacion($('#paginacion'), r, (p) => { estado.pagina = p; cargar(); });
  } catch (e) {
    aviso(e.message, 'error');
  }
}

// ───── Formulario de alta / edición ─────
function opciones(lista, actual) {
  return lista.map((v) => `<option ${v === actual ? 'selected' : ''}>${esc(v)}</option>`).join('');
}

async function abrirFormulario(id) {
  let libro = null;
  if (id) libro = (await gql(`query($id: ID!) { libro(id: $id) { ${CAMPOS} } }`, { id })).libro;
  const v = (k) => esc(libro?.[k] ?? '');
  const d = modal({
    titulo: libro ? 'Editar libro' : 'Nuevo libro',
    ancho: 780,
    cuerpo: `<form id="form-libro" class="rejilla-form">
      <div class="campo ancho"><label for="titulo">Título</label><input class="input" id="titulo" name="titulo" required value="${v('titulo')}"></div>
      <div class="campo ancho">
        <label for="autor-buscar">Autor</label>
        <div class="selector">
          <input class="input" id="autor-buscar" placeholder="Escribe para buscar un autor" autocomplete="off" value="${esc(libro?.autor?.nombre ?? '')}">
          <div class="opciones oculto" id="autor-opciones"></div>
        </div>
        <input type="hidden" name="autorId" id="autorId" value="${esc(libro?.autor?.id ?? '')}">
        <button type="button" class="enlace" id="nuevo-autor" style="align-self:flex-start">+ Registrar autor nuevo</button>
      </div>
      <div class="campo"><label for="isbn">ISBN</label><input class="input" id="isbn" name="isbn" required value="${v('isbn')}" placeholder="978-607-..."></div>
      <div class="campo"><label for="editorial">Editorial</label><input class="input" id="editorial" name="editorial" value="${v('editorial')}"></div>
      <div class="campo"><label for="categoria">Categoría</label><select class="input" id="categoria" name="categoria" required>${opciones(catalogos.categorias, libro?.categoria)}</select></div>
      <div class="campo"><label for="sala">Sala</label><select class="input" id="sala" name="sala">${opciones(catalogos.salas, libro?.sala ?? 'General')}</select></div>
      <div class="campo"><label for="anio">Año de esta edición</label><input class="input" id="anio" name="anioPublicacion" data-num type="number" min="1450" max="2100" value="${v('anioPublicacion')}"></div>
      <div class="campo"><label for="anio1">Año de la primera edición</label><input class="input" id="anio1" name="anioPrimeraEdicion" data-num type="number" min="1" max="2100" value="${v('anioPrimeraEdicion')}"></div>
      <div class="campo"><label for="clasificacion">Clasificación (Dewey)</label><input class="input" id="clasificacion" name="clasificacion" value="${v('clasificacion')}" placeholder="M863 RULP"></div>
      <div class="campo"><label for="paginas">Páginas</label><input class="input" id="paginas" name="paginas" data-num type="number" min="1" value="${v('paginas')}"></div>
      <div class="campo"><label for="idioma">Idioma</label><input class="input" id="idioma" name="idioma" value="${v('idioma') || 'Español'}"></div>
      <div class="campo"><label for="palabras">Palabras clave (separadas por coma)</label><input class="input" id="palabras" name="palabrasClave" value="${esc((libro?.palabrasClave ?? []).join(', '))}"></div>
      <div class="campo ancho"><label for="descripcion">Descripción</label><textarea class="input" id="descripcion" name="descripcion">${v('descripcion')}</textarea></div>
      ${libro ? '' : `
      <div class="campo"><label for="ejemplares">Ejemplares que llegan</label><input class="input" id="ejemplares" name="ejemplaresIniciales" data-num type="number" min="0" max="50" value="1"></div>
      <div class="campo"><label for="origen">Origen</label><select class="input" id="origen" name="origen"><option>Compra</option><option>Donación</option><option>Dotación DGB</option></select></div>`}
    </form>`,
    pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn btn-primario" id="guardar">${libro ? 'Guardar cambios' : 'Registrar libro'}</button>`,
  });

  // Buscador de autores
  const buscarAutor = retrasar(async (texto) => {
    const caja = $('#autor-opciones', d);
    if (!texto) return caja.classList.add('oculto');
    const { autores } = await gql('query($b: String) { autores(busqueda: $b, limite: 8) { id nombre nacionalidad totalLibros } }', { b: texto });
    caja.innerHTML = autores.map((a) => `<button type="button" class="opcion" data-id="${a.id}" data-nombre="${esc(a.nombre)}">${esc(a.nombre)}<small>${esc(a.nacionalidad)} · ${a.totalLibros} libro(s)</small></button>`).join('')
      || '<div class="opcion">Sin coincidencias. Registra el autor nuevo.</div>';
    caja.classList.remove('oculto');
    caja.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
      $('#autorId', d).value = b.dataset.id;
      $('#autor-buscar', d).value = b.dataset.nombre;
      caja.classList.add('oculto');
    }));
  });
  $('#autor-buscar', d).addEventListener('input', (e) => {
    $('#autorId', d).value = '';
    buscarAutor(e.target.value.trim());
  });
  $('#nuevo-autor', d).addEventListener('click', () => abrirAutor((a) => {
    $('#autorId', d).value = a.id;
    $('#autor-buscar', d).value = a.nombre;
  }));

  $('#guardar', d).addEventListener('click', async () => {
    const form = $('#form-libro', d);
    if (!form.reportValidity()) return;
    const datos = leerFormulario(form);
    if (!datos.autorId) return aviso('Elige un autor de la lista o registra uno nuevo', 'error');
    datos.palabrasClave = (datos.palabrasClave ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const k of Object.keys(datos)) if (datos[k] === null) delete datos[k];
    try {
      if (libro) {
        delete datos.ejemplaresIniciales;
        delete datos.origen;
        await gql('mutation($id: ID!, $input: LibroInput!) { actualizarLibro(id: $id, input: $input) { id } }', { id: libro.id, input: datos });
        aviso('Libro actualizado', 'ok');
      } else {
        await gql('mutation($input: LibroInput!) { crearLibro(input: $input) { id } }', { input: datos });
        aviso('Libro registrado', 'ok');
      }
      d.close();
      cargar();
      cargarResumen();
    } catch (e) {
      aviso(e.message, 'error');
    }
  });
}

function abrirAutor(alCrear) {
  const d = modal({
    titulo: 'Registrar autor',
    ancho: 560,
    cuerpo: `<form id="form-autor" class="rejilla-form">
      <div class="campo ancho"><label for="a-nombre">Nombre completo</label><input class="input" id="a-nombre" name="nombre" required></div>
      <div class="campo"><label for="a-nac">Nacionalidad</label><input class="input" id="a-nac" name="nacionalidad" required value="Mexicana"></div>
      <div class="campo"><label for="a-nacio">Año de nacimiento</label><input class="input" id="a-nacio" name="anioNacimiento" data-num type="number"></div>
      <div class="campo ancho"><label><input type="checkbox" name="esNayarita"> Autor(a) nayarita (Fondo Nayarita)</label></div>
    </form>`,
    pie: '<button class="btn" data-cerrar>Cancelar</button><button class="btn btn-primario" id="guardar-autor">Registrar</button>',
  });
  $('#guardar-autor', d).addEventListener('click', async () => {
    const form = $('#form-autor', d);
    if (!form.reportValidity()) return;
    const input = leerFormulario(form);
    if (input.anioNacimiento == null) delete input.anioNacimiento;
    try {
      const { crearAutor } = await gql('mutation($input: AutorInput!) { crearAutor(input: $input) { id nombre } }', { input });
      aviso('Autor registrado', 'ok');
      d.close();
      alCrear(crearAutor);
    } catch (e) {
      aviso(e.message, 'error');
    }
  });
}

// ───── Ejemplares físicos ─────
async function abrirEjemplares(id) {
  const { libro } = await gql(`query($id: ID!) { libro(id: $id) { ${CAMPOS} } }`, { id });
  const estados = ['Disponible', 'En reparación', 'Extraviado'];
  const d = modal({
    titulo: `Ejemplares · ${libro.titulo}`,
    ancho: 720,
    cuerpo: `<div class="tabla-caja"><table>
      <thead><tr><th>Código</th><th>Origen</th><th>Adquisición</th><th>Estado</th></tr></thead>
      <tbody>${libro.ejemplares.map((e) => `<tr>
        <td><b>${esc(e.codigo)}</b></td><td>${esc(e.origen)}</td>
        <td>${e.fechaAdquisicion ? new Date(e.fechaAdquisicion).toLocaleDateString('es-MX') : '—'}</td>
        <td>${e.estado === 'Prestado' ? insigniaSituacion('Prestado')
          : `<select class="input" data-codigo="${esc(e.codigo)}" aria-label="Estado de ${esc(e.codigo)}">${opciones(estados, e.estado)}</select>`}</td>
      </tr>`).join('')}</tbody></table></div>
      <div class="params">
        <div class="campo"><label for="cant">Agregar ejemplares</label><input class="input" id="cant" type="number" min="1" max="50" value="1"></div>
        <div class="campo"><label for="orig">Origen</label><select class="input" id="orig"><option>Compra</option><option>Donación</option><option>Dotación DGB</option></select></div>
        <button class="btn btn-azul" id="agregar">Agregar</button>
      </div>`,
  });
  d.querySelectorAll('select[data-codigo]').forEach((s) => s.addEventListener('change', async () => {
    try {
      await gql('mutation($id: ID!, $c: String!, $e: String!) { cambiarEstadoEjemplar(id: $id, codigo: $c, estado: $e) { id } }', { id, c: s.dataset.codigo, e: s.value });
      aviso(`${s.dataset.codigo}: ${s.value}`, 'ok');
      cargar();
      cargarResumen();
    } catch (e) {
      aviso(e.message, 'error');
    }
  }));
  $('#agregar', d).addEventListener('click', async () => {
    try {
      await gql('mutation($id: ID!, $n: Int!, $o: String) { agregarEjemplares(id: $id, cantidad: $n, origen: $o) { id } }', { id, n: Number($('#cant', d).value), o: $('#orig', d).value });
      aviso('Ejemplares agregados', 'ok');
      d.close();
      cargar();
      cargarResumen();
      abrirEjemplares(id);
    } catch (e) {
      aviso(e.message, 'error');
    }
  });
}

async function eliminar(id, titulo) {
  if (!(await confirmar(`¿Dar de baja "${titulo}"? Si tiene historial de préstamos se conserva como inactivo.`, { boton: 'Dar de baja', peligro: true }))) return;
  try {
    await gql('mutation($id: ID!) { eliminarLibro(id: $id) }', { id });
    aviso('Libro dado de baja', 'ok');
    cargar();
    cargarResumen();
  } catch (e) {
    aviso(e.message, 'error');
  }
}

// ───── Eventos ─────
$('#filas').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-accion]');
  if (!b) return;
  const { accion, id, titulo } = b.dataset;
  if (accion === 'editar') abrirFormulario(id).catch((err) => aviso(err.message, 'error'));
  if (accion === 'ejemplares') abrirEjemplares(id).catch((err) => aviso(err.message, 'error'));
  if (accion === 'eliminar') eliminar(id, titulo);
});
$('#nuevo').addEventListener('click', () => abrirFormulario());
$('#buscar').addEventListener('input', retrasar((e) => { estado.texto = e.target.value.trim(); estado.pagina = 1; cargar(); }));
$('#f-categoria').addEventListener('change', (e) => { estado.categoria = e.target.value; estado.pagina = 1; cargar(); });
$('#f-estado').addEventListener('change', (e) => { estado.estado = e.target.value; estado.pagina = 1; cargar(); });

(async () => {
  try {
    catalogos = await gql('{ categorias salas }');
    $('#f-categoria').insertAdjacentHTML('beforeend', opciones(catalogos.categorias));
    await Promise.all([cargarResumen(), cargar()]);
  } catch (e) {
    aviso(e.message, 'error');
  }
})();
