// Quita acentos y pasa a minúsculas para que "Paramo" encuentre "Páramo".
export function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Escapa caracteres especiales antes de armar una expresión regular con texto del usuario.
export function escaparRegex(texto = '') {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
