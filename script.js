// ---------- Mobile nav toggle ----------
function toggleNav(){
  const nav = document.getElementById('nav-links');
  if (nav) nav.classList.toggle('open');
}

// Close the mobile menu whenever a link inside it is clicked — including the
// current page's own link, which doesn't trigger navigation and would
// otherwise leave the menu stuck open.
document.addEventListener('DOMContentLoaded', function(){
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  nav.querySelectorAll('a').forEach(function(link){
    link.addEventListener('click', function(){
      nav.classList.remove('open');
    });
  });
});

// ---------- Order form (used on contact.html) ----------
function sendOrder(e){
  e.preventDefault();
  const name = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const profile = document.getElementById('order-profile').value;
  const product = document.getElementById('order-product').value.trim();
  const qty = document.getElementById('order-qty').value.trim();
  const transport = document.getElementById('order-transport').value;
  const note = document.getElementById('order-note').value.trim();

  let msg = 'Bonjour, je veux décrire un besoin pour une commande Adebuy.';
  msg += '\nProfil : ' + profile + '.';
  if (product) msg += '\nProduit recherché : ' + product + '.';
  if (qty) msg += '\nQuantité : ' + qty + '.';
  msg += '\nTransport préféré : ' + transport + '.';
  if (name) msg += '\nNom : ' + name + '.';
  if (phone) msg += '\nNuméro : ' + phone + '.';
  if (note) msg += '\n' + note;

  const url = 'https://wa.me/2290194935586?text=' + encodeURIComponent(msg);
  if (window.fbq) { fbq('track', 'Contact'); }
  window.open(url, '_blank', 'noopener');
}

// ---------- PDF download via Blob (bypasses data: URI navigation blocks) ----------
function downloadPdf(el, filename){
  fetch(el.href)
    .then(function(res){ return res.blob(); })
    .then(function(blob){
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 30000);
    })
    .catch(function(){
      window.location.href = el.href;
    });
  return false;
}

// ---------- Tracking lookup (used on suivi.html) ----------
const TRACKING_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRebDwwx8z8IjuEa1Hu8DYr2oNA__1K4RU0D0RtXtXQeEFvYi_2dIBE1fH3fkrwXggJkrGf4sGpcjxF/pub?gid=0&single=true&output=csv';

function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    // simple CSV split (assumes no commas inside quoted fields with commas)
    const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

function initTrackingForm(){
  const form = document.getElementById('track-form');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const input = document.getElementById('track-input').value.trim();
    const resultBox = document.getElementById('track-result');
    if (!input) return;

    resultBox.innerHTML = '<div class="track-msg">Recherche en cours…</div>';

    if (TRACKING_SHEET_CSV_URL.indexOf('REPLACE_WITH') === 0) {
      resultBox.innerHTML = '<div class="track-msg error">Le suivi n\'est pas encore connecté — contactez-nous directement sur WhatsApp pour l\'état de votre colis.</div>';
      return;
    }

    fetch(TRACKING_SHEET_CSV_URL)
      .then(res => res.text())
      .then(text => {
        const rows = parseCSV(text);
        const match = rows.find(r => (r.Numero || '').toLowerCase() === input.toLowerCase());
        if (!match) {
          resultBox.innerHTML = '<div class="track-msg error">Aucun colis trouvé avec ce numéro. Vérifiez la saisie ou contactez-nous sur WhatsApp.</div>';
          return;
        }
        renderTracking(match, resultBox);
      })
      .catch(() => {
        resultBox.innerHTML = '<div class="track-msg error">Impossible de récupérer les données pour le moment. Réessayez dans un instant.</div>';
      });
  });
}

function renderTracking(row, box){
  const steps = [
    {key:'DateRecu', label:'Reçu (Chine)'},
    {key:'DateExpedie', label:'Expédié'},
    {key:'DateArrive', label:'Arrivé (Bénin)'},
    {key:'DateDisponible', label:'Disponible'}
  ];

  function cellState(raw){
    const v = (raw || '').trim();
    if (!v) return {state:'empty', text:''};
    if (/^estm\.?/i.test(v)) return {state:'estimated', text:v.replace(/^estm\.?\s*/i, 'Est. ')};
    return {state:'done', text:v};
  }

  const parsed = steps.map(s => ({...s, ...cellState(row[s.key])}));
  const doneCount = parsed.filter(s => s.state === 'done').length;
  const progressPct = doneCount === 0 ? 0 : ((doneCount - 1) / (steps.length - 1)) * 100;

  let html = '<div class="track-result">';
  html += '<div class="rp-name">' + (row.Produit || 'Votre colis') + '</div>';
  html += '<div class="rp-num">N° ' + row.Numero + ' · Statut : ' + (row.Statut || '—') + '</div>';
  html += '<div class="track-timeline"><div class="tt-progress" style="width:' + progressPct + '%"></div>';
  parsed.forEach((s) => {
    html += '<div class="tt-step ' + (s.state === 'done' ? 'done' : '') + (s.state === 'estimated' ? ' estimated' : '') + '">';
    if (s.state === 'done') {
      html += '<div class="c"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="4 12 10 18 20 6"/></svg></div>';
    } else if (s.state === 'estimated') {
      html += '<div class="c"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>';
    } else {
      html += '<div class="c"></div>';
    }
    html += '<span>' + s.label + '</span>';
    if (s.text) html += '<div class="dte">' + s.text + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  box.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', initTrackingForm);

// ---------- Install banner: works from the very first visit, no need to wait for Chrome's automatic prompt ----------
function initInstallBanner(){
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return; // already installed, nothing to show
  if (localStorage.getItem('adebuy_install_banner_dismissed') === '1') return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.innerHTML = `
    <div class="install-banner-inner">
      <div class="install-banner-icon">📲</div>
      <div class="install-banner-text">
        <b>Installez Adebuy</b>
        <span>Accès plus rapide, comme une vraie appli.</span>
      </div>
      <button class="install-banner-btn" id="install-banner-btn">Installer</button>
      <button class="install-banner-close" id="install-banner-close" aria-label="Fermer">&times;</button>
    </div>
    <div class="install-banner-manual" id="install-banner-manual" style="display:none;">
      Utilisez le menu <b>⋮</b> de votre navigateur → <b>« Installer l'application »</b> (ou « Ajouter à l'écran d'accueil » sur iPhone via le bouton Partager).
    </div>
  `;
  document.body.appendChild(banner);

  // Reserve space at the bottom of the page equal to the banner's height,
  // so fixed positioning never overlaps and blocks taps on real content
  // underneath (this was causing inputs/buttons near the bottom of the
  // screen to be untappable).
  function reserveSpace(){
    document.body.style.paddingBottom = banner.offsetHeight + 16 + 'px';
  }
  reserveSpace();
  window.addEventListener('resize', reserveSpace);

  document.getElementById('install-banner-close').addEventListener('click', () => {
    localStorage.setItem('adebuy_install_banner_dismissed', '1');
    banner.remove();
    document.body.style.paddingBottom = '';
    window.removeEventListener('resize', reserveSpace);
  });

  document.getElementById('install-banner-btn').addEventListener('click', () => {
    if (deferredInstallPrompt) {
      installApp();
    } else {
      document.getElementById('install-banner-manual').style.display = 'block';
      reserveSpace();
    }
  });

  window.addEventListener('appinstalled', () => {
    banner.remove();
    document.body.style.paddingBottom = '';
    window.removeEventListener('resize', reserveSpace);
  });
}
document.addEventListener('DOMContentLoaded', initInstallBanner);

// ---------- PWA: service worker registration + auto-update ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // When a new service worker takes over, reload once to pick up fresh content.
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    }).catch((err) => console.warn('Service worker registration failed:', err));
  });
}

// ---------- PWA: custom "Install app" button (Android/desktop Chrome) ----------
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('install-app-btn');
  if (btn) btn.style.display = 'inline-flex';
});

function installApp(){
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
    const btn = document.getElementById('install-app-btn');
    if (btn) btn.style.display = 'none';
  });
}
