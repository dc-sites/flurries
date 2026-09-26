import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// ==========================================
// FIREBASE CONFIGURATION (flurries2)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDgUqWsiyeYkH8iXhtu-rTszt_gz2Yu9aE",
  authDomain: "flurries2.firebaseapp.com",
  projectId: "flurries2",
  storageBucket: "flurries2.firebasestorage.app",
  messagingSenderId: "267044553050",
  appId: "1:267044553050:web:32937f10a904b931f2b363"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 5-SECOND VIKING PRELOADER LOGIC
    // ==========================================
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('preloader-hidden');
            document.body.classList.remove('loading');
            setTimeout(() => { preloader.style.display = 'none'; }, 800);
        }, 5000);
    }

    // 1. Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // 3. Snowflakes
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

    // 4. Scroll Reveal
    function revealOnScroll() {
        document.querySelectorAll('.reveal').forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight - 150) {
                el.classList.add('active');
            }
        });
    }
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // 5. Admin Login
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await signInWithEmailAndPassword(auth, document.getElementById('adminEmail').value, document.getElementById('adminPassword').value);
                showAlert('Access granted. Welcome aboard!', 'success');
            } catch (error) {
                showAlert('Invalid credentials.', 'error');
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { 
            signOut(auth); 
            window.location.href = 'index.html'; 
        });
    }

    onAuthStateChanged(auth, (user) => {
        const adminContent = document.getElementById('adminContent');
        const loginFormEl = document.getElementById('loginForm');
        if (user && adminContent && loginFormEl) {
            loginFormEl.classList.add('hidden');
            adminContent.classList.remove('hidden');
            if (document.getElementById('allPassesTable')) loadAdminData();
        } else if (!user && loginFormEl) {
            loginFormEl.classList.remove('hidden');
            adminContent.classList.add('hidden');
        }
    });

    // 6. Add Pass Form (Admin)
    const addPassForm = document.getElementById('addPassForm');
    if (addPassForm) {
        addPassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('userName').value;
            const phone = document.getElementById('userPhone').value;
            const gender = document.getElementById('userGender').value;
            const batch = document.getElementById('userBatch').value;
            const passId = generatePassId();
            
            try {
                await setDoc(doc(db, 'passes', passId), {
                    name, phone, gender, batch, passId, 
                    status: 'pending', scannedAt: null,
                    createdAt: serverTimestamp()
                });
                showAlert(`Pass created! ID: <strong>${passId}</strong>`, 'success');
                addPassForm.reset();
                if (document.getElementById('allPassesTable')) loadAdminData();
            } catch (error) { 
                showAlert('Error: ' + error.message, 'error'); 
            }
        });
    }

    // 7. Get Pass Form (User)
    const getPassForm = document.getElementById('getPassFormElement');
    if (getPassForm) {
        getPassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const passId = document.getElementById('passIdInput').value.toUpperCase().trim();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; 
            btn.disabled = true;
            
            try {
                const docSnap = await getDoc(doc(db, 'passes', passId));
                if (docSnap.exists()) displayPass(docSnap.data());
                else showAlert('Invalid Pass ID.', 'error');
            } catch (error) { 
                showAlert('Connection error.', 'error'); 
            } finally { 
                btn.innerHTML = originalHTML; 
                btn.disabled = false; 
            }
        });
    }

    // 8. Download Pass Button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadPass);

    // ==========================================
    // 9. QR CODE SCANNER LOGIC (Admin)
    // ==========================================
    let html5QrcodeScanner = null;
    const startScannerBtn = document.getElementById('startScannerBtn');
    const stopScannerBtn = document.getElementById('stopScannerBtn');
    const scanResultDiv = document.getElementById('scanResult');

    if (startScannerBtn && stopScannerBtn) {
        startScannerBtn.addEventListener('click', async () => {
            if (!html5QrcodeScanner) {
                html5QrcodeScanner = new Html5Qrcode("reader");
            }
            try {
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                await html5QrcodeScanner.start(
                    { facingMode: "environment" }, 
                    config, 
                    onScanSuccess, 
                    onScanFailure
                );
                startScannerBtn.disabled = true;
                stopScannerBtn.disabled = false;
                if (scanResultDiv) scanResultDiv.style.display = 'none';
            } catch (err) {
                showAlert('Camera access denied. Please allow permissions and ensure you are using HTTPS or localhost.', 'error');
                console.error(err);
            }
        });

        stopScannerBtn.addEventListener('click', async () => {
            if (html5QrcodeScanner) {
                await html5QrcodeScanner.stop();
                startScannerBtn.disabled = false;
                stopScannerBtn.disabled = true;
            }
        });
    }

    async function onScanSuccess(decodedText, decodedResult) {
        // Stop scanner temporarily to process
        if (html5QrcodeScanner) {
            await html5QrcodeScanner.stop();
            startScannerBtn.disabled = false;
            stopScannerBtn.disabled = true;
        }

        // Parse the QR code data: FLURRIES26|PASSID|NAME|PHONE
        const parts = decodedText.split('|');
        if (parts.length >= 2 && parts[0] === 'FLURRIES26') {
            const passId = parts[1];
            const docRef = doc(db, 'passes', passId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'attended') {
                    if (scanResultDiv) {
                        scanResultDiv.innerHTML = `
                            <h3 style="color: #dc2626; margin-bottom: 0.5rem;"><i class="fas fa-times-circle"></i> Already Scanned</h3>
                            <p><strong>Name:</strong> ${data.name}</p>
                            <p><strong>Pass ID:</strong> ${data.passId}</p>
                            <p><strong>Scanned at:</strong> ${data.scannedAt ? data.scannedAt.toDate().toLocaleString() : 'Unknown'}</p>
                        `;
                        scanResultDiv.style.display = 'block';
                    }
                    showAlert('This pass has already been used!', 'error');
                } else {
                    // Mark as attended
                    await setDoc(docRef, {
                        ...data,
                        status: 'attended',
                        scannedAt: serverTimestamp()
                    }, { merge: true });
                    
                    if (scanResultDiv) {
                        scanResultDiv.innerHTML = `
                            <h3 style="color: #16a34a; margin-bottom: 0.5rem;"><i class="fas fa-check-circle"></i> Access Granted</h3>
                            <p><strong>Name:</strong> ${data.name}</p>
                            <p><strong>Batch:</strong> ${data.batch}</p>
                            <p><strong>Pass ID:</strong> ${data.passId}</p>
                        `;
                        scanResultDiv.style.display = 'block';
                    }
                    showAlert('Pass marked as attended successfully!', 'success');
                    if (document.getElementById('allPassesTable')) loadAdminData();
                }
            } else {
                if (scanResultDiv) {
                    scanResultDiv.innerHTML = `<h3 style="color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Invalid Pass ID</h3>`;
                    scanResultDiv.style.display = 'block';
                }
                showAlert('Pass ID not found in database.', 'error');
            }
        } else {
            if (scanResultDiv) {
                scanResultDiv.innerHTML = `<h3 style="color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> Invalid QR Code</h3>`;
                scanResultDiv.style.display = 'block';
            }
            showAlert('This is not a valid Flurries 26 QR code.', 'error');
        }
    }

    function onScanFailure(error) {
        // Console warning suppressed to prevent spam during scanning
    }
});

// ==========================================
// Helper Functions
// ==========================================

function generatePassId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'FL26';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

function generateQRCode(data, elementId) {
    const el = document.getElementById(elementId);
    if(el) {
        el.innerHTML = '';
        new QRCode(el, { text: data, width: 150, height: 150, colorDark: "#1B3A5C", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    }
}

async function downloadPass() {
    const passElement = document.getElementById('passTemplate');
    const btn = document.getElementById('downloadBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; 
    btn.disabled = true;
    
    try {
        const isMobile = window.innerWidth <= 768;
        let originalStyles = null;

        if (isMobile) {
            originalStyles = {
                width: passElement.style.width, maxWidth: passElement.style.maxWidth,
                position: passElement.style.position, left: passElement.style.left,
                top: passElement.style.top, zIndex: passElement.style.zIndex,
                transform: passElement.style.transform
            };
            passElement.style.width = '750px';
            passElement.style.maxWidth = '750px';
            passElement.style.position = 'absolute';
            passElement.style.left = '-9999px';
            passElement.style.top = '0';
            passElement.style.zIndex = '-1';
            passElement.style.transform = 'none';
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const canvas = await html2canvas(passElement, { 
            scale: isMobile ? 3 : 2, backgroundColor: '#ffffff', useCORS: true, logging: false
        });

        if (isMobile && originalStyles) {
            passElement.style.width = originalStyles.width || '';
            passElement.style.maxWidth = originalStyles.maxWidth || '';
            passElement.style.position = originalStyles.position || '';
            passElement.style.left = originalStyles.left || '';
            passElement.style.top = originalStyles.top || '';
            passElement.style.zIndex = originalStyles.zIndex || '';
            passElement.style.transform = originalStyles.transform || '';
        }

        const link = document.createElement('a');
        const passId = document.getElementById('displayPassId').textContent;
        link.download = `Flurries26_Pass_${passId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showAlert('Pass downloaded successfully!', 'success');
    } catch (error) { 
        console.error('Download error:', error);
        showAlert('Error downloading pass.', 'error'); 
    } finally { 
        btn.innerHTML = originalHTML; 
        btn.disabled = false; 
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => { 
        alertDiv.style.opacity = '0'; 
        setTimeout(() => alertDiv.remove(), 300); 
    }, 4000);
}

async function loadAdminData() {
    const q = query(collection(db, 'passes'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const table = document.getElementById('allPassesTable');
    
    if (table) {
        table.innerHTML = '';
        if (snapshot.empty) { 
            table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:3rem;">No passes issued yet</td></tr>`; 
            return; 
        }
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const scanTime = d.scannedAt ? d.scannedAt.toDate().toLocaleString() : 'Not Scanned';
            const statusClass = d.status === 'attended' ? 'status-badge attended' : 'status-badge pending';
            
            table.innerHTML += `<tr>
                <td><strong>${d.passId}</strong></td>
                <td>${d.name}</td>
                <td>${d.gender || 'N/A'}</td>
                <td>${d.batch}</td>
                <td>${d.phone}</td>
                <td><span class="${statusClass}">${d.status.toUpperCase()}</span></td>
                <td>${scanTime}</td>
            </tr>`;
        });
    }
}

function displayPass(data) {
    document.getElementById('displayName').textContent = data.name;
    document.getElementById('displayPhone').textContent = data.phone;
    document.getElementById('displayGender').textContent = data.gender || 'N/A';
    document.getElementById('displayBatch').textContent = data.batch;
    document.getElementById('displayPassId').textContent = data.passId;
    
    const qrData = `FLURRIES26|${data.passId}|${data.name}|${data.phone}`;
    generateQRCode(qrData, 'qrcode');
    
    document.getElementById('passDisplay').classList.remove('hidden');
    document.getElementById('getPassForm').classList.add('hidden');
    
    setTimeout(() => {
        document.getElementById('passDisplay').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}
