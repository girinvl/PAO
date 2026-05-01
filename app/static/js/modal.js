window.Anubis = window.Anubis || {};


Anubis.isMobileView = function(){
    return window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
};

Anubis.formatSurname = function(value){
    const text = Anubis.cleanRecognizedText(value || "").toLowerCase();
    if (!text) return "";
    return text
        .split(/([\s-]+)/)
        .map(part => /^[а-яёa-z]/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part)
        .join("");
};

Anubis.formatInitials = function(value){
    return Anubis.cleanRecognizedText(value || "").toUpperCase();
};

Anubis.resetFlagFields = function(){
    ["flag_marshmallow", "flag_blue_face", "flag_crooked_leg", "flag_vegetation", "flag_defects", "issue_reject"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
};

Anubis.setFlagFields = function(body){
    const marshmallow = document.getElementById("flag_marshmallow");
    const blueFace = document.getElementById("flag_blue_face");
    const crookedLeg = document.getElementById("flag_crooked_leg");
    const vegetation = document.getElementById("flag_vegetation");
    const defects = document.getElementById("flag_defects");
    const reject = document.getElementById("issue_reject");

    if (marshmallow) marshmallow.checked = !!Number(body.flag_marshmallow || 0);
    if (blueFace) blueFace.checked = !!Number(body.flag_blue_face || 0);
    if (crookedLeg) crookedLeg.checked = !!Number(body.flag_crooked_leg || 0);
    if (vegetation) vegetation.checked = !!Number(body.flag_vegetation || 0);
    if (defects) defects.checked = !!Number(body.flag_defects || 0);
    if (reject) reject.checked = !!Number(body.issue_reject || 0);
};

Anubis.startFormVoice = async function(){
    Anubis.voiceMode = "short";

    if (typeof Anubis.startVoice !== "function") {
        Anubis.showVoiceStatus("Голосовой модуль не загружен", true);
        return;
    }

    await Anubis.startVoice();
};

Anubis.openCurrent = async function(){
    const el = Anubis.currentElement();
    if (!el) return;

    if (el.classList.contains("body-chip")) {
        await Anubis.openEditModal(el.dataset.bodyId);
        return;
    }

    if (Anubis.nav.area === "unknown") {
        Anubis.rememberPlace(0, 0);
        Anubis.openUnknownModal();
        return;
    }

    const shelf = Anubis.currentShelfElement();
    Anubis.rememberPlace(shelf.dataset.fridge, shelf.dataset.shelf);
    Anubis.openShelfModal(shelf.dataset.fridge, shelf.dataset.shelf);
};

Anubis.setModalStatus = function(v){
    document.getElementById("autopsy").value = String(v);
    Anubis.showVoiceStatus(v === 2 ? "Вскрыт" : "Не вскрыт");
};

Anubis.openShelfModal = function(fridge, shelf){
    Anubis.rememberPlace(fridge, shelf);

    document.getElementById("modalTitle").innerText = `Холодильник ${fridge}, полка ${shelf}`;

    document.getElementById("body_id").value = "0";
    document.getElementById("surname").value = "";
    document.getElementById("initials").value = "";
    document.getElementById("height").value = "";
    document.getElementById("comment").value = "";
    document.getElementById("fridge").value = String(fridge);
    document.getElementById("shelf").value = String(shelf);
    document.getElementById("autopsy").value = "1";
    Anubis.resetFlagFields();

    document.getElementById("modal").classList.remove("hidden");

    Anubis.voiceMode = "short";
    if (!Anubis.isMobileView()) {
        setTimeout(() => {
            Anubis.startVoice();
        }, 300);
    }
};

Anubis.openUnknownModal = function(){
    Anubis.rememberPlace(0, 0);

    document.getElementById("modalTitle").innerText = "Без места / на полу";

    document.getElementById("body_id").value = "0";
    document.getElementById("surname").value = "";
    document.getElementById("initials").value = "";
    document.getElementById("height").value = "";
    document.getElementById("comment").value = "";
    document.getElementById("fridge").value = "0";
    document.getElementById("shelf").value = "0";
    document.getElementById("autopsy").value = "1";
    Anubis.resetFlagFields();

    document.getElementById("modal").classList.remove("hidden");

    Anubis.voiceMode = "short";
    if (!Anubis.isMobileView()) {
        setTimeout(() => {
            Anubis.startVoice();
        }, 300);
    }
};

Anubis.openEditModal = async function(id){
    if (!(await Anubis.acquireBodyLock(id, "edit"))) return;
    await Anubis.stopVoiceRecording(true);

    const r = await fetch("/bodies/" + id);
    const d = await r.json();

    if (!d.success) {
        Anubis.showVoiceStatus(d.error || "Ошибка открытия", true);
        return;
    }

    const b = d.body;

    Anubis.rememberPlace(b.fridge, b.shelf);

    document.getElementById("modalTitle").innerText = "Редактирование";
    document.getElementById("body_id").value = String(b.id);
    document.getElementById("surname").value = Anubis.formatSurname(b.surname || "");
    document.getElementById("initials").value = Anubis.formatInitials(b.initials || "");
    document.getElementById("height").value = Anubis.cleanNumber(b.height || "");
    document.getElementById("comment").value = Anubis.cleanRecognizedText(b.comment || "");
    document.getElementById("fridge").value = String(b.fridge);
    document.getElementById("shelf").value = String(b.shelf);
    document.getElementById("autopsy").value = String(b.autopsy);
    Anubis.setFlagFields(b);

    document.getElementById("modal").classList.remove("hidden");
};

Anubis.closeShelfModal = function(){
    document.getElementById("modal").classList.add("hidden");
    Anubis.stopVoiceRecording(true);
    Anubis.releaseActiveBodyLock(true);
    Anubis.paintSelection();
};

Anubis.saveBody = async function(e){
    if (e) e.preventDefault();

    const surname = Anubis.formatSurname(document.getElementById("surname").value);
    const initials = Anubis.formatInitials(document.getElementById("initials").value);

    document.getElementById("surname").value = surname;
    document.getElementById("initials").value = initials;
    const height = Anubis.cleanNumber(document.getElementById("height").value) || "0";
    const comment = Anubis.cleanRecognizedText(document.getElementById("comment").value);
    const fridge = document.getElementById("fridge").value;
    const shelf = document.getElementById("shelf").value;

    if (!surname) {
        Anubis.showVoiceStatus("Нет фамилии", true);
        document.getElementById("surname").focus();
        return;
    }

    Anubis.rememberPlace(fridge, shelf);

    const form = new URLSearchParams();
    form.append("body_id", document.getElementById("body_id").value || "0");
    form.append("surname", surname);
    form.append("initials", initials);
    form.append("height", height);
    form.append("comment", comment);
    form.append("fridge", fridge);
    form.append("shelf", shelf);
    form.append("autopsy", document.getElementById("autopsy").value);
    form.append("flag_marshmallow", document.getElementById("flag_marshmallow")?.checked ? "1" : "0");
    form.append("flag_blue_face", document.getElementById("flag_blue_face")?.checked ? "1" : "0");
    form.append("flag_crooked_leg", document.getElementById("flag_crooked_leg")?.checked ? "1" : "0");
    form.append("flag_vegetation", document.getElementById("flag_vegetation")?.checked ? "1" : "0");
    form.append("flag_defects", document.getElementById("flag_defects")?.checked ? "1" : "0");
    form.append("issue_reject", document.getElementById("issue_reject")?.checked ? "1" : "0");
    Anubis.addClientId(form);

    const r = await fetch("/save", {
        method: "POST",
        body: form
    });

    const j = await r.json();

    if (!r.ok || !j.success) {
        Anubis.showVoiceStatus(j.error || "Ошибка сохранения", true);
        return;
    }

    if (Anubis.activeBodyLock && Anubis.releaseBodyLock) {
        await Anubis.releaseBodyLock(Anubis.activeBodyLock.bodyId);
    }
    Anubis.activeBodyLock = null;
    if (Anubis.activeBodyLockTimer) {
        clearInterval(Anubis.activeBodyLockTimer);
        Anubis.activeBodyLockTimer = null;
    }

    Anubis.showVoiceStatus("Сохранено");

    setTimeout(() => {
        location.reload();
    }, 300);
};

Anubis.deleteBody = async function(){
    const id = document.getElementById("body_id").value;

    if (id === "0") {
        Anubis.showVoiceStatus("Это новая запись", true);
        return;
    }

    await Anubis.deleteBodyById(id);
};

Anubis.deleteBodyById = async function(id){
    const form = new URLSearchParams();
    form.append("body_id", id);
    Anubis.addClientId(form);

    const r = await fetch("/delete", {
        method: "POST",
        body: form
    });

    const j = await r.json();

    if (!j.success) {
        Anubis.showVoiceStatus(j.error || "Ошибка выдачи", true);
        return;
    }

    Anubis.showVoiceStatus("Выдано");

    setTimeout(() => {
        location.reload();
    }, 250);
};

Anubis.deleteCurrent = async function(){
    const el = Anubis.currentElement();

    if (!el || !el.classList.contains("body-chip")) {
        Anubis.showVoiceStatus("Выберите тело", true);
        return;
    }

    await Anubis.deleteBodyById(el.dataset.bodyId);
};


document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".clear-field-btn[data-clear-target]").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = document.getElementById(btn.dataset.clearTarget);
            if (!target) return;
            target.value = "";
            target.focus();
        });
    });

    const surname = document.getElementById("surname");
    const initials = document.getElementById("initials");

    surname?.addEventListener("blur", () => {
        surname.value = Anubis.formatSurname(surname.value);
    });

    initials?.addEventListener("input", () => {
        initials.value = Anubis.formatInitials(initials.value);
    });
    // Отказ не очищает ☁️🥶🦵. Они остаются в карточке,
    // но не выводятся как уведомления, пока выбран отказ.

});
