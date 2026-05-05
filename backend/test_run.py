"""
Pydantic schemas for request/response models.
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ReportFormat(str, Enum):
    JSON = "json"
    PDF = "pdf"
    HTML = "html"
    CSV = "csv"

class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    company: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    email: Optional[str] = None

# Analysis request schemas
class AnalysisRequestBase(BaseModel):
    location: str
    business_type: Optional[str] = None
    analysis_type: List[str] = ["sentiment", "competitors", "trends"]
    data_sources: List[str] = ["reviews", "news", "social"]
    timeframe_days: int = Field(30, ge=1, le=365)
    
    @validator('location')
    def validate_location(cls, v):
        if len(v) > 100:
            raise ValueError('Location too long')
        return v

class AnalysisRequestCreate(AnalysisRequestBase):
    user_id: Optional[int] = None

class AnalysisRequestInDB(AnalysisRequestBase):
    id: int
    user_id: Optional[int]
    status: AnalysisStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Analysis result schemas
class SentimentResult(BaseModel):
    overall_score: float = Field(..., ge=-1, le=1)
    positive_count: int
    negative_count: int
    neutral_count: int
    key_phrases: List[str]

class CompetitorAnalysis(BaseModel):
    name: str
    rating: Optional[float]
    review_count: Optional[int]
    strengths: List[str]
    weaknesses: List[str]
    market_position: str

class TrendAnalysis(BaseModel):
    topic: str
    frequency: int
    sentiment: str
    keywords: List[str]

class GapAnalysis(BaseModel):
    opportunity: str
    evidence: List[str]
    potential_impact: str

class AnalysisResultBase(BaseModel):
    request_id: int
    summary: str
    sentiment: SentimentResult
    competitors: List[CompetitorAnalysis]
    trends: List[TrendAnalysis]
    gaps: List[GapAnalysis]
    recommendations: List[str]
    raw_data_summary: Dict[str, Any]

class AnalysisResultCreate(AnalysisResultBase):
    pass

class AnalysisResultInDB(AnalysisResultBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Report schemas
class ReportBase(BaseModel):
    title: str
    description: Optional[str]
    format: ReportFormat = ReportFormat.JSON
    include_charts: bool = True
    
    @validator('title')
    def validate_title(cls, v):
        if len(v) > 200:
            raise ValueError('Title too long')
        return v

class ReportCreate(ReportBase):
    analysis_result_id: int

class ReportInDB(ReportBase):
    id: int
    analysis_result_id: int
    file_path: Optional[str]
    download_url: Optional[str]
    created_at: datetime
    download_count: int = 0
    
    class Config:
        from_attributes = True

# API Usage schemas
class APIUsageBase(BaseModel):
    endpoint: str
    method: str
    user_id: Optional[int]
    status_code: int
    response_time_ms: int

class APIUsageCreate(APIUsageBase):
    pass

class APIUsageInDB(APIUsageBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Response schemas
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int

# Market data schemas
class MarketDataRequest(BaseModel):
    location: str
    radius_km: int = Field(10, ge=1, le=50)
    categories: Optional[List[str]] = None

class DataSourceResult(BaseModel):
    source: str
    data_type: str
    count: int
    sample: List[Dict[str, Any]]

# ------------------------------------------------------------------
# Missing schemas that other files expect
# ------------------------------------------------------------------

# Market Analysis Request schema (for routes)
class MarketAnalysisRequest(BaseModel):
    location: str
    business_type: str
    analysis_type: str = "comprehensive"
    competitors: Optional[List[str]] = None
    timeframe_days: int = Field(30, ge=1, le=365)
    include_sources: List[str] = Field(["reviews", "news", "social"])
    custom_prompt: Optional[str] = None
    
    @validator('location')
    def validate_location(cls, v):
        if len(v) > 100:
            raise ValueError('Location too long')
        return v

# Market Analysis Response schema
class MarketAnalysisResponse(BaseModel):
    request_id: str
    location: str
    business_type: str
    analysis_type: str
    generated_at: datetime
    summary: str
    key_findings: List[str]
    market_opportunities: List[str]
    potential_risks: List[str]
    competitor_analysis: Optional[Dict[str, Any]] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None
    trend_analysis: Optional[Dict[str, Any]] = None
    data_sources_used: List[str]
    confidence_score: float = Field(..., ge=0, le=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)

# Report Request schema (for reports.py)
class ReportRequest(BaseModel):
    analysis_request_id: str
    title: str
    description: Optional[str] = None
    format: ReportFormat = ReportFormat.JSON
    include_charts: bool = True

# Market Report schema
class MarketReport(BaseModel):
    id: str
    title: str
    description: Optional[str]
    format: ReportFormat
    content: Dict[str, Any]
    download_url: Optional[str]
    preview_url: Optional[str]
    generated_at: datetime
    
    class Config:
        from_attributes = True

# Report Response schema
class ReportResponse(BaseModel):
    report: MarketReport
    success: bool
    message: str

# Data Collection schemas
class DataCollectionRequest(BaseModel):
    location: str
    business_type: str
    sources: List[str] = ["reviews", "news", "social"]
    max_results: int = 50
    timeframe_days: int = 30

class DataCollectionResponse(BaseModel):
    collection_id: str
    location: str
    business_type: str
    total_items: int
    sources_collected: List[str]
    sample_data: Dict[str, Any]

# API Usage Stats schema
class ApiUsageStats(BaseModel):
    total_requests: int
    requests_today: int
    requests_this_month: int
    last_request_at: Optional[datetime]
    plan_limit: int
    remaining_requests: int

# Dashboard schemas
class DashboardStats(BaseModel):
    total_analyses: int
    completed_analyses: int
    pending_analyses: int
    recent_analyses: List[Dict[str, Any]]
    api_usage: ApiUsageStats

# Settings schemas
class ApiKeyUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    google_places_api_key: Optional[str] = None
    yelp_api_key: Optional[str] = None
    news_api_key: Optional[str] = None

class UserSettings(BaseModel):
    email_notifications: bool = True
    report_format: ReportFormat = ReportFormat.JSON
    default_location: Optional[str] = None
    api_keys: ApiKeyUpdate = ApiKeyUpdate()

# Pagination schemas
class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = 50
    
    @validator('limit')
    def validate_limit(cls, v):
        if v > 100:
            raise ValueError('Limit cannot exceed 100')
        return v

class LocationFilter(BaseModel):
    location: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None

class TimeFilter(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timeframe_days: Optional[int] = None

# Standard response schemas
class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class HealthCheck(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime

class StatusResponse(BaseModel):
    status: str
    version: str
    uptime: str
    database: str
    services: List[str]

# ------------------------------------------------------------------
# Compatibility aliases
# ------------------------------------------------------------------

# Alias for BusinessType used by imports
BusinessType = str
AnalysisType = str
DataSource = str
UserUpdate = UserBase
PasswordUpdate = BaseModel
SourceResult = DataSourceResult