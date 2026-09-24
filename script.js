// Firebase Config - REPLACE WITH YOURS
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

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile Menu
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// Enhanced Snowflake Generation
function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.innerHTML = '❄';
    snowflake.style.left = Math.random() * 100 + 'vw';
    snowflake.style.animationDuration = Math.random() * 5 + 5 + 's';
    snowflake.style.fontSize = Math.random() * 15 + 10 + 'px';
    snowflake.style.opacity = Math.random() * 0.6 + 0.2;
    
    document.body.appendChild(snowflake);
    setTimeout(() => snowflake.remove(), 10000);
}

setInterval(createSnowflake, 150);

// Scroll Reveal Animation
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            el.classList.add('active');
        }
    });
}

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

// Generate 8-char Pass ID
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
        width: 150,
        height: 150,
        colorDark: "#1B3A5C",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Download Pass
async function downloadPass() {
    const passElement = document.getElementById('passTemplate');
    const btn = document.getElementById('downloadBtn');
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;
    
    try {
        const canvas = await html2canvas(passElement, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true
        });
        
        const link = document.createElement('a');
        link.download = `Flurries26_VIP_Pass.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showAlert('Pass downloaded successfully!', 'success');
    } catch (error) {
        showAlert('Error downloading pass.', 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// Show Alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => alertDiv.remove(), 300);
    }, 4000);
}

// Admin Authentication
function setupAdminAuth() {
    const loginForm = document.getElementById('loginFormElement');
    
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showAlert('Access granted. Welcome aboard!', 'success');
        } catch (error) {
            showAlert('Invalid credentials.', 'error');
        }
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', () => {
        auth.signOut();
        window.location.href = 'index.html';
    });
}

// Auth State Observer
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
            table.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 3rem; color: var(--navy-strong);">
                        No passes issued yet
                    </td>
                </tr>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = `
                <tr>
                    <td><strong>${data.passId}</strong></td>
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

// Add New Pass
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
        
        showAlert(`Pass created! ID: <strong>${passId}</strong>`, 'success');
        document.getElementById('addPassForm').reset();
        loadAdminData();
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// Get Pass by ID
async function getPassById(e) {
    e.preventDefault();
    
    const passId = document.getElementById('passIdInput').value.toUpperCase().trim();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;
    
    try {
        const doc = await db.collection('passes').doc(passId).get();
        
        if (doc.exists) {
            const data = doc.data();
            displayPass(data);
        } else {
            showAlert('Invalid Pass ID.', 'error');
        }
    } catch (error) {
        showAlert('Connection error.', 'error');
    } finally {
        btn.innerHTML = originalHTML;
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
    
    setTimeout(() => {
        document.getElementById('passDisplay').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }, 100);
}

// Initialize
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
    downloadBtn?.addEventListener('click', downloadPass);
    
    revealOnScroll();
});
