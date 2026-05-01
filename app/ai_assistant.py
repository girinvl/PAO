import re

from database import SessionLocal
from models import Body


def clean_text(value: str) -> str:
    if not value:
        return ""
    return (
        str(value)
        .replace(",", " ")
        .replace(".", " ")
        .replace(";", " ")
        .replace(":", " ")
        .replace("!", " ")
        .replace("?", " ")
        .replace("ё", "е")
        .replace("Ё", "Е")
        .strip()
    )


def clean_word(value: str) -> str:
    value = clean_text(value)
    value = re.sub(r"[^А-Яа-яA-Za-zЕеЁё\-]", "", value)
    return value.strip()


def clean_initials(value: str) -> str:
    value = clean_text(value)
    value = re.sub(r"[^А-Яа-яA-Za-zЕеЁё]", "", value)
    return value.upper()


def make_initials(parts):
    result = ""

    for part in parts:
        cleaned = clean_initials(part)
        if cleaned:
            result += cleaned[0].upper()

    return result[:2]


def parse_height_token(token: str):
    token = clean_text(token)
    token = re.sub(r"\D", "", token)

    if token.isdigit() and 2 <= len(token) <= 3:
        return int(token)

    return 0


def parse_command(cmd: str):
    """
    Полная команда:
    Иванов ИА 321 178
    Иванов Иван Александрович 321 178
    """

    cmd = clean_text(cmd)
    parts = cmd.split()

    if len(parts) < 2:
        return None

    height = 0

    if parts[-1].isdigit() and 2 <= len(parts[-1]) <= 3:
        height = int(parts[-1])
        parts = parts[:-1]

    code = None
    for i, part in enumerate(parts):
        if part.isdigit() and len(part) == 3:
            code = part
            code_index = i
            break

    if not code:
        return None

    surname = clean_word(parts[0])
    name_parts = parts[1:code_index]

    fridge = int(code[0])
    shelf = int(code[1])
    autopsy = int(code[2])

    if fridge not in (1, 2, 3):
        return None
    if shelf not in (1, 2, 3, 4, 5):
        return None
    if autopsy not in (1, 2):
        return None

    initials = ""

    if len(name_parts) == 1:
        raw = clean_initials(name_parts[0])
        initials = raw if len(raw) <= 3 else raw[0]
    elif len(name_parts) >= 2:
        initials = make_initials(name_parts[:2])

    return {
        "surname": surname,
        "initials": initials,
        "fridge": fridge,
        "shelf": shelf,
        "autopsy": autopsy,
        "height": height,
    }


def parse_short_command(cmd: str):
    """
    Короткая голосовая форма:
    Иванов
    Иванов 178
    Иванов Иван Александрович
    Иванов Иван Александрович 178

    Сокращенные инициалы вроде "ИА" больше не используем:
    модель слушает только полное имя+отчество и/или рост.
    """

    cmd = clean_text(cmd)
    parts = cmd.split()

    if not parts:
        return None

    height = 0

    last_height = parse_height_token(parts[-1])
    if last_height:
        height = last_height
        parts = parts[:-1]

    if not parts:
        return None

    surname = clean_word(parts[0])
    name_parts = [clean_word(p) for p in parts[1:]]
    name_parts = [p for p in name_parts if p]

    initials = ""
    initials_from_full_name = False

    # Только полное имя + отчество: оба слова длиннее одной буквы.
    if len(name_parts) >= 2 and len(name_parts[0]) > 1 and len(name_parts[1]) > 1:
        initials = make_initials(name_parts[:2])
        initials_from_full_name = True

    return {
        "surname": surname,
        "initials": initials,
        "initials_from_full_name": initials_from_full_name,
        "height": height,
    }


def execute(cmd: str):
    data = parse_command(cmd)
    if not data:
        return False

    db = SessionLocal()
    try:
        body = Body(**data)
        db.add(body)
        db.commit()
        return True
    finally:
        db.close()
