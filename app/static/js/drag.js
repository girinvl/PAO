window.Anubis = window.Anubis || {};

Anubis.dragState = {
    active: false,
    moved: false,
    holdMode: false,
    bodyId: null,
    pointerId: null,
    touchId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    ghost: null,
    sourceEl: null,
    holdTimer: null,
    autoScrollFrame: null,
    autoScrollSpeed: 0,
    edgeSize: 125,
    maxScrollSpeed: 18,
    lastAutoScrollTs: 0,
    currentDropEl: null,
    suppressNextClick: false,
    lastTapBodyId: null,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    doubleTapDelay: 360,
    doubleTapDistance: 28
};

Anubis.getScroller = function(){
    return document.scrollingElement || document.documentElement || document.body;
};

Anubis.canScrollPage = function(direction){
    const scroller = Anubis.getScroller();
    const maxTop = Math.max(0, scroller.scrollHeight - window.innerHeight);

    if (direction < 0) return scroller.scrollTop > 0;
    if (direction > 0) return scroller.scrollTop < maxTop - 1;
    return false;
};

Anubis.stopEdgeAutoScroll = function(){
    if (Anubis.dragState.autoScrollFrame) {
        cancelAnimationFrame(Anubis.dragState.autoScrollFrame);
    }

    Anubis.dragState.autoScrollFrame = null;
    Anubis.dragState.autoScrollSpeed = 0;
    Anubis.dragState.lastAutoScrollTs = 0;
};

Anubis.edgeAutoScrollLoop = function(ts){
    if (!Anubis.dragState.active || !Anubis.dragState.moved) {
        Anubis.stopEdgeAutoScroll();
        return;
    }

    const speed = Anubis.dragState.autoScrollSpeed;

    if (!speed || !Anubis.canScrollPage(speed)) {
        Anubis.dragState.autoScrollFrame = requestAnimationFrame(Anubis.edgeAutoScrollLoop);
        return;
    }

    if (!Anubis.dragState.lastAutoScrollTs) {
        Anubis.dragState.lastAutoScrollTs = ts;
    }

    const dt = Math.min(34, Math.max(12, ts - Anubis.dragState.lastAutoScrollTs));
    Anubis.dragState.lastAutoScrollTs = ts;

    const pixels = speed * (dt / 16.67);
    Anubis.getScroller().scrollTop += pixels;

    if (Anubis.dragState.ghost) {
        Anubis.moveDragGhost(
            Anubis.dragState.ghost,
            Anubis.dragState.lastX,
            Anubis.dragState.lastY
        );
    }

    Anubis.highlightDropTarget(Anubis.dragState.lastX, Anubis.dragState.lastY);
    Anubis.dragState.autoScrollFrame = requestAnimationFrame(Anubis.edgeAutoScrollLoop);
};

Anubis.updateEdgeAutoScroll = function(y){
    if (!Anubis.dragState.active || !Anubis.dragState.moved) {
        Anubis.stopEdgeAutoScroll();
        return;
    }

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const edge = Anubis.dragState.edgeSize;
    const maxSpeed = Anubis.dragState.maxScrollSpeed;
    let speed = 0;

    if (y < edge) {
        const power = (edge - y) / edge;
        speed = -Math.max(4, Math.round(power * maxSpeed));
    } else if (y > viewportHeight - edge) {
        const power = (y - (viewportHeight - edge)) / edge;
        speed = Math.max(4, Math.round(power * maxSpeed));
    }

    Anubis.dragState.autoScrollSpeed = speed;

    if (!speed) {
        Anubis.stopEdgeAutoScroll();
        return;
    }

    if (!Anubis.dragState.autoScrollFrame) {
        Anubis.dragState.autoScrollFrame = requestAnimationFrame(Anubis.edgeAutoScrollLoop);
    }
};

Anubis.createDragGhost = function(el, x, y){
    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.style.width = `${Math.max(150, Math.min(rect.width, 260))}px`;
    document.body.appendChild(ghost);
    Anubis.moveDragGhost(ghost, x, y);
    return ghost;
};

Anubis.moveDragGhost = function(ghost, x, y){
    ghost.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`;
};

Anubis.clearDropHighlight = function(){
    if (Anubis.dragState.currentDropEl) {
        Anubis.dragState.currentDropEl.classList.remove("drop-hover");
    }
    Anubis.dragState.currentDropEl = null;
};

Anubis.highlightDropTarget = function(x, y){
    const el = document.elementFromPoint(x, y);
    const targetEl = el ? (el.closest(".shelf") || el.closest(".unknown-zone")) : null;

    if (targetEl === Anubis.dragState.currentDropEl) return;

    Anubis.clearDropHighlight();

    if (targetEl) {
        targetEl.classList.add("drop-hover");
        Anubis.dragState.currentDropEl = targetEl;
    }
};

Anubis.findDropTarget = function(x, y){
    const el = document.elementFromPoint(x, y);
    if (!el) return null;

    const shelf = el.closest(".shelf");
    if (shelf) {
        return {
            fridge: Number(shelf.dataset.fridge),
            shelf: Number(shelf.dataset.shelf)
        };
    }

    const unknown = el.closest(".unknown-zone");
    if (unknown) {
        return { fridge: 0, shelf: 0 };
    }

    return null;
};

Anubis.moveBodyByDrag = async function(bodyId, target){
    Anubis.rememberPlace(target.fridge, target.shelf);

    const form = new URLSearchParams();
    form.append("body_id", bodyId);
    form.append("fridge", target.fridge);
    form.append("shelf", target.shelf);
    Anubis.addClientId(form);

    const res = await fetch("/move", {
        method: "POST",
        body: form
    });

    const data = await res.json();

    if (!data.success) {
        Anubis.showVoiceStatus(data.error || "Ошибка перемещения", true);
        return;
    }

    Anubis.showVoiceStatus("Перемещено");
    setTimeout(() => location.reload(), 180);
};

Anubis.startHoldCarryMode = function(chip){
    Anubis.carriedBodyId = chip.dataset.bodyId;
    Anubis.carriedElement = chip;
    Anubis.clearCarryingStyle();
    chip.classList.add("carrying");
    Anubis.showVoiceStatus("Тело выбрано. Нажмите на место, куда положить");
};

Anubis.stopDragState = function(){
    clearTimeout(Anubis.dragState.holdTimer);
    Anubis.stopEdgeAutoScroll();
    Anubis.clearDropHighlight();

    document.body.classList.remove("anubis-touch-dragging");

    if (Anubis.dragState.sourceEl) {
        Anubis.dragState.sourceEl.classList.remove("dragging");
    }

    if (Anubis.dragState.ghost) {
        Anubis.dragState.ghost.remove();
    }

    Anubis.dragState.active = false;
    Anubis.dragState.moved = false;
    Anubis.dragState.holdMode = false;
    Anubis.dragState.bodyId = null;
    Anubis.dragState.pointerId = null;
    Anubis.dragState.touchId = null;
    Anubis.dragState.ghost = null;
    Anubis.dragState.sourceEl = null;
};

Anubis.cancelTouchCandidate = function(){
    if (!Anubis.dragState.active || Anubis.dragState.moved) return;
    Anubis.stopDragState();
};

Anubis.getTouchById = function(touches, id){
    for (const touch of touches) {
        if (touch.identifier === id) return touch;
    }
    return null;
};

Anubis.handleBodyMobileTap = async function(e, bodyId, x, y){
    const now = Date.now();
    const lastBodyId = Anubis.dragState.lastTapBodyId;
    const dt = now - Anubis.dragState.lastTapTime;
    const dx = Math.abs(x - Anubis.dragState.lastTapX);
    const dy = Math.abs(y - Anubis.dragState.lastTapY);

    const isDoubleTap = (
        String(lastBodyId) === String(bodyId) &&
        dt > 0 &&
        dt <= Anubis.dragState.doubleTapDelay &&
        dx <= Anubis.dragState.doubleTapDistance &&
        dy <= Anubis.dragState.doubleTapDistance
    );

    Anubis.dragState.lastTapBodyId = bodyId;
    Anubis.dragState.lastTapTime = now;
    Anubis.dragState.lastTapX = x;
    Anubis.dragState.lastTapY = y;

    if (!isDoubleTap) return false;

    e.preventDefault();
    e.stopPropagation();

    Anubis.dragState.lastTapBodyId = null;
    Anubis.dragState.lastTapTime = 0;

    await Anubis.toggleBodyAutopsy(bodyId);
    return true;
};

Anubis.beginRealDrag = function(chip, x, y){
    if (Anubis.dragState.moved) return;

    clearTimeout(Anubis.dragState.holdTimer);
    Anubis.dragState.moved = true;
    Anubis.dragState.holdMode = false;
    Anubis.dragState.sourceEl.classList.add("dragging");
    Anubis.dragState.ghost = Anubis.createDragGhost(chip, x, y);
    Anubis.dragState.suppressNextClick = true;
    document.body.classList.add("anubis-touch-dragging");
    Anubis.highlightDropTarget(x, y);
    Anubis.updateEdgeAutoScroll(y);
};

Anubis.startTouchDrag = function(e, chip){
    const touch = e.changedTouches[0];

    Anubis.dragState.active = true;
    Anubis.dragState.moved = false;
    Anubis.dragState.holdMode = false;
    Anubis.dragState.bodyId = chip.dataset.bodyId;
    Anubis.dragState.touchId = touch.identifier;
    Anubis.dragState.startX = touch.clientX;
    Anubis.dragState.startY = touch.clientY;
    Anubis.dragState.lastX = touch.clientX;
    Anubis.dragState.lastY = touch.clientY;
    Anubis.dragState.sourceEl = chip;
    Anubis.dragState.ghost = null;

    clearTimeout(Anubis.dragState.holdTimer);
    Anubis.dragState.holdTimer = setTimeout(() => {
        if (!Anubis.dragState.active || Anubis.dragState.moved) return;
        Anubis.beginRealDrag(chip, Anubis.dragState.lastX, Anubis.dragState.lastY);
        Anubis.showVoiceStatus("Тело взято. Ведите к краю экрана для прокрутки");
    }, 520);
};

Anubis.finishTouchDrag = async function(e){
    const endedPrimary = Anubis.getTouchById(e.changedTouches, Anubis.dragState.touchId);
    if (!endedPrimary) return;

    clearTimeout(Anubis.dragState.holdTimer);

    const wasMoved = Anubis.dragState.moved;
    const bodyId = Anubis.dragState.bodyId;
    const dropX = Anubis.dragState.lastX;
    const dropY = Anubis.dragState.lastY;

    Anubis.stopDragState();

    if (!wasMoved) {
        await Anubis.handleBodyMobileTap(e, bodyId, dropX, dropY);
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    const target = Anubis.findDropTarget(dropX, dropY);

    if (!target) {
        Anubis.showVoiceStatus("Не выбрано место", true);
        return;
    }

    await Anubis.moveBodyByDrag(bodyId, target);
};

/* Desktop / mouse drag */
document.addEventListener("pointerdown", function(e){
    if (e.pointerType === "touch") return;
    if (Anubis.modalIsOpen()) return;
    if (Anubis.dragState.active) return;

    const chip = e.target.closest(".body-chip");
    if (!chip) return;

    Anubis.dragState.active = true;
    Anubis.dragState.moved = false;
    Anubis.dragState.holdMode = false;
    Anubis.dragState.bodyId = chip.dataset.bodyId;
    Anubis.dragState.pointerId = e.pointerId;
    Anubis.dragState.startX = e.clientX;
    Anubis.dragState.startY = e.clientY;
    Anubis.dragState.lastX = e.clientX;
    Anubis.dragState.lastY = e.clientY;
    Anubis.dragState.sourceEl = chip;
    Anubis.dragState.ghost = null;

    clearTimeout(Anubis.dragState.holdTimer);
    Anubis.dragState.holdTimer = setTimeout(() => {
        if (!Anubis.dragState.active || Anubis.dragState.moved) return;
        Anubis.dragState.holdMode = true;
        Anubis.startHoldCarryMode(chip);
    }, 550);
});

document.addEventListener("pointermove", function(e){
    if (e.pointerType === "touch") return;
    if (!Anubis.dragState.active) return;
    if (Anubis.dragState.pointerId !== e.pointerId) return;
    if (Anubis.dragState.holdMode) return;

    Anubis.dragState.lastX = e.clientX;
    Anubis.dragState.lastY = e.clientY;

    const dx = Math.abs(e.clientX - Anubis.dragState.startX);
    const dy = Math.abs(e.clientY - Anubis.dragState.startY);

    if (!Anubis.dragState.moved && (dx > 12 || dy > 12)) {
        Anubis.beginRealDrag(Anubis.dragState.sourceEl, e.clientX, e.clientY);
    }

    if (Anubis.dragState.ghost) {
        Anubis.moveDragGhost(Anubis.dragState.ghost, e.clientX, e.clientY);
    }

    Anubis.highlightDropTarget(e.clientX, e.clientY);
    Anubis.updateEdgeAutoScroll(e.clientY);
});

document.addEventListener("pointerup", async function(e){
    if (e.pointerType === "touch") return;
    if (!Anubis.dragState.active) return;
    if (Anubis.dragState.pointerId !== e.pointerId) return;

    clearTimeout(Anubis.dragState.holdTimer);

    const wasMoved = Anubis.dragState.moved;
    const holdMode = Anubis.dragState.holdMode;
    const bodyId = Anubis.dragState.bodyId;
    const dropX = e.clientX;
    const dropY = e.clientY;

    Anubis.stopDragState();

    if (holdMode) return;
    if (!wasMoved) {
        await Anubis.handleBodyMobileTap(e, bodyId, dropX, dropY);
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    const target = Anubis.findDropTarget(dropX, dropY);

    if (!target) {
        Anubis.showVoiceStatus("Не выбрано место", true);
        return;
    }

    await Anubis.moveBodyByDrag(bodyId, target);
}, true);

document.addEventListener("pointercancel", function(e){
    if (e.pointerType === "touch") return;
    if (!Anubis.dragState.active) return;
    if (Anubis.dragState.pointerId !== e.pointerId) return;
    Anubis.stopDragState();
}, true);

/* Mobile / touch drag with long press and edge auto-scroll */
document.addEventListener("touchstart", function(e){
    if (Anubis.modalIsOpen()) return;
    if (Anubis.dragState.active) return;
    if (e.touches.length !== 1) return;

    const chip = e.target.closest(".body-chip");
    if (!chip) return;

    Anubis.startTouchDrag(e, chip);
}, { passive: true });

document.addEventListener("touchmove", function(e){
    if (!Anubis.dragState.active || Anubis.dragState.touchId === null) return;

    const primary = Anubis.getTouchById(e.touches, Anubis.dragState.touchId);
    if (!primary) return;

    Anubis.dragState.lastX = primary.clientX;
    Anubis.dragState.lastY = primary.clientY;

    const dx = Math.abs(primary.clientX - Anubis.dragState.startX);
    const dy = Math.abs(primary.clientY - Anubis.dragState.startY);

    /* Until the long press fires, a normal swipe must remain page scroll. */
    if (!Anubis.dragState.moved) {
        if (dx > 10 || dy > 10) {
            Anubis.cancelTouchCandidate();
        }
        return;
    }

    if (Anubis.dragState.ghost) {
        Anubis.moveDragGhost(
            Anubis.dragState.ghost,
            Anubis.dragState.lastX,
            Anubis.dragState.lastY
        );
    }

    Anubis.highlightDropTarget(primary.clientX, primary.clientY);
    Anubis.updateEdgeAutoScroll(primary.clientY);

    e.preventDefault();
    e.stopPropagation();
}, { passive: false });

document.addEventListener("touchend", function(e){
    if (!Anubis.dragState.active || Anubis.dragState.touchId === null) return;
    Anubis.finishTouchDrag(e);
}, { passive: false });

document.addEventListener("touchcancel", function(e){
    if (!Anubis.dragState.active || Anubis.dragState.touchId === null) return;
    const cancelledPrimary = Anubis.getTouchById(e.changedTouches, Anubis.dragState.touchId);
    if (cancelledPrimary) Anubis.stopDragState();
}, { passive: true });

document.addEventListener("click", async function(e){
    if (Anubis.dragState.suppressNextClick) {
        Anubis.dragState.suppressNextClick = false;
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    if (!Anubis.carriedBodyId) return;
    if (e.target.closest(".body-chip")) return;

    const shelf = e.target.closest(".shelf");
    const unknown = e.target.closest(".unknown-zone");

    let target = null;

    if (shelf) {
        target = {
            fridge: Number(shelf.dataset.fridge),
            shelf: Number(shelf.dataset.shelf)
        };
    }

    if (unknown) {
        target = { fridge: 0, shelf: 0 };
    }

    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    const bodyId = Anubis.carriedBodyId;
    Anubis.carriedBodyId = null;
    Anubis.clearCarryingStyle();

    await Anubis.moveBodyByDrag(bodyId, target);
}, true);
