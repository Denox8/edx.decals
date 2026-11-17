/**
 * Runs before first paint (no flash). Visitor choices: night/light mode and large text (localStorage keys
 * edx-mode / edx-text, same as the web pack's theme.js). The palette is set by the admin on the server.
 * Default mode: night.
 */
const script = `(function(){try{var r=document.documentElement;var m=localStorage.getItem('edx-mode');r.setAttribute('data-theme',m==='light'||m==='dark'?m:'dark');var t=localStorage.getItem('edx-text');r.setAttribute('data-text',t==='large'?'large':'normal');}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
