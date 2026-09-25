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
    // ==========================================
    // 5-SECOND PRELOADER LOGIC
    // ==========================================
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('preloader-hidden');
            document.body.classList.remove('loading');
            
            // Completely remove from DOM after fade-out for performance
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 800);
        }, 5000); // 5000 milliseconds = 5 seconds
    }

    
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
    if (logoutBtn) logoutBtn.addEventListener('click', () => { signOut(auth); window.location.href = 'index.html'; });

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
                btn.innerHTML = originalHTML; btn.disabled = false; 
            }
        });
    }

    // 8. Download Pass Button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadPass);
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

        // Mobile rendering trick: Temporarily expand to desktop size for crisp export
        if (isMobile) {
            originalStyles = {
                width: passElement.style.width,
                maxWidth: passElement.style.maxWidth,
                position: passElement.style.position,
                left: passElement.style.left,
                top: passElement.style.top,
                zIndex: passElement.style.zIndex,
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
            scale: isMobile ? 3 : 2, 
            backgroundColor: '#ffffff', 
            useCORS: true,
            logging: false
        });

        // Restore original styles
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
