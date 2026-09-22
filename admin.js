document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const passForm = document.getElementById("pass-form");
    const successMsg = document.getElementById("success-msg");
    const verifyBtn = document.getElementById("verify-btn");
    const verifyResult = document.getElementById("verify-result");

    // Track Auth State
    auth.onAuthStateChanged(user => {
        if (user) {
            loginSection.style.display = "none";
            dashboardSection.style.display = "block";
        } else {
            loginSection.style.display = "block";
            dashboardSection.style.display = "none";
        }
    });

    // Login Handler
    loginBtn.addEventListener("click", () => {
        const email = document.getElementById("admin-email").value;
        const password = document.getElementById("admin-password").value;
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => alert("Login failed: " + error.message));
    });

    // Logout Handler
    logoutBtn.addEventListener("click", () => {
        auth.signOut();
    });

    // Helper: Generate random 8-character alphanumeric ID
    function generatePassId() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Pass Generation Submit Handler
    passForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("user-name").value;
        const phone = document.getElementById("user-phone").value;
        const batch = document.getElementById("user-batch").value;
        const passId = generatePassId();

        try {
            await db.collection("passes").doc(passId).set({
                name: name,
                phone: phone,
                batch: batch,
                passId: passId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            successMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Pass successfully created! Pass ID: <strong>${passId}</strong>`;
            passForm.reset();
        } catch (err) {
            alert("Error saving pass: " + err.message);
        }
    });

    // Pass Verification Handler (Event Day Scanner/Lookup)
    verifyBtn.addEventListener("click", async () => {
        const searchId = document.getElementById("search-pass-id").value.trim().toUpperCase();
        if (!searchId) return alert("Please enter a Pass ID");

        verifyResult.style.display = "block";
        verifyResult.innerHTML = "Searching...";

        const docRef = await db.collection("passes").doc(searchId).get();
        if (docRef.exists) {
            const data = docRef.data();
            verifyResult.innerHTML = `
                <h3 style="color: #2a9d8f;"><i class="fa-solid fa-circle-check"></i> Valid Pass Verified!</h3>
                <p><strong>Name:</strong> ${data.name}</p>
                <p><strong>Phone:</strong> ${data.phone}</p>
                <p><strong>Batch:</strong> ${data.batch}</p>
                <p><strong>Pass ID:</strong> ${data.passId}</p>
            `;
        } else {
            verifyResult.innerHTML = `<h3 style="color: #e63946;"><i class="fa-solid fa-triangle-exclamation"></i> Invalid Pass ID! Not found in database.</h3>`;
        }
    });
});
