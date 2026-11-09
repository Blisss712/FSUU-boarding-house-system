/*
 * Applies the saved (or OS) theme before the first paint, so the app never
 * flashes light-on-dark while the React bundle loads.
 *
 * This lives in `public/` as a separate file (instead of an inline <script>)
 * because the production Content-Security-Policy is `script-src 'self'` —
 * inline scripts would be blocked, and a hash would have to be rebuilt into
 * vercel.json every time this file changed.
 */
(function () {
  try {
    var stored = window.localStorage.getItem('balay-theme');
    var systemDark = Boolean(
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    var dark = stored === 'dark' || (stored !== 'light' && systemDark);

    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';

    // Tiny marker so the boot path can be asserted (and debugged) in the browser.
    window.__balayThemeBoot = dark ? 'dark' : 'light';
  } catch (error) {
    // localStorage can be blocked in private mode; ThemeContext still applies
    // the OS theme once React mounts.
  }
})();
