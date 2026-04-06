from typing import Any

from pydantic import BaseModel, field_validator

from app.schemas.gallery import FullGalleryItem, GallerySection


class SiteContentPatch(BaseModel):
    """Partial top-level keys merged into site JSONB (each provided key replaces that section)."""

    model_config = {"extra": "forbid"}

    hero: dict[str, Any] | None = None
    about: dict[str, Any] | None = None
    stats: list[Any] | None = None
    team: dict[str, Any] | None = None
    gallery: dict[str, Any] | None = None
    fullGallery: list[dict[str, Any]] | None = None
    aboutPage: dict[str, Any] | None = None
    admissionsPage: dict[str, Any] | None = None
    # Optional locale mirrors for the public marketing site (merged client-side).
    i18n: dict[str, Any] | None = None

    @field_validator("gallery")
    @classmethod
    def validate_gallery(cls, v: dict[str, Any] | None) -> dict[str, Any] | None:
        if v is not None:
            GallerySection.model_validate(v)
        return v

    @field_validator("fullGallery")
    @classmethod
    def validate_full_gallery(cls, v: list[dict[str, Any]] | None) -> list[dict[str, Any]] | None:
        if v is not None:
            for item in v:
                FullGalleryItem.model_validate(item)
        return v

    def merge_keys(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)
