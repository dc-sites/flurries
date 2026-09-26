import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDYDFZOUwH2K5wzoYcEECTtfFMoOMJv3Gs",
    authDomain: "flurries-32408.firebaseapp.com",
    projectId: "flurries-32408",
    storageBucket: "flurries-32408.firebasestorage.app",
    messagingSenderId: "459835238527",
    appId: "1:459835238527:web:fb9666e57f6d66457ab74a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu (Public Site)
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
        logoutBtn.addEventListener('click', (e) => { 
            e.preventDefault();
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
            loadAllPasses();
            loadScannedData();
        } else if (!user && loginFormEl) {
            loginFormEl.classList.remove('hidden');
            adminContent.classList.add('hidden');
        }
    });

    // ==========================================
    // ADMIN SECTION NAVIGATION (Sidebar + Bottom Nav)
    // ==========================================
    function switchSection(sectionId) {
        // Update Sidebar
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });
        // Update Bottom Nav
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });
        // Update Content
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === `section-${sectionId}`);
        });

        // Stop scanner if leaving scan tab
        if (sectionId !== 'scan' && html5QrcodeScanner) {
            html5QrcodeScanner.stop().catch(() => {});
            if (startScannerBtn) startScannerBtn.disabled = false;
            if (stopScannerBtn) stopScannerBtn.disabled = true;
        }

        // Refresh data
        if (sectionId === 'registry') loadAllPasses();
        else if (sectionId === 'details') loadScannedData();
    }

    // Attach listeners to Sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
        });
    });

    // Attach listeners to Bottom Nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
        });
    });

    // 6. Add Pass Form
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
                showPassIdModal(passId, name, phone, batch);
                addPassForm.reset();
                loadAllPasses();
            } catch (error) { 
                showAlert('Error: ' + error.message, 'error'); 
            }
        });
    }

    // ==========================================
    // PASS ID MODAL
    // ==========================================
    const passIdModal = document.getElementById('passIdModal');
    const modalPassId = document.getElementById('modalPassId');
    const copyPassIdBtn = document.getElementById('copyPassIdBtn');
    const copySuccessMsg = document.getElementById('copySuccessMsg');
    const closeModalBtn = document.getElementById('closeModalBtn');

    function showPassIdModal(passId, name, phone, batch) {
        if (passIdModal) {
            document.getElementById('modalName').textContent = name;
            document.getElementById('modalPhone').textContent = phone;
            document.getElementById('modalBatch').textContent = batch;
            modalPassId.textContent = passId;
            passIdModal.classList.add('active');
            copySuccessMsg.classList.remove('show');
        }
    }

    if (copyPassIdBtn) {
        copyPassIdBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(modalPassId.textContent);
                copySuccessMsg.classList.add('show');
                setTimeout(() => copySuccessMsg.classList.remove('show'), 2000);
            } catch (err) {
                const textArea = document.createElement('textarea');
                textArea.value = modalPassId.textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                copySuccessMsg.classList.add('show');
                setTimeout(() => copySuccessMsg.classList.remove('show'), 2000);
            }
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => passIdModal.classList.remove('active'));
    if (passIdModal) passIdModal.addEventListener('click', (e) => { if (e.target === passIdModal) passIdModal.classList.remove('active'); });

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
            } catch (error) { showAlert('Connection error.', 'error'); } 
            finally { btn.innerHTML = originalHTML; btn.disabled = false; }
        });
    }

    // 8. Download Pass
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadPass);

    // ==========================================
    // 9. QR SCANNER
    // ==========================================
    let html5QrcodeScanner = null;
    let isProcessing = false;
    const startScannerBtn = document.getElementById('startScannerBtn');
    const stopScannerBtn = document.getElementById('stopScannerBtn');
    const scanModal = document.getElementById('scanModal');
    const scanAnotherBtn = document.getElementById('scanAnotherBtn');
    const closeScanModalBtn = document.getElementById('closeScanModalBtn');

    if (startScannerBtn && stopScannerBtn) {
        startScannerBtn.addEventListener('click', async () => {
            if (isProcessing) return;
            if (!html5QrcodeScanner) html5QrcodeScanner = new Html5Qrcode("reader");
            try {
                await html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanFailure);
                startScannerBtn.disabled = true;
                stopScannerBtn.disabled = false;
            } catch (err) { showAlert('Camera access denied. Use HTTPS.', 'error'); }
        });

        stopScannerBtn.addEventListener('click', async () => {
            if (html5QrcodeScanner) {
                await html5QrcodeScanner.stop();
                startScannerBtn.disabled = false;
                stopScannerBtn.disabled = true;
            }
        });
    }

    if (scanAnotherBtn) {
        scanAnotherBtn.addEventListener('click', async () => {
            scanModal.classList.remove('active');
            isProcessing = false;
            if (html5QrcodeScanner && startScannerBtn && !startScannerBtn.disabled) {
                try {
                    await html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanFailure);
                    startScannerBtn.disabled = true;
                    stopScannerBtn.disabled = false;
                } catch (err) { console.error('Restart error:', err); }
            }
        });
    }

    if (closeScanModalBtn) closeScanModalBtn.addEventListener('click', () => { scanModal.classList.remove('active'); isProcessing = false; });

    async function onScanSuccess(decodedText) {
        if (isProcessing) return;
        isProcessing = true;
        if (html5QrcodeScanner) { try { await html5QrcodeScanner.stop(); } catch(e) {} startScannerBtn.disabled = false; stopScannerBtn.disabled = true; }

        const parts = decodedText.split('|');
        if (parts.length >= 2 && parts[0] === 'FLURRIES26') {
            const passId = parts[1];
            const docSnap = await getDoc(doc(db, 'passes', passId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'attended') {
                    showScanModal('warning', 'Already Scanned', data, data.scannedAt ? data.scannedAt.toDate().toLocaleString() : 'Unknown');
                } else {
                    await setDoc(doc(db, 'passes', passId), { ...data, status: 'attended', scannedAt: serverTimestamp() }, { merge: true });
                    showScanModal('success', 'Access Granted', data, null);
                    loadAllPasses(); loadScannedData();
                }
            } else { showScanModal('warning', 'Invalid Pass', { name: 'Not Found', passId: passId, batch: '-' }, null); }
        } else { showScanModal('warning', 'Invalid QR', { name: 'Unknown', passId: '-', batch: '-' }, null); }
    }

    function showScanModal(type, title, data, previousTime) {
        const header = document.getElementById('scanModalHeader');
        header.className = `modal-header scan-header ${type}`;
        document.getElementById('scanModalIcon').className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
        document.getElementById('scanModalTitle').textContent = title;
        document.getElementById('scanName').textContent = data.name || '-';
        document.getElementById('scanPassId').textContent = data.passId || '-';
        document.getElementById('scanBatch').textContent = data.batch || '-';
        
        const timeField = document.getElementById('scanTimeField');
        if (previousTime) { timeField.style.display = 'flex'; document.getElementById('scanTime').textContent = previousTime; } 
        else { timeField.style.display = 'none'; }
        
        scanModal.classList.add('active');
    }

    function onScanFailure() {}

    // ==========================================
    // 10. PDF EXPORT (Scanned)
    // ==========================================
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async () => {
            exportPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            exportPdfBtn.disabled = true;
            try {
                const snapshot = await getDocs(query(collection(db, 'passes'), orderBy('createdAt', 'desc')));
                const tbody = document.getElementById('pdf-table-body');
                tbody.innerHTML = '';
                document.getElementById('pdf-report-title').textContent = 'Official Scanned Guests Report';
                let hasScanned = false;
                snapshot.forEach(docSnap => {
                    const d = docSnap.data();
                    if (d.status === 'attended') {
                        hasScanned = true;
                        tbody.innerHTML += `<tr><td><strong>${d.passId}</strong></td><td>${d.name}</td><td>${d.gender || 'N/A'}</td><td>${d.batch}</td><td>${d.phone}</td><td>${d.scannedAt ? d.scannedAt.toDate().toLocaleString() : 'Unknown'}</td></tr>`;
                    }
                });
                if (!hasScanned) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No scanned guests found.</td></tr>';
                document.getElementById('pdf-generation-date').textContent = new Date().toLocaleString();
                
                await html2pdf().set({ margin: 10, filename: `Flurries26_Scanned_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).from(document.getElementById('pdf-export-template')).save();
                showAlert('PDF exported!', 'success');
            } catch (error) { showAlert('Error generating PDF.', 'error'); } 
            finally { exportPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Export'; exportPdfBtn.disabled = false; }
        });
    }

    // 11. PDF EXPORT (All)
    const exportAllPdfBtn = document.getElementById('exportAllPdfBtn');
    if (exportAllPdfBtn) {
        exportAllPdfBtn.addEventListener('click', async () => {
            exportAllPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            exportAllPdfBtn.disabled = true;
            try {
                const snapshot = await getDocs(query(collection(db, 'passes'), orderBy('createdAt', 'desc')));
                const tbody = document.getElementById('pdf-table-body');
                tbody.innerHTML = '';
                document.getElementById('pdf-report-title').textContent = 'All Generated Passes Report';
                if (snapshot.empty) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No passes found.</td></tr>';
                else {
                    snapshot.forEach(docSnap => {
                        const d = docSnap.data();
                        tbody.innerHTML += `<tr><td><strong>${d.passId}</strong></td><td>${d.name}</td><td>${d.gender || 'N/A'}</td><td>${d.batch}</td><td>${d.phone}</td><td>${d.createdAt ? d.createdAt.toDate().toLocaleString() : 'Unknown'}</td></tr>`;
                    });
                }
                document.getElementById('pdf-generation-date').textContent = new Date().toLocaleString();
                await html2pdf().set({ margin: 10, filename: `Flurries26_AllPasses_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).from(document.getElementById('pdf-export-template')).save();
                showAlert('PDF exported!', 'success');
            } catch (error) { showAlert('Error generating PDF.', 'error'); } 
            finally { exportAllPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Export'; exportAllPdfBtn.disabled = false; }
        });
    }
});

// Helper Functions
function generatePassId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'FL26';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

function generateQRCode(data, elementId) {
    const el = document.getElementById(elementId);
    if(el) { el.innerHTML = ''; new QRCode(el, { text: data, width: 150, height: 150, colorDark: "#1B3A5C", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H }); }
}

async function downloadPass() {
    const passElement = document.getElementById('passTemplate');
    const btn = document.getElementById('downloadBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; btn.disabled = true;
    try {
        const isMobile = window.innerWidth <= 768;
        let originalStyles = null;
        if (isMobile) {
            originalStyles = { width: passElement.style.width, maxWidth: passElement.style.maxWidth, position: passElement.style.position, left: passElement.style.left, top: passElement.style.top, zIndex: passElement.style.zIndex, transform: passElement.style.transform };
            passElement.style.width = '750px'; passElement.style.maxWidth = '750px'; passElement.style.position = 'absolute'; passElement.style.left = '-9999px'; passElement.style.top = '0'; passElement.style.zIndex = '-1'; passElement.style.transform = 'none';
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const canvas = await html2canvas(passElement, { scale: isMobile ? 3 : 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
        if (isMobile && originalStyles) { passElement.style.width = originalStyles.width || ''; passElement.style.maxWidth = originalStyles.maxWidth || ''; passElement.style.position = originalStyles.position || ''; passElement.style.left = originalStyles.left || ''; passElement.style.top = originalStyles.top || ''; passElement.style.zIndex = originalStyles.zIndex || ''; passElement.style.transform = originalStyles.transform || ''; }
        const link = document.createElement('a');
        link.download = `Flurries26_Pass_${document.getElementById('displayPassId').textContent}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
        showAlert('Pass downloaded!', 'success');
    } catch (error) { showAlert('Error downloading pass.', 'error'); } 
    finally { btn.innerHTML = originalHTML; btn.disabled = false; }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => { alertDiv.style.opacity = '0'; setTimeout(() => alertDiv.remove(), 300); }, 4000);
}

async function loadAllPasses() {
    const table = document.getElementById('allPassesTable');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const snapshot = await getDocs(query(collection(db, 'passes'), orderBy('createdAt', 'desc')));
    if (snapshot.empty) { tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No passes issued yet</td></tr>`; return; }
    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const statusClass = d.status === 'attended' ? 'status-badge attended' : 'status-badge pending';
        tbody.innerHTML += `<tr>
            <td data-label="Pass ID"><strong>${d.passId}</strong></td>
            <td data-label="Name">${d.name}</td>
            <td data-label="Batch">${d.batch}</td>
            <td data-label="Status"><span class="${statusClass}">${d.status.toUpperCase()}</span></td>
        </tr>`;
    });
}

async function loadScannedData() {
    const table = document.getElementById('scannedTable');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const snapshot = await getDocs(query(collection(db, 'passes'), orderBy('createdAt', 'desc')));
    let hasScanned = false;
    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.status === 'attended') {
            hasScanned = true;
            tbody.innerHTML += `<tr>
                <td data-label="Pass ID"><strong>${d.passId}</strong></td>
                <td data-label="Name">${d.name}</td>
                <td data-label="Batch">${d.batch}</td>
                <td data-label="Entry Time">${d.scannedAt ? d.scannedAt.toDate().toLocaleString() : 'Unknown'}</td>
            </tr>`;
        }
    });
    if (!hasScanned) tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No guests scanned yet</td></tr>`;
}

function displayPass(data) {
    document.getElementById('displayName').textContent = data.name;
    document.getElementById('displayPhone').textContent = data.phone;
    document.getElementById('displayGender').textContent = data.gender || 'N/A';
    document.getElementById('displayBatch').textContent = data.batch;
    document.getElementById('displayPassId').textContent = data.passId;
    generateQRCode(`FLURRIES26|${data.passId}|${data.name}|${data.phone}`, 'qrcode');
    document.getElementById('passDisplay').classList.remove('hidden');
    document.getElementById('getPassForm').classList.add('hidden');
    setTimeout(() => document.getElementById('passDisplay').scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}
