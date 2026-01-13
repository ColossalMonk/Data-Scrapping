from __future__ import annotations

from typing import List

from .models import BusinessRecord


def evaluate_ui_ux(record: BusinessRecord) -> BusinessRecord:
    """Generate UX commentary based on heuristics.

    Replace this placeholder with a real evaluator (manual rubric, ML model,
    or LLM-driven analysis).
    """
    record.ux_score = 7
    record.ux_strengths = [
        "Clear navigation labels",
        "Consistent brand colors",
    ]
    record.ux_weaknesses = [
        "Hero CTA could be more prominent",
        "Body text could use more whitespace",
    ]
    record.ux_recommendations = [
        "Increase contrast for key calls-to-action",
        "Add quick contact button above the fold",
    ]
    record.ux_summary = (
        "The site presents a clean layout and coherent branding, but increasing CTA visibility "
        "and improving typographic spacing would boost conversions."
    )
    return record


def evaluate_batch(records: List[BusinessRecord]) -> List[BusinessRecord]:
    return [evaluate_ui_ux(record) for record in records]
