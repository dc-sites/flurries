// Firebase Configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Cinematic Blizzard Snowfall
function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.innerHTML = '';
    snowflake.style.left = Math.random() * 100 + 'vw';
    snowflake.style.animationDuration = Math.random() * 4 + 3 + 's';
    snowflake.style.opacity = Math.random() * 0.7 + 0.3;
    snowflake.style.fontSize = Math.random() * 14 + 10 + 'px';
    
    document.body.appendChild(snowflake);
    setTimeout(() => snowflake.remove(), 7000);
}
setInterval(createSnowflake, 150);

// Mobile Menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const spans = hamburger.querySelectorAll('span');
        if (navLinks.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
}

// Scroll Reveal Animation (Alokawarsha Style)
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        if (elementTop < windowHeight - 100) {
            el.classList.add('active');
        }
    });
}
window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

// Generate 8-character ID
function generatePassId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'FL26';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// Generate QR Code
function generateQRCode(data, elementId) {
    document.getElementById(elementId).innerHTML = '';
    new QRCode(document.getElementById(elementId), {
        text: data, width: 140, height: 140,
        colorDark: "#1B3A5C", colorLight: "#D6EEF8",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Download Pass
async function downloadPass() {
    const passElement = document.getElementById('passTemplate');
    const btn = document.getElementById('downloadBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Forging...';
    
    try {
        const canvas = await html2canvas(passElement, { scale: 2, backgroundColor: '#1B3A5C', useCORS: true });
        const link = document.createElement('a');
        link.download = `Flurries26_VIP_Credential.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showAlert('Credential forged successfully!', 'success');
    } catch (error) {
        showAlert('Error forging credential.', 'error');
    } finally {
        btn.innerHTML = originalText;
    }
}

// Show Alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'shield-check' : 'exclamation-triangle'}"></i> ${message}`;
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => { alertDiv.style.opacity = '0'; setTimeout(() => alertDiv.remove(), 300); }, 4000);
}

// Admin Auth
function setupAdminAuth() {
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await auth.signInWithEmailAndPassword(document.getElementById('adminEmail').value, document.getElementById('adminPassword').value);
                showAlert('Access granted.', 'success');
            } catch (error) {
                showAlert('Invalid credentials.', 'error');
            }
        });
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { auth.signOut(); window.location.href = 'index.html'; });
}

auth.onAuthStateChanged((user) => {
    const adminContent = document.getElementById('adminContent');
    const loginForm = document.getElementById('loginForm');
    if (user && adminContent && loginForm) { loginForm.classList.add('hidden'); adminContent.classList.remove('hidden'); loadAdminData(); } 
    else if (!user && loginForm) { loginForm.classList.remove('hidden'); adminContent.classList.add('hidden'); }
});

async function loadAdminData() {
    const snapshot = await db.collection('passes').orderBy('createdAt', 'desc').get();
    const table = document.getElementById('passesTable');
    if (table) {
        table.innerHTML = '';
        if (snapshot.empty) { table.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;">No credentials issued yet.</td></tr>'; return; }
        snapshot.forEach(doc => {
            const d = doc.data();
            table.innerHTML += `<tr><td><strong>${d.passId}</strong></td><td>${d.name}</td><td>${d.phone}</td><td>${d.batch}</td><td><span class="status-badge">Active</span></td></tr>`;
        });
    }
}

async function addNewPass(e) {
    e.preventDefault();
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    const batch = document.getElementById('userBatch').value;
    const passId = generatePassId();
    
    try {
        await db.collection('passes').doc(passId).set({ name, phone, batch, passId, status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        showAlert(`Credential forged! ID: <strong>${passId}</strong>`, 'success');
        document.getElementById('addPassForm').reset();
        loadAdminData();
    } catch (error) { showAlert('Error: ' + error.message, 'error'); }
}

async function getPassById(e) {
    e.preventDefault();
    const passId = document.getElementById('passIdInput').value.toUpperCase().trim();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; btn.disabled = true;
    
    try {
        const doc = await db.collection('passes').doc(passId).get();
        if (doc.exists) { displayPass(doc.data()); } 
        else { showAlert('Invalid Pass ID.', 'error'); }
    } catch (error) { showAlert('Connection error.', 'error'); } 
    finally { btn.innerHTML = originalText; btn.disabled = false; }
}

function displayPass(data) {
    document.getElementById('displayName').textContent = data.name;
    document.getElementById('displayPhone').textContent = data.phone;
    document.getElementById('displayBatch').textContent = data.batch;
    document.getElementById('displayPassId').textContent = data.passId;
    generateQRCode(`FLURRIES26|${data.passId}|${data.name}`, 'qrcode');
    document.getElementById('passDisplay').classList.remove('hidden');
    document.getElementById('getPassForm').classList.add('hidden');
    document.getElementById('passDisplay').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginFormElement')) setupAdminAuth();
    if (document.getElementById('addPassForm')) { document.getElementById('addPassForm').addEventListener('submit', addNewPass); setupAdminAuth(); }
    if (document.getElementById('getPassFormElement')) document.getElementById('getPassFormElement').addEventListener('submit', getPassById);
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadPass);
});
