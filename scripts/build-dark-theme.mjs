#!/usr/bin/env node
/**
 * Generates `src/styles/dark-theme.css` — the palette map that turns the
 * light-themed UI dark.
 *
 * The app was built with a single (light) set of Tailwind classes, spread over
 * ~50 components. Instead of hand-writing a `dark:` twin for every one of the
 * thousands of colour utilities, this script reads the CSS Tailwind actually
 * emitted for the last `vite build` and re-maps each colour declaration onto a
 * dark equivalent:
 *
 *   .bg-white        { background-color: var(--color-white) }
 *   .text-slate-500  { color: var(--color-slate-500) }
 *
 * becomes
 *
 *   html.dark .bg-white       { background-color: #141d31 }
 *   html.dark .text-slate-500 { color: #a6b5cb }
 *
 * The generated rules are unlayered, so they win over Tailwind's
 * `@layer utilities` declarations regardless of specificity. Variants
 * (`hover:`, `md:`, `group-hover:`, `::placeholder`, `@supports` …) are copied
 * verbatim, which is why generating from the built CSS is safer than trying to
 * reconstruct them from source.
 *
 * Usage:  npm run theme:sync        (build → regenerate → rebuild)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'dist', 'assets');
const OUT = path.join(ROOT, 'src', 'styles', 'dark-theme.css');

/* ─── Palette ─────────────────────────────────────────────────────────────── */

const NEUTRALS = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const HUES = new Set([
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
]);

// Surfaces (bg-*): page insets stay deep, cards sit at #141d31.
const SURFACE = {
  50: '#0e1729', 100: '#16223a', 200: '#1f2f4b', 300: '#2a3d5f', 400: '#35496e',
  500: '#3f5476', 600: '#4a5f84', 700: '#566b92', 800: '#0a1424', 900: '#0a1220',
  950: '#070e1a',
};

// Inks (text-*): the light ramp mirrored so muted greys stay readable on dark.
const INK = {
  50: '#f8fbff', 100: '#eff4fb', 200: '#e3eaf4', 300: '#cbd6e6', 400: '#8496b1',
  500: '#a6b5cb', 600: '#c2cedf', 700: '#d5deeb', 800: '#e4ebf5', 900: '#eff4fb',
  950: '#f7faff',
};

// Hairlines / rings (border-*, ring-*).
const EDGE = {
  50: '#182338', 100: '#1e2b42', 200: '#26344e', 300: '#31415e', 400: '#3d4f70',
  500: '#4a5d80', 600: '#576b8f', 700: '#3d4f70', 800: '#33425e', 900: '#2a3750',
  950: '#222d43',
};

const WHITE_SURFACE = '#141d31'; // solid bg-white / from-white panels
const WHITE_EDGE = '#26334d';    // solid border-white / ring-white
const DARK_INK = '#f4f8ff';      // solid text-black

// Accent shades: tints drop to the opposite end of the ramp, mid-tones (the
// button/star/glow shades) are already right for a dark canvas and stay put.
const HUE_SURFACE = { 50: 950, 100: 900, 200: 800, 300: 700 };
const HUE_EDGE = { 50: 900, 100: 900, 200: 800, 300: 700 };
const HUE_TEXT = { 600: 400, 700: 300, 800: 200, 900: 100, 950: 100 };

/* ─── Colour maths ────────────────────────────────────────────────────────── */

function parseHex(value) {
  let hex = value.replace('#', '');
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.split('').map((ch) => ch + ch).join('');
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h, s, l, a = 1) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const to255 = (v) => Math.round(Math.min(255, Math.max(0, v * 255)));
  let r; let g; let b;
  if (s === 0) {
    r = l; g = l; b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const alpha = a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '';
  return `#${[r, g, b].map((v) => to255(v).toString(16).padStart(2, '0')).join('')}${alpha}`;
}

function withAlpha(hex, alpha) {
  if (alpha >= 1) return hex;
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

/* ─── Mapping ─────────────────────────────────────────────────────────────── */

const VAR_RE = /^var\((--color-([a-z]+)(?:-(\d{2,3}))?)\)$/;
const MIX_RE = /^color-mix\(in oklab, (.+?) (\d+)%, transparent\)$/;
const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const OKLAB_RE = /^oklab\(\s*([\d.]+)(%?)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/i;

/** Tailwind writes `<arbitrary>/<opacity>` as an oklab() literal — bring it back to hex. */
function oklabToHex(match) {
  const [, lText, lPercent, aText, bText, alphaText, alphaPercent] = match;
  const L = lPercent ? Number(lText) / 100 : Number(lText);
  const a = Number(aText);
  const b = Number(bText);
  const alpha = alphaText
    ? alphaPercent ? Number(alphaText) / 100 : Number(alphaText)
    : 1;

  const l3 = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];

  const gamma = (value) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  const hex = linear
    .map((channel) => Math.round(gamma(channel) * 255).toString(16).padStart(2, '0'))
    .join('');

  return `#${hex}${alpha < 1 ? Math.round(alpha * 255).toString(16).padStart(2, '0') : ''}`;
}

/**
 * `role` is one of bg | text | border | ring | grad | fill.
 * `pct` is the opacity modifier of the utility (bg-white/10 → 10).
 *
 * Returns a replacement CSS colour, `undefined` when the light value already
 * works on a dark canvas, or `null` when the token is unknown.
 */
function mapToken(name, role, pct) {
  if (name === 'white') {
    if (role === 'text' || role === 'fill') return undefined; // white ink stays white
    if (role === 'border' || role === 'ring') return pct == null ? WHITE_EDGE : undefined;
    // Translucent white on a dark panel is a highlight (bg-white/10) — keep it.
    if (pct != null && pct < 50) return undefined;
    return WHITE_SURFACE;
  }

  if (name === 'black') {
    if (role === 'text' || role === 'fill') return DARK_INK;
    if (role === 'border' || role === 'ring') return pct == null ? WHITE_EDGE : undefined;
    return undefined; // scrims over photos stay black
  }

  const match = name.match(/^([a-z]+)-(\d{2,3})$/);
  if (!match) return null;
  const [, hue, shadeText] = match;
  const shade = Number(shadeText);

  if (NEUTRALS.has(hue)) {
    const table = role === 'bg' || role === 'grad' ? SURFACE
      : role === 'text' || role === 'fill' ? INK
      : EDGE;
    return table[shade] || null;
  }

  if (!HUES.has(hue)) return null;

  let next = shade;
  if (role === 'text' || role === 'fill') next = HUE_TEXT[shade] ?? shade;
  else if (role === 'bg' || role === 'grad') next = HUE_SURFACE[shade] ?? shade;
  else next = HUE_EDGE[shade] ?? shade;

  return next === shade ? undefined : `var(--color-${hue}-${next})`;
}

/**
 * Arbitrary values (`bg-[#0b1a30]`, `text-[#854d0e]`) are literal, so the
 * replacement is derived from the colour's lightness and the property it feeds.
 * Tailwind also writes translucent utilities as an 8-digit hex fallback before
 * the `color-mix()` version, so pure white/black are routed through mapToken to
 * stay consistent with the non-arbitrary classes.
 */
function mapLiteral(hex, role) {
  const { r, g, b, a } = parseHex(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  if (a === 0) return undefined; // fully transparent (e.g. text-transparent)
  const pct = a < 1 ? Math.round(a * 100) : undefined;

  if (s < 0.05 && l > 0.97) {
    const white = mapToken('white', role, pct);
    if (white == null) return white;
    return a < 1 ? withAlpha(white, a) : white;
  }

  if (s < 0.05 && l < 0.03) {
    const black = mapToken('black', role, pct);
    if (black == null) return black;
    return a < 1 ? withAlpha(black, a) : black;
  }

  if (role === 'text' || role === 'fill') {
    if (l >= 0.5) return undefined; // already light enough for a dark canvas
    return hslToHex(h, Math.min(s, 0.55), 0.8, a);
  }

  if (l >= 0.72) {
    // Light wash (#fef3c7, #eff6ff, #eef2f6 …) → dark tinted surface.
    if (s < 0.12) return withAlpha(WHITE_SURFACE, a);
    return hslToHex(h, Math.min(s, 0.4), 0.09 + (1 - l) * 0.18, a);
  }

  if (l < 0.3) {
    // Brand navy panels/buttons: lift them off the page so they still read.
    return hslToHex(h, Math.min(s, 0.55), Math.min(0.34, l + 0.1), a);
  }

  return undefined; // saturated mid-tone brand colour (e.g. Facebook blue)
}

function mapValue(value, role) {
  const raw = value.trim();

  const variable = raw.match(VAR_RE);
  if (variable) {
    const name = variable[3] ? `${variable[2]}-${variable[3]}` : variable[2];
    return mapToken(name, role, undefined);
  }

  const mix = raw.match(MIX_RE);
  if (mix) {
    const inner = mix[1].trim();
    const pct = Number(mix[2]);
    let base;
    const innerVar = inner.match(VAR_RE);
    if (innerVar) {
      base = mapToken(innerVar[3] ? `${innerVar[2]}-${innerVar[3]}` : innerVar[2], role, pct);
    } else if (HEX_RE.test(inner)) {
      base = mapLiteral(inner, role);
    }
    if (base === undefined) return undefined;
    if (base === null) return null;
    return `color-mix(in oklab, ${base} ${pct}%, transparent)`;
  }

  if (HEX_RE.test(raw)) return mapLiteral(raw, role);

  const oklab = raw.match(OKLAB_RE);
  if (oklab) return mapLiteral(oklabToHex(oklab), role);

  return null;
}

/* ─── Which declarations matter ───────────────────────────────────────────── */

const ROLE_BY_PROP = {
  'background-color': 'bg',
  color: 'text',
  'border-color': 'border',
  'border-top-color': 'border',
  'border-right-color': 'border',
  'border-bottom-color': 'border',
  'border-left-color': 'border',
  'outline-color': 'border',
  'text-decoration-color': 'text',
  '--tw-ring-color': 'ring',
  '--tw-gradient-from': 'grad',
  '--tw-gradient-to': 'grad',
  '--tw-gradient-via': 'grad',
  fill: 'fill',
  stroke: 'fill',
  'accent-color': 'fill',
  'caret-color': 'text',
};

const COLOR_UTILITY_RE = /^(?:[a-z0-9-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|outline|decoration|accent|caret)-/;

const UNESCAPE_RE = /\\(.)/g;
const CLASS_TOKEN_RE = /\.((?:\\.|[A-Za-z0-9_-])+)/g;

function unescapeCss(value) {
  return value.replace(UNESCAPE_RE, '$1');
}

function lastClassToken(selector) {
  let last = null;
  CLASS_TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = CLASS_TOKEN_RE.exec(selector)) !== null) last = match[1];
  return last;
}

function splitTopLevel(selector, separator) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

const PSEUDO_WRAP_RE = /^:(where|is)\(([\s\S]*)\)$/;

/** Prefix with `html.dark`, but only for rules that target a colour utility. */
function prefixSelector(selector) {
  const prefixed = [];
  for (const part of splitTopLevel(selector, ',')) {
    const trimmed = part.trim();
    if (trimmed.includes('html.dark')) return null;

    // Tailwind wraps some utilities in :where()/:is(); prefix outside so the
    // override keeps a specificity bump instead of being fully zeroed out.
    const wrapped = trimmed.match(PSEUDO_WRAP_RE);
    const inner = wrapped ? wrapped[2].trim() : trimmed;
    if (!inner.startsWith('.')) return null;

    const token = lastClassToken(inner);
    if (!token || !COLOR_UTILITY_RE.test(unescapeCss(token))) return null;
    prefixed.push(`html.dark ${trimmed}`);
  }
  return prefixed.join(', ');
}

/** At-rules that must wrap the override (skipping `@layer`, which we escape). */
function atRuleContext(rule) {
  const context = [];
  let node = rule.parent;
  while (node && node.type === 'atrule') {
    if (node.name !== 'layer' && node.name !== 'tailwind' && node.name !== 'apply') {
      context.unshift(`@${node.name} ${node.params}`.trim());
    }
    node = node.parent;
  }
  return context;
}

/* ─── Build ───────────────────────────────────────────────────────────────── */

function findBuiltCss() {
  if (!fs.existsSync(ASSETS)) {
    throw new Error(`No build found in ${ASSETS}. Run \`npm run build\` first.`);
  }
  const files = fs.readdirSync(ASSETS).filter((file) => /^index-.*\.css$/.test(file));
  if (!files.length) {
    throw new Error(`No index-*.css in ${ASSETS}. Run \`npm run build\` first.`);
  }
  return files
    .map((file) => path.join(ASSETS, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

async function main() {
  const source = findBuiltCss();
  const css = fs.readFileSync(source, 'utf8');
  const root = postcss.parse(css, { from: source });

  // context + selector → ordered declarations (insertion order is source order)
  const groups = new Map();
  const skipped = new Map();
  let mapped = 0;

  root.walkDecls((decl) => {
    const role = ROLE_BY_PROP[decl.prop];
    if (!role) return;
    const rule = decl.parent;
    if (!rule || rule.type !== 'rule') return;

    const selector = prefixSelector(rule.selector || '');
    if (!selector) return;

    const replacement = mapValue(decl.value, role);
    if (replacement === undefined) return; // light value already works on dark
    if (replacement === null) {
      const value = decl.value.trim();
      if (value !== 'transparent' && value !== 'currentColor' && value !== 'inherit') {
        skipped.set(value, (skipped.get(value) || 0) + 1);
      }
      return;
    }

    const context = atRuleContext(rule);
    const key = `${context.join('\n')}|${selector}`;
    let group = groups.get(key);
    if (!group) {
      group = { context, selector, declarations: [] };
      groups.set(key, group);
    }
    const existing = group.declarations.find((d) => d.prop === decl.prop);
    if (existing) existing.value = replacement;
    else group.declarations.push({ prop: decl.prop, value: replacement });
    mapped += 1;
  });

  // Plain rules first, then every variant (@media/@supports) block: a variant
  // override must land after the base rule it refines.
  const plainSections = [];
  const wrappers = new Map();

  for (const { context, selector, declarations } of groups.values()) {
    const body = declarations.map(({ prop, value }) => `  ${prop}: ${value};`).join('\n');
    const rule = `${selector} {\n${body}\n}`;

    if (!context.length) {
      plainSections.push(rule);
      continue;
    }

    const chainKey = context.join('|');
    let wrapper = wrappers.get(chainKey);
    if (!wrapper) {
      wrapper = { context, rules: [] };
      wrappers.set(chainKey, wrapper);
    }
    wrapper.rules.push(rule);
  }

  const sections = [...plainSections];
  for (const { context, rules } of wrappers.values()) {
    const inner = rules
      .map((rule) => rule.split('\n').map((line) => `  ${line}`).join('\n'))
      .join('\n\n');
    sections.push(context.reduceRight((body, at) => `${at} {\n${body}\n}`, inner));
  }

  const header = `/*
 * Dark-mode palette overrides — GENERATED, DO NOT EDIT BY HAND.
 *
 * Source: ${path.relative(ROOT, source).replace(/\\/g, '/')}
 * Rebuild: npm run theme:sync   (build → regenerate → rebuild)
 *
 * Each rule re-maps a utility class used by the components onto the dark
 * palette. They are intentionally unlayered so they win over Tailwind's
 * utilities layer without needing !important.
 */

`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header + sections.join('\n\n') + '\n', 'utf8');

  const ruleCount = [...groups.values()].length;
  if (!ruleCount) throw new Error('No colour utilities matched — refusing to write an empty theme.');

  console.log(`dark-theme.css ← ${path.relative(ROOT, source).replace(/\\/g, '/')}`);
  console.log(`  ${ruleCount} rules, ${mapped} colour declarations mapped`);
  if (skipped.size) {
    const top = [...skipped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([value, count]) => `${value} ×${count}`)
      .join(', ');
    console.log(`  ${skipped.size} colour values left unmapped: ${top}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
