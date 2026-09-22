// Lightweight background snowfall animation effect
document.addEventListener("DOMContentLoaded", () => {
    const snowflakeCount = 45;
    for (let i = 0; i < snowflakeCount; i++) {
        const snowflake = document.createElement("div");
        snowflake.classList.add("snowflake");
        
        const size = Math.random() * 5 + 3 + "px";
        snowflake.style.width = size;
        snowflake.style.height = size;
        
        snowflake.style.left = Math.random() * 100 + "vw";
        snowflake.style.animationDuration = Math.random() * 5 + 5 + "s";
        snowflake.style.animationDelay = Math.random() * 5 + "s";
        
        document.body.appendChild(snowflake);
    }
});
