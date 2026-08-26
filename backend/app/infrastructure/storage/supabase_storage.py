from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath
from uuid import UUID, uuid4

from supabase import Client, create_client

from app.core.config import Settings

ALLOWED_CONTENT_TYPES = frozenset({"image/png", "image/jpeg", "image/webp", "application/pdf"})
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _content_matches_type(content: bytes, content_type: str) -> bool:
    signatures = {
        "image/png": content.startswith(b"\\x89PNG\\r\\n\\x1a\\n"),
        "image/jpeg": content.startswith(b"\\xff\\xd8\\xff"),
        "image/webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
        "application/pdf": content.startswith(b"%PDF-"),
    }
    return signatures.get(content_type, False)


@dataclass(slots=True)
class SupabaseStorage:
    client: Client
    bucket: str

    @classmethod
    def from_settings(cls, settings: Settings) -> SupabaseStorage:
        if not settings.supabase_service_role_key:
            raise ValueError("Supabase storage is not configured")
        return cls(
            create_client(settings.supabase_url, settings.supabase_service_role_key),
            settings.storage_bucket,
        )

    def upload(
        self, organization_id: UUID, filename: str, content: bytes, content_type: str
    ) -> str:
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError("Unsupported upload type")
        if len(content) > MAX_UPLOAD_BYTES:
            raise ValueError("Upload exceeds the 5 MB limit")
        if not _content_matches_type(content, content_type):
            raise ValueError("Upload content does not match its declared type")
        safe_name = PurePosixPath(filename).name
        if not filename or safe_name != filename or filename in {".", ".."} or "\\" in filename:
            raise ValueError("Unsafe upload filename")
        path = f"{organization_id}/{uuid4().hex}-{safe_name}"
        self.client.storage.from_(self.bucket).upload(
            path, content, {"content-type": content_type, "upsert": "false"}
        )
        return path
