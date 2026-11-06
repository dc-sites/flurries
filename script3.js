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

let allPassesData = [];

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
        } else if (!user && loginFormEl) {
            loginFormEl.classList.remove('hidden');
            adminContent.classList.add('hidden');
        }
    });

    // ==========================================
    // ADMIN SECTION NAVIGATION
    // ==========================================
    let html5QrcodeScanner = null;

    function switchSection(sectionId) {
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === `section-${sectionId}`);
        });

        if (sectionId !== 'scan' && html5QrcodeScanner) {
            html5QrcodeScanner.stop().catch(() => {});
            const startBtn = document.getElementById('startScannerBtn');
            const stopBtn = document.getElementById('stopScannerBtn');
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }

        if (sectionId === 'registry') renderAllPasses();
        else if (sectionId === 'details') renderScannedGuests();
        else if (sectionId === 'signed') renderSignedGuests();
    }

    document.querySelectorAll('.sidebar-nav .nav-item, .bottom-nav-item').forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); switchSection(item.dataset.section); });
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
                await loadAllPasses();
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
                
                // NEW CHECK: Block entry if agreement not signed
                if (!data.agreed) {
                    showScanModal('warning', 'Agreement Required', data, null, true);
                    isProcessing = false;
                    return;
                }
                
                if (data.status === 'attended') {
                    showScanModal('warning', 'Already Scanned', data, data.scannedAt ? data.scannedAt.toDate().toLocaleString() : 'Unknown');
                } else {
                    await setDoc(doc(db, 'passes', passId), { ...data, status: 'attended', scannedAt: serverTimestamp() }, { merge: true });
                    showScanModal('success', 'Access Granted', data, null);
                    await loadAllPasses();
                }
            } else { 
                showScanModal('warning', 'Invalid Pass', { name: 'Not Found', passId: passId, batch: '-' }, null); 
            }
        } else { 
            showScanModal('warning', 'Invalid QR', { name: 'Unknown', passId: '-', batch: '-' }, null); 
        }
    }

    function showScanModal(type, title, data, previousTime, agreementRequired = false) {
        const header = document.getElementById('scanModalHeader');
        header.className = `modal-header scan-header ${type}`;
        document.getElementById('scanModalIcon').className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
        document.getElementById('scanModalTitle').textContent = title;
        document.getElementById('scanName').textContent = data.name || '-';
        document.getElementById('scanPassId').textContent = data.passId || '-';
        document.getElementById('scanBatch').textContent = data.batch || '-';
        
        const timeField = document.getElementById('scanTimeField');
        if (previousTime) { 
            timeField.style.display = 'flex'; 
            document.getElementById('scanTime').textContent = previousTime; 
        } else { 
            timeField.style.display = 'none'; 
        }
        
        // Agreement Status
        const agreedField = document.getElementById('scanAgreedField');
        const agreedValue = document.getElementById('scanAgreedValue');
        if (agreedField && agreedValue) {
            if (agreementRequired) {
                agreedField.style.display = 'flex';
                agreedValue.innerHTML = 'ACTION REQUIRED';
                agreedValue.className = 'scan-value scan-agreed-no';
            } else if (data.agreed) {
                agreedField.style.display = 'flex';
                agreedValue.innerHTML = '<i class="fas fa-check-circle"></i> Signed';
                agreedValue.className = 'scan-value scan-agreed-yes';
            } else {
                agreedField.style.display = 'flex';
                agreedValue.innerHTML = '<i class="fas fa-times-circle"></i> Not Signed';
                agreedValue.className = 'scan-value scan-agreed-no';
            }
        }
        
        // Show agreement warning message if needed
        let warningMsg = document.getElementById('scanWarningMsg');
        if (!warningMsg) {
            warningMsg = document.createElement('div');
            warningMsg.id = 'scanWarningMsg';
            warningMsg.className = 'scan-warning-msg';
            document.querySelector('.scan-body').appendChild(warningMsg);
        }
        
        if (agreementRequired) {
            warningMsg.style.display = 'block';
            warningMsg.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>This guest must sign the agreement first!</strong>
                    
                </div>
            `;
        } else {
            warningMsg.style.display = 'none';
        }
        
        scanModal.classList.add('active');
    }

    function onScanFailure() {}

    // ==========================================
    // 10. DATA LOADING & FILTERING
    // ==========================================
    async function loadAllPasses() {
        const snapshot = await getDocs(query(collection(db, 'passes'), orderBy('createdAt', 'desc')));
        allPassesData = [];
        snapshot.forEach(docSnap => {
            allPassesData.push(docSnap.data());
        });
        renderAllPasses();
        renderScannedGuests();
        renderSignedGuests();
    }

    function renderAllPasses() {
        const table = document.getElementById('allPassesTable');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        const search = document.getElementById('registrySearch')?.value.toLowerCase() || '';
        const gender = document.getElementById('registryGenderFilter')?.value || 'all';
        const batch = document.getElementById('registryBatchFilter')?.value || 'all';
        const status = document.getElementById('registryStatusFilter')?.value || 'all';

        const filtered = allPassesData.filter(d => {
            const matchSearch = d.name.toLowerCase().includes(search) || (d.passId && d.passId.toLowerCase().includes(search));
            const matchGender = gender === 'all' || d.gender === gender;
            const matchBatch = batch === 'all' || d.batch === batch;
            const matchStatus = status === 'all' || d.status === status;
            return matchSearch && matchGender && matchBatch && matchStatus;
        });

        const countEl = document.getElementById('registryCount');
        if (countEl) countEl.textContent = `${filtered.length} passes found`;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No passes found matching your filters.</td></tr>`;
            return;
        }

        filtered.forEach(d => {
            const statusClass = d.status === 'attended' ? 'status-badge attended' : 'status-badge pending';
            tbody.innerHTML += `<tr>
                <td data-label="Pass ID"><strong>${d.passId}</strong></td>
                <td data-label="Name">${d.name}</td>
                <td data-label="Gender">${d.gender || 'N/A'}</td>
                <td data-label="Batch">${d.batch}</td>
                <td data-label="Status"><span class="${statusClass}">${d.status.toUpperCase()}</span></td>
            </tr>`;
        });
    }

    function renderScannedGuests() {
        const table = document.getElementById('scannedTable');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        const search = document.getElementById('scannedSearch')?.value.toLowerCase() || '';
        const gender = document.getElementById('scannedGenderFilter')?.value || 'all';
        const batch = document.getElementById('scannedBatchFilter')?.value || 'all';

        const filtered = allPassesData.filter(d => {
            if (d.status !== 'attended') return false;
            const matchSearch = d.name.toLowerCase().includes(search) || (d.passId && d.passId.toLowerCase().includes(search));
            const matchGender = gender === 'all' || d.gender === gender;
            const matchBatch = batch === 'all' || d.batch === batch;
            return matchSearch && matchGender && matchBatch;
        });

        const countEl = document.getElementById('scannedCount');
        if (countEl) countEl.textContent = `${filtered.length} guests found`;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No scanned guests found matching your filters.</td></tr>`;
            return;
        }

        filtered.forEach(d => {
            tbody.innerHTML += `<tr>
                <td data-label="Pass ID"><strong>${d.passId}</strong></td>
                <td data-label="Name">${d.name}</td>
                <td data-label="Gender">${d.gender || 'N/A'}</td>
                <td data-label="Batch">${d.batch}</td>
                <td data-label="Entry Time">${d.scannedAt ? d.scannedAt.toDate().toLocaleString() : 'Unknown'}</td>
            </tr>`;
        });
    }

    // ==========================================
    // SIGNED GUESTS RENDERING
    // ==========================================
    function renderSignedGuests() {
        const table = document.getElementById('signedTable');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        const search = document.getElementById('signedSearch')?.value.toLowerCase() || '';
        const batch = document.getElementById('signedBatchFilter')?.value || 'all';

        const filtered = allPassesData.filter(d => {
            if (!d.agreed) return false;
            const matchSearch = d.name.toLowerCase().includes(search) || (d.passId && d.passId.toLowerCase().includes(search));
            const matchBatch = batch === 'all' || d.batch === batch;
            return matchSearch && matchBatch;
        });

        const countEl = document.getElementById('signedCount');
        if (countEl) countEl.textContent = `${filtered.length} signed`;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No signed agreements found matching your filters.</td></tr>`;
            return;
        }

        filtered.forEach(d => {
            const dateStr = d.agreedAt ? d.agreedAt.toDate().toLocaleString() : 'Unknown';
            tbody.innerHTML += `<tr>
                <td data-label="Pass ID"><strong>${d.passId}</strong></td>
                <td data-label="Name">${d.name}</td>
                <td data-label="Batch">${d.batch}</td>
                <td data-label="Agreed Date">${dateStr}</td>
                <td data-label="Signature">
                    <button class="btn btn-outline view-sig-btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" data-sig="${d.signature}" data-name="${d.name}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>`;
        });

        // Attach event listeners to new buttons
        document.querySelectorAll('.view-sig-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('sigModalName').textContent = btn.dataset.name;
                document.getElementById('sigModalImage').src = btn.dataset.sig;
                document.getElementById('signatureModal').classList.add('active');
            });
        });
    }

    // Filter Event Listeners
    document.getElementById('registrySearch')?.addEventListener('input', renderAllPasses);
    document.getElementById('registryGenderFilter')?.addEventListener('change', renderAllPasses);
    document.getElementById('registryBatchFilter')?.addEventListener('change', renderAllPasses);
    document.getElementById('registryStatusFilter')?.addEventListener('change', renderAllPasses);

    document.getElementById('scannedSearch')?.addEventListener('input', renderScannedGuests);
    document.getElementById('scannedGenderFilter')?.addEventListener('change', renderScannedGuests);
    document.getElementById('scannedBatchFilter')?.addEventListener('change', renderScannedGuests);

    document.getElementById('signedSearch')?.addEventListener('input', renderSignedGuests);
    document.getElementById('signedBatchFilter')?.addEventListener('change', renderSignedGuests);

    // ==========================================
    // 11. EXCEL EXPORT
    // ==========================================
    function exportTableToExcel(tableId, filename) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0 || rows[0].querySelector('.empty-state')) {
            showAlert('No data to export. Adjust filters or add data.', 'error');
            return;
        }

        const btn = tableId === 'allPassesTable' ? document.getElementById('exportAllExcelBtn') : document.getElementById('exportExcelBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            btn.disabled = true;
        }

        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.table_to_sheet(table);
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
            showAlert('Excel exported successfully!', 'success');
        } catch (err) {
            console.error(err);
            showAlert('Error generating Excel file.', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-file-excel"></i> Export Excel';
                btn.disabled = false;
            }
        }
    }

    document.getElementById('exportAllExcelBtn')?.addEventListener('click', () => exportTableToExcel('allPassesTable', 'All_Generated_Passes'));
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => exportTableToExcel('scannedTable', 'Scanned_Guests_Entry'));

    // ==========================================
    // PDF EXPORT FOR SIGNED AGREEMENTS
    // ==========================================
    document.getElementById('exportSignedPdfBtn')?.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setTextColor(27, 58, 92);
        doc.text("Flurries 26 - Signed Agreements", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        const search = document.getElementById('signedSearch')?.value.toLowerCase() || '';
        const batch = document.getElementById('signedBatchFilter')?.value || 'all';
        
        const filtered = allPassesData.filter(d => {
            if (!d.agreed) return false;
            const matchSearch = d.name.toLowerCase().includes(search) || (d.passId && d.passId.toLowerCase().includes(search));
            const matchBatch = batch === 'all' || d.batch === batch;
            return matchSearch && matchBatch;
        });

        if (filtered.length === 0) {
            doc.text("No signed agreements found for the selected filters.", 14, 45);
        } else {
            const tableData = filtered.map(d => [
                d.passId,
                d.name,
                d.batch,
                d.agreedAt ? d.agreedAt.toDate().toLocaleString() : 'Unknown',
                "Yes (On File)"
            ]);

            doc.autoTable({
                startY: 35,
                head: [['Pass ID', 'Name', 'Batch', 'Agreed Date', 'Signature']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [27, 58, 92], textColor: 255 },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    4: { cellWidth: 35, halign: 'center' }
                }
            });
        }

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Flurries 26 Official Document', 14, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 10);
        }

        doc.save(`Flurries26_Signed_Agreements_${new Date().toISOString().slice(0,10)}.pdf`);
    });

    // ==========================================
    // SIGNATURE MODAL CONTROLS
    // ==========================================
    const signatureModal = document.getElementById('signatureModal');
    const closeSignatureModalBtn = document.getElementById('closeSignatureModalBtn');
    
    if (closeSignatureModalBtn) {
        closeSignatureModalBtn.addEventListener('click', () => signatureModal.classList.remove('active'));
    }
    if (signatureModal) {
        signatureModal.addEventListener('click', (e) => { 
            if (e.target === signatureModal) signatureModal.classList.remove('active'); 
        });
    }
});

// ==========================================
// HELPER FUNCTIONS
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
        if (typeof QRCode !== 'undefined') {
            new QRCode(el, { text: data, width: 150, height: 150, colorDark: "#1B3A5C", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H }); 
        }
    }
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
