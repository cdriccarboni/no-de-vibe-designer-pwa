/**
 * Surface Switcher - Single Source of Truth for Navigation
 * Modes: designer | show | mobile | regie | plateau | camera | auto
 */
export function getSurfaceList() {
  return [
    { id: 'designer', label: 'Designer', url: '/desktop/index.html?surface=designer' },
    { id: 'show', label: 'Show', url: '/show/index.html?surface=show' },
    { id: 'mobile', label: 'Mobile', url: '/mobile/index.html?surface=mobile' },
    { id: 'regie', label: 'Régie', url: '/studio/index.html?surface=regie' },
    { id: 'plateau', label: 'Plateau', url: '/studio/index.html?surface=plateau' },
    { id: 'camera', label: 'Caméra', url: '/companion/index.html?surface=camera' },
    { id: 'auto', label: 'Auto', url: '/index.html?surface=auto' }
  ];
}

export function getCurrentSurface() {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get('surface');
  if (explicit) return explicit;

  const path = window.location.pathname;
  if (path.includes('/show/')) return 'show';
  if (path.includes('/mobile/')) return 'mobile';
  if (path.includes('/companion/')) return 'camera';
  if (path.includes('/studio/')) return 'regie';
  if (path.includes('/desktop/')) return 'designer';
  return 'auto';
}

export function installSurfaceSwitcher(containerId = 'surface-switcher-root') {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = 'position:fixed; bottom:130px; right:12px; z-index:90; display:flex; gap:6px; background:#171a1e; padding:4px 7px; border-radius:7px; border:1px solid #2d333b; box-shadow:0 8px 24px rgba(0,0,0,0.35); align-items:center;';
    document.body.appendChild(container);
  }

  const current = getCurrentSurface();
  const surfaces = getSurfaceList();

  const select = document.createElement('select');
  select.style.cssText = 'background:#1d2126; color:#f1f3f5; border:1px solid #2d333b; padding:4px 8px; border-radius:5px; font-weight:600; font-size:10px; cursor:pointer; outline:none;';

  surfaces.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = (s.id === current ? '● ' : '') + s.label;
    if (s.id === current) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    const target = surfaces.find(s => s.id === e.target.value);
    if (target) {
      const isFile = window.location.protocol === 'file:';
      if (isFile) {
        const basePath = window.location.href.split('#')[0].split('?')[0];
        const dir = basePath.substring(0, basePath.lastIndexOf('/'));
        const rootDir = dir.substring(0, dir.lastIndexOf('/'));
        window.location.href = rootDir + target.url;
      } else {
        window.location.href = target.url;
      }
    }
  });

  container.innerHTML = '<span style="font-size:9px; color:#9ba4ae; font-weight:650; letter-spacing:.08em; margin-right:3px;">SURFACE</span>';
  container.appendChild(select);
}
