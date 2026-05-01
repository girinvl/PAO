import re


def digits_from_voice_text(text):
    raw_digits = re.sub(r"\D", "", text or "")
    if raw_digits:
        return raw_digits

    words = re.sub(
        r"[^а-яА-Яa-zA-ZёЁ ]",
        " ",
        text or ""
    ).lower().replace("ё", "е").split()

    mapping = {
        "ноль": "0",
        "один": "1",
        "одна": "1",
        "первый": "1",
        "раз": "1",
        "два": "2",
        "две": "2",
        "второй": "2",
        "три": "3",
        "третий": "3",
        "четыре": "4",
        "четвертый": "4",
        "пять": "5",
        "пятый": "5",
        "шесть": "6",
        "шестой": "6",
        "семь": "7",
        "седьмой": "7",
        "восемь": "8",
        "восьмой": "8",
        "девять": "9",
        "девятый": "9",
    }

    result = ""
    for word in words:
        if word in mapping:
            result += mapping[word]

    return result


def parse_move_code(text):
    digits = digits_from_voice_text(text)

    if len(digits) == 3:
        fridge = int(digits[0])
        shelf = int(digits[1])
        autopsy = int(digits[2])

        if fridge in (1, 2, 3) and shelf in (1, 2, 3, 4, 5) and autopsy in (1, 2):
            return {
                "fridge": fridge,
                "shelf": shelf,
                "autopsy": autopsy,
                "code": digits
            }

    if len(digits) == 2:
        floor_flag = int(digits[0])
        autopsy = int(digits[1])

        if floor_flag == 1 and autopsy in (1, 2):
            return {
                "fridge": 0,
                "shelf": 0,
                "autopsy": autopsy,
                "code": digits
            }

    return None


def parse_height_code(text):
    digits = digits_from_voice_text(text)

    if len(digits) >= 2:
        height = int(digits[-3:]) if len(digits) >= 3 else int(digits)

        if 40 <= height <= 260:
            return {
                "height": height,
                "code": str(height)
            }

    return None
