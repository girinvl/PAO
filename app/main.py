from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from database import Base, engine
from services.db_migration import ensure_columns
from services.time_stats import dt_fmt

from routes.pages import router as pages_router
from routes.api import router as api_router
from routes.speech import router as speech_router


Base.metadata.create_all(bind=engine)
ensure_columns()

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")
templates.env.filters["dt"] = dt_fmt

app.state.templates = templates

app.include_router(pages_router)
app.include_router(api_router)
app.include_router(speech_router)
