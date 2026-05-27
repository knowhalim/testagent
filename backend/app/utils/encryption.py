import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import get_settings


def _get_fernet_key() -> bytes:
    """Derive a 32-byte Fernet key from the SECRET_KEY setting."""
    settings = get_settings()
    key_bytes = settings.SECRET_KEY.encode("utf-8")
    # Use SHA-256 to derive a 32-byte key, then base64-encode for Fernet
    derived = hashlib.sha256(key_bytes).digest()
    return base64.urlsafe_b64encode(derived)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value using Fernet symmetric encryption."""
    if not plaintext:
        return ""
    fernet = Fernet(_get_fernet_key())
    encrypted = fernet.encrypt(plaintext.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a Fernet-encrypted string value."""
    if not ciphertext:
        return ""
    fernet = Fernet(_get_fernet_key())
    try:
        decrypted = fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception:
        # If decryption fails (e.g., key changed), return empty string
        return ""
