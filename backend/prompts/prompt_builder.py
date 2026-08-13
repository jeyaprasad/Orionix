"""
prompt_builder.py
-----------------
Reusable Prompt Builder layer for Orionix.

Responsibilities (and ONLY these):
  1. Validate the incoming EOContext.
  2. Populate the system and user prompt templates.
  3. Return a PromptPayload ready to be sent to GPTService.

Constraints enforced by design:
  - Does NOT communicate with GPT, OpenRouter, or any external service.
  - Does NOT perform inference or call any vision/interpreter module.
  - Does NOT accept raw embeddings, cosine similarities, or any vision-layer internals.
  - Is completely independent of GPTService and RemoteCLIP.
  - Is stateless — build_prompt() has no side effects.
"""

import time
from typing import Optional
from backend.prompts.templates import (
    SYSTEM_PROMPT,
    USER_PROMPT_TEMPLATE,
    SECONDARY_LAND_COVER_FALLBACK,
    QUESTION_SYSTEM_PROMPT,
    QUESTION_USER_TEMPLATE,
)
from backend.schemas.prompt import EOContext, PromptPayload
from backend.utils.logger import logger


class PromptBuilder:
    """
    Transforms structured EO interpretation context into a PromptPayload
    suitable for direct consumption by GPTService.

    Usage:
        builder = PromptBuilder()
        payload = builder.build_prompt(eo_context)
        # payload.system_prompt → pass as {"role": "system", "content": ...}
        # payload.user_prompt   → pass as {"role": "user",   "content": ...}
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build_prompt(self, eo_context: EOContext) -> PromptPayload:
        """
        Build a PromptPayload from a validated EOContext.

        Runs validation, resolves any optional field defaults, then populates
        the system and user prompt templates.

        Args:
            eo_context: A validated EOContext instance containing the semantic
                        EO interpretation fields. Raw vision outputs (embeddings,
                        similarity scores) must NOT be present.

        Returns:
            PromptPayload — contains system_prompt and user_prompt strings,
            ready to be forwarded to GPTService.

        Raises:
            ValueError: If any mandatory field is missing, blank, or carries an
                        invalid value. The exception message is descriptive and
                        safe to log.
        """
        start = time.perf_counter()
        logger.info("Prompt generation started.")

        # 1. Validate
        self._validate(eo_context)

        # 2. Resolve secondary land-cover fallback
        secondary = self._resolve_secondary(eo_context.secondary_land_cover)

        # 3. Build system prompt (static — same for every request)
        system_prompt = self._build_system_prompt()

        # 4. Build user prompt (parameterised per request)
        user_prompt = self._build_user_prompt(
            dominant=eo_context.dominant_land_cover,
            secondary=secondary,
            confidence=eo_context.confidence,
            summary=eo_context.summary,
            water_coverage_percent=eo_context.water_coverage_percent,
            vegetation_index_score=eo_context.vegetation_index_score,
            vegetation_index_type=eo_context.vegetation_index_type,
            urban_density_percent=eo_context.urban_density_percent,
            deforestation_delta=eo_context.deforestation_delta,
            mode=eo_context.mode,
        )

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(f"Prompt generation completed in {elapsed_ms:.2f}ms.")

        return PromptPayload(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

    def build_question_prompt(self, eo_context: EOContext, question: str) -> PromptPayload:
        """
        Build a PromptPayload for a single predefined EO question.

        Reuses the same EOContext already produced by /api/analyze — no
        RemoteCLIP or interpreter re-execution required.

        Args:
            eo_context: The validated EOContext from the completed analysis.
            question:   The predefined question string the user clicked.

        Returns:
            PromptPayload with the focused Q&A system and user prompts.

        Raises:
            ValueError: If eo_context fails validation or question is blank.
        """
        if not question or not question.strip():
            raise ValueError("question must not be blank.")

        self._validate(eo_context)
        secondary = self._resolve_secondary(eo_context.secondary_land_cover)

        user_prompt = QUESTION_USER_TEMPLATE.format(
            dominant_land_cover=eo_context.dominant_land_cover,
            secondary_land_cover=secondary,
            confidence=eo_context.confidence,
            summary=eo_context.summary,
            question=question.strip(),
        )

        return PromptPayload(
            system_prompt=QUESTION_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate(self, ctx: EOContext) -> None:
        """
        Performs explicit semantic validation beyond Pydantic's schema rules.

        Pydantic already enforces field presence and the confidence band.
        This method adds business-rule checks and produces logger-friendly
        error context before re-raising.

        Args:
            ctx: The EOContext to validate.

        Raises:
            ValueError: With a descriptive message identifying the failing field.
        """
        issues = []

        if not ctx.dominant_land_cover or not ctx.dominant_land_cover.strip():
            issues.append("dominant_land_cover is missing or blank")

        if ctx.confidence not in {"High", "Medium", "Low"}:
            issues.append(
                f"confidence must be 'High', 'Medium', or 'Low' — got '{ctx.confidence}'"
            )

        if not ctx.summary or not ctx.summary.strip():
            issues.append("summary is missing or blank")

        if ctx.water_coverage_percent is not None and not (0.0 <= ctx.water_coverage_percent <= 100.0):
            issues.append(f"water_coverage_percent must be between 0 and 100, got {ctx.water_coverage_percent}")

        if ctx.vegetation_index_score is not None and not (0.0 <= ctx.vegetation_index_score <= 100.0):
            issues.append(f"vegetation_index_score must be between 0 and 100, got {ctx.vegetation_index_score}")

        if ctx.urban_density_percent is not None and not (0.0 <= ctx.urban_density_percent <= 100.0):
            issues.append(f"urban_density_percent must be between 0 and 100, got {ctx.urban_density_percent}")

        if issues:
            msg = f"EOContext validation failed: {'; '.join(issues)}."
            logger.warning(f"Prompt generation aborted — {msg}")
            raise ValueError(msg)

    @staticmethod
    def _resolve_secondary(secondary_land_cover: str | None) -> str:
        """
        Normalises the secondary_land_cover value.

        Returns SECONDARY_LAND_COVER_FALLBACK if the value is None, empty,
        or the sentinel string 'Undetermined', keeping the user prompt coherent.

        Args:
            secondary_land_cover: Raw value from EOContext.

        Returns:
            A non-empty string safe to embed in the prompt.
        """
        if not secondary_land_cover or secondary_land_cover.strip().lower() in {
            "undetermined", "none", ""
        }:
            return SECONDARY_LAND_COVER_FALLBACK
        return secondary_land_cover.strip()

    @staticmethod
    def _build_system_prompt() -> str:
        """
        Returns the static Orionix system prompt from templates.py.

        This method exists as an indirection point so that future prompt
        versioning or A/B testing can be added here without touching
        build_prompt().

        Returns:
            The SYSTEM_PROMPT string constant.
        """
        return SYSTEM_PROMPT

    @staticmethod
    def _build_user_prompt(
        dominant: str,
        secondary: str,
        confidence: str,
        summary: str,
        water_coverage_percent: Optional[float] = None,
        vegetation_index_score: Optional[float] = None,
        vegetation_index_type: Optional[str] = None,
        urban_density_percent: Optional[float] = None,
        deforestation_delta: Optional[float] = None,
        mode: Optional[str] = None,
    ) -> str:
        """
        Populates USER_PROMPT_TEMPLATE with the provided EO field values.
        """
        water_val = f"{water_coverage_percent:.2f}%" if water_coverage_percent is not None else "Not applicable"
        veg_val = f"{vegetation_index_score:.2f} / 100" if vegetation_index_score is not None else "Not applicable"
        veg_type_val = vegetation_index_type if vegetation_index_type is not None else "RGB proxy index"
        urban_val = f"{urban_density_percent:.2f}%" if urban_density_percent is not None else "Not applicable"
        deforest_val = f"{deforestation_delta:.2f}%" if deforestation_delta is not None else "Not applicable"

        base_prompt = USER_PROMPT_TEMPLATE.format(
            dominant_land_cover=dominant,
            secondary_land_cover=secondary,
            confidence=confidence,
            summary=summary,
            water_coverage_percent=water_val,
            vegetation_index_score=veg_val,
            vegetation_index_type=veg_type_val,
            urban_density_percent=urban_val,
            deforestation_delta=deforest_val,
        )

        mode_instructions = ""
        if mode == "flood":
            mode_instructions = "\n\nFOCUS DIRECTIVE: This report is specifically focused on Flood & Water hazard analysis. Prioritize assessing the water coverage metrics, flood severity level, and potential hazard impact. Base your explanation heavily on the water coverage measurement."
        elif mode == "deforestation":
            mode_instructions = "\n\nFOCUS DIRECTIVE: This report is specifically focused on Deforestation & Canopy loss analysis. Prioritize assessing the deforestation delta metric, vegetation index measurements, and forest canopy health. Highlight the change over time."
        elif mode == "urban":
            mode_instructions = "\n\nFOCUS DIRECTIVE: This report is specifically focused on Urban Sprawl & Built-up expansion analysis. Prioritize assessing the urban density index, infrastructure coverage, and impervious surface metrics."
        elif mode == "agriculture":
            mode_instructions = "\n\nFOCUS DIRECTIVE: This report is specifically focused on Agricultural Vitality & Vegetation health analysis. Prioritize assessing the vegetation index score, crop vitality, and agricultural area health."

        return base_prompt + mode_instructions


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
# Import and use this directly rather than instantiating PromptBuilder
# manually in every call site.
# ---------------------------------------------------------------------------
prompt_builder = PromptBuilder()
