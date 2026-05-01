window.Anubis = window.Anubis || {};

Anubis.nav = {
    area: "fridge",
    fridge: 0,
    shelf: 0,
    body: 0,
    mode: "shelf"
};

Anubis.hoveredBodyId = null;
Anubis.carriedBodyId = null;
Anubis.carriedElement = null;

Anubis.voiceMode = "short";
Anubis.voiceMoveBodyId = null;
Anubis.voiceHeightBodyId = null;

Anubis.mediaRecorder = null;
Anubis.audioChunks = [];
Anubis.currentStream = null;
Anubis.audioContext = null;
Anubis.analyser = null;
Anubis.sourceNode = null;
Anubis.silenceTimer = null;
Anubis.monitorInterval = null;
Anubis.isRecording = false;

Anubis.SILENCE_DURATION_MS = 1800;
Anubis.CHECK_INTERVAL_MS = 200;
Anubis.SILENCE_THRESHOLD = 0.02;

Anubis.cleanRecognizedText = function(v){
    return String(v || "")
        .replace(/[.,;:!?]/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

Anubis.cleanNumber = function(v){
    return String(v || "")
        .replace(/\D/g, "")
        .trim();
};

Anubis.showVoiceStatus = function(text, isError=false){
    const el = document.getElementById("voiceStatus");
    if (!el) return;

    el.innerText = text;
    el.style.display = "block";
    el.style.background = isError ? "#dc2626" : "#2563eb";

    clearTimeout(el.timer);
    el.timer = setTimeout(() => {
        el.style.display = "none";
    }, 2500);
};

Anubis.modalIsOpen = function(){
    const modal = document.getElementById("modal");
    return modal && !modal.classList.contains("hidden");
};

Anubis.isTypingInField = function(){
    const el = document.activeElement;
    if (!el) return false;

    const t = el.tagName.toLowerCase();
    return t === "input" || t === "textarea" || t === "select";
};

Anubis.getOpenedBodyId = function(){
    const id = document.getElementById("body_id")?.value || "0";
    return Number(id);
};

Anubis.saveNavState = function(){
    sessionStorage.setItem("anubis_nav", JSON.stringify(Anubis.nav));
};

Anubis.restoreNavState = function(){
    const raw = sessionStorage.getItem("anubis_nav");
    if (!raw) return false;

    try {
        const saved = JSON.parse(raw);
        Anubis.nav = Object.assign(Anubis.nav, saved);
        return true;
    } catch(e) {
        return false;
    }
};

Anubis.rememberPlace = function(fridge, shelf){
    if (Number(fridge) === 0 || Number(shelf) === 0) {
        Anubis.nav.area = "unknown";
        Anubis.nav.mode = "shelf";
        Anubis.nav.body = 0;
    } else {
        Anubis.nav.area = "fridge";
        Anubis.nav.mode = "shelf";
        Anubis.nav.fridge = Number(fridge) - 1;
        Anubis.nav.shelf = 5 - Number(shelf);
        Anubis.nav.body = 0;
    }

    Anubis.saveNavState();
};
