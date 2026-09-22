document.addEventListener("DOMContentLoaded", () => {
    const fetchBtn = document.getElementById("fetch-pass-btn");
    const downloadBtn = document.getElementById("download-pass-btn");
    const ticketCard = document.getElementById("ticket-card");

    fetchBtn.addEventListener("click", async () => {
        const passId = document.getElementById("pass-id-input").value.trim().toUpperCase();
        if (!passId || passId.length !== 8) {
            alert("Please enter a valid 8-character Pass ID.");
            return;
        }

        fetchBtn.innerHTML = "Loading Pass...";
        const docRef = await db.collection("passes").doc(passId).get();

        if (!docRef.exists) {
            alert("Pass ID not found. Please contact the administrator.");
            fetchBtn.innerHTML = "Generate Pass";
            ticketCard.style.display = "none";
            downloadBtn.style.display = "none";
            return;
        }

        const data = docRef.data();
        
        // Populate text details on the left square layout
        document.getElementById("t-name").innerText = data.name;
        document.getElementById("t-phone").innerText = data.phone;
        document.getElementById("t-batch").innerText = data.batch;
        document.getElementById("t-id").innerText = data.passId;

        // Clear and render QR code onto the right square layout
        const qrContainer = document.getElementById("qrcode");
        qrContainer.innerHTML = "";
        
        // QR Code links directly to the verification info or pass ID text
        new QRCode(qrContainer, {
            text: data.passId,
            width: 130,
            height: 130,
            colorDark: "#0b192c",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        ticketCard.style.display = "block";
        downloadBtn.style.display = "block";
        fetchBtn.innerHTML = "Generate Pass";
    });

    // Download Pass as Image using html2canvas
    downloadBtn.addEventListener("click", () => {
        downloadBtn.innerHTML = "Processing Image...";
        html2canvas(ticketCard, { scale: 2, useCORS: true }).then(canvas => {
            const link = document.createElement("a");
            link.download = `Flurries26-Pass-${document.getElementById("t-id").innerText}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download Pass Image';
        });
    });
});
