// Firebase Configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Elegant Snowfall Animation
function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.innerHTML = '';
    snowflake.style.left = Math.random() * 100 + 'vw';
    snowflake.style.animationDuration = Math.random() * 6 + 6 + 's';
    snowflake.style.opacity = Math.random() * 0.5 + 0.1;
    snowflake.style.fontSize = Math.random() * 10 + 8 + 'px';
    
    document.body.appendChild(snowflake);
    
    setTimeout(() => {
        snowflake.remove();
    }, 12000);
}

setInterval(createSnowflake, 400);

// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const spans = hamburger.querySelectorAll('span');
        if (navLinks.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
}

// Scroll Reveal Animation (Alokawarsha style)
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.15 });

revealElements.forEach(el => revealObserver.observe(el));

// Generate 8-character Premium ID
function generatePassId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'FL26';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate QR Code
function generateQRCode(data, elementId) {
    document.getElementById(elementId).innerHTML = '';
    new QRCode(document.getElementById(elementId), {
        text: data,
        width: 140,
        height: 140,
        colorDark: "#1B3A5C",
        colorLight: "#D6EEF8",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Download Pass as High-Quality Image
async function downloadPass() {
    const passElement = document.getElementById('passTemplate');
    const btn = document.getElementById('downloadBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Forging...';
    
    try {
        const canvas = await html2canvas(passElement, {
            scale: 2,
            backgroundColor: '#1B3A5C',
            useCORS: true
        });
        const link = document.createElement('a');
        link.download = `Flurries26_VIP_Credential.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showAlert('Credential forged successfully!', 'success');
    } catch (error) {
        showAlert('Error forging credential. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
    }
}

// Show Alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'shield-alt' : 'exclamation-triangle'}"></i> ${message}`;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 4000);
}

// Admin Authentication
function setupAdminAuth() {
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
                showAlert('Access granted.', 'success');
            } catch (error) {
                showAlert('Invalid credentials. Access denied.', 'error');
            }
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
            window.location.href = 'index.html';
        });
    }
}

// Check Admin Auth State
auth.onAuthStateChanged((user) => {
    const adminContent = document.getElementById('adminContent');
    const loginForm = document.getElementById('loginForm');
    
    if (user && adminContent && loginForm) {
        loginForm.classList.add('hidden');
        adminContent.classList.remove('hidden');
        loadAdminData();
    } else if (!user && loginForm) {
        loginForm.classList.remove('hidden');
        adminContent.classList.add('hidden');
    }
});

// Load Admin Data
async function loadAdminData() {
    const snapshot = await db.collection('passes').orderBy('createdAt', 'desc').get();
    const table = document.getElementById('passesTable');
    
    if (table) {
        table.innerHTML = '';
        if (snapshot.empty) {
            table.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--pale-blue);">No credentials issued yet.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = `
                <tr>
                    <td><strong style="color: var(--ice-white); letter-spacing: 1px;">${data.passId}</strong></td>
                    <td>${data.name}</td>
                    <td>${data.phone}</td>
                    <td>${data.batch}</td>
                    <td><span class="status-badge">Active</span></td>
                </tr>
            `;
            table.innerHTML += row;
        });
    }
}

// Add New Pass (Admin)
async function addNewPass(e) {
    e.preventDefault();
    
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    const batch = document.getElementById('userBatch').value;
    const passId = generatePassId();
    
    try {
        await db.collection('passes').doc(passId).set({
            name,
            phone,
            batch,
            passId,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert(`Credential forged! ID: <strong>${passId}</strong>`, 'success');
        document.getElementById('addPassForm').reset();
        loadAdminData();
    } catch (error) {
        showAlert('Error forging credential: ' + error.message, 'error');
    }
}

// Get Pass by ID (User)
async function getPassById(e) {
    e.preventDefault();
    
    const passId = document.getElementById('passIdInput').value.toUpperCase().trim();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;
    
    try {
        const doc = await db.collection('passes').doc(passId).get();
        
        if (doc.exists) {
            const data = doc.data();
            displayPass(data);
        } else {
            showAlert('Invalid Credential ID. Check your transmission.', 'error');
        }
    } catch (error) {
        showAlert('Connection error. Check your link.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Display Pass
function displayPass(data) {
    document.getElementById('displayName').textContent = data.name;
    document.getElementById('displayPhone').textContent = data.phone;
    document.getElementById('displayBatch').textContent = data.batch;
    document.getElementById('displayPassId').textContent = data.passId;
    
    const qrData = `FLURRIES26|${data.passId}|${data.name}|${data.phone}`;
    generateQRCode(qrData, 'qrcode');
    
    document.getElementById('passDisplay').classList.remove('hidden');
    document.getElementById('getPassForm').classList.add('hidden');
    
    document.getElementById('passDisplay').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Initialize Pages
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginFormElement')) setupAdminAuth();
    
    if (document.getElementById('addPassForm')) {
        document.getElementById('addPassForm').addEventListener('submit', addNewPass);
        setupAdminAuth();
    }
    
    if (document.getElementById('getPassFormElement')) {
        document.getElementById('getPassFormElement').addEventListener('submit', getPassById);
    }
    
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPass);
    }
});
