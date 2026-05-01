(function(){
'use strict';

const root = document.querySelector('.issue-page');
if (!root) return;

const SELECTED_DATE_KEY = 'anubis_issue_selected_date';

let currentYear = Number(root.dataset.year) || new Date().getFullYear();
let currentMonth = Number(root.dataset.month) || new Date().getMonth() + 1;
let selectedDate = sessionStorage.getItem(SELECTED_DATE_KEY) || null;
let bodies = [];
let randomFillBodies = [];
let draggedId = null;
const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const isTouchDevice = isCoarsePointer || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const mobileDnD = {
    active: false,
    dragging: false,
    id: null,
    touchId: null,
    source: null,
    ghost: null,
    timer: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    over: null,
    raf: null,
    speed: 0
};

function getPageScroller(){
    return document.scrollingElement || document.documentElement || document.body;
}

function setNativeDraggableEnabled(enabled){
    document.querySelectorAll('.issue-body-card, .issue-slot-body').forEach(el => {
        el.draggable = !!enabled;
        el.setAttribute('draggable', enabled ? 'true' : 'false');
    });
}

function clearMobileDropOver(){
    if (mobileDnD.over) {
        mobileDnD.over.classList.remove('over');
        mobileDnD.over = null;
    }
}

function findIssueSlotAt(x, y){
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('.issue-slot') : null;
}

function updateMobileDropOver(x, y){
    const slot = findIssueSlotAt(x, y);
    if (slot === mobileDnD.over) return;
    clearMobileDropOver();
    if (slot) {
        slot.classList.add('over');
        mobileDnD.over = slot;
    }
}

function createMobileGhost(source, x, y){
    const ghost = source.cloneNode(true);
    const rect = source.getBoundingClientRect();
    ghost.classList.add('issue-mobile-drag-ghost');
    ghost.style.position = 'fixed';
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.width = Math.min(Math.max(rect.width, 230), Math.max(230, window.innerWidth - 34)) + 'px';
    ghost.style.maxWidth = 'calc(100vw - 28px)';
    ghost.style.zIndex = '99999';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.96';
    ghost.style.transformOrigin = 'left top';
    ghost.style.boxShadow = '0 18px 48px rgba(0,0,0,.55), 0 0 0 2px rgba(255,212,90,.5)';
    document.body.appendChild(ghost);
    moveMobileGhost(x, y);
    return ghost;
}

function moveMobileGhost(x, y){
    if (!mobileDnD.ghost) return;
    // Кладем карточку рядом с пальцем, а не под системную адресную строку/оверлеи.
    const offsetX = 18;
    const offsetY = -38;
    let gx = x + offsetX;
    let gy = y + offsetY;
    const rect = mobileDnD.ghost.getBoundingClientRect();
    if (gx + rect.width > window.innerWidth - 8) gx = window.innerWidth - rect.width - 8;
    if (gx < 8) gx = 8;
    if (gy < 8) gy = 8;
    if (gy + rect.height > window.innerHeight - 8) gy = window.innerHeight - rect.height - 8;
    mobileDnD.ghost.style.transform = `translate3d(${Math.round(gx)}px, ${Math.round(gy)}px, 0)`;
}

function easeOutCubic(t){
    return 1 - Math.pow(1 - t, 3);
}

function computeMobileAutoScrollSpeed(y){
    const vh = window.innerHeight || document.documentElement.clientHeight || 640;

    const topZone = vh * 0.42;
    const bottomZone = vh * 0.42;

    const MIN_SPEED = 0.6;
    const MAX_SPEED = 4.5;

    if (y < topZone) {
        let t = 1 - (y / topZone);
        t = Math.max(0, Math.min(1, t));
        t = easeOutCubic(t);
        return -(MIN_SPEED + (MAX_SPEED - MIN_SPEED) * t);
    }

    if (y > vh - bottomZone) {
        let t = (y - (vh - bottomZone)) / bottomZone;
        t = Math.max(0, Math.min(1, t));
        t = easeOutCubic(t);
        return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * t;
    }

    return 0;
}

function mobileAutoScrollLoop(){
    if (!mobileDnD.dragging) {
        mobileDnD.raf = null;
        return;
    }

    const scroller = getPageScroller();
    const speed = mobileDnD.speed;

    if (speed) {
        const before = scroller.scrollTop;
        scroller.scrollTop = before + speed;
        // fallback для мобильных браузеров, где scrollingElement может быть не тем элементом
        if (scroller.scrollTop === before) {
            window.scrollBy(0, speed);
            document.documentElement.scrollTop += speed;
            document.body.scrollTop += speed;
        }
        updateMobileDropOver(mobileDnD.x, mobileDnD.y);
        moveMobileGhost(mobileDnD.x, mobileDnD.y);
    }

    mobileDnD.raf = requestAnimationFrame(mobileAutoScrollLoop);
}

function startMobileAutoScroll(){
    if (!mobileDnD.raf) mobileDnD.raf = requestAnimationFrame(mobileAutoScrollLoop);
}

function stopMobileAutoScroll(){
    if (mobileDnD.raf) cancelAnimationFrame(mobileDnD.raf);
    mobileDnD.raf = null;
    mobileDnD.speed = 0;
}

function resetMobileDnD(){
    clearTimeout(mobileDnD.timer);
    stopMobileAutoScroll();
    clearMobileDropOver();

    if (mobileDnD.source) mobileDnD.source.classList.remove('dragging');
    if (mobileDnD.ghost) mobileDnD.ghost.remove();

    document.body.classList.remove('issue-mobile-dnd-active');

    mobileDnD.active = false;
    mobileDnD.dragging = false;
    mobileDnD.id = null;
    mobileDnD.touchId = null;
    mobileDnD.source = null;
    mobileDnD.ghost = null;
    mobileDnD.timer = null;
    draggedId = null;
}

function getTouchById(list, id){
    for (const t of list) {
        if (t.identifier === id) return t;
    }
    return null;
}

function beginMobileDrag(){
    if (!mobileDnD.active || mobileDnD.dragging || !mobileDnD.source) return;
    mobileDnD.dragging = true;
    draggedId = mobileDnD.id;
    document.body.classList.add('issue-mobile-dnd-active');
    mobileDnD.source.classList.add('dragging');
    mobileDnD.ghost = createMobileGhost(mobileDnD.source, mobileDnD.x, mobileDnD.y);
    updateMobileDropOver(mobileDnD.x, mobileDnD.y);
    mobileDnD.speed = computeMobileAutoScrollSpeed(mobileDnD.y);
    startMobileAutoScroll();
}

function bindMobileTouchDnD(){
    if (!isTouchDevice) return;
    if (document.body.dataset.issueMobileDndBound === '1') return;
    document.body.dataset.issueMobileDndBound = '1';

    setNativeDraggableEnabled(false);

    document.addEventListener('dragstart', e => {
        const item = e.target.closest('.issue-body-card, .issue-slot-body');
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
    }, true);

    document.addEventListener('touchstart', e => {
        if (els.modal && !els.modal.classList.contains('hidden')) return;
        if (mobileDnD.active || e.touches.length !== 1) return;

        const item = e.target.closest('.issue-body-card, .issue-slot-body');
        if (!item) return;

        const touch = e.changedTouches[0];
        mobileDnD.active = true;
        mobileDnD.dragging = false;
        mobileDnD.id = item.dataset.bodyId;
        mobileDnD.touchId = touch.identifier;
        mobileDnD.source = item;
        mobileDnD.startX = touch.clientX;
        mobileDnD.startY = touch.clientY;
        mobileDnD.x = touch.clientX;
        mobileDnD.y = touch.clientY;

        clearTimeout(mobileDnD.timer);
        mobileDnD.timer = setTimeout(beginMobileDrag, 480);
    }, {passive:true});

    document.addEventListener('touchmove', e => {
        if (!mobileDnD.active) return;

        const touch = getTouchById(e.touches, mobileDnD.touchId);
        if (!touch) return;

        mobileDnD.x = touch.clientX;
        mobileDnD.y = touch.clientY;

        const dx = Math.abs(mobileDnD.x - mobileDnD.startX);
        const dy = Math.abs(mobileDnD.y - mobileDnD.startY);

        // До долгого удержания это обычный свайп страницы. Ничего не блокируем.
        if (!mobileDnD.dragging) {
            if (dx > 12 || dy > 12) resetMobileDnD();
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        moveMobileGhost(mobileDnD.x, mobileDnD.y);
        updateMobileDropOver(mobileDnD.x, mobileDnD.y);
        mobileDnD.speed = computeMobileAutoScrollSpeed(mobileDnD.y);
        startMobileAutoScroll();
    }, {passive:false});

    document.addEventListener('touchend', async e => {
        if (!mobileDnD.active) return;

        const touch = getTouchById(e.changedTouches, mobileDnD.touchId);
        if (!touch) return;

        const wasDragging = mobileDnD.dragging;
        const bodyId = mobileDnD.id;
        const x = mobileDnD.x;
        const y = mobileDnD.y;
        const slot = mobileDnD.over || findIssueSlotAt(x, y);

        if (wasDragging) {
            e.preventDefault();
            e.stopPropagation();
        }

        resetMobileDnD();

        if (wasDragging && slot && bodyId) {
            await moveBody(bodyId, slot.dataset.issueDate || slot.dataset.date, slot.dataset.issueTime || slot.dataset.time);
        }
    }, {passive:false});

    document.addEventListener('touchcancel', e => {
        if (!mobileDnD.active) return;
        const touch = getTouchById(e.changedTouches, mobileDnD.touchId);
        if (touch) resetMobileDnD();
    }, {passive:true});
}

const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const weekDayNames = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const times = [];
for (let h = 9; h <= 14; h++) {
    times.push(String(h).padStart(2,'0') + ':00');
    if (h < 14) times.push(String(h).padStart(2,'0') + ':30');
}

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

const els = {
    grid: document.getElementById('issueMonthGrid'),
    title: document.getElementById('issueMonthTitle'),
    prev: document.getElementById('issuePrevMonth'),
    next: document.getElementById('issueNextMonth'),
    calendarView: document.getElementById('issueCalendarView'),
    dayView: document.getElementById('issueDayView'),
    dayTitle: document.getElementById('issueDayTitle'),
    slots: document.getElementById('issueSlots'),
    back: document.getElementById('issueBackToCalendar'),
    search: document.getElementById('issueSearch'),
    modal: document.getElementById('issueModal'),
    form: document.getElementById('issueForm'),
    msg: document.getElementById('issueMessage')
};

function bodyName(b){
    return `${b.surname || ''}${b.initials ? ' ' + b.initials : ''}`.trim();
}

function pad(n){ return String(n).padStart(2,'0'); }
function dateStr(y,m,d){ return `${y}-${pad(m)}-${pad(d)}`; }
function allIssueBodies(){
    return bodies.concat(randomFillBodies);
}

function dayBodies(ds){
    return allIssueBodies().filter(b => b.issue_date === ds);
}

function slotBodies(ds,t){
    return allIssueBodies().filter(b => b.issue_date === ds && b.issue_time === t);
}

function isRandomFilledBody(b){
    return !!(b && b.__randomFill);
}

function shuffleArray(arr){
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getFreeTimesForDate(ds){
    return times.filter(t => slotBodies(ds, t).length === 0);
}

function updateRandomFillButton(){
    if (!els.randomFillBtn) return;

    const hasDate = !!selectedDate && !els.dayView.classList.contains('hidden');
    const active = randomFillBodies.length > 0;

    els.randomFillBtn.disabled = !hasDate;
    els.randomFillBtn.textContent = active ? '☁️' : '☀️';
    els.randomFillBtn.title = hasDate
        ? (active ? 'Убрать случайное заполнение' : 'Случайно заполнить свободные слоты телами из базы')
        : 'Выберите дату';
    els.randomFillBtn.classList.toggle('active', active);
    els.randomFillBtn.style.opacity = hasDate ? '1' : '.45';
}

function ensureRandomFillButton(){
    if (els.randomFillBtn || !root) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'issue-random-fill-btn';
    btn.textContent = '☀️';
    btn.title = 'Выберите дату';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '1000';
    btn.style.width = '42px';
    btn.style.height = '42px';
    btn.style.borderRadius = '999px';
    btn.style.border = '1px solid rgba(255,255,255,.22)';
    btn.style.background = 'rgba(20,20,20,.88)';
    btn.style.color = '#ffd45a';
    btn.style.fontSize = '22px';
    btn.style.boxShadow = '0 8px 24px rgba(0,0,0,.35)';
    btn.style.cursor = 'pointer';

    btn.onclick = toggleRandomFill;
    document.body.appendChild(btn);
    els.randomFillBtn = btn;
    updateRandomFillButton();
}

function clearRandomFill(){
    randomFillBodies = [];
    updateRandomFillButton();
    if (selectedDate && !els.dayView.classList.contains('hidden')) {
        renderCalendar();
        renderSlots(selectedDate);
    }
}

async function loadRandomCandidates(){
    const r = await fetch('/issue/api/random-candidates', {cache:'no-store'});
    const j = await r.json();
    if (!j.success) throw new Error(j.error || 'Не удалось получить тела из базы');
    return j.bodies || [];
}

async function enableRandomFill(ds){
    const freeTimes = getFreeTimesForDate(ds);
    if (!freeTimes.length) {
        alert('Нет свободных слотов для заполнения');
        return;
    }

    const existingDayIds = new Set(dayBodies(ds).map(b => String(b.id)));
    const usedIds = new Set();

    const candidates = shuffleArray((await loadRandomCandidates()).filter(b => {
        const id = String(b.id || '');
        if (!id) return false;
        if (existingDayIds.has(id)) return false;
        if (usedIds.has(id)) return false;
        usedIds.add(id);
        return true;
    }));

    if (!candidates.length) {
        alert('Нет подходящих тел для случайного заполнения');
        return;
    }

    const count = Math.min(freeTimes.length, candidates.length);
    randomFillBodies = [];

    for (let i = 0; i < count; i++) {
        const b = Object.assign({}, candidates[i]);
        b.issue_date = ds;
        b.issue_time = freeTimes[i];
        b.__randomFill = true;
        randomFillBodies.push(b);
    }

    renderCalendar();
    renderSlots(ds);
    updateRandomFillButton();
}

function disableRandomFill(){
    clearRandomFill();
}

async function toggleRandomFill(){
    if (!selectedDate) return;

    if (randomFillBodies.length) {
        disableRandomFill();
        return;
    }

    try {
        await enableRandomFill(selectedDate);
    } catch (e) {
        alert(e.message || 'Не удалось выполнить случайное заполнение');
    }
}

function rememberDay(ds){
    selectedDate = ds || null;
    if (selectedDate) {
        sessionStorage.setItem(SELECTED_DATE_KEY, selectedDate);
    }
}

function clearRememberedDay(){
    selectedDate = null;
    randomFillBodies = [];
    sessionStorage.removeItem(SELECTED_DATE_KEY);
    updateRandomFillButton();
}

function iconsHTML(b){
    if (Number(b.issue_reject || 0)) return '<span class="flag-reject" title="Отказ">❌</span>';

    const icons = [];
    if (b.has_comment) icons.push('<span title="Комментарий">🔔</span>');
    if (b.is_duplicate_surname) icons.push('<span title="Похожая фамилия">❗</span>');
    if (b.is_old) icons.push('<span title="Старая запись">💩</span>');
    if (Number(b.flag_marshmallow || 0)) icons.push('<span class="body-flag flag-blink" title="Толстый">🧸</span>');
    if (Number(b.flag_blue_face || 0)) icons.push('<span class="body-flag flag-blink" title="Синий">🔵</span>');
    if (Number(b.flag_crooked_leg || 0)) icons.push('<span class="body-flag flag-blink" title="Кривой">🦵</span>');
    if (Number(b.flag_vegetation || 0)) icons.push('<span class="body-flag flag-blink" title="Растительность">🌿</span>');
    if (Number(b.flag_defects || 0)) icons.push('<span class="body-flag flag-blink" title="Дефекты">⚠️</span>');
    if (Number(b.issue_clothes || 0)) icons.push('<span title="Одежда">👕</span>');
    if (Number(b.issue_shave_clean || 0)) icons.push('<span title="Брить чисто">🪒</span>');
    if (Number(b.issue_beautify || b.issue_beard || 0)) icons.push('<span title="Облагородить">✨</span>');
    if (Number(b.issue_mustache || 0)) icons.push('<span title="Усы">〰️</span>');
    if (Number(b.issue_funeral || 0)) icons.push('<span title="Отпевание">⛪</span>');
    if (isRandomFilledBody(b)) icons.push('<span title="Случайно добавлен">➕</span>');
    return icons.join('');
}

async function loadBodies(){
    const r = await fetch('/issue/api/bodies', {cache:'no-store'});
    const j = await r.json();
    if (j.success) bodies = j.bodies || [];

    renderCalendar();
    renderVisibleCards();

    if (selectedDate) {
        showDayView(selectedDate);
        renderSlots(selectedDate);
    }

    updateRandomFillButton();
}

function renderVisibleCards(){
    const q = (els.search.value || '').trim().toLowerCase();

    document.querySelectorAll('.issue-body-card').forEach(card => {
        const id = Number(card.dataset.bodyId);
        const b = bodies.find(x => x.id === id);

        if (b) {
            card.dataset.issueDate = b.issue_date || '';
            card.dataset.issueTime = b.issue_time || '';

            card.classList.toggle('issue-today', b.issue_date === todayStr);
            card.classList.toggle('issue-reject', !!Number(b.issue_reject || 0));
            card.classList.toggle('status-1', Number(b.autopsy || 0) === 1);
            card.classList.toggle('status-2', Number(b.autopsy || 0) === 2);

            const meta = card.querySelector('.issue-card-meta');
            if (meta) meta.textContent = b.issue_date ? `${b.issue_date.split('-').reverse().join('.')} ${b.issue_time}` : 'не назначено';

            const icons = card.querySelector('.issue-card-icons');
            if (icons) icons.innerHTML = iconsHTML(b);
        }

        const text = (card.dataset.name || card.textContent || '').toLowerCase();
        card.style.display = !q || text.includes(q) ? '' : 'none';
    });
}

function renderCalendar(){
    els.title.textContent = `${monthNames[currentMonth-1]} ${currentYear}`;
    els.grid.innerHTML = '';

    const first = new Date(currentYear, currentMonth - 1, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(currentYear, currentMonth - 1, 1 - startOffset);

    for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);

        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const ds = dateStr(y,m,day);
        const items = dayBodies(ds);

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'issue-day-cell' + (m === currentMonth ? '' : ' other') + (ds === todayStr ? ' today' : '') + (ds === selectedDate ? ' selected' : '');
        cell.dataset.date = ds;
        cell.innerHTML = `
            <div class="issue-day-number">${day}</div>
            ${items.length ? `<div class="issue-day-count">${items.length}</div>` : '<div class="issue-empty-slot">нет</div>'}
        `;
        cell.onclick = () => openDay(ds);
        els.grid.appendChild(cell);
    }
}

function showDayView(ds){
    const [y,m,d] = ds.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));

    els.calendarView.classList.add('hidden');
    els.dayView.classList.remove('hidden');
    els.dayTitle.innerHTML = `
        <span>${d}.${m}.${y}</span>
        <small class="issue-weekday" style="display:block;opacity:.72;font-size:.78em;margin-top:2px;">${weekDayNames[dateObj.getDay()]}</small>
    `;
    updateRandomFillButton();
}

function openDay(ds){
    rememberDay(ds);
    showDayView(ds);
    renderCalendar();
    renderSlots(ds);
}

function renderSlots(ds){
    els.slots.innerHTML = '';

    const issueAll = document.createElement('button');
    issueAll.type = 'button';
    issueAll.className = 'issue-all-btn';
    issueAll.textContent = 'Выдать всех за этот день';
    issueAll.onclick = () => issueAllForDay(ds);
    els.slots.appendChild(issueAll);

    times.forEach(t => {
        const items = slotBodies(ds,t);
        const slot = document.createElement('div');
        slot.className = 'issue-slot' + (items.length >= 2 ? ' full' : '');
        slot.dataset.date = ds;
        slot.dataset.time = t;
        slot.dataset.issueDate = ds;
        slot.dataset.issueTime = t;

        slot.innerHTML = `
            <div class="issue-slot-time">${t}</div>
            <div class="issue-slot-items">
                ${items.map(b => `<div class="issue-slot-body status-${b.autopsy} ${b.issue_date === todayStr ? 'issue-today' : ''} ${Number(b.issue_reject || 0) ? 'issue-reject' : ''} ${isRandomFilledBody(b) ? 'issue-random-fill' : ''}" draggable="${isRandomFilledBody(b) || isTouchDevice ? 'false' : 'true'}" data-body-id="${b.id}"><span>${bodyName(b)}</span><span class="issue-slot-icons">${iconsHTML(b)}</span></div>`).join('') || '<div class="issue-empty-slot">перетащите тело сюда</div>'}
            </div>
        `;

        slot.addEventListener('dragover', e => {
            e.preventDefault();
            slot.classList.add('over');
        });

        slot.addEventListener('dragleave', () => slot.classList.remove('over'));

        slot.addEventListener('drop', e => {
            e.preventDefault();
            slot.classList.remove('over');

            const id = draggedId || e.dataTransfer.getData('text/plain');
            if (id) moveBody(id, ds, t);
        });

        els.slots.appendChild(slot);
    });

    updateRandomFillButton();
}

async function moveBody(id, ds, t){
    if (window.Anubis && Anubis.acquireBodyLock) {
        const ok = await Anubis.acquireBodyLock(id, 'issue_move');
        if (!ok) return;
    }

    rememberDay(ds);

    const fd = new FormData();
    fd.append('body_id', id);
    fd.append('issue_date', ds);
    fd.append('issue_time', t);
    if (window.Anubis && Anubis.addClientId) Anubis.addClientId(fd);

    const r = await fetch('/issue/api/move', {method:'POST', body:fd});
    const j = await r.json();

    if (!j.success) {
        if (j.locked && window.Anubis && Anubis.toast) {
            Anubis.toast(j.error || 'Тело заблокировано в другом окне', true);
        } else {
            alert(j.error || 'Не удалось назначить выдачу');
        }
        if (window.Anubis && Anubis.releaseActiveBodyLock) Anubis.releaseActiveBodyLock(true);
        return;
    }

    if (window.Anubis) {
        Anubis.activeBodyLock = null;
        if (Anubis.activeBodyLockTimer) {
            clearInterval(Anubis.activeBodyLockTimer);
            Anubis.activeBodyLockTimer = null;
        }
    }

    await loadBodies();
    openDay(ds);
}

async function issueAllForDay(ds){
    rememberDay(ds);

    const count = bodies.filter(b => b.issue_date === ds).length;
    if (!count) {
        alert('На этот день нет назначенных тел');
        return;
    }

    if (!confirm(`Выдать всех за выбранный день? Количество: ${count}`)) return;

    const fd = new FormData();
    fd.append('issue_date', ds);
    if (window.Anubis && Anubis.addClientId) Anubis.addClientId(fd);

    const r = await fetch('/issue/api/issue-day', {method:'POST', body:fd});
    const j = await r.json();

    if (!j.success) {
        alert(j.error || 'Не удалось выдать всех');
        return;
    }

    await loadBodies();
    openDay(ds);
}

function fillTimeSelect(){
    document.getElementById('issueTime').innerHTML = '<option value="">Не назначено</option>' + times.map(t => `<option value="${t}">${t}</option>`).join('');
}

function byId(id){ return document.getElementById(id); }

function openModal(id){
    els.msg.textContent = '';

    const b = allIssueBodies().find(x => x.id === Number(id));
    if (!b) return;

    byId('issueBodyId').value = b.id;
    byId('issueModalTitle').textContent = `Выдача: ${bodyName(b)}`;
    byId('issueDate').value = b.issue_date || selectedDate || '';
    byId('issueTime').value = b.issue_time || '';
    byId('issueClothes').checked = !!Number(b.issue_clothes || 0);
    byId('issueShaveClean').checked = !!Number(b.issue_shave_clean || 0);
    byId('issueBeautify').checked = !!Number(b.issue_beautify || b.issue_beard || 0);
    byId('issueMustache').checked = !!Number(b.issue_mustache || 0);
    byId('issueFuneral').checked = !!Number(b.issue_funeral || 0);
    byId('issueReject').checked = !!Number(b.issue_reject || 0);
    byId('issueNote').value = b.issue_note || '';

    els.modal.classList.remove('hidden');
}

function closeModal(){
    els.modal.classList.add('hidden');
}

function normalizeExclusiveChecks(changed){
    const grooming = [byId('issueShaveClean'), byId('issueBeautify'), byId('issueMustache')].filter(Boolean);

    // Отказ не очищает остальные пункты — они сохраняются в данных,
    // но скрываются в списках/таблицах через iconsHTML().
    if (grooming.includes(changed) && changed.checked) {
        grooming.forEach(el => {
            if (el !== changed) el.checked = false;
        });
    }
}

async function saveForm(e){
    e.preventDefault();

    const issueDate = byId('issueDate').value;
    if (issueDate) rememberDay(issueDate);

    const fd = new FormData();
    fd.append('body_id', byId('issueBodyId').value);
    fd.append('issue_date', issueDate);
    fd.append('issue_time', byId('issueTime').value);
    fd.append('issue_clothes', byId('issueClothes').checked ? '1' : '0');
    fd.append('issue_shave_clean', byId('issueShaveClean').checked ? '1' : '0');
    fd.append('issue_beautify', byId('issueBeautify').checked ? '1' : '0');
    fd.append('issue_mustache', byId('issueMustache').checked ? '1' : '0');
    fd.append('issue_funeral', byId('issueFuneral').checked ? '1' : '0');
    fd.append('issue_reject', byId('issueReject').checked ? '1' : '0');
    fd.append('issue_note', byId('issueNote').value || '');
    if (window.Anubis && Anubis.addClientId) Anubis.addClientId(fd);

    const r = await fetch('/issue/api/save', {method:'POST', body:fd});
    const j = await r.json();

    if (!j.success) {
        els.msg.textContent = j.error || 'Не удалось сохранить';
        return;
    }

    closeModal();
    await loadBodies();

    if (issueDate) openDay(issueDate);
}

function bindCards(){
    document.querySelectorAll('.issue-body-card').forEach(card => {
        card.draggable = !isTouchDevice;
        card.setAttribute('draggable', isTouchDevice ? 'false' : 'true');

        if (!isTouchDevice) {
            card.addEventListener('dragstart', e => {
                draggedId = card.dataset.bodyId;
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', draggedId);
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                draggedId = null;
                card.classList.remove('dragging');
            });
        }

        card.addEventListener('click', () => {
            if (mobileDnD.dragging) return;
            openModal(card.dataset.bodyId);
        });
    });

    document.addEventListener('click', e => {
        const item = e.target.closest('.issue-slot-body');
        if (item && !mobileDnD.dragging) openModal(item.dataset.bodyId);
    });

    if (!isTouchDevice) {
        document.addEventListener('dragstart', e => {
            const item = e.target.closest('.issue-slot-body');
            if (!item) return;
            draggedId = item.dataset.bodyId;
            item.classList.add('dragging');
            e.dataTransfer.setData('text/plain', draggedId);
            e.dataTransfer.effectAllowed = 'move';
        });

        document.addEventListener('dragend', e => {
            const item = e.target.closest('.issue-slot-body');
            if (item) item.classList.remove('dragging');
            draggedId = null;
        });
    }

    bindMobileTouchDnD();
}

els.prev.onclick = () => {
    currentMonth--;
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    clearRememberedDay();
    renderCalendar();
};

els.next.onclick = () => {
    currentMonth++;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    }
    clearRememberedDay();
    renderCalendar();
};

els.back.onclick = () => {
    clearRememberedDay();
    els.dayView.classList.add('hidden');
    els.calendarView.classList.remove('hidden');
    renderCalendar();
    updateRandomFillButton();
};

els.search.addEventListener('input', renderVisibleCards);
els.form.addEventListener('submit', saveForm);
byId('issueModalClose').onclick = closeModal;
byId('issueModalCancel').onclick = closeModal;
byId('issueClearPlan').onclick = () => {
    byId('issueDate').value = '';
    byId('issueTime').value = '';
};

['issueReject','issueClothes','issueShaveClean','issueBeautify','issueMustache','issueFuneral'].forEach(id => {
    const el = byId(id);
    if (el) el.addEventListener('change', () => normalizeExclusiveChecks(el));
});

els.modal.addEventListener('click', e => {
    if (e.target === els.modal) closeModal();
});

fillTimeSelect();
bindCards();
ensureRandomFillButton();
clearRandomFill();

loadBodies().then(() => {
    const saved = sessionStorage.getItem(SELECTED_DATE_KEY);
    if (saved) openDay(saved);
});
})();
