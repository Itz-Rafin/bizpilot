from uuid import UUID

import pytest

from app.infrastructure.storage.supabase_storage import SupabaseStorage


class FakeBucket:
    def __init__(self):
        self.calls = []

    def upload(self, path, content, options):
        self.calls.append((path, content, options))


class FakeStorage:
    def __init__(self):
        self.bucket = FakeBucket()

    def from_(self, name):
        assert name == "bizpilot-assets"
        return self.bucket


class FakeClient:
    def __init__(self):
        self.storage = FakeStorage()


def storage():
    return SupabaseStorage(FakeClient(), "bizpilot-assets")


def test_upload_uses_organization_root_and_unique_filename():
    path = storage().upload(
        UUID("00000000-0000-0000-0000-000000000001"),
        "logo.png",
        b"\\x89PNG\\r\\n\\x1a\\nvalid",
        "image/png",
    )
    assert path.startswith("00000000-0000-0000-0000-000000000001/")
    assert path.endswith("-logo.png")


@pytest.mark.parametrize("filename", ["../logo.png", "org/logo.png", "\\logo.png", ".."])
def test_path_traversal_and_nested_filenames_are_rejected(filename):
    with pytest.raises(ValueError, match="Unsafe"):
        storage().upload(UUID(int=1), filename, b"\\x89PNG\\r\\n\\x1a\\nvalid", "image/png")


@pytest.mark.parametrize("content_type", ["text/html", "application/x-sh", "image/svg+xml"])
def test_unsupported_content_types_are_rejected(content_type):
    with pytest.raises(ValueError, match="Unsupported"):
        storage().upload(UUID(int=1), "file", b"data", content_type)


def test_mismatched_content_is_rejected():
    with pytest.raises(ValueError, match="does not match"):
        storage().upload(UUID(int=1), "logo.png", b"not-an-image", "image/png")


def test_oversized_upload_is_rejected():
    with pytest.raises(ValueError, match="5 MB"):
        storage().upload(
            UUID(int=1), "large.pdf", b"%PDF-" + b"x" * (5 * 1024 * 1024 + 1), "application/pdf"
        )
