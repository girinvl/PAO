/*
  ANUBIS ISSUE V4 DRAG FIX

  Назначение:
  - разрешает drag&drop тел между слотами времени на странице /issue;
  - не ломает существующий issue.js;
  - работает через делегирование и MutationObserver;
  - ограничение "2 тела на одно время" остаётся на backend, но здесь тоже есть мягкая проверка.
*/

(function(){
    if (!location.pathname.startsWith("/issue")) return;

    window.Anubis = window.Anubis || {};

    function getClientId(){
        try {
            if (window.Anubis && window.Anubis.clientId) return window.Anubis.clientId;
            let id = sessionStorage.getItem("anubisClientId");
            if (!id) {
                id = Date.now() + "-" + Math.random().toString(16).slice(2);
                sessionStorage.setItem("anubisClientId", id);
            }
            return id;
        } catch(e) {
            return Date.now() + "-" + Math.random().toString(16).slice(2);
        }
    }

    function bodyElFrom(target){
        return target.closest(
            "[data-body-id], .issue-body-card, .issue-list-body, .issue-schedule-body, .body-chip"
        );
    }

    function bodyIdFrom(el){
        if (!el) return "";
        return (
            el.dataset.bodyId ||
            el.getAttribute("data-body-id") ||
            el.dataset.id ||
            el.getAttribute("data-id") ||
            ""
        );
    }

    function slotElFrom(target){
        return target.closest(
            "[data-issue-date][data-issue-time], [data-date][data-time], .issue-time-slot, .issue-slot, .time-slot"
        );
    }

    function slotDate(slot){
        if (!slot) return "";
        return (
            slot.dataset.issueDate ||
            slot.getAttribute("data-issue-date") ||
            slot.dataset.date ||
            slot.getAttribute("data-date") ||
            slot.getAttribute("data-day") ||
            ""
        );
    }

    function slotTime(slot){
        if (!slot) return "";
        return (
            slot.dataset.issueTime ||
            slot.getAttribute("data-issue-time") ||
            slot.dataset.time ||
            slot.getAttribute("data-time") ||
            ""
        );
    }

    function countBodiesInSlot(slot){
        if (!slot) return 0;
        return slot.querySelectorAll("[data-body-id], .issue-body-card, .issue-list-body, .issue-schedule-body, .body-chip").length;
    }

    function markDraggables(){
        document.querySelectorAll("[data-body-id], .issue-body-card, .issue-list-body, .issue-schedule-body").forEach(el => {
            const id = bodyIdFrom(el);
            if (!id) return;
            el.setAttribute("draggable", "true");
            el.classList.add("issue-dnd-ready");
        });

        document.querySelectorAll("[data-issue-date][data-issue-time], [data-date][data-time], .issue-time-slot, .issue-slot, .time-slot").forEach(slot => {
            if (!slotDate(slot) || !slotTime(slot)) return;
            slot.classList.add("issue-dnd-slot");
        });
    }

    async function moveBody(bodyId, date, time){
        const form = new FormData();
        form.append("body_id", bodyId);
        form.append("issue_date", date);
        form.append("issue_time", time);
        form.append("client_id", getClientId());

        const response = await fetch("/issue/api/move", {
            method:"POST",
            body:form
        });

        let data = null;
        try {
            data = await response.json();
        } catch(e) {
            data = {success:false, error:"Сервер вернул не JSON"};
        }

        if (!response.ok || !data.success) {
            alert((data && data.error) ? data.error : "Не удалось перенести тело");
            return false;
        }

        return true;
    }

    document.addEventListener("dragstart", function(e){
        const body = bodyElFrom(e.target);
        const id = bodyIdFrom(body);
        if (!body || !id) return;

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.setData("application/x-anubis-body-id", id);
        body.classList.add("issue-dragging");
    }, true);

    document.addEventListener("dragend", function(e){
        document.querySelectorAll(".issue-dragging").forEach(el => el.classList.remove("issue-dragging"));
        document.querySelectorAll(".issue-drop-active,.issue-drop-full").forEach(el => {
            el.classList.remove("issue-drop-active", "issue-drop-full");
        });
    }, true);

    document.addEventListener("dragover", function(e){
        const slot = slotElFrom(e.target);
        if (!slot) return;

        const date = slotDate(slot);
        const time = slotTime(slot);
        if (!date || !time) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        slot.classList.add("issue-drop-active");
        if (countBodiesInSlot(slot) >= 2) {
            slot.classList.add("issue-drop-full");
        } else {
            slot.classList.remove("issue-drop-full");
        }
    }, true);

    document.addEventListener("dragleave", function(e){
        const slot = slotElFrom(e.target);
        if (!slot) return;
        if (slot.contains(e.relatedTarget)) return;
        slot.classList.remove("issue-drop-active", "issue-drop-full");
    }, true);

    document.addEventListener("drop", async function(e){
        const slot = slotElFrom(e.target);
        if (!slot) return;

        const date = slotDate(slot);
        const time = slotTime(slot);
        if (!date || !time) return;

        e.preventDefault();
        e.stopPropagation();

        slot.classList.remove("issue-drop-active", "issue-drop-full");

        const id =
            e.dataTransfer.getData("application/x-anubis-body-id") ||
            e.dataTransfer.getData("text/plain");

        if (!id) return;

        const existing = Array.from(slot.querySelectorAll("[data-body-id]"))
            .map(el => bodyIdFrom(el))
            .filter(Boolean);

        if (!existing.includes(String(id)) && existing.length >= 2) {
            alert("На это время уже записано два тела");
            return;
        }

        const ok = await moveBody(id, date, time);
        if (!ok) return;

        if (window.Issue && typeof window.Issue.loadBodies === "function") {
            window.Issue.loadBodies();
        } else if (window.AnubisIssue && typeof window.AnubisIssue.loadBodies === "function") {
            window.AnubisIssue.loadBodies();
        } else {
            location.reload();
        }
    }, true);

    const observer = new MutationObserver(markDraggables);
    observer.observe(document.documentElement, {childList:true, subtree:true});

    window.addEventListener("load", markDraggables);
    document.addEventListener("DOMContentLoaded", markDraggables);
    setInterval(markDraggables, 1500);
})();
