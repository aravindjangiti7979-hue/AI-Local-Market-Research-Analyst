"""
Market data models for data collection and processing.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ReviewSource(str, Enum):
    GOOGLE = "google"
    YELP = "yelp"
    TRIPADVISOR = "tripadvisor"
    FACEBOOK = "facebook"
    OTHER = "other"


class NewsSource(str, Enum):
    NEWS_API = "newsapi"
    GOOGLE_NEWS = "google_news"
    LOCAL_NEWS = "local_news"
    SOCIAL_MEDIA = "social_media"


class SocialPlatform(str, Enum):
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    REDDIT = "reddit"


# Business Data Models
class BusinessData(BaseModel):
    """Model for business information."""
    name: str
    address: str
    city: str
    state: str
    country: str
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    business_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_level: Optional[int] = None
    opening_hours: Optional[List[str]] = None
    categories: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    source: str


class ReviewData(BaseModel):
    """Model for review data."""
    business_id: str
    business_name: str
    source: ReviewSource
    review_id: str
    author: str
    rating: float = Field(..., ge=1, le=5)
    text: str
    date: datetime
    sentiment_score: Optional[float] = None
    language: str = "en"
    helpful_votes: Optional[int] = None
    response_from_business: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NewsArticle(BaseModel):
    """Model for news articles."""
    source: NewsSource
    article_id: str
    title: str
    description: str
    content: str
    url: str
    published_at: datetime
    author: Optional[str] = None
    source_name: str
    category: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    sentiment_score: Optional[float] = None
    relevance_score: Optional[float] = None
    location_tags: List[str] = Field(default_factory=list)
    business_tags: List[str] = Field(default_factory=list)


class SocialMediaPost(BaseModel):
    """Model for social media posts."""
    platform: SocialPlatform
    post_id: str
    author: str
    author_followers: Optional[int] = None
    text: str
    url: str
    posted_at: datetime
    likes: Optional[int] = None
    shares: Optional[int] = None
    comments: Optional[int] = None
    hashtags: List[str] = Field(default_factory=list)
    mentions: List[str] = Field(default_factory=list)
    sentiment_score: Optional[float] = None
    engagement_score: Optional[float] = None
    location: Optional[str] = None
    media_urls: List[str] = Field(default_factory=list)


class MarketIndicator(BaseModel):
    """Model for market indicators and metrics."""
    location: str
    business_type: str
    indicator_type: str
    value: float
    unit: str
    period: str  # daily, weekly, monthly
    date: datetime
    source: str
    confidence: float = Field(..., ge=0, le=1)
    metadata: Dict[str, Any] = Field(default_factory=list)


# Aggregated Models
class MarketDataCollection(BaseModel):
    """Aggregated market data collection."""
    location: str
    business_type: str
    collection_id: str
    collected_at: datetime
    businesses: List[BusinessData] = Field(default_factory=list)
    reviews: List[ReviewData] = Field(default_factory=list)
    news_articles: List[NewsArticle] = Field(default_factory=list)
    social_posts: List[SocialMediaPost] = Field(default_factory=list)
    indicators: List[MarketIndicator] = Field(default_factory=list)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics of the collection."""
        return {
            "total_businesses": len(self.businesses),
            "total_reviews": len(self.reviews),
            "total_articles": len(self.news_articles),
            "total_posts": len(self.social_posts),
            "total_indicators": len(self.indicators),
            "date_range": {
                "from": min([
                    item.collected_at for item in self.businesses
                ] + [item.date for item in self.reviews] if self.businesses or self.reviews else None),
                "to": max([
                    item.collected_at for item in self.businesses
                ] + [item.date for item in self.reviews] if self.businesses or self.reviews else None)
            }
        }


# Data Processing Models
class ProcessedReview(BaseModel):
    """Processed review data with analysis."""
    original_review: ReviewData
    cleaned_text: str
    sentiment: str  # positive, negative, neutral
    sentiment_score: float
    key_phrases: List[str]
    aspects: Dict[str, float]  # aspect-based sentiment
    is_constructive: bool
    summary: Optional[str] = None


class ProcessedArticle(BaseModel):
    """Processed news article with analysis."""
    original_article: NewsArticle
    summary: str
    entities: List[str]
    topics: List[str]
    relevance_score: float
    impact_score: float
    key_points: List[str]


class MarketInsight(BaseModel):
    """Generated market insight from analysis."""
    insight_type: str  # opportunity, threat, trend, competitor_analysis
    title: str
    description: str
    confidence: float
    supporting_data: List[Dict[str, Any]]
    recommendation: Optional[str] = None
    impact_score: float
    timeframe: str  # immediate, short_term, long_term
    source_data_types: List[str]