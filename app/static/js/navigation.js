window.Anubis = window.Anubis || {};

Anubis.shelvesMatrix = function(){
    return [...document.querySelectorAll(".fridge")].map(fridge => {
        return [...fridge.querySelectorAll(".shelf")];
    });
};

Anubis.unknownZone = function(){
    return document.querySelector(".unknown-zone");
};

Anubis.unknownBodies = function(){
    return [...document.querySelectorAll(".unknown-zone .body-chip")];
};

Anubis.clearSelection = function(){
    document.querySelectorAll(".selected-nav").forEach(x => {
        x.classList.remove("selected-nav");
    });
};

Anubis.clearCarryingStyle = function(){
    document.querySelectorAll(".carrying").forEach(x => {
        x.classList.remove("carrying");
    });
};

Anubis.bodiesOn = function(fridgeIndex, shelfIndex){
    const matrix = Anubis.shelvesMatrix();

    if (!matrix[fridgeIndex] || !matrix[fridgeIndex][shelfIndex]) {
        return [];
    }

    return [...matrix[fridgeIndex][shelfIndex].querySelectorAll(".body-chip")];
};

Anubis.currentShelfElement = function(){
    const matrix = Anubis.shelvesMatrix();

    if (!matrix[Anubis.nav.fridge]) return null;
    if (!matrix[Anubis.nav.fridge][Anubis.nav.shelf]) return null;

    return matrix[Anubis.nav.fridge][Anubis.nav.shelf];
};

Anubis.currentElement = function(){
    if (Anubis.nav.area === "unknown") {
        const bodies = Anubis.unknownBodies();

        if (Anubis.nav.mode === "body" && bodies.length) {
            if (Anubis.nav.body >= bodies.length) Anubis.nav.body = bodies.length - 1;
            return bodies[Anubis.nav.body];
        }

        return Anubis.unknownZone();
    }

    const shelf = Anubis.currentShelfElement();
    if (!shelf) return null;

    const bodies = Anubis.bodiesOn(Anubis.nav.fridge, Anubis.nav.shelf);

    if (Anubis.nav.mode === "body" && bodies.length) {
        if (Anubis.nav.body >= bodies.length) Anubis.nav.body = bodies.length - 1;
        return bodies[Anubis.nav.body];
    }

    return shelf;
};

Anubis.paintSelection = function(){
    Anubis.clearSelection();

    const el = Anubis.currentElement();
    if (!el) return;

    el.classList.add("selected-nav");

    Anubis.clearCarryingStyle();
    if (Anubis.carriedBodyId && Anubis.carriedElement) {
        Anubis.carriedElement.classList.add("carrying");
    }

    el.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth"
    });
};

Anubis.initSelection = function(){
    if (!Anubis.restoreNavState()) {
        Anubis.nav.area = "fridge";
        Anubis.nav.mode = "shelf";
        Anubis.nav.fridge = 0;
        Anubis.nav.shelf = 0;
        Anubis.nav.body = 0;
    }

    Anubis.paintSelection();
};

Anubis.moveLeft = function(){
    if (Anubis.nav.area === "unknown") {
        Anubis.nav.area = "fridge";
        Anubis.nav.mode = "shelf";
        Anubis.nav.fridge = 2;
        Anubis.nav.shelf = 4;
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
        return;
    }

    if (Anubis.nav.fridge > 0) {
        Anubis.nav.fridge--;
        Anubis.nav.mode = "shelf";
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
    }
};

Anubis.moveRight = function(){
    if (Anubis.nav.area === "unknown") return;

    const maxFridge = Anubis.shelvesMatrix().length - 1;

    if (Anubis.nav.fridge < maxFridge) {
        Anubis.nav.fridge++;
        Anubis.nav.mode = "shelf";
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
    }
};

Anubis.moveUp = function(){
    if (Anubis.nav.area === "unknown") {
        Anubis.nav.area = "fridge";
        Anubis.nav.mode = "shelf";
        Anubis.nav.shelf = 4;
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
        return;
    }

    if (Anubis.nav.mode === "body") {
        if (Anubis.nav.body > 0) {
            Anubis.nav.body--;
        } else {
            Anubis.nav.mode = "shelf";
            Anubis.nav.body = 0;
        }

        Anubis.paintSelection();
        Anubis.saveNavState();
        return;
    }

    if (Anubis.nav.shelf > 0) {
        Anubis.nav.shelf--;
        Anubis.nav.mode = "shelf";
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
    }
};

Anubis.moveDown = function(){
    if (Anubis.nav.area === "unknown") {
        const bodies = Anubis.unknownBodies();

        if (Anubis.nav.mode === "shelf" && bodies.length) {
            Anubis.nav.mode = "body";
            Anubis.nav.body = 0;
            Anubis.paintSelection();
            Anubis.saveNavState();
            return;
        }

        if (Anubis.nav.mode === "body" && Anubis.nav.body < bodies.length - 1) {
            Anubis.nav.body++;
            Anubis.paintSelection();
            Anubis.saveNavState();
        }

        return;
    }

    const bodies = Anubis.bodiesOn(Anubis.nav.fridge, Anubis.nav.shelf);

    if (Anubis.nav.mode === "shelf" && bodies.length) {
        Anubis.nav.mode = "body";
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
        return;
    }

    if (Anubis.nav.mode === "body") {
        if (Anubis.nav.body < bodies.length - 1) {
            Anubis.nav.body++;
            Anubis.paintSelection();
            Anubis.saveNavState();
            return;
        }

        if (Anubis.nav.shelf < 4) {
            Anubis.nav.shelf++;
            Anubis.nav.mode = "shelf";
            Anubis.nav.body = 0;
            Anubis.paintSelection();
            Anubis.saveNavState();
            return;
        }

        Anubis.nav.area = "unknown";
        Anubis.nav.mode = "shelf";
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
        return;
    }

    if (Anubis.nav.shelf < 4) {
        Anubis.nav.shelf++;
        Anubis.nav.mode = "shelf";
        Anubis.nav.body = 0;
        Anubis.paintSelection();
        Anubis.saveNavState();
        return;
    }

    Anubis.nav.area = "unknown";
    Anubis.nav.mode = "shelf";
    Anubis.nav.body = 0;
    Anubis.paintSelection();
    Anubis.saveNavState();
};

Anubis.getSelectedBodyId = function(){
    const el = Anubis.currentElement();

    if (el && el.classList.contains("body-chip")) {
        return Number(el.dataset.bodyId);
    }

    return null;
};

Anubis.getSelectedTarget = function(){
    if (Anubis.nav.area === "unknown") {
        return { fridge: 0, shelf: 0 };
    }

    const shelf = Anubis.currentShelfElement();

    if (!shelf) return null;

    return {
        fridge: Number(shelf.dataset.fridge),
        shelf: Number(shelf.dataset.shelf)
    };
};

Anubis.getActiveBodyIdForVoice = function(){
    if (Anubis.modalIsOpen() && Anubis.getOpenedBodyId() > 0) {
        return Anubis.getOpenedBodyId();
    }

    return Anubis.getSelectedBodyId();
};


// Рамка выделения на главной следует за мышкой.
// Клавиатурная навигация остаётся рабочей: hover только синхронизирует Anubis.nav.
Anubis.syncSelectionFromHoveredElement = function(el){
    if (!el || !Anubis.nav) return;

    const body = el.closest(".body-chip");
    if (body) {
        const unknown = body.closest(".unknown-zone");
        if (unknown) {
            const bodies = Anubis.unknownBodies();
            Anubis.nav.area = "unknown";
            Anubis.nav.mode = "body";
            Anubis.nav.body = Math.max(0, bodies.indexOf(body));
        } else {
            const shelf = body.closest(".shelf");
            const fridge = body.closest(".fridge");
            if (!shelf || !fridge) return;

            const fridges = [...document.querySelectorAll(".fridge")];
            const shelves = [...fridge.querySelectorAll(".shelf")];
            const bodies = [...shelf.querySelectorAll(".body-chip")];

            Anubis.nav.area = "fridge";
            Anubis.nav.mode = "body";
            Anubis.nav.fridge = Math.max(0, fridges.indexOf(fridge));
            Anubis.nav.shelf = Math.max(0, shelves.indexOf(shelf));
            Anubis.nav.body = Math.max(0, bodies.indexOf(body));
        }

        Anubis.clearSelection();
        body.classList.add("selected-nav");
        if (typeof Anubis.saveNavState === "function") Anubis.saveNavState();
        return;
    }

    const shelf = el.closest(".shelf");
    if (shelf) {
        const fridge = shelf.closest(".fridge");
        const fridges = [...document.querySelectorAll(".fridge")];
        const shelves = [...fridge.querySelectorAll(".shelf")];

        Anubis.nav.area = "fridge";
        Anubis.nav.mode = "shelf";
        Anubis.nav.fridge = Math.max(0, fridges.indexOf(fridge));
        Anubis.nav.shelf = Math.max(0, shelves.indexOf(shelf));
        Anubis.nav.body = 0;

        Anubis.clearSelection();
        shelf.classList.add("selected-nav");
        if (typeof Anubis.saveNavState === "function") Anubis.saveNavState();
        return;
    }

    const unknownZone = el.closest(".unknown-zone");
    if (unknownZone) {
        Anubis.nav.area = "unknown";
        Anubis.nav.mode = "shelf";
        Anubis.nav.body = 0;

        Anubis.clearSelection();
        unknownZone.classList.add("selected-nav");
        if (typeof Anubis.saveNavState === "function") Anubis.saveNavState();
    }
};

document.addEventListener("pointerover", function(e){
    if (Anubis.modalIsOpen && Anubis.modalIsOpen()) return;
    const target = e.target.closest(".body-chip, .shelf, .unknown-zone");
    if (!target) return;
    Anubis.syncSelectionFromHoveredElement(target);
}, {passive:true});


// Подсветка именно той группы фамилий, из-за которой стоит ❗.
// Логика повторяет backend services/body_logic.py:surname_similarity().
Anubis.clearDuplicateSurnameHighlight = function(){
    document
        .querySelectorAll(".duplicate-surname-highlight")
        .forEach(el => el.classList.remove("duplicate-surname-highlight"));
};

Anubis.normalizeSurnameForHighlight = function(value){
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^а-яa-z]/g, "");
};

Anubis.getSurnameFromBodyCard = function(card){
    if (!card) return "";

    if (card.dataset && card.dataset.surname) {
        return Anubis.normalizeSurnameForHighlight(card.dataset.surname);
    }

    const nameText = card.dataset && card.dataset.name
        ? card.dataset.name
        : (card.querySelector(".body-name, strong") || card).textContent;

    return Anubis.normalizeSurnameForHighlight(String(nameText || "").split(/\s+/)[0]);
};

Anubis.cardHasDuplicateWarn = function(card){
    return !!(card && card.querySelector(".duplicate-warn, .warn"));
};

Anubis.sequenceSimilarity = function(a, b){
    a = Anubis.normalizeSurnameForHighlight(a);
    b = Anubis.normalizeSurnameForHighlight(b);

    if (!a || !b) return 0;
    if (a === b) return 1;

    const m = a.length;
    const n = b.length;

    const dp = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Быстрый аналог SequenceMatcher ratio для коротких фамилий:
    // 2*M / (len(a)+len(b)), где M — длина LCS.
    return (2 * dp[m][n]) / (m + n);
};

Anubis.surnamesAreSimilar = function(a, b){
    a = Anubis.normalizeSurnameForHighlight(a);
    b = Anubis.normalizeSurnameForHighlight(b);

    if (!a || !b) return false;
    if (a === b) return true;

    if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) {
        return true;
    }

    if (a.length >= 5 && b.length >= 5 && a.slice(0, 3) === b.slice(0, 3)) {
        return true;
    }

    return Anubis.sequenceSimilarity(a, b) >= 0.68;
};

Anubis.highlightDuplicateSurnamesFor = function(card){
    const surname = Anubis.getSurnameFromBodyCard(card);
    if (!surname) return;

    document.querySelectorAll(".body-chip, .issue-body-card").forEach(other => {
        const otherSurname = Anubis.getSurnameFromBodyCard(other);

        // Подсвечиваем ровно тех, кого та же логика считает похожими.
        // ❗ на второй карточке не обязателен: если backend поставил ❗ на одной,
        // группа всё равно вычисляется симметрично.
        if (Anubis.surnamesAreSimilar(surname, otherSurname)) {
            other.classList.add("duplicate-surname-highlight");
        }
    });
};

document.addEventListener("pointerover", function(e){
    const warn = e.target.closest(".duplicate-warn, .warn");
    if (!warn) return;

    const card = warn.closest(".body-chip, .issue-body-card");
    if (!card) return;

    Anubis.clearDuplicateSurnameHighlight();
    Anubis.highlightDuplicateSurnamesFor(card);
}, {passive:true});

document.addEventListener("pointerout", function(e){
    const warn = e.target.closest(".duplicate-warn, .warn");
    if (!warn) return;

    const to = e.relatedTarget;
    if (to && to.closest && (to.closest(".duplicate-warn, .warn") || to.closest(".duplicate-surname-highlight"))) return;

    Anubis.clearDuplicateSurnameHighlight();
}, {passive:true});


// Убираем жёлтые рамки, когда мышь ушла с восклицательного знака/подсвеченной группы.
document.addEventListener("pointermove", function(e){
    if (!document.querySelector(".duplicate-surname-highlight")) return;
    if (e.target.closest(".duplicate-warn, .warn, .duplicate-surname-highlight")) return;
    Anubis.clearDuplicateSurnameHighlight();
}, {passive:true});

document.addEventListener("pointerleave", function(){
    Anubis.clearDuplicateSurnameHighlight();
}, {passive:true});


// Горизонтальная прокрутка тел внутри полки при наведении на край.
Anubis.shelfEdgeScrollTimers = Anubis.shelfEdgeScrollTimers || new WeakMap();

Anubis.startShelfEdgeScroll = function(edge){
    const shelf = edge && edge.closest(".shelf");
    if (!shelf) return;

    const scroller = shelf.querySelector(".shelf-bodies-scroll");
    if (!scroller) return;

    const dir = Number(edge.dataset.dir || 0);
    if (!dir) return;

    Anubis.stopShelfEdgeScroll(edge);

    const timer = setInterval(() => {
        scroller.scrollLeft += dir * 18;
    }, 24);

    Anubis.shelfEdgeScrollTimers.set(edge, timer);
};

Anubis.stopShelfEdgeScroll = function(edge){
    const timer = Anubis.shelfEdgeScrollTimers.get(edge);
    if (timer) {
        clearInterval(timer);
        Anubis.shelfEdgeScrollTimers.delete(edge);
    }
};

document.addEventListener("mouseenter", function(e){
    const edge = e.target.closest && e.target.closest(".shelf-scroll-edge");
    if (edge) Anubis.startShelfEdgeScroll(edge);
}, true);

document.addEventListener("mouseleave", function(e){
    const edge = e.target.closest && e.target.closest(".shelf-scroll-edge");
    if (edge) Anubis.stopShelfEdgeScroll(edge);
}, true);


// === Smooth horizontal scroll for shelves and floor ===
Anubis.edgeScrollTimers = Anubis.edgeScrollTimers || new WeakMap();

Anubis.ensureShelfAndFloorScrollState = function(){
    document.querySelectorAll(".shelf").forEach(shelf => {
        const scroller = shelf.querySelector(".shelf-bodies-scroll");
        if (!scroller) return;

        const count = scroller.querySelectorAll(".body-chip").length;
        shelf.classList.toggle("has-side-scroll", count > 2);

        if (count > 2 && !shelf.querySelector(".shelf-scroll-left")) {
            const left = document.createElement("div");
            left.className = "shelf-scroll-edge shelf-scroll-left";
            left.dataset.dir = "-1";

            const right = document.createElement("div");
            right.className = "shelf-scroll-edge shelf-scroll-right";
            right.dataset.dir = "1";

            shelf.appendChild(left);
            shelf.appendChild(right);
        }
    });

    const floor = document.querySelector(".unknown-zone");
    const floorBodies = floor && floor.querySelector(".unknown-bodies");
    if (floor && floorBodies) {
        const count = floorBodies.querySelectorAll(".body-chip, .unknown-chip").length;
        floor.classList.toggle("has-floor-scroll", count > 18);

        if (count > 18 && !floor.querySelector(".floor-scroll-left")) {
            const left = document.createElement("div");
            left.className = "floor-scroll-edge floor-scroll-left";
            left.dataset.dir = "-1";

            const right = document.createElement("div");
            right.className = "floor-scroll-edge floor-scroll-right";
            right.dataset.dir = "1";

            floor.appendChild(left);
            floor.appendChild(right);
        }
    }
};

Anubis.startSmoothEdgeScroll = function(edge){
    if (!edge) return;

    const dir = Number(edge.dataset.dir || 0);
    if (!dir) return;

    const shelf = edge.closest(".shelf");
    const floor = edge.closest(".unknown-zone");

    const scroller = shelf
        ? shelf.querySelector(".shelf-bodies-scroll")
        : floor && floor.querySelector(".unknown-bodies");

    if (!scroller) return;

    Anubis.stopSmoothEdgeScroll(edge);

    let raf = null;
    let last = performance.now();

    const step = (now) => {
        const dt = Math.min(32, now - last);
        last = now;

        scroller.scrollLeft += dir * dt * 0.42;

        raf = requestAnimationFrame(step);
        Anubis.edgeScrollTimers.set(edge, raf);
    };

    raf = requestAnimationFrame(step);
    Anubis.edgeScrollTimers.set(edge, raf);
};

Anubis.stopSmoothEdgeScroll = function(edge){
    const raf = Anubis.edgeScrollTimers.get(edge);
    if (raf) {
        cancelAnimationFrame(raf);
        Anubis.edgeScrollTimers.delete(edge);
    }
};

document.addEventListener("mouseenter", function(e){
    const edge = e.target.closest && e.target.closest(".shelf-scroll-edge, .floor-scroll-edge");
    if (edge) Anubis.startSmoothEdgeScroll(edge);
}, true);

document.addEventListener("mouseleave", function(e){
    const edge = e.target.closest && e.target.closest(".shelf-scroll-edge, .floor-scroll-edge");
    if (edge) Anubis.stopSmoothEdgeScroll(edge);
}, true);

window.addEventListener("load", Anubis.ensureShelfAndFloorScrollState);
setTimeout(Anubis.ensureShelfAndFloorScrollState, 300);
