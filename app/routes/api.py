from datetime import datetime, timedelta
import hashlib
import json
from typing import Optional, Set

from fastapi import APIRouter, Form, WebSocket, WebSocketDisconnect

from database import SessionLocal
from models import Body
from services.time_stats import dt_fmt


router = APIRouter()

_active_websockets: Set[WebSocket] = set()
_sync_counter = 0

_body_locks = {}
_LOCK_TTL_SECONDS = 90


def _cleanup_locks():
    now = datetime.now()
    expired = [body_id for body_id, lock in _body_locks.items() if lock.get("expires_at") and lock["expires_at"] < now]
    for body_id in expired:
        _body_locks.pop(body_id, None)


def _lock_payload(body_id: int):
    _cleanup_locks()
    lock = _body_locks.get(int(body_id))
    if not lock:
        return None
    return {
        "body_id": int(body_id),
        "client_id": lock.get("client_id", ""),
        "action": lock.get("action", "edit"),
        "expires_at": lock.get("expires_at").isoformat() if lock.get("expires_at") else "",
    }


def _is_locked_by_other(body_id: int, client_id: str):
    payload = _lock_payload(int(body_id))
    if not payload:
        return None
    if payload.get("client_id") == (client_id or ""):
        return None
    return payload



def _body_attr(body, name, default=""):
    return getattr(body, name, default) or default


def _sync_body_fingerprint(body):
    fields = [
        body.id,
        body.surname or "",
        body.initials or "",
        body.height or 0,
        body.fridge or 0,
        body.shelf or 0,
        body.autopsy or 0,
        body.comment or "",
        body.arrived_at.isoformat() if body.arrived_at else "",
        body.issued_at.isoformat() if body.issued_at else "",
        getattr(body, "flag_marshmallow", 0) or 0,
        getattr(body, "flag_blue_face", 0) or 0,
        getattr(body, "flag_crooked_leg", 0) or 0,
        getattr(body, "flag_vegetation", 0) or 0,
        getattr(body, "flag_defects", 0) or 0,
        getattr(body, "issue_planned_at", None).isoformat() if getattr(body, "issue_planned_at", None) else "",
        getattr(body, "issue_clothes", 0) or 0,
        getattr(body, "issue_shave_clean", 0) or 0,
        getattr(body, "issue_beautify", 0) or getattr(body, "issue_beard", 0) or 0,
        getattr(body, "issue_mustache", 0) or 0,
        getattr(body, "issue_funeral", 0) or 0,
        getattr(body, "issue_note", "") or "",
        getattr(body, "issue_reject", 0) or 0,
    ]
    return "|".join(map(str, fields))


def build_state_version() -> str:
    db = SessionLocal()
    try:
        bodies = db.query(Body).order_by(Body.id.asc()).all()
        raw = "\n".join(_sync_body_fingerprint(body) for body in bodies)
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()
    finally:
        db.close()


async def notify_state_changed(action: str = "changed", source: Optional[str] = None):
    global _sync_counter
    _sync_counter += 1

    if not _active_websockets:
        return

    message = json.dumps({
        "type": "state_changed",
        "action": action,
        "source": source or "",
        "counter": _sync_counter,
    })

    dead = []
    for websocket in list(_active_websockets):
        try:
            await websocket.send_text(message)
        except Exception:
            dead.append(websocket)

    for websocket in dead:
        _active_websockets.discard(websocket)


async def notify_body_lock_changed(body_id: int, locked: bool, action: str = "", source: Optional[str] = None):
    global _sync_counter
    _sync_counter += 1
    message = json.dumps({
        "type": "body_lock",
        "body_id": int(body_id),
        "locked": bool(locked),
        "action": action or "",
        "source": source or "",
        "counter": _sync_counter,
    })
    dead = []
    for websocket in list(_active_websockets):
        try:
            await websocket.send_text(message)
        except Exception:
            dead.append(websocket)
    for websocket in dead:
        _active_websockets.discard(websocket)


@router.websocket("/ws/sync")
async def websocket_sync(websocket: WebSocket):
    await websocket.accept()
    _active_websockets.add(websocket)

    try:
        await websocket.send_text(json.dumps({
            "type": "hello",
            "version": build_state_version(),
            "counter": _sync_counter,
        }))

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _active_websockets.discard(websocket)


@router.get("/sync-state")
def sync_state():
    return {
        "success": True,
        "version": build_state_version(),
        "counter": _sync_counter,
    }


def _form_bool(value):
    return 1 if str(value or "").lower() in ("1", "true", "on", "yes", "да") else 0


@router.post("/locks/acquire")
async def acquire_body_lock(body_id: int = Form(...), action: str = Form("edit"), client_id: str = Form("")):
    db = SessionLocal()
    try:
        body = db.query(Body).filter(Body.id == body_id).first()
        if not body:
            return {"success": False, "error": "Тело не найдено"}
        _cleanup_locks()
        existing = _body_locks.get(int(body_id))
        if existing and existing.get("client_id") != (client_id or ""):
            return {"success": False, "locked": True, "error": "Тело сейчас редактируется или переносится в другом окне", "lock": _lock_payload(body_id)}
        _body_locks[int(body_id)] = {
            "client_id": client_id or "",
            "action": action or "edit",
            "expires_at": datetime.now() + timedelta(seconds=_LOCK_TTL_SECONDS),
        }
        await notify_body_lock_changed(body_id, True, action, client_id)
        return {"success": True, "lock": _lock_payload(body_id)}
    finally:
        db.close()


@router.post("/locks/release")
async def release_body_lock(body_id: int = Form(...), client_id: str = Form("")):
    _cleanup_locks()
    lock = _body_locks.get(int(body_id))
    if lock and lock.get("client_id") == (client_id or ""):
        _body_locks.pop(int(body_id), None)
        await notify_body_lock_changed(body_id, False, "", client_id)
    return {"success": True}


@router.post("/locks/refresh")
async def refresh_body_lock(body_id: int = Form(...), action: str = Form("edit"), client_id: str = Form("")):
    _cleanup_locks()
    lock = _body_locks.get(int(body_id))
    if lock and lock.get("client_id") != (client_id or ""):
        return {"success": False, "locked": True, "error": "Тело сейчас редактируется или переносится в другом окне", "lock": _lock_payload(body_id)}
    if not lock:
        return {"success": False, "error": "Блокировка уже снята"}
    lock["expires_at"] = datetime.now() + timedelta(seconds=_LOCK_TTL_SECONDS)
    lock["action"] = action or lock.get("action") or "edit"
    return {"success": True, "lock": _lock_payload(body_id)}


@router.post("/save")
async def save(
    body_id: int = Form(0),
    surname: str = Form(...),
    initials: str = Form(""),
    fridge: int = Form(...),
    shelf: int = Form(...),
    height: int = Form(0),
    autopsy: int = Form(...),
    comment: str = Form(""),
    flag_marshmallow: str = Form("0"),
    flag_blue_face: str = Form("0"),
    flag_crooked_leg: str = Form("0"),
    flag_vegetation: str = Form("0"),
    flag_defects: str = Form("0"),
    issue_reject: str = Form("0"),
    client_id: str = Form("")
):
    if fridge not in (0, 1, 2, 3):
        return {"success": False}

    if shelf not in (0, 1, 2, 3, 4, 5):
        return {"success": False}

    if fridge == 0 or shelf == 0:
        fridge = 0
        shelf = 0

    if body_id:
        locked = _is_locked_by_other(body_id, client_id)
        if locked:
            return {"success": False, "locked": True, "error": "Тело сейчас редактируется или переносится в другом окне", "lock": locked}

    db = SessionLocal()

    try:
        if body_id:
            body = db.query(Body).filter(Body.id == body_id).first()

            if not body:
                return {"success": False}

            body.surname = surname
            body.initials = initials
            body.height = height
            body.fridge = fridge
            body.shelf = shelf
            body.autopsy = autopsy
            body.comment = comment

        else:
            body = Body(
                surname=surname,
                initials=initials,
                height=height,
                fridge=fridge,
                shelf=shelf,
                autopsy=autopsy,
                comment=comment,
                arrived_at=datetime.now()
            )
            db.add(body)

        if hasattr(body, "flag_marshmallow"):
            body.flag_marshmallow = _form_bool(flag_marshmallow)
        if hasattr(body, "flag_blue_face"):
            body.flag_blue_face = _form_bool(flag_blue_face)
        if hasattr(body, "flag_crooked_leg"):
            body.flag_crooked_leg = _form_bool(flag_crooked_leg)
        if hasattr(body, "flag_vegetation"):
            body.flag_vegetation = _form_bool(flag_vegetation)
        if hasattr(body, "flag_defects"):
            body.flag_defects = _form_bool(flag_defects)
        if hasattr(body, "issue_reject"):
            body.issue_reject = _form_bool(issue_reject)

        db.commit()
        await notify_state_changed("save", client_id)

        return {"success": True}

    finally:
        db.close()


@router.post("/move")
async def move(
    body_id: int = Form(...),
    fridge: int = Form(...),
    shelf: int = Form(...),
    client_id: str = Form("")
):
    locked = _is_locked_by_other(body_id, client_id)
    if locked:
        return {"success": False, "locked": True, "error": "Тело сейчас редактируется или переносится в другом окне", "lock": locked}

    db = SessionLocal()

    try:
        body = db.query(Body).filter(Body.id == body_id).first()

        if not body:
            return {"success": False}

        if fridge == 0 or shelf == 0:
            fridge = 0
            shelf = 0

        body.fridge = fridge
        body.shelf = shelf

        db.commit()
        await notify_state_changed("move", client_id)

        return {"success": True}

    finally:
        db.close()


@router.post("/delete")
async def delete(body_id: int = Form(...), client_id: str = Form("")):
    locked = _is_locked_by_other(body_id, client_id)
    if locked:
        return {"success": False, "locked": True, "error": "Тело сейчас редактируется или переносится в другом окне", "lock": locked}

    db = SessionLocal()

    try:
        body = db.query(Body).filter(Body.id == body_id).first()

        if not body:
            return {"success": False}

        body.issued_at = datetime.now()
        body.fridge = 0
        body.shelf = 0

        db.commit()
        await notify_state_changed("delete", client_id)

        return {"success": True}

    finally:
        db.close()


@router.get("/bodies/{body_id}")
def get_body(body_id: int):
    db = SessionLocal()

    try:
        body = db.query(Body).filter(Body.id == body_id).first()

        if not body:
            return {"success": False}

        return {
            "success": True,
            "body": {
                "id": body.id,
                "surname": body.surname,
                "initials": body.initials,
                "height": body.height,
                "fridge": body.fridge,
                "shelf": body.shelf,
                "autopsy": body.autopsy,
                "comment": body.comment or "",
                "arrived_at": dt_fmt(body.arrived_at),
                "issued_at": dt_fmt(body.issued_at),
                "flag_marshmallow": getattr(body, "flag_marshmallow", 0) or 0,
                "flag_blue_face": getattr(body, "flag_blue_face", 0) or 0,
                "flag_crooked_leg": getattr(body, "flag_crooked_leg", 0) or 0,
                "flag_vegetation": getattr(body, "flag_vegetation", 0) or 0,
                "flag_defects": getattr(body, "flag_defects", 0) or 0,
                "issue_reject": getattr(body, "issue_reject", 0) or 0,
            }
        }

    finally:
        db.close()


# === ANUBIS ISSUE DEPARTMENT START ===
def _issue_bool(value):
    return 1 if str(value or "").lower() in ("1", "true", "on", "yes", "да") else 0


def _issue_parse_dt(issue_date: str, issue_time: str):
    issue_date = (issue_date or "").strip()
    issue_time = (issue_time or "").strip()
    if not issue_date or not issue_time:
        return None
    try:
        planned = datetime.strptime(f"{issue_date} {issue_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        return None
    if planned.hour < 9 or planned.hour > 14:
        return None
    if planned.hour == 14 and planned.minute != 0:
        return None
    if planned.minute not in (0, 30):
        return None
    return planned


def _issue_dt_date(value):
    return value.strftime("%Y-%m-%d") if value else ""


def _issue_dt_time(value):
    return value.strftime("%H:%M") if value else ""


def _issue_body_payload(body):
    return {
        "id": body.id,
        "surname": body.surname,
        "initials": body.initials or "",
        "height": body.height or 0,
        "fridge": body.fridge,
        "shelf": body.shelf,
        "autopsy": body.autopsy,
        "comment": body.comment or "",
        "issue_date": _issue_dt_date(getattr(body, "issue_planned_at", None)),
        "issue_time": _issue_dt_time(getattr(body, "issue_planned_at", None)),
        "issue_planned_at": dt_fmt(getattr(body, "issue_planned_at", None)),
        "issue_clothes": getattr(body, "issue_clothes", 0) or 0,
        "issue_shave_clean": getattr(body, "issue_shave_clean", 0) or 0,
        "issue_beautify": getattr(body, "issue_beautify", 0) or getattr(body, "issue_beard", 0) or 0,
        "issue_mustache": getattr(body, "issue_mustache", 0) or 0,
        "issue_funeral": getattr(body, "issue_funeral", 0) or 0,
        "issue_note": body.comment or "", "has_comment": bool((body.comment or "").strip()),
        "issue_reject": getattr(body, "issue_reject", 0) or 0,
        "flag_marshmallow": getattr(body, "flag_marshmallow", 0) or 0,
        "flag_blue_face": getattr(body, "flag_blue_face", 0) or 0,
        "flag_crooked_leg": getattr(body, "flag_crooked_leg", 0) or 0,
        "flag_vegetation": getattr(body, "flag_vegetation", 0) or 0,
        "flag_defects": getattr(body, "flag_defects", 0) or 0,
    }


@router.get("/issue/api/bodies")
def issue_bodies():
    db = SessionLocal()
    try:
        bodies = db.query(Body).filter(Body.issued_at.is_(None)).order_by(Body.surname.asc(), Body.initials.asc(), Body.id.asc()).all()
        return {"success": True, "bodies": [_issue_body_payload(b) for b in bodies]}
    finally:
        db.close()



@router.get("/issue/api/random-candidates")
def issue_random_candidates():
    db = SessionLocal()
    try:
        # Для случайного заполнения берём только уже выданные тела.
        bodies = (
            db.query(Body)
            .filter(Body.issued_at.isnot(None))
            .order_by(Body.surname.asc(), Body.initials.asc(), Body.id.asc())
            .all()
        )
        return {"success": True, "bodies": [_issue_body_payload(b) for b in bodies]}
    finally:
        db.close()


@router.get("/issue/api/bodies/{body_id}")
def issue_get_body(body_id: int):
    db = SessionLocal()
    try:
        body = db.query(Body).filter(Body.id == body_id).first()
        if not body:
            return {"success": False, "error": "Тело не найдено"}
        return {"success": True, "body": _issue_body_payload(body)}
    finally:
        db.close()


@router.post("/issue/api/save")
async def issue_save(
    body_id: int = Form(...),
    issue_date: str = Form(""),
    issue_time: str = Form(""),
    issue_clothes: str = Form("0"),
    issue_shave_clean: str = Form("0"),
    issue_beautify: str = Form("0"),
    issue_mustache: str = Form("0"),
    issue_funeral: str = Form("0"),
    issue_note: str = Form(""),
    issue_reject: str = Form("0"),
    client_id: str = Form(""),
):
    db = SessionLocal()
    try:
        body = db.query(Body).filter(Body.id == body_id).first()
        if not body:
            return {"success": False, "error": "Тело не найдено"}

        planned = _issue_parse_dt(issue_date, issue_time)
        if (issue_date or issue_time) and not planned:
            return {"success": False, "error": "Время выдачи: только 09:00–14:00 с шагом 30 минут"}

        if planned:
            same_slot = db.query(Body).filter(Body.issued_at.is_(None), Body.issue_planned_at == planned, Body.id != body_id).count()
            if same_slot >= 2:
                return {"success": False, "error": "На это время уже записано два тела"}

        shave_clean = _issue_bool(issue_shave_clean)
        beautify = _issue_bool(issue_beautify)
        mustache = _issue_bool(issue_mustache)
        if shave_clean + beautify + mustache > 1:
            return {"success": False, "error": "Выберите только один вариант: брить чисто, облагородить или усы"}

        body.issue_planned_at = planned
        body.issue_clothes = _issue_bool(issue_clothes)
        body.issue_shave_clean = shave_clean
        if hasattr(body, "issue_beautify"):
            body.issue_beautify = beautify
        elif hasattr(body, "issue_beard"):
            body.issue_beard = beautify
        body.issue_mustache = mustache
        body.issue_funeral = _issue_bool(issue_funeral)
        if hasattr(body, "issue_note"):
            body.issue_note = (issue_note or "").strip()
        if hasattr(body, "issue_reject"):
            body.issue_reject = _issue_bool(issue_reject)

        db.commit()
        await notify_state_changed("issue_save", client_id)

        return {"success": True, "body": _issue_body_payload(body)}
    finally:
        db.close()


@router.post("/issue/api/move")
async def issue_move(
    body_id: int = Form(...),
    issue_date: str = Form(...),
    issue_time: str = Form(...),
    client_id: str = Form(""),
):
    locked = _is_locked_by_other(body_id, client_id)
    if locked:
        return {"success": False, "locked": True, "error": "Тело сейчас редактируется или переносится в другом окне", "lock": locked}

    db = SessionLocal()
    try:
        body = db.query(Body).filter(Body.id == body_id).first()
        if not body:
            return {"success": False, "error": "Тело не найдено"}

        planned = _issue_parse_dt(issue_date, issue_time)
        if not planned:
            return {"success": False, "error": "Некорректное время"}

        same_slot = db.query(Body).filter(Body.issued_at.is_(None), Body.issue_planned_at == planned, Body.id != body_id).count()
        if same_slot >= 2:
            return {"success": False, "error": "На это время уже записано два тела"}

        body.issue_planned_at = planned
        db.commit()
        await notify_state_changed("issue_move", client_id)

        return {"success": True, "body": _issue_body_payload(body)}
    finally:
        db.close()


@router.post("/issue/api/issue-day")
async def issue_day(issue_date: str = Form(...), client_id: str = Form("")):
    db = SessionLocal()
    try:
        try:
            day_start = datetime.strptime(issue_date, "%Y-%m-%d")
        except ValueError:
            return {"success": False, "error": "Некорректная дата"}

        day_end = day_start.replace(hour=23, minute=59, second=59)
        bodies = db.query(Body).filter(
            Body.issued_at.is_(None),
            Body.issue_planned_at >= day_start,
            Body.issue_planned_at <= day_end,
        ).all()

        now = datetime.now()
        for body in bodies:
            body.issued_at = now
            body.fridge = 0
            body.shelf = 0

        db.commit()
        await notify_state_changed("issue_day", client_id)

        return {"success": True, "count": len(bodies)}
    finally:
        db.close()
# === ANUBIS ISSUE DEPARTMENT END ===
