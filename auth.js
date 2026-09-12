// ---------- Comptes clients (Firebase Auth + Firestore) ----------
// Requires firebase-app-compat.js, firebase-auth-compat.js and
// firebase-firestore-compat.js to be loaded before this file (see compte.html).
// Also requires script.js to be loaded first (for parseCSV / TRACKING_SHEET_CSV_URL).

const AUTH_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAbXBgFYSxpJ7Rg9AwapH2UQ4nBpuWuTmk",
  authDomain: "abebuy-179ec.firebaseapp.com",
  projectId: "abebuy-179ec",
  storageBucket: "abebuy-179ec.firebasestorage.app",
  messagingSenderId: "739115474396",
  appId: "1:739115474396:web:42bc0bbbd9437fc7fe0319"
};

if (!firebase.apps.length) {
  firebase.initializeApp(AUTH_FIREBASE_CONFIG);
}
const auth = firebase.auth();
const db = firebase.firestore();

function showAuthError(msg){
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearAuthError(){
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': "Un compte existe déjà avec cet email.",
  'auth/invalid-email': "Adresse email invalide.",
  'auth/weak-password': "Le mot de passe doit contenir au moins 6 caractères.",
  'auth/user-not-found': "Aucun compte ne correspond à cet email.",
  'auth/wrong-password': "Mot de passe incorrect.",
  'auth/invalid-credential': "Email ou mot de passe incorrect.",
  'auth/too-many-requests': "Trop de tentatives. Réessayez dans quelques minutes."
};

function withLoadingState(btn, loadingText, fn){
  if (!btn) { fn(); return; }
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText;
  Promise.resolve(fn()).finally(() => {
    btn.disabled = false;
    btn.textContent = original;
  });
}

function signup(email, password){
  clearAuthError();
  return auth.createUserWithEmailAndPassword(email, password)
    .catch((err) => showAuthError(AUTH_ERROR_MESSAGES[err.code] || err.message));
}

function login(email, password){
  clearAuthError();
  return auth.signInWithEmailAndPassword(email, password)
    .catch((err) => showAuthError(AUTH_ERROR_MESSAGES[err.code] || err.message));
}

function logout(){
  return auth.signOut();
}

function addPackageToAccount(numero){
  const user = auth.currentUser;
  if (!user || !numero) return Promise.resolve();
  return db.collection('users').doc(user.uid).collection('packages').add({
    numero: numero.trim(),
    addedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('add-package-input').value = '';
    loadUserPackages(user.uid);
  }).catch((err) => console.error('Erreur ajout colis :', err));
}

function removePackage(docId, uid){
  db.collection('users').doc(uid).collection('packages').doc(docId).delete()
    .then(() => loadUserPackages(uid))
    .catch((err) => console.error('Erreur suppression :', err));
}

function loadUserPackages(uid){
  const list = document.getElementById('user-packages-list');
  if (!list) return;
  list.innerHTML = '<div class="track-msg">Chargement…</div>';

  db.collection('users').doc(uid).collection('packages').orderBy('addedAt', 'desc').get()
    .then((snapshot) => {
      if (snapshot.empty) {
        list.innerHTML = '<div class="track-msg">Aucun colis rattaché à votre compte pour l\'instant.</div>';
        return;
      }
      const numeros = [];
      const docsByNumero = {};
      snapshot.forEach((doc) => {
        const n = doc.data().numero;
        numeros.push(n);
        docsByNumero[n] = doc.id;
      });

      if (typeof TRACKING_SHEET_CSV_URL === 'undefined' || TRACKING_SHEET_CSV_URL.indexOf('REPLACE_WITH') === 0) {
        list.innerHTML = '<div class="track-msg error">Le suivi n\'est pas encore connecté.</div>';
        return;
      }

      fetch(TRACKING_SHEET_CSV_URL)
        .then((res) => res.text())
        .then((text) => {
          const rows = parseCSV(text);
          list.innerHTML = '';
          numeros.forEach((numero) => {
            const match = rows.find((r) => (r.Numero || '').toLowerCase() === numero.toLowerCase());
            const card = document.createElement('div');
            card.className = 'user-package-card';
            if (!match) {
              card.innerHTML = '<div class="rp-num">N° ' + numero + '</div><div class="track-msg error" style="padding:8px 0;">Aucune donnée trouvée pour ce numéro pour l\'instant.</div>';
            } else {
              const wrapper = document.createElement('div');
              renderTracking(match, wrapper);
              card.appendChild(wrapper);
            }
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-package-btn';
            removeBtn.textContent = 'Retirer ce colis';
            removeBtn.onclick = () => removePackage(docsByNumero[numero], uid);
            card.appendChild(removeBtn);
            list.appendChild(card);
          });
        });
    })
    .catch((err) => {
      list.innerHTML = '<div class="track-msg error">Impossible de charger vos colis pour le moment.</div>';
      console.error(err);
    });
}

// ---------- Wire up the UI ----------
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const addPackageForm = document.getElementById('add-package-form');
  const logoutBtn = document.getElementById('logout-btn');
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');

  if (loginForm) loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    withLoadingState(btn, 'Connexion…', () =>
      login(document.getElementById('login-email').value.trim(), document.getElementById('login-password').value)
    );
  });

  if (signupForm) signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = signupForm.querySelector('button[type="submit"]');
    withLoadingState(btn, 'Création…', () =>
      signup(document.getElementById('signup-email').value.trim(), document.getElementById('signup-password').value)
    );
  });

  if (addPackageForm) addPackageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = addPackageForm.querySelector('button[type="submit"]');
    withLoadingState(btn, '...', () =>
      addPackageToAccount(document.getElementById('add-package-input').value)
    );
  });

  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    withLoadingState(logoutBtn, 'Déconnexion…', logout);
  });

  if (showSignup) showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    clearAuthError();
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('signup-panel').style.display = 'block';
  });
  if (showLogin) showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    clearAuthError();
    document.getElementById('signup-panel').style.display = 'none';
    document.getElementById('login-panel').style.display = 'block';
  });

  auth.onAuthStateChanged((user) => {
    const authSection = document.getElementById('auth-forms');
    const dashSection = document.getElementById('account-dashboard');
    if (user) {
      if (authSection) authSection.style.display = 'none';
      if (dashSection) dashSection.style.display = 'block';
      const emailEl = document.getElementById('account-email');
      if (emailEl) emailEl.textContent = user.email;
      loadUserPackages(user.uid);
    } else {
      if (authSection) authSection.style.display = 'block';
      if (dashSection) dashSection.style.display = 'none';
    }
  });
});
