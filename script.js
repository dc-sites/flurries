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

// Snowfall Animation
function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.innerHTML = '❄';
    snowflake.style.left = Math.random() * 100 + 'vw';
    snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
    snowflake.style.opacity = Math.random();
    snowflake.style.fontSize = Math.random() * 10 + 10 + 'px';
    
    document.body.appendChild(snowflake);
    
    setTimeout(() => {
        snowflake.remove();
    }, 5000);
}

setInterval(createSnowflake, 100);

// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Generate 8-character ID
function generatePassId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FL26';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate QR Code
function generateQRCode(data, elementId) {
    const qr = new QRCode(document.getElementById(elementId), {
        text: data,
        width: 150,
        height: 150,
        colorDark: "#1565C0",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Download Pass as Image
async function downloadPass() {
    const passElement = document.getElementById('passTemplate');
    const canvas = await html2canvas(passElement);
    const link = document.createElement('a');
    link.download = `Flurries26_Pass.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// Show Alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Admin Authentication
function setupAdminAuth() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
                window.location.href = 'admin.html';
            } catch (error) {
                showAlert('Login failed: ' + error.message, 'error');
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
    }
});

// Load Admin Data
async function loadAdminData() {
    const snapshot = await db.collection('passes').orderBy('createdAt', 'desc').get();
    const table = document.getElementById('passesTable');
    
    if (table) {
        table.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = `
                <tr>
                    <td>${data.passId}</td>
                    <td>${data.name}</td>
                    <td>${data.phone}</td>
                    <td>${data.batch}</td>
                    <td>${data.status}</td>
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
        
        showAlert(`Pass created successfully! ID: ${passId}`, 'success');
        document.getElementById('addPassForm').reset();
        loadAdminData();
    } catch (error) {
        showAlert('Error creating pass: ' + error.message, 'error');
    }
}

// Get Pass by ID (User)
async function getPassById(e) {
    e.preventDefault();
    
    const passId = document.getElementById('passIdInput').value.toUpperCase();
    
    try {
        const doc = await db.collection('passes').doc(passId).get();
        
        if (doc.exists) {
            const data = doc.data();
            displayPass(data);
        } else {
            showAlert('Invalid Pass ID. Please check and try again.', 'error');
        }
    } catch (error) {
        showAlert('Error fetching pass: ' + error.message, 'error');
    }
}

// Display Pass
function displayPass(data) {
    document.getElementById('displayName').textContent = data.name;
    document.getElementById('displayPhone').textContent = data.phone;
    document.getElementById('displayBatch').textContent = data.batch;
    document.getElementById('displayPassId').textContent = data.passId;
    
    const qrData = JSON.stringify({
        name: data.name,
        phone: data.phone,
        batch: data.batch,
        passId: data.passId,
        event: 'Flurries 26'
    });
    
    generateQRCode(qrData, 'qrcode');
    
    document.getElementById('passDisplay').classList.remove('hidden');
    document.getElementById('getPassForm').classList.add('hidden');
}

// Initialize Pages
document.addEventListener('DOMContentLoaded', () => {
    // Admin Login Page
    if (document.getElementById('loginForm')) {
        setupAdminAuth();
    }
    
    // Admin Dashboard
    if (document.getElementById('addPassForm')) {
        document.getElementById('addPassForm').addEventListener('submit', addNewPass);
        setupAdminAuth();
    }
    
    // Get Pass Page
    if (document.getElementById('getPassForm')) {
        document.getElementById('getPassForm').addEventListener('submit', getPassById);
    }
    
    // Download Button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPass);
    }
});
