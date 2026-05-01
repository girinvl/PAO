from datetime import datetime, timedelta

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from database import SessionLocal
from models import Body

from services.body_logic import enrich_bodies, build_fridge_map
from services.time_stats import (
    start_of_week,
    start_of_month,
    start_of_year,
    count_arrived_since,
)


router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def index(request: Request):
    db = SessionLocal()

    try:
        active_bodies = (
            db.query(Body)
            .filter(Body.issued_at.is_(None))
            .order_by(Body.fridge, Body.shelf, Body.surname, Body.id)
            .all()
        )

        active_bodies = enrich_bodies(active_bodies)

        known_bodies = [
            b for b in active_bodies
            if b.fridge in (1, 2, 3) and b.shelf in (1, 2, 3, 4, 5)
        ]

        unknown_bodies = [
            b for b in active_bodies
            if b.fridge == 0 or b.shelf == 0
        ]

        fridge_map = build_fridge_map(known_bodies)
        occupied = {(b.fridge, b.shelf) for b in known_bodies}

        return request.app.state.templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "fridge_map": fridge_map,
                "unknown_bodies": unknown_bodies,
                "total_active": len(active_bodies),
                "free_shelves": 15 - len(occupied),
                "week_total": count_arrived_since(db, start_of_week()),
                "month_total": count_arrived_since(db, start_of_month()),
                "year_total": count_arrived_since(db, start_of_year()),
                "today_str": datetime.now().strftime("%Y-%m-%d"),
            }
        )

    finally:
        db.close()


@router.get("/table", response_class=HTMLResponse)
def table(request: Request, q: str = "", status: str = "active", sort: str = "surname"):
    db = SessionLocal()

    try:
        query = db.query(Body)

        if status == "active":
            query = query.filter(Body.issued_at.is_(None))
        elif status == "issued":
            query = query.filter(Body.issued_at.is_not(None))

        if q.strip():
            like = f"%{q.strip()}%"
            query = query.filter(Body.surname.ilike(like))

        if sort == "arrived":
            query = query.order_by(Body.arrived_at.desc(), Body.surname.asc())
        elif sort == "issued":
            query = query.order_by(Body.issued_at.desc(), Body.surname.asc())
        elif sort == "place":
            query = query.order_by(Body.fridge.asc(), Body.shelf.asc(), Body.surname.asc())
        else:
            query = query.order_by(Body.surname.asc(), Body.initials.asc())

        bodies = enrich_bodies(query.all())

        return request.app.state.templates.TemplateResponse(
            request=request,
            name="table.html",
            context={
                "bodies": bodies,
                "q": q,
                "status": status,
                "sort": sort
            }
        )

    finally:
        db.close()


@router.get("/stats", response_class=HTMLResponse)
def stats(request: Request):
    db = SessionLocal()

    try:
        now = datetime.now()

        days = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = datetime(day.year, day.month, day.day)
            day_end = day_start + timedelta(days=1)

            count = db.query(Body).filter(
                Body.arrived_at >= day_start,
                Body.arrived_at < day_end
            ).count()

            days.append({
                "label": day.strftime("%d.%m"),
                "count": count
            })

        months = []
        for month in range(1, 13):
            start = datetime(now.year, month, 1)

            if month == 12:
                end = datetime(now.year + 1, 1, 1)
            else:
                end = datetime(now.year, month + 1, 1)

            count = db.query(Body).filter(
                Body.arrived_at >= start,
                Body.arrived_at < end
            ).count()

            months.append({
                "label": start.strftime("%m"),
                "count": count
            })

        max_day = max([x["count"] for x in days] + [1])
        max_month = max([x["count"] for x in months] + [1])

        return request.app.state.templates.TemplateResponse(
            request=request,
            name="stats.html",
            context={
                "week_total": count_arrived_since(db, start_of_week()),
                "month_total": count_arrived_since(db, start_of_month()),
                "year_total": count_arrived_since(db, start_of_year()),
                "today_str": datetime.now().strftime("%Y-%m-%d"),
                "days": days,
                "months": months,
                "max_day": max_day,
                "max_month": max_month,
            }
        )

    finally:
        db.close()


@router.get("/faq", response_class=HTMLResponse)
def faq(request: Request):
    return request.app.state.templates.TemplateResponse(
        request=request,
        name="faq.html",
        context={}
    )


@router.get("/issue", response_class=HTMLResponse)
def issue_department(request: Request, year: int = 0, month: int = 0):
    db = SessionLocal()
    try:
        now = datetime.now()
        if not year:
            year = now.year
        if not month or month < 1 or month > 12:
            month = now.month
        bodies = (db.query(Body).filter(Body.issued_at.is_(None)).order_by(Body.surname.asc(), Body.initials.asc(), Body.id.asc()).all())
        bodies = enrich_bodies(bodies)
        return request.app.state.templates.TemplateResponse(request=request, name="issue.html", context={"bodies": bodies, "year": year, "month": month, "today_str": now.strftime("%Y-%m-%d")})
    finally:
        db.close()
