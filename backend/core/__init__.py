"""
Core application package.
"""

# Remove problematic imports that cause circular dependencies
from .config import settings

# Import security functions that don't cause circular dependencies
from .security import (
    verify_password,
    get_password_hash,
    create_access_token,
    validate_api_key,
    sanitize_input,
    validate_location_input,
    rate_limit_key,
    validate_email_format,
    generate_api_key,
    validate_api_key_format
)

# Don't import get_current_user or get_current_active_user here
# They will be used through dependencies.py

__all__ = [
    "settings",
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "validate_api_key",
    "sanitize_input",
    "validate_location_input",
    "rate_limit_key",
    "validate_email_format",
    "generate_api_key",
    "validate_api_key_format",
]