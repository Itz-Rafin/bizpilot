from __future__ import annotations

from dataclasses import dataclass

from supabase import Client, create_client

from app.core.config import Settings


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

    def upload(self, path: str, content: bytes, content_type: str) -> str:
        self.client.storage.from_(self.bucket).upload(
            path, content, {"content-type": content_type, "upsert": "true"}
        )
        return path
