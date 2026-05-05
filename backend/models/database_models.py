"""
SQLAlchemy database models.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, 
    DateTime, Text, JSON, ForeignKey, Enum as SQLEnum,
    Index
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


# Enums for database - Using UPPERCASE to match PostgreSQL conventions
class BusinessTypeEnum(enum.Enum):
    RESTAURANT = "RESTAURANT"
    RETAIL = "RETAIL"
    SERVICE = "SERVICE"
    TECH = "TECH"
    HEALTHCARE = "HEALTHCARE"
    OTHER = "OTHER"


class AnalysisTypeEnum(enum.Enum):
    COMPREHENSIVE = "COMPREHENSIVE"
    COMPETITOR = "COMPETITOR"
    SENTIMENT = "SENTIMENT"
    TREND = "TREND"


class ReportFormatEnum(enum.Enum):
    PDF = "pdf"
    HTML = "html"
    JSON = "json"
    CSV = "csv"
    MARKDOWN = "markdown"


class ReviewSourceEnum(enum.Enum):
    GOOGLE = "google"
    YELP = "yelp"
    TRIPADVISOR = "tripadvisor"
    OTHER = "other"


class NewsSourceEnum(enum.Enum):
    NEWS_API = "news_api"
    GOOGLE_NEWS = "google_news"
    OTHER = "other"


class SocialPlatformEnum(enum.Enum):
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    REDDIT = "reddit"
    OTHER = "other"


class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    company = Column(String(255))
    phone = Column(String(50))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    analysis_requests = relationship("AnalysisRequest", back_populates="user")
    reports = relationship("Report", back_populates="user")
    api_usage = relationship("ApiUsage", back_populates="user")
    
    __table_args__ = (
        Index('ix_users_email_active', 'email', 'is_active'),
    )


class AnalysisRequest(Base):
    """Market analysis request model."""
    __tablename__ = "analysis_requests"
    
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    location = Column(String(255), nullable=False)
    business_type = Column(SQLEnum(BusinessTypeEnum), nullable=False)
    analysis_type = Column(SQLEnum(AnalysisTypeEnum), nullable=False)
    competitors = Column(JSON)  # JSON array of competitor names
    timeframe_days = Column(Integer, default=30)
    include_sources = Column(JSON, default=["reviews", "news", "social"])
    custom_prompt = Column(Text)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    error_message = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="analysis_requests")
    analysis_results = relationship("AnalysisResult", back_populates="analysis_request")
    reports = relationship("Report", back_populates="analysis_request")
    
    __table_args__ = (
        Index('ix_analysis_requests_user_status', 'user_id', 'status'),
        Index('ix_analysis_requests_created_at', 'created_at'),
    )


class AnalysisResult(Base):
    """Analysis result model."""
    __tablename__ = "analysis_results"
    
    id = Column(String(50), primary_key=True, index=True)
    analysis_request_id = Column(String(50), ForeignKey("analysis_requests.id"))
    summary = Column(Text)
    key_findings = Column(JSON)
    market_opportunities = Column(JSON)
    potential_risks = Column(JSON)
    competitor_analysis = Column(JSON)
    sentiment_analysis = Column(JSON)
    trend_analysis = Column(JSON)
    data_sources_used = Column(JSON)
    confidence_score = Column(Float)
    analysis_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis_request = relationship("AnalysisRequest", back_populates="analysis_results")
    
    __table_args__ = (
        Index('ix_analysis_results_request_id', 'analysis_request_id'),
    )


class Report(Base):
    """Generated report model - FIXED with download_count field."""
    __tablename__ = "reports"
    
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    analysis_request_id = Column(String(50), ForeignKey("analysis_requests.id"))
    title = Column(String(255), nullable=False)
    format = Column(SQLEnum(ReportFormatEnum), nullable=False)
    content = Column(JSON, nullable=False)
    download_url = Column(String(500))
    preview_url = Column(String(500))
    download_count = Column(Integer, default=0)  # ← ADD THIS FIELD
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="reports")
    analysis_request = relationship("AnalysisRequest", back_populates="reports")
    
    __table_args__ = (
        Index('ix_reports_user_id', 'user_id'),
        Index('ix_reports_analysis_request_id', 'analysis_request_id'),
    )


class DataSource(Base):
    """Data source model for tracking data collection."""
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50))  # review, news, social, business
    api_endpoint = Column(String(500))
    api_key_required = Column(Boolean, default=True)
    rate_limit_per_minute = Column(Integer)
    last_accessed = Column(DateTime(timezone=True))
    status = Column(String(50), default="active")  # active, inactive, rate_limited
    configuration = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ApiUsage(Base):
    """API usage tracking model."""
    __tablename__ = "api_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer)
    response_time = Column(Float)  # in milliseconds
    request_size = Column(Integer)  # in bytes
    response_size = Column(Integer)  # in bytes
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_usage")
    
    __table_args__ = (
        Index('ix_api_usage_user_created', 'user_id', 'created_at'),
        Index('ix_api_usage_endpoint', 'endpoint'),
    )


# Raw Data Models (for caching)
class RawBusinessData(Base):
    """Raw business data cache."""
    __tablename__ = "raw_business_data"
    
    id = Column(String(100), primary_key=True)
    source = Column(String(50), nullable=False)
    location = Column(String(255), nullable=False)
    business_type = Column(String(100))
    data = Column(JSON, nullable=False)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('ix_raw_business_data_location', 'location'),
        Index('ix_raw_business_data_expires', 'expires_at'),
    )


class RawReviewData(Base):
    """Raw review data cache."""
    __tablename__ = "raw_review_data"
    
    id = Column(String(100), primary_key=True)
    source = Column(SQLEnum(ReviewSourceEnum), nullable=False)
    business_id = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    data = Column(JSON, nullable=False)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('ix_raw_review_data_business', 'business_id'),
        Index('ix_raw_review_data_location', 'location'),
    )


class Insight(Base):
    """AI-generated insights model."""
    __tablename__ = "insights"
    
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # 'insight', 'opportunity', 'advantage', 'trend'
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    confidence = Column(Float, default=0.8)  # 0.0 to 1.0
    source_analysis_id = Column(String(50), ForeignKey("analysis_requests.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", backref="insights")
    source_analysis = relationship("AnalysisRequest", backref="generated_insights")
    
    __table_args__ = (
        Index('ix_insights_user_created', 'user_id', 'created_at'),
        Index('ix_insights_user_type', 'user_id', 'type'),
        Index('ix_insights_expires', 'expires_at'),
    )


class RawNewsData(Base):
    """Raw news data cache."""
    __tablename__ = "raw_news_data"
    
    id = Column(String(100), primary_key=True)
    source = Column(SQLEnum(NewsSourceEnum), nullable=False)
    location = Column(String(255), nullable=False)
    data = Column(JSON, nullable=False)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('ix_raw_news_data_location', 'location'),
    )

class Alert(Base):
    """Alert model for user notifications and monitoring."""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), nullable=False)  # competitor, sentiment, market_share, price
    enabled = Column(Boolean, default=True)
    frequency = Column(String(20), default="daily")  # realtime, daily, weekly, monthly
    threshold = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="alerts")
    
    __table_args__ = (
        Index('ix_alerts_user_enabled', 'user_id', 'enabled'),
        Index('ix_alerts_user_type', 'user_id', 'type'),
    )
    
class RawSocialData(Base):
    """Raw social media data cache."""
    __tablename__ = "raw_social_data"
    
    id = Column(String(100), primary_key=True)
    platform = Column(SQLEnum(SocialPlatformEnum), nullable=False)
    location = Column(String(255), nullable=False)
    data = Column(JSON, nullable=False)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('ix_raw_social_data_location', 'location'),
    )