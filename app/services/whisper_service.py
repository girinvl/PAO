import os
import tempfile

from fastapi import UploadFile
from faster_whisper import WhisperModel


MODEL_PATH = "/opt/models/faster-whisper-small"

if not os.path.isdir(MODEL_PATH):
    raise RuntimeError(f"Локальная модель faster-whisper не найдена: {MODEL_PATH}")


whisper_model = WhisperModel(
    MODEL_PATH,
    device="cpu",
    compute_type="int8"
)


async def transcribe_upload(audio: UploadFile):
    suffix = ".webm"

    if audio.filename and "." in audio.filename:
        suffix = "." + audio.filename.rsplit(".", 1)[-1]

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = tmp.name
        tmp.write(await audio.read())

    try:
        segments, info = whisper_model.transcribe(
            temp_path,
            language="ru",
            beam_size=5
        )

        text = " ".join(s.text.strip() for s in segments).strip()
        return text

    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
