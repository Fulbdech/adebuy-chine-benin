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
// Replace this with the "pub?output=csv" link from your published Google Sheet.
const TRACKING_SHEET_CSV_URL = 'REPLACE_WITH_YOUR_SHEET_CSV_URL';

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
  const doneCount = steps.filter(s => row[s.key] && row[s.key].trim() !== '').length;
  const progressPct = doneCount === 0 ? 0 : ((doneCount - 1) / (steps.length - 1)) * 100;

  let html = '<div class="track-result">';
  html += '<div class="rp-name">' + (row.Produit || 'Votre colis') + '</div>';
  html += '<div class="rp-num">N° ' + row.Numero + ' · Statut : ' + (row.Statut || '—') + '</div>';
  html += '<div class="track-timeline"><div class="tt-progress" style="width:' + progressPct + '%"></div>';
  steps.forEach((s, i) => {
    const isDone = row[s.key] && row[s.key].trim() !== '';
    html += '<div class="tt-step ' + (isDone ? 'done' : '') + '">';
    html += '<div class="c">' + (isDone
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="4 12 10 18 20 6"/></svg>'
      : (i+1)) + '</div>';
    html += '<span>' + s.label + '</span>';
    if (isDone) html += '<div class="dte">' + row[s.key] + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  box.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', initTrackingForm);
