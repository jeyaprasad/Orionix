"""
prompt.py
---------
Pydantic schemas for the Prompt Builder layer.

EOContext  — structured EO interpretation consumed by PromptBuilder.
             Contains only the semantic fields required to build a GPT prompt.
             Deliberately excludes raw embeddings, cosine similarities, and
             any other vision-layer internals.

PromptPayload — the output produced by PromptBuilder and consumed by GPTService.
               System and user prompts are kept separate so GPTService can map
               them directly to the OpenAI messages format.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional

VALID_CONFIDENCE_BANDS = {"High", "Medium", "Low"}


class EOContext(BaseModel):
    """
    Structured EO interpretation passed into the Prompt Builder.

    Accepts only semantic, analyst-readable fields.
    Vision-layer internals (embeddings, similarity scores, logits) are
    explicitly excluded from this model by design.
    """
    dominant_land_cover: str = Field(
        ...,
        description="Primary EO land-cover category identified by the interpreter.",
        min_length=1,
    )
    secondary_land_cover: Optional[str] = Field(
        None,
        description="Secondary land-cover category, or None / 'Undetermined' if unavailable.",
    )
    confidence: str = Field(
        ...,
        description="Relative confidence band: High | Medium | Low.",
    )
    summary: str = Field(
        ...,
        description="Rule-based scene summary text produced by the EO interpreter.",
        min_length=1,
    )
    water_coverage_percent: Optional[float] = Field(
        None,
        description="Computed water coverage percentage.",
    )
    vegetation_index_score: Optional[float] = Field(
        None,
        description="Computed vegetation health score (0-100).",
        ge=0.0,
        le=100.0,
    )
    urban_density_percent: Optional[float] = Field(
        None,
        description="Computed urban/settlement density percentage.",
    )
    deforestation_delta: Optional[float] = Field(
        None,
        description="Computed deforestation delta percentage (change between pre and post scenes).",
    )
    vegetation_delta: Optional[float] = Field(
        None,
        description="Computed vegetation delta percentage.",
    )
    urban_density_delta: Optional[float] = Field(
        None,
        description="Computed urban density change percentage.",
    )
    deforestation_classification: Optional[str] = Field(
        None,
        description="Deforestation classification: stable/declining/critical",
    )
    urban_growth_classification: Optional[str] = Field(
        None,
        description="Urban growth classification: stable/moderate/rapid",
    )
    vegetation_index_type: Optional[str] = Field(
        None,
        description="The type of vegetation index used: 'true NDVI (multispectral)' or 'RGB proxy index'.",
    )
    mode: Optional[str] = Field(
        None,
        description="The analysis mode selected by the user: auto | flood | deforestation | urban | agriculture",
    )

    @field_validator("dominant_land_cover")
    @classmethod
    def dominant_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("dominant_land_cover must not be blank.")
        return v.strip()

    @field_validator("confidence")
    @classmethod
    def confidence_must_be_valid_band(cls, v: str) -> str:
        if v not in VALID_CONFIDENCE_BANDS:
            raise ValueError(
                f"confidence must be one of {sorted(VALID_CONFIDENCE_BANDS)}, got '{v}'."
            )
        return v

    @field_validator("summary")
    @classmethod
    def summary_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("summary must not be blank.")
        return v.strip()


class PromptPayload(BaseModel):
    """
    Output produced by PromptBuilder and consumed by GPTService.

    system_prompt — defines the AI persona and strict operating constraints.
    user_prompt   — encodes the EO context and the analysis request.

    These are kept separate so GPTService can map them directly to the
    OpenAI Chat Completions messages array:
        [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ]
    """
    system_prompt: str = Field(
        ..., description="GPT system role prompt defining Orionix's persona and constraints."
    )
    user_prompt: str = Field(
        ..., description="GPT user message containing EO context and analysis instructions."
    )
