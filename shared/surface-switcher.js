/**
 * Surface Switcher - Single Source of Truth for Navigation
 * Modes: designer | show | mobile | regie | plateau | camera | auto
 */
export function getSurfaceList() {
  return [
    { id: 'designer', label: '🎨 Designer', url: '/desktop/index.html?surface=designer' },
    { id: 'show', label: '🎬 Show', url: '/show/index.html?surface=show' },
    { id: 'mobile', label: '📱 Mobile', url: '/mobile/index.html?surface=mobile' },
    { id: 'regie', label: '🎛️ Régie', url: '/studio/index.html?surface=regie' },
    { id: 'plateau', label: '🎭 Plateau', url: '/studio/index.html?surface=plateau' },
    { id: 'camera', label: '📷 Caméra', url: '/companion/index.html?surface=camera' },
    { id: 'auto', label: '🔄 Auto', url: '/index.html?surface=auto' }
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
    container.style.cssText = 'position:fixed; bottom:12px; right:12px; z-index:999999; display:flex; gap:6px; background:#0f172a; padding:6px 10px; border-radius:20px; border:1px solid #1e293b; box-shadow:0 4px 12px rgba(0,0,0,0.5); align-items:center;';
    document.body.appendChild(container);
  }

  const current = getCurrentSurface();
  const surfaces = getSurfaceList();

  const select = document.createElement('select');
  select.style.cssText = 'background:#1e293b; color:#00e5ff; border:1px solid #334155; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:12px; cursor:pointer; outline:none;';

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

  container.innerHTML = '<span style="font-size:11px; color:#64748b; font-weight:bold; margin-right:4px;">SURFACE:</span>';
  container.appendChild(select);
}
