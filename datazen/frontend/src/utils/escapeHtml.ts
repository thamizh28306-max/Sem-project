/**
 * Escapes characters in user-controlled or API strings before string interpolation
 * into HTML-sensitive contexts (Leaflet popups, divIcons, SVG tags).
 */
export function escapeHtml(str: string | null | undefined): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
