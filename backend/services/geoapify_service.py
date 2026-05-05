"""
Geoapify service for free business data, geocoding, and places.
Free tier: 3,000 requests per day - no credit card required!
"""
import logging
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime

from core.config import settings
from models.market_models import BusinessData

logger = logging.getLogger(__name__)


class GeoapifyService:
    """Service for fetching business data from Geoapify (free, no credit card)."""
    
    def __init__(self):
        self.base_url = "https://api.geoapify.com/v2"
        self.geocode_url = "https://api.geoapify.com/v1/geocode"
        self.api_key = settings.GEOAPIFY_API_KEY
        
        if not self.api_key:
            logger.warning("GEOAPIFY_API_KEY not configured. Please add to .env file.")
        else:
            logger.info(f"Geoapify service initialized with API key: {self.api_key[:8]}...")
    
    async def search_places(
        self,
        location: str,
        categories: List[str],
        limit: int = 20,
        radius: int = 5000  # meters
    ) -> List[Dict[str, Any]]:
        """
        Search for places using Geoapify Places API.
        
        Args:
            location: City, State (e.g., "Chicago, IL")
            categories: List of place categories (e.g., ["catering.restaurant", "catering.fast_food"])
            limit: Maximum number of results
            radius: Search radius in meters
        
        Returns:
            List of place dictionaries
        """
        if not self.api_key:
            logger.error("Geoapify API key not configured")
            return []
        
        try:
            # First, geocode the location to get coordinates
            coords = await self._geocode_location(location)
            if not coords:
                logger.error(f"Could not geocode location: {location}")
                return []
            
            lat, lon = coords
            
            # Build categories filter - make sure it's a string
            if isinstance(categories, list):
                categories_str = ",".join(categories)
            else:
                categories_str = categories
            
            # Prepare API request
            url = f"{self.base_url}/places"
            params = {
                "apiKey": self.api_key,
                "filter": f"circle:{lon},{lat},{radius}",
                "bias": f"proximity:{lon},{lat}",
                "limit": limit,
                "categories": categories_str
            }
            
            logger.info(f"Searching Geoapify for categories: {categories_str}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        features = data.get("features", [])
                        
                        businesses = []
                        for feature in features:
                            props = feature.get("properties", {})
                            geometry = feature.get("geometry", {}).get("coordinates", [])
                            
                            # Parse address components
                            address = props.get("formatted", "")
                            name = props.get("name", "Unknown")
                            
                            # Skip if no name (less useful for competitors)
                            if name == "Unknown" and not props.get("name"):
                                continue
                            
                            # Extract categories
                            place_categories = []
                            if props.get("categories"):
                                for cat in props.get("categories", []):
                                    if "." in cat:
                                        place_categories.append(cat.split(".")[-1])
                            
                            business = {
                                "name": name,
                                "full_address": address,
                                "street": props.get("street", ""),
                                "city": props.get("city", ""),
                                "state": props.get("state", ""),
                                "country": props.get("country", ""),
                                "postcode": props.get("postcode", ""),
                                "latitude": geometry[1] if len(geometry) > 1 else None,
                                "longitude": geometry[0] if geometry else None,
                                "categories": place_categories,
                                "place_id": props.get("place_id", ""),
                                "source": "geoapify"
                            }
                            
                            # Add rating if available
                            raw = props.get("datasource", {}).get("raw", {})
                            if raw.get("rating"):
                                try:
                                    business["rating"] = float(raw.get("rating"))
                                except:
                                    business["rating"] = None
                            
                            if raw.get("reviews"):
                                try:
                                    business["review_count"] = int(raw.get("reviews"))
                                except:
                                    business["review_count"] = None
                            
                            businesses.append(business)
                        
                        logger.info(f"Geoapify found {len(businesses)} places")
                        return businesses
                    else:
                        error_text = await response.text()
                        logger.error(f"Geoapify API error: {response.status} - {error_text[:200]}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error searching Geoapify places: {e}")
            return []
    
    async def search_businesses(
        self,
        location: str,
        business_type: str,
        limit: int = 20
    ) -> List[BusinessData]:
        """
        Search for businesses and return as BusinessData objects.
        
        Args:
            location: City, State
            business_type: Type of business (restaurant, cafe, retail, etc.)
            limit: Maximum results
        
        Returns:
            List of BusinessData objects
        """
        # CORRECTED category mapping based on Geoapify's valid categories
        category_map = {
            "restaurant": ["catering.restaurant"],
            "pizza": ["catering.restaurant.pizza"],
            "burger": ["catering.restaurant.burger"],
            "italian": ["catering.restaurant.italian"],
            "chinese": ["catering.restaurant.chinese"],
            "mexican": ["catering.restaurant.mexican"],
            "japanese": ["catering.restaurant.japanese"],
            "sushi": ["catering.restaurant.sushi"],
            "fast_food": ["catering.fast_food"],
            "cafe": ["catering.cafe"],
            "coffee_shop": ["catering.cafe.coffee_shop"],
            "bakery": ["commercial.food_and_drink.bakery"],
            "bar": ["catering.bar"],
            "pub": ["catering.pub"],
            "hotel": ["accommodation.hotel"],
            "supermarket": ["commercial.supermarket"],
            "grocery": ["commercial.food_and_drink"],
            "shopping_mall": ["commercial.shopping_mall"],
            "retail": ["commercial"],
            "clothing": ["commercial.clothing"],
            "electronics": ["commercial.elektronics"],
            "pharmacy": ["healthcare.pharmacy", "commercial.health_and_beauty.pharmacy"],
            "hospital": ["healthcare.hospital"],
            "bank": ["service.financial.bank"],
            "atm": ["service.financial.atm"],
            "gas_station": ["service.vehicle.fuel"],
            "parking": ["parking"],
            "school": ["education.school"],
            "university": ["education.university"],
            "gym": ["sport.fitness.fitness_centre"],
            "spa": ["leisure.spa"],
            "cinema": ["entertainment.cinema"],
            "theatre": ["entertainment.culture.theatre"],
            "museum": ["entertainment.museum"],
            "park": ["leisure.park"],
            "other": []
        }
        
        # Get categories for this business type
        categories = category_map.get(business_type.lower(), [])
        
        # If no specific categories, try a general search with business type
        if not categories:
            categories = [f"catering.{business_type.lower()}", business_type.lower()]
        
        # Try each category until we get results
        businesses = []
        for category in categories:
            try:
                places = await self.search_places(location, [category], limit)
                if places:
                    # Convert to BusinessData objects
                    for place in places:
                        business = BusinessData(
                            name=place.get("name", "Unknown"),
                            address=place.get("full_address", ""),
                            city=place.get("city", ""),
                            state=place.get("state", ""),
                            country=place.get("country", ""),
                            postal_code=place.get("postcode"),
                            phone=place.get("phone"),
                            website=place.get("website"),
                            business_type=business_type,
                            latitude=place.get("latitude"),
                            longitude=place.get("longitude"),
                            rating=place.get("rating"),
                            review_count=place.get("review_count"),
                            categories=place.get("categories", []),
                            source="geoapify",
                            collected_at=datetime.utcnow()
                        )
                        businesses.append(business)
                    break  # Stop after first successful category
            except Exception as e:
                logger.debug(f"Category {category} failed: {e}")
                continue
        
        logger.info(f"Found {len(businesses)} {business_type} businesses in {location}")
        return businesses
    
    async def _geocode_location(self, location: str) -> Optional[tuple]:
        """
        Geocode a location to get coordinates.
        
        Args:
            location: City, State or address
        
        Returns:
            Tuple of (lat, lon) or None
        """
        try:
            url = f"{self.geocode_url}/search"
            params = {
                "apiKey": self.api_key,
                "text": location,
                "limit": 1
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        features = data.get("features", [])
                        if features:
                            geometry = features[0].get("geometry", {}).get("coordinates", [])
                            if len(geometry) >= 2:
                                # Geoapify returns [lon, lat]
                                lon, lat = geometry[0], geometry[1]
                                logger.info(f"Geocoded '{location}' to ({lat}, {lon})")
                                return lat, lon
                    return None
        except Exception as e:
            logger.error(f"Geocoding error for '{location}': {e}")
            return None


# Singleton instance
geoapify_service = GeoapifyService()