"""
Models package.
"""

# Import database models
from .database_models import (
    User,
    AnalysisRequest,
    AnalysisResult,
    Report,
    DataSource,
    ApiUsage,
    RawBusinessData,
    RawReviewData,
    RawNewsData,
    RawSocialData,
    BusinessTypeEnum,
    AnalysisTypeEnum,
    ReportFormatEnum,
    ReviewSourceEnum,
    NewsSourceEnum,
    SocialPlatformEnum
)

# Import schemas (Pydantic models)
from .schemas import (
    # User schemas
    UserBase,
    UserCreate,
    UserLogin,
    UserInDB,
    UserResponse,
    
    # Token schemas
    Token,
    TokenData,
    
    # Market Analysis schemas
    MarketAnalysisRequest,  # This was AnalysisRequestBase
    MarketAnalysisResponse,
    
    # Report schemas
    ReportBase,
    ReportCreate,
    ReportResponse,
    
    # API Usage schemas
    APIUsageBase,
    APIUsageCreate,
    APIUsageInDB,
    
    # Other schemas
    ErrorResponse,
    PaginatedResponse,
    MarketDataRequest,
    DataSourceResult,
    
    # Enums
    AnalysisStatus,
    ReportFormat,
    SentimentType,
    AnalysisType,
    BusinessType
)

# Import market models
from .market_models import (
    BusinessData,
    ReviewData,
    NewsArticle,
    SocialMediaPost,
    MarketIndicator,
    MarketDataCollection,
    ProcessedReview,
    ProcessedArticle,
    MarketInsight,
    ReviewSource,
    NewsSource,
    SocialPlatform
)

# Export everything
__all__ = [
    # Database models
    "User",
    "AnalysisRequest",
    "AnalysisResult",
    "Report",
    "DataSource",
    "ApiUsage",
    "RawBusinessData",
    "RawReviewData",
    "RawNewsData",
    "RawSocialData",
    "BusinessTypeEnum",
    "AnalysisTypeEnum",
    "ReportFormatEnum",
    "ReviewSourceEnum",
    "NewsSourceEnum",
    "SocialPlatformEnum",
    
    # User schemas
    "UserBase",
    "UserCreate",
    "UserLogin",
    "UserInDB",
    "UserResponse",
    
    # Token schemas
    "Token",
    "TokenData",
    
    # Market Analysis schemas
    "MarketAnalysisRequest",
    "MarketAnalysisResponse",
    
    # Report schemas
    "ReportBase",
    "ReportCreate",
    "ReportResponse",
    
    # API Usage schemas
    "APIUsageBase",
    "APIUsageCreate",
    "APIUsageInDB",
    
    # Other schemas
    "ErrorResponse",
    "PaginatedResponse",
    "MarketDataRequest",
    "DataSourceResult",
    
    # Enums
    "AnalysisStatus",
    "ReportFormat",
    "SentimentType",
    "AnalysisType",
    "BusinessType",
    
    # Market models
    "BusinessData",
    "ReviewData",
    "NewsArticle",
    "SocialMediaPost",
    "MarketIndicator",
    "MarketDataCollection",
    "ProcessedReview",
    "ProcessedArticle",
    "MarketInsight",
    "ReviewSource",
    "NewsSource",
    "SocialPlatform"
]