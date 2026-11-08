// Small decorative marks share one centred view box instead of font metrics.
export function windowControlIcon(name) {
  const paths={
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    minimize:'<path d="M5 12h14"/>',
    maximize:'<rect x="5" y="5" width="14" height="14" rx="1"/>',
    restore:'<path d="M9 5h10v10M5 9h10v10H5Z"/>',
  };
  return `<svg class="it-window-control-icon" viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||''}</svg>`;
}
