"""
Helper functions and utilities.
"""
import asyncio
import json
import logging
import os
import random
import string
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union
from contextlib import contextmanager
import aiohttp
import httpx
from loguru import logger

from core.config import settings


def setup_logging():
    """
    Setup logging configuration.
    """
    # Remove default handlers
    logger.remove()
    
    # Add console handler
    logger.add(
        lambda msg: print(msg, end=""),
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=settings.LOG_LEVEL,
        enqueue=True,
    )
    
    # Add file handler
    log_dir = os.path.dirname(settings.LOG_FILE)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
    
    logger.add(
        settings.LOG_FILE,
        rotation="500 MB",
        retention="30 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level=settings.LOG_LEVEL,
        enqueue=True,
    )
    
    return logger


def generate_request_id() -> str:
    """
    Generate a unique request ID.
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"req_{timestamp}_{random_str}"


def generate_report_id() -> str:
    """
    Generate a unique report ID.
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"rep_{timestamp}_{random_str}"


def format_location(location: str) -> Tuple[str, str]:
    """
    Format location string into city and region.
    
    Args:
        location: Location string (e.g., "New York, NY")
    
    Returns:
        Tuple of (city, region)
    """
    parts = [part.strip() for part in location.split(",")]
    if len(parts) >= 2:
        city = parts[0]
        region = parts[1]
    else:
        city = location
        region = ""
    
    return city, region


def validate_email(email: str) -> bool:
    """
    Validate email format.
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def sanitize_text(text: str) -> str:
    """
    Sanitize text by removing special characters and normalizing.
    """
    import re
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^\w\s.,!?-]', ' ', text)
    # Normalize whitespace
    text = ' '.join(text.split())
    return text.strip()


def calculate_confidence_score(
    data_points: int,
    source_diversity: int,
    recency_hours: int
) -> float:
    """
    Calculate confidence score for analysis.
    
    Args:
        data_points: Number of data points
        source_diversity: Number of unique sources
        recency_hours: Age of newest data in hours
    
    Returns:
        Confidence score between 0 and 1
    """
    # Data points score (max 0.4)
    data_score = min(data_points / 1000, 0.4)
    
    # Source diversity score (max 0.3)
    source_score = min(source_diversity / 10, 0.3)
    
    # Recency score (max 0.3)
    if recency_hours <= 24:
        recency_score = 0.3
    elif recency_hours <= 168:  # 1 week
        recency_score = 0.2
    elif recency_hours <= 720:  # 1 month
        recency_score = 0.1
    else:
        recency_score = 0.0
    
    return round(data_score + source_score + recency_score, 2)


def format_datetime(dt: datetime, format: str = "iso") -> str:
    """
    Format datetime to string.
    
    Args:
        dt: Datetime object
        format: Output format ("iso", "human", "short")
    
    Returns:
        Formatted datetime string
    """
    if format == "iso":
        return dt.isoformat() + "Z"
    elif format == "human":
        return dt.strftime("%B %d, %Y at %I:%M %p")
    elif format == "short":
        return dt.strftime("%Y-%m-%d %H:%M")
    else:
        return dt.isoformat()


def parse_datetime(date_str: str) -> Optional[datetime]:
    """
    Parse datetime from string.
    """
    formats = [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    return None


def chunk_list(items: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    Split list into chunks.
    """
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


async def async_retry(
    func,
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Retry an async function with exponential backoff.
    
    Args:
        func: Async function to retry
        max_retries: Maximum number of retries
        delay: Initial delay in seconds
        backoff: Backoff multiplier
        exceptions: Exceptions to catch
    
    Returns:
        Function result
    
    Raises:
        Last exception if all retries fail
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except exceptions as e:
            last_exception = e
            if attempt == max_retries:
                break
            
            wait_time = delay * (backoff ** attempt)
            logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
            await asyncio.sleep(wait_time)
    
    raise last_exception


def get_file_extension(filename: str) -> str:
    """
    Get file extension from filename.
    """
    return os.path.splitext(filename)[1].lower().lstrip('.')


def ensure_directory(path: str):
    """
    Ensure directory exists.
    """
    os.makedirs(path, exist_ok=True)


def format_bytes(size: int) -> str:
    """
    Format bytes to human readable string.
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"


@contextmanager
def timer(name: str):
    """
    Context manager for timing code execution.
    """
    start = time.time()
    yield
    elapsed = time.time() - start
    logger.info(f"{name} took {elapsed:.2f} seconds")


def create_error_response(
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create standardized error response.
    """
    response = {
        "error": {
            "code": error_code,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    }
    
    if details:
        response["error"]["details"] = details
    
    return response


def validate_url(url: str) -> bool:
    """
    Validate URL format.
    """
    import re
    pattern = re.compile(
        r'^(?:http|ftp)s?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP
        r'(?::\d+)?'  # port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE
    )
    return bool(re.match(pattern, url))