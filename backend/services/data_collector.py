"""
Data collection service for gathering market data from various sources.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import aiohttp
import httpx
from googlemaps import Client as GoogleMapsClient

from core.config import settings
from core.exceptions import APIConnectionError, DataProcessingError
from utils.helpers import async_retry, generate_request_id
from models.market_models import (
    BusinessData, ReviewData, NewsArticle, SocialMediaPost,
    MarketIndicator, MarketDataCollection, ReviewSource, NewsSource, SocialPlatform
)

logger = logging.getLogger(__name__)


class DataCollector:
    """Service for collecting market data from various sources."""
    
    def __init__(self):
        """Initialize data collector with API clients."""
        self.session = None
        
        # Initialize API clients if keys are available
        self.gmaps_client = None
        if settings.GOOGLE_MAPS_API_KEY:
            try:
                self.gmaps_client = GoogleMapsClient(
                    key=settings.GOOGLE_MAPS_API_KEY
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Google Maps client: {e}")
        
        # Rate limiting
        self.rate_limits = {}
        
    async def collect_market_data(
        self,
        location: str,
        business_type: str,
        data_sources: List[str],
        max_results: int = 50,
        timeframe_days: int = 30
    ) -> MarketDataCollection:
        """
        Collect market data from specified sources.
        
        Args:
            location: Location to collect data for
            business_type: Type of business
            data_sources: Sources to collect from
            max_results: Maximum results per source
            timeframe_days: Timeframe for data collection
        
        Returns:
            MarketDataCollection object
        """
        collection_id = generate_request_id()
        logger.info(f"Starting data collection {collection_id} for {location}")
        
        # Parse location
        city, region = self._parse_location(location)
        
        # Initialize collection
        collection = MarketDataCollection(
            location=location,
            business_type=business_type,
            collection_id=collection_id,
            collected_at=datetime.utcnow()
        )
        
        try:
            # Collect data from each source
            tasks = []
            
            if "businesses" in data_sources:
                tasks.append(
                    self.collect_business_data(city, region, business_type, max_results)
                )
            
            if "reviews" in data_sources:
                tasks.append(
                    self.collect_review_data(city, region, business_type, max_results, timeframe_days)
                )
            
            if "news" in data_sources:
                tasks.append(
                    self.collect_news_data(city, region, business_type, max_results, timeframe_days)
                )
            
            if "social" in data_sources:
                tasks.append(
                    self.collect_social_data(city, region, business_type, max_results, timeframe_days)
                )
            
            if "indicators" in data_sources:
                tasks.append(
                    self.collect_market_indicators(city, region, business_type)
                )
            
            # Execute collection tasks
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Error in data collection task {i}: {result}")
                    continue
                
                if result:
                    if isinstance(result, list):
                        if result and isinstance(result[0], BusinessData):
                            collection.businesses.extend(result)
                        elif result and isinstance(result[0], ReviewData):
                            collection.reviews.extend(result)
                        elif result and isinstance(result[0], NewsArticle):
                            collection.news_articles.extend(result)
                        elif result and isinstance(result[0], SocialMediaPost):
                            collection.social_posts.extend(result)
                        elif result and isinstance(result[0], MarketIndicator):
                            collection.indicators.extend(result)
            
            logger.info(f"Completed data collection {collection_id}")
            return collection
            
        except Exception as e:
            logger.error(f"Error in data collection {collection_id}: {e}", exc_info=True)
            raise DataProcessingError(f"Data collection failed: {str(e)}")
    
    async def collect_business_data(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int = 50
    ) -> List[BusinessData]:
        """
        Collect business data from Google Places and other sources.
        """
        businesses = []
        
        try:
            # Try Google Places API first
            if self.gmaps_client:
                google_businesses = await self._collect_from_google_places(
                    city, region, business_type, max_results
                )
                businesses.extend(google_businesses)
            
            # Try Yelp API if available
            if settings.YELP_API_KEY:
                yelp_businesses = await self._collect_from_yelp(
                    city, region, business_type, max_results
                )
                businesses.extend(yelp_businesses)
            
            logger.info(f"Collected {len(businesses)} businesses")
            return businesses
            
        except Exception as e:
            logger.error(f"Error collecting business data: {e}")
            return businesses
    
    async def collect_review_data(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int = 50,
        timeframe_days: int = 30
    ) -> List[ReviewData]:
        """
        Collect review data from various platforms.
        """
        reviews = []
        
        try:
            # Collect from Google Places reviews
            if self.gmaps_client:
                google_reviews = await self._collect_google_reviews(
                    city, region, business_type, max_results, timeframe_days
                )
                reviews.extend(google_reviews)
            
            # Collect from Yelp reviews if available
            if settings.YELP_API_KEY:
                yelp_reviews = await self._collect_yelp_reviews(
                    city, region, business_type, max_results, timeframe_days
                )
                reviews.extend(yelp_reviews)
            
            logger.info(f"Collected {len(reviews)} reviews")
            return reviews
            
        except Exception as e:
            logger.error(f"Error collecting review data: {e}")
            return reviews
    
    async def collect_news_data(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int = 50,
        timeframe_days: int = 30
    ) -> List[NewsArticle]:
        """
        Collect news articles related to the market.
        """
        articles = []
        
        try:
            # Use NewsAPI if available
            if settings.NEWS_API_KEY:
                newsapi_articles = await self._collect_from_newsapi(
                    city, region, business_type, max_results, timeframe_days
                )
                articles.extend(newsapi_articles)
            
            # Try Google News search
            google_news = await self._collect_google_news(
                city, region, business_type, max_results, timeframe_days
            )
            articles.extend(google_news)
            
            logger.info(f"Collected {len(articles)} news articles")
            return articles
            
        except Exception as e:
            logger.error(f"Error collecting news data: {e}")
            return articles
    
    async def collect_social_data(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int = 50,
        timeframe_days: int = 30
    ) -> List[SocialMediaPost]:
        """
        Collect social media posts related to the market.
        
        Note: In production, you would use official APIs like:
        - Twitter API v2
        - Facebook Graph API
        - Instagram Basic Display API
        - Reddit API
        
        This is a simplified example.
        """
        posts = []
        
        try:
            # In a real implementation, you would:
            # 1. Use official social media APIs
            # 2. Implement proper authentication
            # 3. Handle rate limits
            # 4. Respect platform terms of service
            
            # For now, return empty list as this requires proper API setup
            logger.info("Social media collection requires API setup")
            return posts
            
        except Exception as e:
            logger.error(f"Error collecting social data: {e}")
            return posts
    
    async def collect_market_indicators(
        self,
        city: str,
        region: str,
        business_type: str
    ) -> List[MarketIndicator]:
        """
        Collect market indicators and economic data.
        """
        indicators = []
        
        try:
            # Collect weather data if available
            if settings.OPENWEATHER_API_KEY:
                weather_indicators = await self._collect_weather_data(city, region)
                indicators.extend(weather_indicators)
            
            # Collect economic indicators (simplified)
            economic_indicators = await self._collect_economic_indicators(city, region)
            indicators.extend(economic_indicators)
            
            logger.info(f"Collected {len(indicators)} market indicators")
            return indicators
            
        except Exception as e:
            logger.error(f"Error collecting market indicators: {e}")
            return indicators
    
    async def _collect_from_google_places(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int
    ) -> List[BusinessData]:
        """Collect business data from Google Places API."""
        if not self.gmaps_client:
            return []
        
        try:
            # Build search query
            query = f"{business_type} in {city}, {region}"
            
            # Search for places
            places_result = await asyncio.to_thread(
                self.gmaps_client.places,
                query=query,
                type=business_type if business_type != "other" else None
            )
            
            businesses = []
            for place in places_result.get('results', [])[:max_results]:
                try:
                    # Get place details
                    place_details = await asyncio.to_thread(
                        self.gmaps_client.place,
                        place_id=place['place_id'],
                        fields=['name', 'formatted_address', 'geometry', 
                                'formatted_phone_number', 'website', 'rating',
                                'user_ratings_total', 'price_level', 'opening_hours',
                                'types', 'business_status']
                    )
                    
                    details = place_details.get('result', {})
                    
                    # Parse address components
                    address_parts = details.get('formatted_address', '').split(',')
                    if len(address_parts) >= 3:
                        street = address_parts[0].strip()
                        city_state = address_parts[1].strip()
                        country = address_parts[-1].strip()
                    else:
                        street = details.get('formatted_address', '')
                        city_state = f"{city}, {region}"
                        country = region
                    
                    business = BusinessData(
                        name=details.get('name', 'Unknown'),
                        address=street,
                        city=city,
                        state=region,
                        country=country,
                        phone=details.get('formatted_phone_number'),
                        website=details.get('website'),
                        business_type=business_type,
                        latitude=details.get('geometry', {}).get('location', {}).get('lat'),
                        longitude=details.get('geometry', {}).get('location', {}).get('lng'),
                        rating=details.get('rating'),
                        review_count=details.get('user_ratings_total'),
                        price_level=details.get('price_level'),
                        opening_hours=details.get('opening_hours', {}).get('weekday_text', []),
                        categories=details.get('types', []),
                        features=[],
                        source="google_places",
                        collected_at=datetime.utcnow()
                    )
                    
                    businesses.append(business)
                    
                except Exception as e:
                    logger.error(f"Error processing Google Places result: {e}")
                    continue
            
            return businesses
            
        except Exception as e:
            logger.error(f"Google Places API error: {e}")
            raise APIConnectionError(
                f"Google Places API connection failed: {str(e)}",
                api_name="google_places"
            )
    
    async def _collect_from_yelp(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int
    ) -> List[BusinessData]:
        """Collect business data from Yelp API."""
        if not settings.YELP_API_KEY:
            return []
        
        try:
            # Yelp API endpoint
            url = "https://api.yelp.com/v3/businesses/search"
            
            headers = {
                "Authorization": f"Bearer {settings.YELP_API_KEY}"
            }
            
            params = {
                "location": f"{city}, {region}",
                "term": business_type,
                "limit": min(max_results, 50),  # Yelp max is 50
                "sort_by": "rating"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        businesses = []
                        for business_data in data.get('businesses', []):
                            try:
                                business = BusinessData(
                                    name=business_data.get('name', 'Unknown'),
                                    address=business_data.get('location', {}).get('address1', ''),
                                    city=business_data.get('location', {}).get('city', city),
                                    state=business_data.get('location', {}).get('state', region),
                                    country=business_data.get('location', {}).get('country', 'US'),
                                    postal_code=business_data.get('location', {}).get('zip_code'),
                                    phone=business_data.get('phone'),
                                    website=business_data.get('url'),
                                    business_type=business_type,
                                    latitude=business_data.get('coordinates', {}).get('latitude'),
                                    longitude=business_data.get('coordinates', {}).get('longitude'),
                                    rating=business_data.get('rating'),
                                    review_count=business_data.get('review_count'),
                                    price_level=len(business_data.get('price', '')),
                                    categories=[cat['title'] for cat in business_data.get('categories', [])],
                                    features=[],
                                    source="yelp",
                                    collected_at=datetime.utcnow()
                                )
                                
                                businesses.append(business)
                                
                            except Exception as e:
                                logger.error(f"Error processing Yelp business: {e}")
                                continue
                        
                        return businesses
                    else:
                        error_text = await response.text()
                        logger.error(f"Yelp API error: {response.status} - {error_text}")
                        return []
                        
        except Exception as e:
            logger.error(f"Yelp API connection error: {e}")
            return []
    
    async def _collect_google_reviews(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int,
        timeframe_days: int
    ) -> List[ReviewData]:
        """Collect reviews from Google Places."""
        if not self.gmaps_client:
            return []
        
        try:
            # First get businesses
            businesses = await self._collect_from_google_places(
                city, region, business_type, max_results=10
            )
            
            reviews = []
            cutoff_date = datetime.utcnow() - timedelta(days=timeframe_days)
            
            for business in businesses:
                try:
                    # Get place details with reviews
                    place_details = await asyncio.to_thread(
                        self.gmaps_client.place,
                        place_id=None,  # Would need place_id here
                        fields=['reviews']
                    )
                    
                    # Note: The Google Places API doesn't return reviews in the basic search
                    # You would need to use the Place Details endpoint with reviews field
                    # This is a simplified example
                    
                except Exception as e:
                    logger.error(f"Error getting Google reviews for {business.name}: {e}")
                    continue
            
            return reviews
            
        except Exception as e:
            logger.error(f"Error collecting Google reviews: {e}")
            return []
    
    async def _collect_yelp_reviews(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int,
        timeframe_days: int
    ) -> List[ReviewData]:
        """Collect reviews from Yelp."""
        # Simplified - in production, use Yelp Fusion API with proper review access
        return []
    
    async def _collect_from_newsapi(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int,
        timeframe_days: int
    ) -> List[NewsArticle]:
        """Collect news from NewsAPI."""
        if not settings.NEWS_API_KEY:
            return []
        
        try:
            # Calculate date range
            from_date = (datetime.utcnow() - timedelta(days=timeframe_days)).strftime('%Y-%m-%d')
            
            # Build query
            query = f"{business_type} {city} {region}"
            
            url = "https://newsapi.org/v2/everything"
            
            params = {
                "q": query,
                "from": from_date,
                "sortBy": "relevancy",
                "language": "en",
                "pageSize": min(max_results, 100),
                "apiKey": settings.NEWS_API_KEY
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        articles = []
                        for article_data in data.get('articles', []):
                            try:
                                published_at = datetime.fromisoformat(
                                    article_data['publishedAt'].replace('Z', '+00:00')
                                )
                                
                                article = NewsArticle(
                                    source=NewsSource.NEWS_API,
                                    article_id=article_data.get('url', ''),
                                    title=article_data.get('title', ''),
                                    description=article_data.get('description', ''),
                                    content=article_data.get('content', ''),
                                    url=article_data.get('url', ''),
                                    published_at=published_at,
                                    author=article_data.get('author'),
                                    source_name=article_data.get('source', {}).get('name', ''),
                                    keywords=[],
                                    location_tags=[city, region],
                                    business_tags=[business_type]
                                )
                                
                                articles.append(article)
                                
                            except Exception as e:
                                logger.error(f"Error processing news article: {e}")
                                continue
                        
                        return articles
                    else:
                        error_text = await response.text()
                        logger.error(f"NewsAPI error: {response.status} - {error_text}")
                        return []
                        
        except Exception as e:
            logger.error(f"NewsAPI connection error: {e}")
            return []
    
    async def _collect_google_news(
        self,
        city: str,
        region: str,
        business_type: str,
        max_results: int,
        timeframe_days: int
    ) -> List[NewsArticle]:
        """Collect news from Google News (simplified - web scraping)."""
        # Note: In production, use official Google News RSS or Search API
        # Web scraping Google News may violate terms of service
        return []
    
    async def _collect_weather_data(
        self,
        city: str,
        region: str
    ) -> List[MarketIndicator]:
        """Collect weather data from OpenWeather API."""
        if not settings.OPENWEATHER_API_KEY:
            return []
        
        try:
            url = "https://api.openweathermap.org/data/2.5/weather"
            
            params = {
                "q": f"{city},{region}",
                "appid": settings.OPENWEATHER_API_KEY,
                "units": "metric"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        indicators = []
                        
                        # Temperature indicator
                        if 'main' in data:
                            temp = data['main'].get('temp')
                            if temp:
                                indicators.append(MarketIndicator(
                                    location=f"{city}, {region}",
                                    business_type="general",
                                    indicator_type="temperature",
                                    value=temp,
                                    unit="celsius",
                                    period="current",
                                    date=datetime.utcnow(),
                                    source="openweather",
                                    confidence=0.9
                                ))
                        
                        # Weather condition
                        if 'weather' in data and data['weather']:
                            condition = data['weather'][0].get('main')
                            if condition:
                                indicators.append(MarketIndicator(
                                    location=f"{city}, {region}",
                                    business_type="general",
                                    indicator_type="weather_condition",
                                    value=0,  # Placeholder
                                    unit="category",
                                    period="current",
                                    date=datetime.utcnow(),
                                    source="openweather",
                                    confidence=0.9,
                                    metadata={"condition": condition}
                                ))
                        
                        return indicators
                    else:
                        return []
                        
        except Exception as e:
            logger.error(f"OpenWeather API error: {e}")
            return []
    
    async def _collect_economic_indicators(
        self,
        city: str,
        region: str
    ) -> List[MarketIndicator]:
        """Collect economic indicators (simplified)."""
        # In production, you would integrate with:
        # - Bureau of Labor Statistics API
        # - Census Bureau API
        # - Federal Reserve Economic Data
        # - Local government APIs
        
        # For now, return placeholder indicators
        indicators = []
        
        # Example: Population growth (placeholder)
        indicators.append(MarketIndicator(
            location=f"{city}, {region}",
            business_type="general",
            indicator_type="population_growth",
            value=1.2,  # Placeholder percentage
            unit="percent",
            period="annual",
            date=datetime.utcnow(),
            source="estimated",
            confidence=0.5
        ))
        
        # Example: Unemployment rate (placeholder)
        indicators.append(MarketIndicator(
            location=f"{city}, {region}",
            business_type="general",
            indicator_type="unemployment_rate",
            value=3.8,  # Placeholder percentage
            unit="percent",
            period="monthly",
            date=datetime.utcnow(),
            source="estimated",
            confidence=0.5
        ))
        
        return indicators
    
    def _parse_location(self, location: str) -> Tuple[str, str]:
        """Parse location string into city and region."""
        parts = [part.strip() for part in location.split(",")]
        if len(parts) >= 2:
            return parts[0], parts[1]
        elif len(parts) == 1:
            return parts[0], ""
        else:
            return "", ""
    
    async def close(self):
        """Close connections."""
        if self.session:
            await self.session.close()


# Singleton instance
data_collector = DataCollector()