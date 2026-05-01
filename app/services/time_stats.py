from datetime import datetime, timedelta

from models import Body


def start_of_week():
    now = datetime.now()
    base = datetime(now.year, now.month, now.day)
    return base - timedelta(days=now.weekday())


def start_of_month():
    now = datetime.now()
    return datetime(now.year, now.month, 1)


def start_of_year():
    now = datetime.now()
    return datetime(now.year, 1, 1)


def count_arrived_since(db, dt):
    return db.query(Body).filter(Body.arrived_at >= dt).count()


def dt_fmt(v):
    if not v:
        return ""
    try:
        return v.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return str(v)
