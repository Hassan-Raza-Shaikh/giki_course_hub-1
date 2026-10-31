# ==========================================
# utils/validators.py — File validation & security utilities
# ==========================================

import hashlib

# ─────────────────────────────────────────────────────────────────────────────
# Magic byte signatures for content-type verification
# Prevents content-type spoofing (e.g. renaming malware.exe → notes.pdf)
# ─────────────────────────────────────────────────────────────────────────────

MAGIC_BYTES = {
    'pdf':  [b'%PDF'],
    'docx': [b'PK\x03\x04'],      # DOCX is a ZIP/OOXML container
    'pptx': [b'PK\x03\x04'],      # PPTX is a ZIP/OOXML container
    'xlsx': [b'PK\x03\x04'],      # XLSX is a ZIP/OOXML container
    'zip':  [b'PK\x03\x04', b'PK\x05\x06'],
    'png':  [b'\x89PNG'],
    'jpg':  [b'\xff\xd8\xff'],
    'jpeg': [b'\xff\xd8\xff'],
    'doc':  [b'\xd0\xcf\x11\xe0'],  # OLE2 compound document (legacy Office)
    'ppt':  [b'\xd0\xcf\x11\xe0'],
    'xls':  [b'\xd0\xcf\x11\xe0'],
    'gif':  [b'GIF87a', b'GIF89a'],
    'webm': [b'\x1a\x45\xdf\xa3'],   # EBML header (Matroska/WebM)
}

# Extensions that have no reliable magic bytes (plain text formats)
# Formats whose signature isn't a plain prefix: checked in _matches_container()
CONTAINER_EXTENSIONS = {'webp', 'mp4'}

# CSV is plain text too, but is stored as text/csv rather than text/plain
UNSIGNED_EXTENSIONS = {'csv'}

PLAINTEXT_EXTENSIONS = {'txt', 'ipynb', 'py', 'js', 'jsx', 'ts', 'tsx', 'cpp', 'c', 'h', 'hpp', 'java', 'rs', 'go', 'rb', 'php', 'css', 'html', 'json', 'yaml', 'yml', 'sh', 'md'}


def _matches_container(header, extension):
    if extension == 'webp':
        return header[:4] == b'RIFF' and header[8:12] == b'WEBP'
    if extension == 'mp4':
        return header[4:8] == b'ftyp'  # ISO base media box
    return False


def validate_file_magic_bytes(file_stream, extension):
    """
    Read the first 12 bytes of a file to verify its content matches the
    declared extension.  Returns True if the file is valid, False otherwise.
    Always resets the stream position to 0 after reading.
    """
    extension = extension.lower()

    # Plain text files have no magic bytes — allow them through
    if extension in PLAINTEXT_EXTENSIONS or extension in UNSIGNED_EXTENSIONS:
        return True

    expected = MAGIC_BYTES.get(extension)
    if expected is None and extension not in CONTAINER_EXTENSIONS:
        # Unknown extension — reject for safety (shouldn't happen if
        # ALLOWED_EXTENSIONS is checked first, but defense-in-depth)
        return False

    try:
        header = file_stream.read(12)
        file_stream.seek(0)

        if not header:
            return False

        if extension in CONTAINER_EXTENSIONS:
            return _matches_container(header, extension)
        return any(header.startswith(magic) for magic in expected)
    except Exception:
        try:
            file_stream.seek(0)
        except Exception:
            pass
        return False


def compute_file_hash(file_stream):
    """
    Compute SHA-256 hash of a file's content for deduplication.
    Reads the file in 8KB chunks to avoid loading large files into memory.
    Always resets the stream position to 0 after reading.
    """
    hasher = hashlib.sha256()
    try:
        for chunk in iter(lambda: file_stream.read(8192), b''):
            hasher.update(chunk)
    finally:
        file_stream.seek(0)
    return hasher.hexdigest()


def get_file_extension(filename):
    """Extract and lowercase the file extension from a filename."""
    if '.' not in filename:
        return ''
    return filename.rsplit('.', 1)[1].lower()


# ─────────────────────────────────────────────────────────────────────────────
# Content-Type used when storing uploads in R2
# Derived from the (already validated) extension, never from the browser, so a
# file can't be labelled text/html and render as a live page from its public URL.
# Plain-text formats (including html/js/svg-like code) are served as text/plain.
# ─────────────────────────────────────────────────────────────────────────────

SAFE_CONTENT_TYPES = {
    'pdf':  'application/pdf',
    'doc':  'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt':  'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xls':  'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv':  'text/csv; charset=utf-8',
    'zip':  'application/zip',
    'png':  'image/png',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif':  'image/gif',
    'webp': 'image/webp',
    'mp4':  'video/mp4',
    'webm': 'video/webm',
}


def safe_content_type(extension):
    """Return the Content-Type to store an upload with, based on its extension."""
    extension = extension.lower()
    if extension in PLAINTEXT_EXTENSIONS:
        return 'text/plain; charset=utf-8'
    return SAFE_CONTENT_TYPES.get(extension, 'application/octet-stream')


# ─────────────────────────────────────────────────────────────────────────────
# Display names
# ─────────────────────────────────────────────────────────────────────────────

DISPLAY_NAME_MAX = 60
# Names that would read as official; only admins may use them
_RESERVED_NAMES = {'admin', 'administrator', 'moderator', 'mod', 'staff', 'support',
                   'gikicoursehub', 'coursehub', 'coursehubteam', 'system', 'official'}


def check_display_name(name, is_admin=False):
    """Return (cleaned name, None) or (None, error message)."""
    import re
    name = ' '.join((name or '').split())  # collapse whitespace and control chars
    if not name:
        return None, "Display name cannot be empty."
    if len(name) > DISPLAY_NAME_MAX:
        return None, f"Display name must be {DISPLAY_NAME_MAX} characters or fewer."
    if not is_admin and re.sub(r'[^a-z]', '', name.lower()) in _RESERVED_NAMES:
        return None, "That display name is reserved. Please choose another."
    return name, None
