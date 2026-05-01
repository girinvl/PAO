window.Anubis = window.Anubis || {};

Anubis.handleSpaceMove = async function(){
    const el = Anubis.currentElement();

    if (!Anubis.carriedBodyId) {
        if (!el || !el.classList.contains("body-chip")) {
            Anubis.showVoiceStatus("Сначала выберите тело", true);
            return;
        }

        Anubis.carriedBodyId = el.dataset.bodyId;
        Anubis.carriedElement = el;
        Anubis.clearCarryingStyle();
        el.classList.add("carrying");
        Anubis.showVoiceStatus("Тело взято. Выберите место и нажмите Space");
        return;
    }

    const target = Anubis.getSelectedTarget();

    if (!target) {
        Anubis.showVoiceStatus("Некуда положить", true);
        return;
    }

    Anubis.rememberPlace(target.fridge, target.shelf);

    const form = new URLSearchParams();
    form.append("body_id", Anubis.carriedBodyId);
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

    Anubis.carriedBodyId = null;
    Anubis.carriedElement = null;
    Anubis.showVoiceStatus("Перемещено");

    setTimeout(() => location.reload(), 250);
};

Anubis.setBodyAutopsy = async function(bodyId, status){
    const r = await fetch(`/bodies/${bodyId}`);
    const d = await r.json();

    if (!d.success) {
        Anubis.showVoiceStatus(d.error || "Ошибка открытия", true);
        return;
    }

    const b = d.body;
    Anubis.rememberPlace(b.fridge, b.shelf);

    const form = new URLSearchParams();
    form.append("body_id", b.id);
    form.append("surname", Anubis.cleanRecognizedText(b.surname || ""));
    form.append("initials", Anubis.cleanRecognizedText(b.initials || ""));
    form.append("height", Anubis.cleanNumber(b.height || "") || "0");
    form.append("comment", Anubis.cleanRecognizedText(b.comment || ""));
    form.append("flag_marshmallow", b.flag_marshmallow || 0);
    form.append("flag_blue_face", b.flag_blue_face || 0);
    form.append("flag_crooked_leg", b.flag_crooked_leg || 0);
    form.append("flag_vegetation", b.flag_vegetation || 0);
    form.append("flag_defects", b.flag_defects || 0);
    form.append("fridge", b.fridge);
    form.append("shelf", b.shelf);
    form.append("autopsy", status);
    Anubis.addClientId(form);

    const sr = await fetch("/save", {
        method: "POST",
        body: form
    });

    const sj = await sr.json();

    if (!sj.success) {
        Anubis.showVoiceStatus(sj.error || "Ошибка статуса", true);
        return;
    }

    Anubis.showVoiceStatus(status === 2 ? "Статус: вскрыт" : "Статус: не вскрыт");
    setTimeout(() => location.reload(), 250);
};

Anubis.toggleBodyAutopsy = async function(bodyId){
    const r = await fetch(`/bodies/${bodyId}`);
    const d = await r.json();

    if (!d.success) {
        Anubis.showVoiceStatus(d.error || "Ошибка открытия", true);
        return;
    }

    const currentStatus = Number(d.body.autopsy || 1);
    const nextStatus = currentStatus === 2 ? 1 : 2;

    await Anubis.setBodyAutopsy(bodyId, nextStatus);
};

Anubis.changeStatusHotkey = async function(status){
    if (Anubis.modalIsOpen()) {
        if (Anubis.isTypingInField()) return;
        Anubis.setModalStatus(status);
        return;
    }

    const targetId = Anubis.getSelectedBodyId();

    if (!targetId) {
        Anubis.showVoiceStatus("Выберите тело рамкой", true);
        return;
    }

    await Anubis.setBodyAutopsy(targetId, status);
};
