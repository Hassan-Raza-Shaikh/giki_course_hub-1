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
}

# Extensions that have no reliable magic bytes (plain text formats)
PLAINTEXT_EXTENSIONS = {'txt'}


def validate_file_magic_bytes(file_stream, extension):
    """
    Read the first 8 bytes of a file to verify its content matches the
    declared extension.  Returns True if the file is valid, False otherwise.
    Always resets the stream position to 0 after reading.
    """
    extension = extension.lower()

    # Plain text files have no magic bytes — allow them through
    if extension in PLAINTEXT_EXTENSIONS:
        return True

    expected = MAGIC_BYTES.get(extension)
    if expected is None:
        # Unknown extension — reject for safety (shouldn't happen if
        # ALLOWED_EXTENSIONS is checked first, but defense-in-depth)
        return False

    try:
        header = file_stream.read(8)
        file_stream.seek(0)

        if not header:
            return False

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
