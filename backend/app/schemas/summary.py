from datetime import datetime

from app.models import SummarySource
from app.schemas.common import ORMModel


class ChapterOut(ORMModel):
    id: int
    title: str
    start_ms: int
    bullets: list[str]


class SummaryOut(ORMModel):
    overview: str
    keywords: list[str]
    generated_by: SummarySource
    chapters: list[ChapterOut]
    updated_at: datetime
