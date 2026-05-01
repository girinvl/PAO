from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from ai_assistant import parse_short_command
from services.whisper_service import transcribe_upload
from services.speech_parse import parse_move_code, parse_height_code


router = APIRouter()


@router.post("/stt-short")
async def stt_short(audio: UploadFile = File(...)):
    try:
        text = await transcribe_upload(audio)

        if not text:
            return JSONResponse(
                {"success": False, "error": "Речь не распознана"},
                status_code=400
            )

        parsed = parse_short_command(text)

        return {
            "success": True,
            "text": text,
            "parsed": parsed
        }

    except Exception as e:
        return JSONResponse(
            {"success": False, "error": str(e)},
            status_code=500
        )


@router.post("/stt-move-code")
async def stt_move_code(audio: UploadFile = File(...)):
    try:
        text = await transcribe_upload(audio)

        if not text:
            return JSONResponse(
                {"success": False, "error": "Код не распознан"},
                status_code=400
            )

        parsed = parse_move_code(text)

        if not parsed:
            return JSONResponse(
                {"success": False, "error": f"Код не понятен: {text}"},
                status_code=400
            )

        return {
            "success": True,
            "text": text,
            "parsed": parsed
        }

    except Exception as e:
        return JSONResponse(
            {"success": False, "error": str(e)},
            status_code=500
        )


@router.post("/stt-height-code")
async def stt_height_code(audio: UploadFile = File(...)):
    try:
        text = await transcribe_upload(audio)

        if not text:
            return JSONResponse(
                {"success": False, "error": "Рост не распознан"},
                status_code=400
            )

        parsed = parse_height_code(text)

        if not parsed:
            return JSONResponse(
                {"success": False, "error": f"Рост не понятен: {text}"},
                status_code=400
            )

        return {
            "success": True,
            "text": text,
            "parsed": parsed
        }

    except Exception as e:
        return JSONResponse(
            {"success": False, "error": str(e)},
            status_code=500
        )
