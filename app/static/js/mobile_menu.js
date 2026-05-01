window.Anubis = window.Anubis || {};

Anubis.openMobileMenu = function(){
    const sheet = document.getElementById("mobileSheet");
    const backdrop = document.getElementById("mobileMenuBackdrop");
    if (!sheet || !backdrop) return;

    backdrop.hidden = false;
    backdrop.style.display = "block";
    requestAnimationFrame(() => {
        sheet.classList.add("open");
        backdrop.classList.add("open");
        sheet.setAttribute("aria-hidden", "false");
        document.body.classList.add("mobile-menu-open");
    });
};

Anubis.closeMobileMenu = function(){
    const sheet = document.getElementById("mobileSheet");
    const backdrop = document.getElementById("mobileMenuBackdrop");
    if (!sheet || !backdrop) return;

    sheet.classList.remove("open");
    backdrop.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-menu-open");

    setTimeout(() => {
        if (!backdrop.classList.contains("open")) {
            backdrop.hidden = true;
            backdrop.style.display = "none";
        }
    }, 220);
};

document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("mobileMenuOpen");
    const closeBtn = document.getElementById("mobileMenuClose");
    const backdrop = document.getElementById("mobileMenuBackdrop");

    if (backdrop) {
        backdrop.hidden = true;
        backdrop.style.display = "none";
    }

    openBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        Anubis.openMobileMenu();
    });

    closeBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        Anubis.closeMobileMenu();
    });

    backdrop?.addEventListener("click", (e) => {
        e.preventDefault();
        Anubis.closeMobileMenu();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") Anubis.closeMobileMenu();
    });
});
