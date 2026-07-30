import { ASSET_MAP, STAGE_WIDTH, STAGE_HEIGHT } from './assets.js';

const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    el.setAttribute(key, String(value));
  }
  return el;
}

function safeColor(value, fallback) {
  return /^#[0-9a-fA-F]{3,8}$/.test(value || '') ? value : fallback;
}

export function renderScene(svg, scene, options = {}) {
  const { interactive = false, selection = new Set(), showGrid = false } = options;
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  svg.style.background = scene.background || '#f4ead0';

  const defs = svgEl('defs');
  defs.innerHTML = `
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity="0.18"/>
    </filter>
    <pattern id="stage-grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(7,7,10,.09)" stroke-width="2"/>
    </pattern>`;
  svg.appendChild(defs);

  if (showGrid) {
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: 'url(#stage-grid)', 'pointer-events': 'none' }));
  }

  const objects = [...(scene.objects || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const obj of objects) {
    if (obj.visible === false) continue;
    const group = renderObject(obj, interactive);
    if (selection.has(obj.id)) group.classList.add('is-selected');
    svg.appendChild(group);
  }
}

export function renderObject(obj, interactive = false) {
  const g = svgEl('g', {
    class: `stage-object stage-object-${obj.type || 'asset'}`,
    'data-object-id': obj.id,
    transform: objectTransform(obj),
    opacity: obj.opacity ?? 1,
    tabindex: interactive ? '0' : undefined,
    role: interactive ? 'button' : undefined,
    'aria-label': interactive ? obj.name : undefined
  });
  g.style.color = safeColor(obj.color, '#171419');
  g.style.setProperty('--asset-accent', safeColor(obj.accent, '#fbbf24'));
  g.style.setProperty('--asset-danger', safeColor(obj.danger, '#b91c1c'));
  if (obj.locked) g.classList.add('is-locked');

  if (obj.type === 'image') {
    const image = svgEl('image', {
      href: obj.src,
      x: -obj.w / 2,
      y: -obj.h / 2,
      width: obj.w,
      height: obj.h,
      preserveAspectRatio: 'xMidYMid meet'
    });
    g.appendChild(image);
  } else if (obj.type === 'path') {
    const sx = obj.w / (obj.baseW || obj.w || 1);
    const sy = obj.h / (obj.baseH || obj.h || 1);
    const path = svgEl('path', {
      d: obj.path,
      transform: `scale(${sx} ${sy})`,
      fill: obj.fill || 'none',
      stroke: safeColor(obj.stroke, '#171419'),
      'stroke-width': obj.strokeWidth || 9,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke'
    });
    g.appendChild(path);
  } else if (obj.type === 'text') {
    const text = svgEl('text', {
      x: 0,
      y: 0,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: safeColor(obj.color, '#171419'),
      'font-size': (obj.fontSize || 52) * (obj.h / (obj.baseH || obj.h || 1)),
      'font-family': 'Inter, system-ui, sans-serif',
      'font-weight': obj.fontWeight || 700
    });
    text.textContent = obj.text || 'Testo';
    g.appendChild(text);
  } else {
    const asset = ASSET_MAP[obj.assetKey];
    if (asset) {
      const inner = svgEl('g', {
        transform: `translate(${-obj.w / 2} ${-obj.h / 2}) scale(${obj.w / asset.w} ${obj.h / asset.h})`
      });
      inner.innerHTML = asset.svg;
      g.appendChild(inner);
      if (obj.bubbleText) {
        const text = svgEl('text', {
          x: 0,
          y: -obj.h * 0.05,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          fill: safeColor(obj.color, '#171419'),
          'font-size': Math.max(24, Math.min(54, obj.w / 7)),
          'font-family': 'Inter, system-ui, sans-serif',
          'font-weight': 700
        });
        text.textContent = obj.bubbleText;
        g.appendChild(text);
      }
    }
  }
  return g;
}

export function objectTransform(obj) {
  const flipX = obj.flipX ? -1 : 1;
  const flipY = obj.flipY ? -1 : 1;
  return `translate(${obj.x} ${obj.y}) rotate(${obj.rotation || 0}) scale(${flipX} ${flipY})`;
}

export function getObjectBounds(obj) {
  return {
    x: obj.x - obj.w / 2,
    y: obj.y - obj.h / 2,
    width: obj.w,
    height: obj.h,
    cx: obj.x,
    cy: obj.y
  };
}

export function sceneToSvgString(scene) {
  const clone = document.createElementNS(NS, 'svg');
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
  clone.setAttribute('width', String(STAGE_WIDTH));
  clone.setAttribute('height', String(STAGE_HEIGHT));
  renderScene(clone, scene, { interactive: false, showGrid: false });
  const bg = svgEl('rect', { x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, fill: scene.background || '#f4ead0' });
  clone.insertBefore(bg, clone.firstChild?.nextSibling || clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}
