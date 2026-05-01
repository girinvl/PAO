import re

from datetime import datetime
from difflib import SequenceMatcher


def normalize_surname(value):
    value = (value or "").lower().replace("ё", "е")
    value = re.sub(r"[^а-яa-z]", "", value)
    return value


def surname_similarity(a, b):
    a = normalize_surname(a)
    b = normalize_surname(b)

    if not a or not b:
        return False

    if a == b:
        return True

    if len(a) >= 4 and len(b) >= 4 and a[:4] == b[:4]:
        return True

    if len(a) >= 5 and len(b) >= 5 and a[:3] == b[:3]:
        return True

    return SequenceMatcher(None, a, b).ratio() >= 0.68


def days_in_morgue(body):
    if not body.arrived_at:
        return 0
    try:
        return (datetime.now() - body.arrived_at).days
    except Exception:
        return 0


def enrich_bodies(bodies):
    for b in bodies:
        b.has_comment = bool((b.comment or "").strip())
        b.is_old = days_in_morgue(b) > 14
        b.is_duplicate_surname = False

    for i, body_a in enumerate(bodies):
        for j, body_b in enumerate(bodies):
            if i == j:
                continue
            if surname_similarity(body_a.surname, body_b.surname):
                body_a.is_duplicate_surname = True
                break

    return bodies


def build_fridge_map(bodies):
    fridge_map = []

    for fridge_num in range(1, 4):
        shelves = []

        for shelf_num in range(1, 6):
            place_bodies = [
                b for b in bodies
                if b.fridge == fridge_num and b.shelf == shelf_num
            ]

            if not place_bodies:
                color_class = "empty"
            else:
                statuses = [b.autopsy for b in place_bodies]
                if all(x == 1 for x in statuses):
                    color_class = "nevskryt"
                elif all(x == 2 for x in statuses):
                    color_class = "vskryt"
                else:
                    color_class = "mixed"

            shelves.append({
                "shelf": shelf_num,
                "bodies": place_bodies,
                "color_class": color_class
            })

        fridge_map.append({
            "fridge": fridge_num,
            "shelves": shelves
        })

    return fridge_map
