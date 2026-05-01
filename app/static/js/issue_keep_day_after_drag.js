/*
  ANUBIS ISSUE KEEP DAY AFTER DRAG

  Исправление:
  После переноса тела между временем в дневном расписании не возвращаемся к календарю.
  Сохраняем выбранную дату и пытаемся восстановить дневной режим после перерисовки.
*/

(function(){
    if (!location.pathname.startsWith("/issue")) return;

    const STORE_KEY = "anubisIssueSelectedDate";

    function getDateFromSlot(slot){
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

    function rememberDate(date){
        if (!date) return;
        try { sessionStorage.setItem(STORE_KEY, date); } catch(e) {}
        window.AnubisIssueSelectedDate = date;
    }

    function rememberedDate(){
        return window.AnubisIssueSelectedDate || (() => {
            try { return sessionStorage.getItem(STORE_KEY) || ""; } catch(e) { return ""; }
        })();
    }

    function clickDateCell(date){
        if (!date) return false;

        const selectors = [
            `[data-date="${date}"]`,
            `[data-day="${date}"]`,
            `[data-issue-date="${date}"]`,
            `.issue-calendar-day[data-date="${date}"]`,
            `.calendar-day[data-date="${date}"]`
        ];

        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && !el.closest(".issue-time-slot,.issue-slot,.time-slot")) {
                el.click();
                return true;
            }
        }

        return false;
    }

    function restoreDaySoon(date){
        if (!date) return;

        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;

            const dayVisible =
                document.querySelector(`[data-issue-time], [data-time], .issue-time-slot, .issue-slot, .time-slot`);

            if (dayVisible) {
                clearInterval(timer);
                return;
            }

            if (clickDateCell(date) || attempts > 12) {
                clearInterval(timer);
            }
        }, 120);
    }

    // Запоминаем дату при клике по календарю.
    document.addEventListener("click", function(e){
        const dateEl = e.target.closest("[data-date], [data-day], [data-issue-date]");
        if (!dateEl) return;

        const date = getDateFromSlot(dateEl);
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            rememberDate(date);
        }
    }, true);

    // Запоминаем дату drop-слота раньше основного обработчика.
    document.addEventListener("drop", function(e){
        const slot = e.target.closest("[data-issue-date][data-issue-time], [data-date][data-time], .issue-time-slot, .issue-slot, .time-slot");
        if (!slot) return;

        const date = getDateFromSlot(slot);
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            rememberDate(date);
            setTimeout(() => restoreDaySoon(date), 250);
            setTimeout(() => restoreDaySoon(date), 800);
        }
    }, true);

    // Перехватываем reload после успешного drag в старом fix-скрипте:
    // вместо полной перезагрузки просим issue.js перерисовать данные и возвращаем дневной вид.
    const originalReload = location.reload.bind(location);
    let suppressNextReload = false;

    document.addEventListener("drop", function(e){
        const slot = e.target.closest("[data-issue-date][data-issue-time], [data-date][data-time], .issue-time-slot, .issue-slot, .time-slot");
        if (slot) suppressNextReload = true;
        setTimeout(() => { suppressNextReload = false; }, 2500);
    }, true);

    try {
        Object.defineProperty(location, "reload", {
            configurable: true,
            value: function(){
                if (!suppressNextReload) return originalReload();

                const date = rememberedDate();
                suppressNextReload = false;

                if (window.Issue && typeof window.Issue.loadBodies === "function") {
                    Promise.resolve(window.Issue.loadBodies()).finally(() => restoreDaySoon(date));
                    return;
                }

                if (window.AnubisIssue && typeof window.AnubisIssue.loadBodies === "function") {
                    Promise.resolve(window.AnubisIssue.loadBodies()).finally(() => restoreDaySoon(date));
                    return;
                }

                restoreDaySoon(date);
            }
        });
    } catch(e) {
        // В некоторых браузерах location.reload нельзя переопределить.
        // Тогда хотя бы восстановим день после перерисовки.
    }

    window.addEventListener("load", () => {
        const date = rememberedDate();
        if (date) setTimeout(() => restoreDaySoon(date), 300);
    });
})();
