import React from 'react';

/* Brand glyphs (lucide-react no longer ships brand icons) */
function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.87v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.88h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.2l-4.86-6.36L6.6 22H3.5l7.24-8.28L2.4 2h6.36l4.39 5.8L18.9 2Zm-1.09 18.08h1.72L7.3 3.82H5.46l12.35 16.26Z" />
    </svg>
  );
}

const PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    Icon: FacebookIcon,
    card: 'bg-blue-50 border-blue-200 text-blue-900',
    chip: 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100',
    icon: 'text-[#1877F2]'
  },
  {
    key: 'instagram',
    label: 'Instagram',
    Icon: InstagramIcon,
    card: 'bg-pink-50 border-pink-200 text-pink-900',
    chip: 'bg-pink-50 border-pink-200 text-pink-900 hover:bg-pink-100',
    icon: 'text-[#E1306C]'
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    Icon: XIcon,
    card: 'bg-slate-100 border-slate-300 text-slate-900',
    chip: 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200',
    icon: 'text-slate-900'
  }
];

/** Turns any user input (handle, @handle, domain, or full URL) into a link. */
function normalizeSocialUrl(platform, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) return raw;

  let handle = raw.replace(/^@/, '').replace(/^\/+/, '');
  if (!handle) return '';

  if (platform === 'facebook') {
    if (/^(www\.)?facebook\.com\//i.test(handle)) {
      return `https://${handle.replace(/^www\./i, '')}`;
    }
    return `https://facebook.com/${handle}`;
  }

  if (platform === 'instagram') {
    if (/^(www\.)?instagram\.com\//i.test(handle)) {
      return `https://${handle.replace(/^www\./i, '')}`;
    }
    return `https://instagram.com/${handle}`;
  }

  // X / Twitter
  if (/^(www\.)?(twitter|x)\.com\//i.test(handle)) {
    return `https://${handle.replace(/^www\./i, '')}`;
  }
  return `https://x.com/${handle}`;
}

/** Pretty handle for display: "@juandelacruz" */
function socialHandle(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let handle = raw
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^(facebook\.com|instagram\.com|twitter\.com|x\.com)\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '');

  if (!handle) return raw;
  return `@${handle}`;
}

/**
 * Renders a landlord's / user's social profiles as clickable links.
 * Returns nothing when they have not connected any socials yet.
 *
 * variant: 'cards' (default, profile sections) | 'chips' (compact rows)
 */
export default function SocialLinks({
  facebook,
  instagram,
  twitter,
  variant = 'cards',
  className = ''
}) {
  const values = { facebook, instagram, twitter };
  const entries = PLATFORMS
    .map(p => ({ ...p, value: values[p.key] }))
    .filter(p => String(p.value || '').trim());

  if (entries.length === 0) return null;

  if (variant === 'chips') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {entries.map(({ key, label, Icon, chip, icon }) => (
          <a
            key={key}
            href={normalizeSocialUrl(key, values[key])}
            target="_blank"
            rel="noreferrer"
            title={`${label}: ${socialHandle(values[key])}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black transition-colors ${chip}`}
          >
            <Icon className={`w-3.5 h-3.5 ${icon}`} />
            <span className="max-w-[9rem] truncate">{socialHandle(values[key])}</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 ${className}`}>
      {entries.map(({ key, label, Icon, card, icon }) => (
        <a
          key={key}
          href={normalizeSocialUrl(key, values[key])}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all hover:shadow-sm active:scale-[0.99] ${card}`}
        >
          <span className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon className={`w-4 h-4 ${icon}`} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide opacity-70">{label}</p>
            <p className="text-xs font-black truncate">{socialHandle(values[key])}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
