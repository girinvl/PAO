window.Anubis = window.Anubis || {};

Anubis.clientId = Anubis.clientId || (() => {
    try {
        let id = sessionStorage.getItem("anubisClientId");
        if (!id) {
            id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            sessionStorage.setItem("anubisClientId", id);
        }
        return id;
    } catch (e) {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
})();

Anubis.addClientId = function(form){
    if (!form) return form;
    try {
        if (!form.has("client_id")) {
            form.append("client_id", Anubis.clientId);
        }
    } catch (e) {}
    return form;
};

Anubis.syncReloadPlanned = false;
Anubis.syncSocket = null;
Anubis.syncPollTimer = null;
Anubis.syncLastVersion = null;

Anubis.planSyncReload = function(delay){
    if (Anubis.syncReloadPlanned) return;
    if (Anubis.modalIsOpen && Anubis.modalIsOpen()) return;
    if (Anubis.dragState && Anubis.dragState.active) return;

    Anubis.syncReloadPlanned = true;
    if (Anubis.showVoiceStatus) {
        Anubis.showVoiceStatus("Обновление данных...");
    }

    setTimeout(() => {
        location.reload();
    }, delay || 200);
};

Anubis.pollSyncStateOnce = async function(){
    try {
        const response = await fetch(`/sync-state?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        if (!data.success || !data.version) return;

        if (Anubis.syncLastVersion === null) {
            Anubis.syncLastVersion = data.version;
            return;
        }

        if (Anubis.syncLastVersion !== data.version) {
            Anubis.syncLastVersion = data.version;
            Anubis.planSyncReload(300);
        }
    } catch (e) {
        // Локальная сеть могла моргнуть — следующий интервал попробует снова.
    }
};

Anubis.startSyncPolling = function(){
    if (Anubis.syncPollTimer) return;
    Anubis.pollSyncStateOnce();
    Anubis.syncPollTimer = setInterval(Anubis.pollSyncStateOnce, 2000);
};

Anubis.stopSyncPolling = function(){
    if (!Anubis.syncPollTimer) return;
    clearInterval(Anubis.syncPollTimer);
    Anubis.syncPollTimer = null;
};

Anubis.startWebSocketSync = function(){
    if (!("WebSocket" in window)) {
        Anubis.startSyncPolling();
        return;
    }

    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${location.host}/ws/sync`;

    try {
        Anubis.syncSocket = new WebSocket(url);
    } catch (e) {
        Anubis.startSyncPolling();
        return;
    }

    Anubis.syncSocket.addEventListener("open", () => {
        Anubis.stopSyncPolling();
    });

    Anubis.syncSocket.addEventListener("message", (event) => {
        let message = null;

        try {
            message = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        if (message.type === "hello") {
            Anubis.syncLastVersion = message.version || null;
            return;
        }

        if (message.type !== "state_changed") return;
        if (message.source && message.source === Anubis.clientId) return;

        Anubis.planSyncReload(200);
    });

    Anubis.syncSocket.addEventListener("close", () => {
        Anubis.syncSocket = null;
        Anubis.startSyncPolling();

        setTimeout(() => {
            if (!Anubis.syncSocket) Anubis.startWebSocketSync();
        }, 2500);
    });

    Anubis.syncSocket.addEventListener("error", () => {
        Anubis.startSyncPolling();
    });

    setInterval(() => {
        if (Anubis.syncSocket && Anubis.syncSocket.readyState === WebSocket.OPEN) {
            try {
                Anubis.syncSocket.send("ping");
            } catch (e) {}
        }
    }, 25000);
};

window.addEventListener("load", Anubis.startWebSocketSync);


// === Body edit/move locks across browser windows ===
Anubis.clientId = Anubis.clientId || localStorage.getItem("anubis_client_id");
if (!Anubis.clientId) {
    Anubis.clientId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem("anubis_client_id", Anubis.clientId);
}
Anubis.lockedBodies = Anubis.lockedBodies || new Map();
Anubis.activeBodyLock = Anubis.activeBodyLock || null;
Anubis.activeBodyLockTimer = Anubis.activeBodyLockTimer || null;

Anubis.toast = function(message, isError=false){
    let box = document.getElementById("anubisToastBox");
    if (!box) {
        box = document.createElement("div");
        box.id = "anubisToastBox";
        box.className = "anubis-toast-box";
        document.body.appendChild(box);
    }
    const item = document.createElement("div");
    item.className = "anubis-toast" + (isError ? " error" : "");
    item.textContent = message;
    box.appendChild(item);
    setTimeout(() => item.classList.add("show"), 20);
    setTimeout(() => {
        item.classList.remove("show");
        setTimeout(() => item.remove(), 260);
    }, 2800);
};

Anubis.addClientId = function(form){
    if (!form) return;
    if (form instanceof FormData || form instanceof URLSearchParams) form.append("client_id", Anubis.clientId);
};

Anubis.acquireBodyLock = async function(bodyId, action="edit"){
    if (!bodyId) return false;
    const form = new URLSearchParams();
    form.append("body_id", bodyId);
    form.append("action", action);
    Anubis.addClientId(form);
    const r = await fetch("/locks/acquire", {method:"POST", body:form});
    const j = await r.json();
    if (!j.success) {
        Anubis.toast(j.error || "Тело заблокировано в другом окне", true);
        return false;
    }
    Anubis.activeBodyLock = {bodyId:String(bodyId), action};
    Anubis.startBodyLockRefresh();
    return true;
};

Anubis.refreshBodyLock = async function(){
    if (!Anubis.activeBodyLock) return;
    const form = new URLSearchParams();
    form.append("body_id", Anubis.activeBodyLock.bodyId);
    form.append("action", Anubis.activeBodyLock.action || "edit");
    Anubis.addClientId(form);
    try {
        const r = await fetch("/locks/refresh", {method:"POST", body:form});
        const j = await r.json();
        if (!j.success) Anubis.releaseActiveBodyLock(false);
    } catch(e) {}
};

Anubis.startBodyLockRefresh = function(){
    if (Anubis.activeBodyLockTimer) clearInterval(Anubis.activeBodyLockTimer);
    Anubis.activeBodyLockTimer = setInterval(Anubis.refreshBodyLock, 30000);
};

Anubis.releaseBodyLock = async function(bodyId){
    if (!bodyId) return;
    const form = new URLSearchParams();
    form.append("body_id", bodyId);
    Anubis.addClientId(form);
    try { await fetch("/locks/release", {method:"POST", body:form}); } catch(e) {}
};

Anubis.releaseActiveBodyLock = async function(send=true){
    const lock = Anubis.activeBodyLock;
    Anubis.activeBodyLock = null;
    if (Anubis.activeBodyLockTimer) {
        clearInterval(Anubis.activeBodyLockTimer);
        Anubis.activeBodyLockTimer = null;
    }
    if (send && lock && lock.bodyId) await Anubis.releaseBodyLock(lock.bodyId);
};

Anubis.markBodyLocked = function(bodyId, locked=true){
    document.querySelectorAll(`[data-body-id="${bodyId}"]`).forEach(el => {
        el.classList.toggle("body-locked", !!locked);
    });
};

Anubis.handleLockMessage = function(msg){
    if (!msg || !msg.body_id) return;
    if (msg.source && msg.source === Anubis.clientId) return;
    if (msg.locked) {
        Anubis.lockedBodies.set(String(msg.body_id), msg.action || "edit");
        Anubis.markBodyLocked(msg.body_id, true);
        Anubis.toast("Тело заблокировано в другом окне");
    } else {
        Anubis.lockedBodies.delete(String(msg.body_id));
        Anubis.markBodyLocked(msg.body_id, false);
    }
};

window.addEventListener("beforeunload", function(){
    if (!Anubis.activeBodyLock || !navigator.sendBeacon) return;
    const form = new FormData();
    form.append("body_id", Anubis.activeBodyLock.bodyId);
    form.append("client_id", Anubis.clientId);
    navigator.sendBeacon("/locks/release", form);
});
