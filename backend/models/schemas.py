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

class AnalysisType(str, Enum):
    COMPREHENSIVE = "comprehensive"
    COMPETITOR = "competitor"
    SENTIMENT = "sentiment"
    TREND = "trend"

class BusinessType(str, Enum):
    RESTAURANT = "restaurant"
    RETAIL = "retail"
    SERVICE = "service"
    TECH = "tech"
    HEALTHCARE = "healthcare"
    OTHER = "other"

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

# Market Analysis schemas
class MarketAnalysisRequest(BaseModel):
    location: str = Field(..., description="Location for market analysis (e.g., 'New York, NY')")
    business_type: str = Field(..., description="Type of business to analyze")
    analysis_type: str = Field("comprehensive", description="Type of analysis: 'comprehensive', 'competitor', 'sentiment', 'trend'")
    competitors: Optional[List[str]] = Field(None, description="List of competitor names")
    timeframe_days: int = Field(30, ge=1, le=365, description="Timeframe for data collection in days")
    include_sources: List[str] = Field(["reviews", "news", "social"], description="Data sources to include")
    custom_prompt: Optional[str] = Field(None, description="Custom analysis prompt")

    @validator('location')
    def validate_location(cls, v):
        if len(v) > 200:
            raise ValueError('Location too long')
        return v

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
    confidence_score: float
    metadata: Dict[str, Any]

# Report schemas
class ReportBase(BaseModel):
    title: str = Field(..., description="Report title")
    format: str = Field("json", description="Report format: json, html, pdf")
    content: Dict[str, Any] = Field(..., description="Report content")

class ReportCreate(ReportBase):
    analysis_request_id: str

class ReportResponse(ReportBase):
    id: str
    user_id: int
    analysis_request_id: str
    generated_at: datetime
    download_url: Optional[str] = None
    preview_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# Data Collection schemas
class DataCollectionRequest(BaseModel):
    location: str = Field(..., description="Location for data collection")
    radius_km: int = Field(10, ge=1, le=50, description="Radius in kilometers")
    categories: Optional[List[str]] = Field(None, description="Business categories to filter")
    max_results: int = Field(20, ge=1, le=100, description="Maximum number of results")
    include_reviews: bool = Field(True, description="Include reviews in data collection")
    include_news: bool = Field(True, description="Include news in data collection")
    include_social: bool = Field(False, description="Include social media in data collection")

    @validator('location')
    def validate_location(cls, v):
        if len(v) > 200:
            raise ValueError('Location too long')
        return v

class DataCollectionResponse(BaseModel):
    request_id: str
    location: str
    radius_km: int
    collected_at: datetime
    total_items: int
    businesses_count: int
    reviews_count: int
    news_count: int
    social_count: int
    status: str
    error_message: Optional[str] = None

class MarketDataRequest(BaseModel):
    location: str
    radius_km: int = Field(10, ge=1, le=50)
    categories: Optional[List[str]] = None

class DataSourceResult(BaseModel):
    source: str
    data_type: str
    count: int
    sample: List[Dict[str, Any]]

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

# Dashboard schemas
class DashboardStats(BaseModel):
    total_analyses: int
    completed_analyses: int
    total_reports: int
    recent_analyses: List[Dict[str, Any]]
    api_usage: Dict[str, Any]

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

# Analysis result schemas (for detailed analysis)
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

class ApiUsageStats(BaseModel):
    user_id: int
    total_requests: int
    requests_today: int
    requests_this_month: int
    last_request_at: Optional[datetime] = None
    plan_limit: int
    remaining_requests: int
 # In models/schemas.py, add phone field to UserBase and UserCreate

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None  # Add this line
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    # Phone is already included from UserBase, but you can add validators if needed
    #    
class AnalysisResult(BaseModel):
    request_id: int
    summary: str
    sentiment: SentimentResult
    competitors: List[CompetitorAnalysis]
    trends: List[TrendAnalysis]
    gaps: List[GapAnalysis]
    recommendations: List[str]
    raw_data_summary: Dict[str, Any]

# Alert schemas
class AlertType(str, Enum):
    COMPETITOR = "competitor"
    SENTIMENT = "sentiment"
    MARKET_SHARE = "market_share"
    PRICE = "price"

class AlertFrequency(str, Enum):
    REALTIME = "realtime"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class AlertBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    type: AlertType
    enabled: bool = True
    frequency: AlertFrequency = AlertFrequency.DAILY
    threshold: Optional[float] = Field(None, ge=0)

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    type: Optional[AlertType] = None
    enabled: Optional[bool] = None
    frequency: Optional[AlertFrequency] = None
    threshold: Optional[float] = Field(None, ge=0)

class AlertInDB(AlertBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AlertResponse(AlertInDB):
    pass