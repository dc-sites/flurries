import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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

let currentPassId = null;
let isDrawing = false;
let canvas, ctx;

document.addEventListener('DOMContentLoaded', () => {
    // Auto-fill if accessed via URL like: conditions.html?passId=FL26XXXX
    const urlParams = new URLSearchParams(window.location.search);
    const passIdFromUrl = urlParams.get('passId');
    if (passIdFromUrl) {
        document.getElementById('verifyPassId').value = passIdFromUrl.toUpperCase();
        verifyPass(passIdFromUrl.toUpperCase());
    }

    document.getElementById('verifyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        verifyPass(document.getElementById('verifyPassId').value.toUpperCase().trim());
    });

    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const submitBtn = document.getElementById('submitAgreementBtn');
    agreeCheckbox.addEventListener('change', () => {
        submitBtn.disabled = !agreeCheckbox.checked;
    });

    // Canvas Setup
    canvas = document.getElementById('signatureCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse Events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch Events (Mobile)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    document.getElementById('clearSignatureBtn').addEventListener('click', clearCanvas);
    submitBtn.addEventListener('click', submitAgreement);

    document.getElementById('closeSuccessModalBtn').addEventListener('click', () => {
        document.getElementById('successModal').classList.remove('active');
        window.location.href = 'index.html';
    });
});

async function verifyPass(passId) {
    const btn = document.querySelector('#verifyForm button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    try {
        const docSnap = await getDoc(doc(db, 'passes', passId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentPassId = passId;
            
            document.getElementById('displayPassId').textContent = data.passId;
            document.getElementById('displayName').textContent = data.name;
            document.getElementById('displayBatch').textContent = data.batch;
            document.getElementById('displayPhone').textContent = data.phone;

            document.getElementById('verifySection').classList.add('hidden');
            document.getElementById('agreementSection').classList.remove('hidden');
            
            if (data.agreedAt) {
                document.querySelector('.checkbox-group label').textContent = "You have already signed the agreement on " + new Date(data.agreedAt.toDate()).toLocaleString();
                document.getElementById('agreeCheckbox').checked = true;
                document.getElementById('agreeCheckbox').disabled = true;
                submitBtn.textContent = "Already Submitted";
                submitBtn.disabled = true;
            }
        } else {
            showAlert('Invalid Pass ID. Please check and try again.');
        }
    } catch (error) {
        console.error(error);
        showAlert('Connection error. Please try again.');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

function resizeCanvas() {
    const wrapper = canvas.parentElement;
    canvas.width = wrapper.clientWidth;
    canvas.height = 200;
    ctx.strokeStyle = '#1B3A5C';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
}

function stopDrawing() { isDrawing = false; }

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function submitAgreement() {
    if (!currentPassId) return;
    
    // Check if canvas is empty
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
        showAlert('Please provide your signature before submitting.');
        return;
    }

    const btn = document.getElementById('submitAgreementBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const signatureDataUrl = canvas.toDataURL('image/png');
        await updateDoc(doc(db, 'passes', currentPassId), {
            signature: signatureDataUrl,
            agreedAt: serverTimestamp(),
            status: 'agreed'
        });
        document.getElementById('successModal').classList.add('active');
    } catch (error) {
        console.error(error);
        showAlert('Error saving agreement. Please try again.');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

function showAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-error';
    alertDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '100px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.zIndex = '9999';
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
}
