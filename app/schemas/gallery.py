from pydantic import BaseModel, Field


class GalleryEvent(BaseModel):
    title: str
    subtitle: str = ""
    media: list[str] = Field(default_factory=list)


class GallerySection(BaseModel):
    badge: str = ""
    title: str = ""
    events: list[GalleryEvent] = Field(default_factory=list)


class FullGalleryItem(BaseModel):
    type: str = Field(pattern="^(image|video)$")
    category: str
    url: str
    title: str
