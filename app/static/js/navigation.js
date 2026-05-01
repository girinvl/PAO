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
    let velocity = 0;

    const targetVelocity = shelf ? 0.62 : 0.42;

    const step = (now) => {
        const dt = Math.min(32, now - last);
        last = now;

        velocity += (targetVelocity - velocity) * 0.18;
        scroller.scrollLeft += dir * dt * velocity;

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


// === Hotkey F: поиск похожих фамилий ===
Anubis.normalizeFindSurname = function(value){
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^а-яa-z]/g, "");
};

Anubis.similarityRatio = function(a, b){
    a = Anubis.normalizeFindSurname(a);
    b = Anubis.normalizeFindSurname(b);

    if (!a || !b) return 0;
    if (a === b) return 1;

    const m = a.length;
    const n = b.length;
    const dp = Array.from({length:m+1}, () => new Array(n+1).fill(0));

    for (let i=1;i<=m;i++){
        for (let j=1;j<=n;j++){
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);
        }
    }

    return (2 * dp[m][n]) / (m + n);
};

Anubis.cardSurnameForFind = function(card){
    if (!card) return "";

    if (card.dataset && card.dataset.surname) {
        return Anubis.normalizeFindSurname(card.dataset.surname);
    }

    const nameEl = card.querySelector(".body-name, strong");
    const text = nameEl ? nameEl.textContent : card.textContent;
    return Anubis.normalizeFindSurname(String(text || "").split(/\s+/)[0]);
};

Anubis.clearFindBlink = function(){
    document.querySelectorAll(".find-blink").forEach(el => el.classList.remove("find-blink"));
    document.body.classList.remove("find-mode");
    if (Anubis.findBlinkTimer) {
        clearTimeout(Anubis.findBlinkTimer);
        Anubis.findBlinkTimer = null;
    }
};

Anubis.runSurnameFind = function(query){
    const q = Anubis.normalizeFindSurname(query);
    if (!q) return;

    Anubis.clearFindBlink();
    document.body.classList.add("find-mode");

    let firstFound = null;

    document.querySelectorAll(".body-chip, .unknown-chip").forEach(card => {
        const s = Anubis.cardSurnameForFind(card);

        const similar =
            s === q ||
            s.startsWith(q) ||
            q.startsWith(s) ||
            Anubis.similarityRatio(q, s) >= 0.62;

        if (similar) {
            card.classList.add("find-blink");
            if (!firstFound) firstFound = card;
        }
    });

    if (firstFound) {
        const scroller = firstFound.closest(".unknown-bodies, .shelf-bodies-scroll");
        if (scroller) {
            firstFound.scrollIntoView({
                behavior:"smooth",
                block:"nearest",
                inline:"center"
            });
        }
    }

    Anubis.findBlinkTimer = setTimeout(Anubis.clearFindBlink, 7000);
};

Anubis.openFindPopup = function(){
    Anubis.findPopupOpen = true;
    if (document.querySelector(".anubis-find-popup")) return;

    const popup = document.createElement("div");
    popup.className = "anubis-find-popup";
    popup.innerHTML = `
        <input type="text" placeholder="Фамилия..." autocomplete="off">
        <div class="hint">Enter — найти, Esc — закрыть</div>
    `;

    document.body.appendChild(popup);

    const input = popup.querySelector("input");
    input.focus();

    input.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            popup.remove();
            Anubis.findPopupOpen = false;
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();

            const value = input.value;
            popup.remove();
            Anubis.findPopupOpen = false;
            setTimeout(() => Anubis.runSurnameFind(value), 0);
        }
    });
};

document.addEventListener("keydown", function(e){
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    const typing = ["input", "textarea", "select"].includes(tag);

    if (typing) return;
    if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
        e.preventDefault();
        Anubis.openFindPopup();
    }
});



document.addEventListener("scroll", function(){
    if (document.querySelector(".find-blink")) Anubis.clearFindBlink();
}, true);


// pointerover shelf-scroll-edge: надежнее, чем mouseenter, для узких зон полок.
document.addEventListener("pointerover", function(e){
    const edge = e.target.closest && e.target.closest(".shelf-scroll-edge, .floor-scroll-edge");
    if (edge) Anubis.startSmoothEdgeScroll(edge);
}, true);

document.addEventListener("pointerout", function(e){
    const edge = e.target.closest && e.target.closest(".shelf-scroll-edge, .floor-scroll-edge");
    if (!edge) return;

    const to = e.relatedTarget;
    if (to && edge.contains(to)) return;

    Anubis.stopSmoothEdgeScroll(edge);
}, true);




// === FINAL FINAL: reliable shelf horizontal scroll ===

// Полочный скролл больше НЕ зависит от узких edge-зон.
// Он работает по положению мыши внутри полки:
// левая часть — скролл влево, правая часть — вправо.
Anubis.shelfHoverScrollFinal = {
    raf: null,
    shelf: null,
    dir: 0,
    velocity: 0,
    last: 0
};

Anubis.stopShelfHoverScrollFinal = function(){
    const st = Anubis.shelfHoverScrollFinal;

    if (st.raf) {
        cancelAnimationFrame(st.raf);
    }

    st.raf = null;
    st.shelf = null;
    st.dir = 0;
    st.velocity = 0;
};

Anubis.startShelfHoverScrollFinal = function(shelf, dir){
    if (!shelf || !dir) return;

    const scroller = shelf.querySelector(".shelf-bodies-scroll");
    if (!scroller) return;

    // Если реально нечего скроллить — не запускаем.
    if (scroller.scrollWidth <= scroller.clientWidth + 2) {
        Anubis.stopShelfHoverScrollFinal();
        return;
    }

    const st = Anubis.shelfHoverScrollFinal;

    if (st.shelf === shelf && st.dir === dir && st.raf) return;

    Anubis.stopShelfHoverScrollFinal();

    st.shelf = shelf;
    st.dir = dir;
    st.velocity = 0;
    st.last = performance.now();

    const step = (now) => {
        const currentScroller = st.shelf && st.shelf.querySelector(".shelf-bodies-scroll");

        if (!currentScroller) {
            Anubis.stopShelfHoverScrollFinal();
            return;
        }

        const dt = Math.min(32, now - st.last);
        st.last = now;

        // Быстрый, но плавный разгон.
        st.velocity += (0.16 - st.velocity) * 0.10;

        currentScroller.scrollLeft += st.dir * dt * st.velocity;

        st.raf = requestAnimationFrame(step);
    };

    st.raf = requestAnimationFrame(step);
};

document.addEventListener("pointermove", function(e){
    const shelf = e.target.closest && e.target.closest(".shelf");

    if (!shelf || !shelf.classList.contains("has-side-scroll")) {
        Anubis.stopShelfHoverScrollFinal();
        return;
    }

    const scroller = shelf.querySelector(".shelf-bodies-scroll");
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) {
        Anubis.stopShelfHoverScrollFinal();
        return;
    }

    const rect = shelf.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Широкие зоны, чтобы не надо было попадать пиксель-в-пиксель.
    const zone = Math.max(110, rect.width * 0.28);

    if (x < zone) {
        Anubis.startShelfHoverScrollFinal(shelf, -1);
    } else if (x > rect.width - zone) {
        Anubis.startShelfHoverScrollFinal(shelf, 1);
    } else {
        Anubis.stopShelfHoverScrollFinal();
    }
}, {passive:true});

document.addEventListener("pointerleave", function(){
    Anubis.stopShelfHoverScrollFinal();
}, {passive:true});

document.addEventListener("visibilitychange", function(){
    if (document.hidden) Anubis.stopShelfHoverScrollFinal();
});


// Более заметный поиск: белое мигание и не гасить мгновенно.
Anubis.clearFindBlink = function(){
    document.querySelectorAll(".find-blink").forEach(el => el.classList.remove("find-blink"));
    document.body.classList.remove("find-mode");

    if (Anubis.findBlinkTimer) {
        clearTimeout(Anubis.findBlinkTimer);
        Anubis.findBlinkTimer = null;
    }
};

Anubis.runSurnameFind = function(query){
    const q = Anubis.normalizeFindSurname(query);
    if (!q) return;

    Anubis.clearFindBlink();
    document.body.classList.add("find-mode");
    Anubis.findActivatedAt = Date.now();

    let firstFound = null;

    document.querySelectorAll(".body-chip, .unknown-chip").forEach(card => {
        const s = Anubis.cardSurnameForFind(card);

        const similar =
            s === q ||
            s.startsWith(q) ||
            q.startsWith(s) ||
            Anubis.similarityRatio(q, s) >= 0.62;

        if (similar) {
            card.classList.add("find-blink");
            if (!firstFound) firstFound = card;
        }
    });

    if (firstFound) {
        firstFound.scrollIntoView({
            behavior:"smooth",
            block:"nearest",
            inline:"center"
        });
    }

    Anubis.findBlinkTimer = setTimeout(Anubis.clearFindBlink, 7000);
};


// === FINAL SEARCH FIX: highlight after scroll, visible white blink ===
Anubis.runSurnameFind = function(query){
    const q = Anubis.normalizeFindSurname(query);
    if (!q) return;

    Anubis.clearFindBlink();
    document.body.classList.add("find-mode");
    Anubis.findActivatedAt = Date.now();

    const found = [];

    document.querySelectorAll(".body-chip, .unknown-chip").forEach(card => {
        const s = Anubis.cardSurnameForFind(card);

        const similar =
            s === q ||
            s.startsWith(q) ||
            q.startsWith(s) ||
            Anubis.similarityRatio(q, s) >= 0.62;

        if (similar) {
            found.push(card);
        }
    });

    if (!found.length) return;

    const firstFound = found[0];

    // Сначала вытаскиваем скрытую карточку из горизонтального скролла.
    firstFound.scrollIntoView({
        behavior:"smooth",
        block:"nearest",
        inline:"center"
    });

    // Потом, после прокрутки, навешиваем мигание.
    // Иначе браузер иногда сбрасывает/не показывает box-shadow во время scrollIntoView.
    setTimeout(() => {
        found.forEach(card => {
            card.classList.add("find-blink");
        });
    }, 280);

    Anubis.findBlinkTimer = setTimeout(Anubis.clearFindBlink, 7000);
};
