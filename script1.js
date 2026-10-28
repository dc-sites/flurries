// ==========================================
// FIREBASE CONFIGURATION 
// ⚠️ REPLACE WITH YOUR ACTUAL FIREBASE PROJECT CONFIG
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDYDFZOUwH2K5wzoYcEECTtfFMoOMJv3Gs",
    authDomain: "flurries-32408.firebaseapp.com",
    projectId: "flurries-32408",
    storageBucket: "flurries-32408.firebasestorage.app",
    messagingSenderId: "459835238527",
    appId: "1:459835238527:web:fb9666e57f6d66457ab74a"
};


import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// DOM ELEMENTS
// ==========================================
const loginForm = document.getElementById("loginForm");
const adminContent = document.getElementById("adminContent");
const loginFormElement = document.getElementById("loginFormElement");
const logoutBtn = document.getElementById("logoutBtn");

const navItems = document.querySelectorAll(".nav-item, .bottom-nav-item");
const sections = document.querySelectorAll(".admin-section");

const startScannerBtn = document.getElementById("startScannerBtn");
const stopScannerBtn = document.getElementById("stopScannerBtn");
let html5QrcodeScanner = null;

const scanModal = document.getElementById("scanModal");
const closeScanModalBtn = document.getElementById("closeScanModalBtn");
const scanAnotherBtn = document.getElementById("scanAnotherBtn");
const passIdModal = document.getElementById("passIdModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const copyPassIdBtn = document.getElementById("copyPassIdBtn");

const addPassForm = document.getElementById("addPassForm");

const allPassesTableBody = document.querySelector("#allPassesTable tbody");
const scannedTableBody = document.querySelector("#scannedTable tbody");

const registrySearch = document.getElementById("registrySearch");
const registryBatchFilter = document.getElementById("registryBatchFilter");
const registryStatusFilter = document.getElementById("registryStatusFilter");

const scannedSearch = document.getElementById("scannedSearch");
const scannedBatchFilter = document.getElementById("scannedBatchFilter");

const exportAllPdfBtn = document.getElementById("exportAllPdfBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// ==========================================
// AUTHENTICATION
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginForm.classList.add("hidden");
        adminContent.classList.remove("hidden");
        loadAllPasses();
        loadScannedGuests();
    } else {
        loginForm.classList.remove("hidden");
        adminContent.classList.add("hidden");
    }
});

loginFormElement.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Login failed: " + error.message);
    }
});

logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth);
});

// ==========================================
// NAVIGATION
// ==========================================
navItems.forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        const targetSection = item.getAttribute("data-section");
        
        navItems.forEach(nav => nav.classList.remove("active"));
        document.querySelectorAll(`[data-section="${targetSection}"]`).forEach(nav => nav.classList.add("active"));
        
        sections.forEach(section => {
            section.classList.remove("active");
            if (section.id === `section-${targetSection}`) {
                section.classList.add("active");
            }
        });

        if (targetSection !== "scan" && html5QrcodeScanner) {
            stopScanner();
        }
    });
});

// ==========================================
// PASS GENERATION
// ==========================================
function generatePassId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "FL26-";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

addPassForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("userName").value.trim();
    const phone = document.getElementById("userPhone").value.trim();
    const gender = document.getElementById("userGender").value;
    const batch = document.getElementById("userBatch").value;
    const passId = generatePassId();

    try {
        await setDoc(doc(db, "passes", passId), {
            passId: passId,
            name: name,
            phone: phone,
            gender: gender,
            batch: batch,
            status: "Not Scanned",
            scannedAt: null,
            createdAt: serverTimestamp()
        });

        document.getElementById("modalPassId").innerText = passId;
        document.getElementById("modalName").innerText = name;
        document.getElementById("modalPhone").innerText = phone;
        document.getElementById("modalBatch").innerText = batch;
        passIdModal.classList.add("active");
        
        addPassForm.reset();
        loadAllPasses();
    } catch (err) {
        alert("Error saving pass: " + err.message);
    }
});

closeModalBtn.addEventListener("click", () => {
    passIdModal.classList.remove("active");
    document.getElementById("copySuccessMsg").classList.remove("show");
});

copyPassIdBtn.addEventListener("click", () => {
    const passId = document.getElementById("modalPassId").innerText;
    navigator.clipboard.writeText(passId).then(() => {
        document.getElementById("copySuccessMsg").classList.add("show");
        setTimeout(() => document.getElementById("copySuccessMsg").classList.remove("show"), 2000);
    });
});

// ==========================================
// QR SCANNER
// ==========================================
startScannerBtn.addEventListener("click", () => {
    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        () => {} // Ignore scan failures (continuous scanning)
    ).then(() => {
        startScannerBtn.disabled = true;
        stopScannerBtn.disabled = false;
    }).catch(err => {
        alert("Camera error: " + err);
    });
});

stopScannerBtn.addEventListener("click", stopScanner);

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
            startScannerBtn.disabled = false;
            stopScannerBtn.disabled = true;
        }).catch(err => console.error("Failed to stop", err));
    }
}

async function onScanSuccess(decodedText) {
    await stopScanner(); // Prevent multiple rapid scans
    
    const passId = decodedText.trim().toUpperCase();
    const docRef = doc(db, "passes", passId);
    const docSnap = await getDoc(docRef);

    const header = document.getElementById("scanModalHeader");
    const icon = document.getElementById("scanModalIcon");
    const title = document.getElementById("scanModalTitle");
    const timeField = document.getElementById("scanTimeField");

    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById("scanName").innerText = data.name;
        document.getElementById("scanPassId").innerText = data.passId;
        document.getElementById("scanBatch").innerText = data.batch;

        if (data.status === "Scanned") {
            header.className = "modal-header scan-header warning";
            icon.className = "fas fa-exclamation-triangle";
            title.innerText = "Already Scanned";
            timeField.style.display = "flex";
            document.getElementById("scanTime").innerText = data.scannedAt ? new Date(data.scannedAt.toDate()).toLocaleString() : "Unknown";
        } else {
            await updateDoc(docRef, {
                status: "Scanned",
                scannedAt: serverTimestamp()
            });
            header.className = "modal-header scan-header success";
            icon.className = "fas fa-check-circle";
            title.innerText = "Access Granted";
            timeField.style.display = "none";
            
            loadAllPasses();
            loadScannedGuests();
        }
    } else {
        header.className = "modal-header scan-header warning";
        icon.className = "fas fa-times-circle";
        title.innerText = "Invalid Pass";
        document.getElementById("scanName").innerText = "-";
        document.getElementById("scanPassId").innerText = passId;
        document.getElementById("scanBatch").innerText = "-";
        timeField.style.display = "none";
    }

    scanModal.classList.add("active");
}

closeScanModalBtn.addEventListener("click", () => scanModal.classList.remove("active"));
scanAnotherBtn.addEventListener("click", () => {
    scanModal.classList.remove("active");
    startScannerBtn.click();
});

// ==========================================
// DATA LOADING & FILTERING
// ==========================================
let allPassesData = [];
let scannedGuestsData = [];

async function loadAllPasses() {
    const q = query(collection(db, "passes"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    allPassesData = [];
    querySnapshot.forEach((doc) => allPassesData.push(doc.data()));
    renderAllPasses();
}

async function loadScannedGuests() {
    const q = query(collection(db, "passes"), orderBy("scannedAt", "desc"));
    const querySnapshot = await getDocs(q);
    scannedGuestsData = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "Scanned") scannedGuestsData.push(data);
    });
    renderScannedGuests();
}

function renderAllPasses() {
    const search = registrySearch.value.toLowerCase();
    const batch = registryBatchFilter.value;
    const status = registryStatusFilter.value;

    const filtered = allPassesData.filter(pass => {
        const matchSearch = pass.name.toLowerCase().includes(search) || pass.passId.toLowerCase().includes(search);
        const matchBatch = batch === "all" || pass.batch === batch;
        const matchStatus = status === "all" || pass.status === status;
        return matchSearch && matchBatch && matchStatus;
    });

    allPassesTableBody.innerHTML = "";
    if (filtered.length === 0) {
        allPassesTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No passes found matching your filters.</td></tr>`;
        return;
    }

    filtered.forEach(pass => {
        const tr = document.createElement("tr");
        const statusColor = pass.status === "Scanned" ? "#16a34a" : "#dc2626";
        tr.innerHTML = `
            <td data-label="Pass ID"><strong>${pass.passId}</strong></td>
            <td data-label="Name">${pass.name}</td>
            <td data-label="Gender">${pass.gender}</td>
            <td data-label="Batch">${pass.batch}</td>
            <td data-label="Status"><span style="color: ${statusColor}; font-weight: 700;">${pass.status}</span></td>
        `;
        allPassesTableBody.appendChild(tr);
    });
}

function renderScannedGuests() {
    const search = scannedSearch.value.toLowerCase();
    const batch = scannedBatchFilter.value;

    const filtered = scannedGuestsData.filter(pass => {
        const matchSearch = pass.name.toLowerCase().includes(search) || pass.passId.toLowerCase().includes(search);
        const matchBatch = batch === "all" || pass.batch === batch;
        return matchSearch && matchBatch;
    });

    scannedTableBody.innerHTML = "";
    if (filtered.length === 0) {
        scannedTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No scanned guests found matching your filters.</td></tr>`;
        return;
    }

    filtered.forEach(pass => {
        const tr = document.createElement("tr");
        const entryTime = pass.scannedAt ? new Date(pass.scannedAt.toDate()).toLocaleString() : "Unknown";
        tr.innerHTML = `
            <td data-label="Pass ID"><strong>${pass.passId}</strong></td>
            <td data-label="Name">${pass.name}</td>
            <td data-label="Gender">${pass.gender}</td>
            <td data-label="Batch">${pass.batch}</td>
            <td data-label="Entry Time">${entryTime}</td>
        `;
        scannedTableBody.appendChild(tr);
    });
}

// Filter Event Listeners
registrySearch.addEventListener("input", renderAllPasses);
registryBatchFilter.addEventListener("change", renderAllPasses);
registryStatusFilter.addEventListener("change", renderAllPasses);

scannedSearch.addEventListener("input", renderScannedGuests);
scannedBatchFilter.addEventListener("change", renderScannedGuests);

// ==========================================
// PROFESSIONAL PDF EXPORT
// ==========================================
function exportToPDF(tableId, reportTitle) {
    const element = document.getElementById("pdf-export-template");
    document.getElementById("pdf-report-title").innerText = reportTitle;
    document.getElementById("pdf-generation-date").innerText = new Date().toLocaleString();
    
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll("tbody tr");
    const pdfTbody = document.getElementById("pdf-table-body");
    const pdfThead = document.getElementById("pdf-table-head");
    
    pdfTbody.innerHTML = "";
    
    // Dynamically set headers based on report type
    if (reportTitle.includes("Scanned")) {
        pdfThead.innerHTML = `<th>Pass ID</th><th>Name</th><th>Gender</th><th>Batch</th><th>Entry Time</th>`;
    } else {
        pdfThead.innerHTML = `<th>Pass ID</th><th>Name</th><th>Gender</th><th>Batch</th><th>Status</th>`;
    }

    let hasData = false;
    rows.forEach(row => {
        if (row.classList.contains("empty-state")) return;
        hasData = true;
        const tr = document.createElement("tr");
        const cells = row.querySelectorAll("td");
        cells.forEach(cell => {
            const td = document.createElement("td");
            td.innerText = cell.innerText;
            tr.appendChild(td);
        });
        pdfTbody.appendChild(tr);
    });

    if (!hasData) {
        alert("No data to export! Adjust your filters or add passes first.");
        return;
    }

    // Temporarily make visible for html2pdf to capture
    element.style.position = "absolute";
    element.style.left = "0";
    element.style.top = "0";
    element.style.opacity = "1";
    element.style.zIndex = "9999";

    const opt = {
        margin: 10,
        filename: `${reportTitle.replace(/\s+/g, "_")}_${Date.now()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // Hide again after export
        element.style.position = "absolute";
        element.style.left = "-9999px";
        element.style.opacity = "0";
        element.style.zIndex = "-1";
    });
}

exportAllPdfBtn.addEventListener("click", () => exportToPDF("allPassesTable", "All Passes Registry Report"));
exportPdfBtn.addEventListener("click", () => exportToPDF("scannedTable", "Scanned Guests Entry Report"));
