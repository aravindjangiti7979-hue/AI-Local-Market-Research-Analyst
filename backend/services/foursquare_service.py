"""
Foursquare Places API service for business data using correct endpoints.
Free tier: 1,000 requests/day - no credit card required!
"""
import logging
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime

from core.config import settings
from models.market_models import BusinessData

logger = logging.getLogger(__name__)


class FoursquareService:
    """Service for fetching business data from Foursquare Places API."""
    
    def __init__(self):
        # Correct Foursquare endpoints
        self.auth_url = "https://api.foursquare.com/v2/oauth/access_token"
        self.base_url = "https://api.foursquare.com/v2/venues"
        
        # Get credentials from settings
        self.client_id = settings.FOURSQUARE_CLIENT_ID
        self.client_secret = settings.FOURSQUARE_CLIENT_SECRET
        self.access_token = settings.FOURSQUARE_ACCESS_TOKEN
        
        if not self.client_id or not self.client_secret:
            logger.warning("Foursquare client credentials not configured")
        else:
            logger.info("Foursquare service initialized with client credentials")
    
    async def _get_access_token(self) -> Optional[str]:
        """
        Get OAuth2 access token using client credentials (v2 endpoint).
        """
        if self.access_token:
            return self.access_token
        
        try:
            # Foursquare v2 token endpoint
            params = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials",
                "v": "20240217"  # Version date
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.auth_url,
                    params=params
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        self.access_token = data.get("access_token")
                        logger.info("✅ Successfully obtained Foursquare access token")
                        return self.access_token
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to get access token: {response.status} - {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error getting access token: {e}")
            return None
    
    async def search_businesses(
        self,
        location: str,
        business_type: str,
        limit: int = 20,
        radius: int = 5000
    ) -> List[BusinessData]:
        """
        Search for businesses using Foursquare Venues API (v2).
        
        Args:
            location: City, State (e.g., "Chicago, IL")
            business_type: Type of business (restaurant, cafe, retail, etc.)
            limit: Maximum number of results
            radius: Search radius in meters
        
        Returns:
            List of BusinessData objects
        """
        try:
            # Build query parameters for v2 API
            params = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "v": "20240217",
                "near": location,
                "query": business_type,
                "limit": min(limit, 50),
                "radius": radius,
                "intent": "browse",
                "categoryId": self._map_business_type(business_type)
            }
            
            logger.info(f"Searching Foursquare v2 for {business_type} in {location}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/search",
                    params=params
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        venues = data.get("response", {}).get("venues", [])
                        
                        businesses = []
                        for venue in venues[:limit]:
                            try:
                                # Parse location data
                                location_data = venue.get("location", {})
                                categories = venue.get("categories", [])
                                
                                # Extract categories
                                categories_list = []
                                for cat in categories:
                                    if cat.get("name"):
                                        categories_list.append(cat["name"].lower())
                                
                                # Get stats
                                stats = venue.get("stats", {})
                                tip_count = stats.get("tipCount", 0)
                                users_count = stats.get("usersCount", 0)
                                
                                # Get rating (Foursquare uses 0-10 scale)
                                rating = venue.get("rating", 6.0)  # Default to 6.0 (3/5)
                                if rating:
                                    # Convert Foursquare 0-10 to 1-5 scale
                                    rating = rating / 2
                                
                                business = BusinessData(
                                    name=venue.get("name", "Unknown"),
                                    address=location_data.get("address", ""),
                                    city=location_data.get("city", ""),
                                    state=location_data.get("state", ""),
                                    country=location_data.get("country", ""),
                                    postal_code=location_data.get("postalCode", ""),
                                    phone=location_data.get("phone", ""),
                                    website=None,
                                    business_type=business_type,
                                    latitude=location_data.get("lat"),
                                    longitude=location_data.get("lng"),
                                    rating=float(rating) if rating else 3.5,
                                    review_count=int(tip_count) if tip_count else 0,
                                    categories=categories_list,
                                    source="foursquare",
                                    collected_at=datetime.utcnow()
                                )
                                businesses.append(business)
                                
                            except Exception as e:
                                logger.debug(f"Error processing Foursquare venue: {e}")
                                continue
                        
                        logger.info(f"Foursquare v2 found {len(businesses)} {business_type} in {location}")
                        return businesses
                    
                    elif response.status == 429:
                        logger.warning("Foursquare rate limit exceeded (5000/day)")
                        return []
                    else:
                        error_text = await response.text()
                        logger.error(f"Foursquare API error: {response.status} - {error_text[:200]}")
                        return []
                        
        except Exception as e:
            logger.error(f"Foursquare search error: {e}")
            return []
    
    def _map_business_type(self, business_type: str) -> Optional[str]:
        """
        Map business type to Foursquare v2 category IDs.
        
        Returns:
            Foursquare category ID string (comma-separated if multiple)
        """
        # Foursquare v2 category IDs
        category_map = {
            "restaurant": "4d4b7105d754a06374d81259",  # Food
            "cafe": "4bf58dd8d48988d16d941735",  # Cafe
            "coffee_shop": "4bf58dd8d48988d1e0931735",  # Coffee Shop
            "pizza": "4bf58dd8d48988d1ca941735",  # Pizza Place
            "burger": "4bf58dd8d48988d16c941735",  # Burger Joint
            "italian": "4bf58dd8d48988d110941735",  # Italian Restaurant
            "chinese": "4bf58dd8d48988d145941735",  # Chinese Restaurant
            "mexican": "4bf58dd8d48988d1c1941735",  # Mexican Restaurant
            "japanese": "4bf58dd8d48988d111941735",  # Japanese Restaurant
            "sushi": "4bf58dd8d48988d1d2941735",  # Sushi Restaurant
            "fast_food": "4bf58dd8d48988d16e941735",  # Fast Food
            "bakery": "4bf58dd8d48988d16a941735",  # Bakery
            "bar": "4bf58dd8d48988d116941735",  # Bar
            "hotel": "4bf58dd8d48988d1fa931735",  # Hotel
            "supermarket": "4bf58dd8d48988d118951735",  # Grocery Store
            "grocery": "4bf58dd8d48988d118951735",  # Grocery Store
            "shopping_mall": "4bf58dd8d48988d1fd941735",  # Shopping Mall
            "clothing": "4bf58dd8d48988d103951735",  # Clothing Store
            "electronics": "4bf58dd8d48988d122951735",  # Electronics Store
            "pharmacy": "4bf58dd8d48988d10f951735",  # Pharmacy
            "hospital": "4bf58dd8d48988d196941735",  # Hospital
            "bank": "4bf58dd8d48988d10a951735",  # Bank
            "gas_station": "4bf58dd8d48988d113951735",  # Gas Station
            "parking": "4bf58dd8d48988d1f6941735",  # Parking
            "school": "4bf58dd8d48988d13b941735",  # School
            "university": "4bf58dd8d48988d1ae941735",  # University
            "gym": "4bf58dd8d48988d176941735",  # Gym
            "spa": "4bf58dd8d48988d1ed941735",  # Spa
            "cinema": "4bf58dd8d48988d180941735",  # Movie Theater
            "museum": "4bf58dd8d48988d181941735",  # Museum
            "park": "4bf58dd8d48988d163941735",  # Park
        }
        
        return category_map.get(business_type.lower())
    
    async def get_venue_details(self, venue_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific venue.
        
        Args:
            venue_id: Foursquare venue ID
        
        Returns:
            Venue details dictionary
        """
        try:
            params = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "v": "20240217"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/{venue_id}",
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("response", {}).get("venue", {})
                    return None
        except Exception as e:
            logger.error(f"Error getting venue details: {e}")
            return None


# Singleton instance
foursquare_service = FoursquareService()