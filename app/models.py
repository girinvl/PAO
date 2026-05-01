from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime

from database import Base


class Body(Base):
    __tablename__ = "bodies"

    id = Column(Integer, primary_key=True, index=True)

    surname = Column(String, nullable=False)
    initials = Column(String, default="")
    height = Column(Integer, default=0)

    fridge = Column(Integer, default=0)
    shelf = Column(Integer, default=0)
    autopsy = Column(Integer, default=1)

    comment = Column(Text, default="")

    arrived_at = Column(DateTime, default=datetime.now)
    issued_at = Column(DateTime, nullable=True)

    # Мерцающие пометки тела
    flag_marshmallow = Column(Integer, default=0)
    flag_blue_face = Column(Integer, default=0)
    flag_crooked_leg = Column(Integer, default=0)
    flag_vegetation = Column(Integer, default=0)
    flag_defects = Column(Integer, default=0)

    # Отдел выдачи
    issue_planned_at = Column(DateTime, nullable=True)
    issue_clothes = Column(Integer, default=0)
    issue_shave_clean = Column(Integer, default=0)
    issue_beautify = Column(Integer, default=0)
    issue_beard = Column(Integer, default=0)  # совместимость со старыми версиями
    issue_mustache = Column(Integer, default=0)
    issue_funeral = Column(Integer, default=0)
    issue_note = Column(Text, default="")
    issue_reject = Column(Integer, default=0)
