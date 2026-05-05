"""
Input validation utilities.
"""
import re
from typing import Optional, Tuple, List
from datetime import datetime
import phonenumbers
from email_validator import validate_email as validate_email_lib, EmailNotValidError

from core.exceptions import MarketResearchException


def validate_location_input(location: str) -> Tuple[str, str]:
    """
    Validate and parse location input.
    
    Args:
        location: Location string (e.g., "New York, NY")
    
    Returns:
        Tuple of (city, region)
    
    Raises:
        MarketResearchException: If location is invalid
    """
    if not location or len(location) > 100:
        raise MarketResearchException(
            "Location must be between 1 and 100 characters"
        )
    
    # Check if location contains city and region
    if ',' not in location:
        raise MarketResearchException(
            "Location must include city and region (e.g., 'New York, NY')"
        )
    
    parts = [part.strip() for part in location.split(",")]
    if len(parts) < 2:
        raise MarketResearchException(
            "Location must include city and region separated by comma"
        )
    
    city = parts[0]
    region = parts[1]
    
    # Basic validation
    if not city or len(city) < 2:
        raise MarketResearchException("City name is too short")
    
    if not region or len(region) < 2:
        raise MarketResearchException("Region name is too short")
    
    return city, region


def validate_business_name(name: str) -> str:
    """
    Validate business name.
    
    Args:
        name: Business name
    
    Returns:
        Sanitized business name
    
    Raises:
        MarketResearchException: If name is invalid
    """
    if not name or len(name.strip()) == 0:
        raise MarketResearchException("Business name is required")
    
    name = name.strip()
    
    if len(name) > 200:
        raise MarketResearchException(
            "Business name must be less than 200 characters"
        )
    
    # Check for valid characters
    if not re.match(r'^[a-zA-Z0-9\s\-\'&.,]+$', name):
        raise MarketResearchException(
            "Business name contains invalid characters"
        )
    
    return name


def validate_email(email: str) -> str:
    """
    Validate email address.
    
    Args:
        email: Email address
    
    Returns:
        Normalized email address
    
    Raises:
        MarketResearchException: If email is invalid
    """
    if not email:
        raise MarketResearchException("Email address is required")
    
    try:
        # Validate email
        email_info = validate_email_lib(
            email,
            check_deliverability=False  # Don't check MX records for performance
        )
        return email_info.normalized
    except EmailNotValidError as e:
        raise MarketResearchException(f"Invalid email address: {str(e)}")


def validate_phone_number(phone: str, country: str = "US") -> Optional[str]:
    """
    Validate phone number.
    
    Args:
        phone: Phone number string
        country: Country code for validation
    
    Returns:
        Formatted phone number or None if invalid
    """
    if not phone:
        return None
    
    try:
        parsed = phonenumbers.parse(phone, country)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(
                parsed,
                phonenumbers.PhoneNumberFormat.E164
            )
    except phonenumbers.NumberParseException:
        pass
    
    return None


def validate_timeframe_days(days: int) -> int:
    """
    Validate timeframe days.
    
    Args:
        days: Number of days
    
    Returns:
        Validated days
    
    Raises:
        MarketResearchException: If days is invalid
    """
    if days < 1:
        raise MarketResearchException("Timeframe must be at least 1 day")
    
    if days > 365:
        raise MarketResearchException("Timeframe cannot exceed 365 days")
    
    return days


def validate_analysis_type(analysis_type: str) -> str:
    """
    Validate analysis type.
    
    Args:
        analysis_type: Analysis type string
    
    Returns:
        Validated analysis type
    
    Raises:
        MarketResearchException: If analysis type is invalid
    """
    valid_types = {"sentiment", "competitor", "trend", "comprehensive"}
    
    if analysis_type.lower() not in valid_types:
        raise MarketResearchException(
            f"Invalid analysis type. Must be one of: {', '.join(valid_types)}"
        )
    
    return analysis_type.lower()


def validate_business_type(business_type: str) -> str:
    """
    Validate business type.
    
    Args:
        business_type: Business type string
    
    Returns:
        Validated business type
    
    Raises:
        MarketResearchException: If business type is invalid
    """
    valid_types = {
        "restaurant", "retail", "service", "tech", 
        "healthcare", "other"
    }
    
    if business_type.lower() not in valid_types:
        raise MarketResearchException(
            f"Invalid business type. Must be one of: {', '.join(valid_types)}"
        )
    
    return business_type.lower()


def validate_competitor_list(competitors: Optional[List[str]]) -> List[str]:
    """
    Validate competitor list.
    
    Args:
        competitors: List of competitor names
    
    Returns:
        Validated competitor list
    
    Raises:
        MarketResearchException: If competitor list is invalid
    """
    if competitors is None:
        return []
    
    if not isinstance(competitors, list):
        raise MarketResearchException("Competitors must be a list")
    
    validated = []
    for i, competitor in enumerate(competitors):
        try:
            validated.append(validate_business_name(competitor))
        except MarketResearchException as e:
            raise MarketResearchException(
                f"Invalid competitor at position {i}: {str(e)}"
            )
    
    # Limit number of competitors
    if len(validated) > 20:
        raise MarketResearchException(
            "Maximum 20 competitors allowed per analysis"
        )
    
    return validated


def validate_date_range(
    start_date: Optional[str],
    end_date: Optional[str]
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Validate date range.
    
    Args:
        start_date: Start date string
        end_date: End date string
    
    Returns:
        Tuple of (start_datetime, end_datetime)
    
    Raises:
        MarketResearchException: If dates are invalid
    """
    from utils.helpers import parse_datetime
    
    start_dt = None
    end_dt = None
    
    if start_date:
        start_dt = parse_datetime(start_date)
        if not start_dt:
            raise MarketResearchException(
                f"Invalid start date format: {start_date}"
            )
    
    if end_date:
        end_dt = parse_datetime(end_date)
        if not end_dt:
            raise MarketResearchException(
                f"Invalid end date format: {end_date}"
            )
    
    if start_dt and end_dt and start_dt > end_dt:
        raise MarketResearchException(
            "Start date cannot be after end date"
        )
    
    # Ensure dates are not in the future
    now = datetime.utcnow()
    if start_dt and start_dt > now:
        raise MarketResearchException("Start date cannot be in the future")
    
    if end_dt and end_dt > now:
        raise MarketResearchException("End date cannot be in the future")
    
    return start_dt, end_dt


def validate_api_key_format(api_key: str) -> bool:
    """
    Validate API key format (basic check).
    
    Args:
        api_key: API key string
    
    Returns:
        True if format looks valid
    """
    if not api_key or len(api_key) < 10:
        return False
    
    # Check if it looks like a typical API key
    # (mix of alphanumeric characters, possibly with dashes/underscores)
    if not re.match(r'^[A-Za-z0-9_\-]{20,}$', api_key):
        return False
    
    return True


def validate_search_query(query: str) -> str:
    """
    Validate search query.
    
    Args:
        query: Search query string
    
    Returns:
        Sanitized query
    
    Raises:
        MarketResearchException: If query is invalid
    """
    if not query or len(query.strip()) == 0:
        raise MarketResearchException("Search query is required")
    
    query = query.strip()
    
    if len(query) > 500:
        raise MarketResearchException(
            "Search query must be less than 500 characters"
        )
    
    # Remove potentially harmful characters
    query = re.sub(r'[<>{}[\]]', '', query)
    
    return query


def validate_file_upload(
    filename: str,
    max_size: int,
    allowed_extensions: List[str]
) -> Tuple[str, str]:
    """
    Validate file upload.
    
    Args:
        filename: Original filename
        max_size: Maximum file size in bytes
        allowed_extensions: List of allowed file extensions
    
    Returns:
        Tuple of (safe_filename, file_extension)
    
    Raises:
        MarketResearchException: If file is invalid
    """
    if not filename:
        raise MarketResearchException("Filename is required")
    
    # Get file extension
    from utils.helpers import get_file_extension
    ext = get_file_extension(filename)
    
    if not ext:
        raise MarketResearchException("File must have an extension")
    
    if ext.lower() not in [e.lower() for e in allowed_extensions]:
        raise MarketResearchException(
            f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Sanitize filename
    safe_name = re.sub(r'[^\w\s.-]', '', filename)
    safe_name = safe_name.replace(' ', '_')
    
    if len(safe_name) > 255:
        raise MarketResearchException("Filename is too long")
    
    return safe_name, ext