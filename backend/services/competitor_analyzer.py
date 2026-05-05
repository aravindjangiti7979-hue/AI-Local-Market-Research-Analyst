"""
Competitor analysis service.
"""
import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict

from models.market_models import BusinessData, ReviewData
from utils.data_cleaners import DataCleaner

logger = logging.getLogger(__name__)


class CompetitorAnalyzer:
    """Service for analyzing competitors in a market."""
    
    def __init__(self):
        self.data_cleaner = DataCleaner()
    
    async def analyze_competitors(
        self,
        businesses: List[BusinessData],
        reviews: List[ReviewData],
        target_business_type: str
    ) -> List[Dict[str, Any]]:
        """
        Analyze competitors in the market.
        
        Args:
            businesses: List of businesses in the market
            reviews: List of reviews for those businesses
            target_business_type: Type of business being analyzed
        
        Returns:
            List of competitor analyses
        """
        try:
            logger.info(f"Analyzing competitors for {target_business_type}")
            
            # Filter businesses by type
            relevant_businesses = [
                b for b in businesses 
                if target_business_type in b.business_type.lower() or 
                   any(target_business_type in cat.lower() for cat in b.categories)
            ]
            
            if not relevant_businesses:
                logger.warning(f"No relevant businesses found for {target_business_type}")
                return []
            
            # Group reviews by business
            reviews_by_business = defaultdict(list)
            for review in reviews:
                if review.business_name:
                    reviews_by_business[review.business_name].append(review)
            
            # Analyze each competitor
            competitor_analyses = []
            for business in relevant_businesses:
                try:
                    analysis = await self._analyze_competitor(
                        business, 
                        reviews_by_business.get(business.name, []),
                        relevant_businesses
                    )
                    competitor_analyses.append(analysis)
                except Exception as e:
                    logger.error(f"Error analyzing competitor {business.name}: {e}")
                    continue
            
            # Sort by market strength (descending)
            competitor_analyses.sort(
                key=lambda x: x.get("market_share_estimate", 0), 
                reverse=True
            )
            
            logger.info(f"Completed competitor analysis: {len(competitor_analyses)} competitors")
            return competitor_analyses
            
        except Exception as e:
            logger.error(f"Error in competitor analysis: {e}", exc_info=True)
            raise
    
    async def _analyze_competitor(
        self,
        business: BusinessData,
        business_reviews: List[ReviewData],
        all_businesses: List[BusinessData]
    ) -> Dict[str, Any]:
        """
        Analyze a single competitor.
        """
        # Calculate strength score
        strength_score = self._calculate_strength_score(business, business_reviews)
        
        # Calculate weakness score
        weakness_score = self._calculate_weakness_score(business, business_reviews)
        
        # Estimate market share
        market_share = self._estimate_market_share(business, all_businesses)
        
        # Calculate customer sentiment
        sentiment = self._calculate_customer_sentiment(business_reviews)
        
        # Extract key insights
        key_insights = self._extract_key_insights(business, business_reviews)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            business, strength_score, weakness_score, sentiment
        )
        
        return {
            "competitor_name": business.name,
            "strength_score": round(strength_score, 2),
            "weakness_score": round(weakness_score, 2),
            "market_share_estimate": round(market_share, 3),
            "customer_sentiment": round(sentiment, 3),
            "key_insights": key_insights,
            "recommendations": recommendations,
            "metadata": {
                "rating": business.rating,
                "review_count": business.review_count,
                "price_level": business.price_level,
                "categories": business.categories,
                "features": business.features
            }
        }
    
    def _calculate_strength_score(
        self,
        business: BusinessData,
        reviews: List[ReviewData]
    ) -> float:
        """
        Calculate strength score (0-10).
        """
        score = 5.0  # Base score
        
        # Rating-based score
        if business.rating:
            # Convert 1-5 rating to 0-3 scale, then add to score
            rating_score = (business.rating - 1) * 0.75  # 1->0, 5->3
            score += rating_score
        
        # Review count score
        if business.review_count:
            if business.review_count > 100:
                score += 1.0
            elif business.review_count > 50:
                score += 0.5
            elif business.review_count > 10:
                score += 0.2
        
        # Features score
        if business.features:
            score += min(len(business.features) * 0.1, 1.0)
        
        # Price level (premium pricing can indicate strength)
        if business.price_level:
            if business.price_level >= 3:  # $$$ or higher
                score += 0.5
        
        # Website presence
        if business.website:
            score += 0.3
        
        return min(score, 10.0)
    
    def _calculate_weakness_score(
        self,
        business: BusinessData,
        reviews: List[ReviewData]
    ) -> float:
        """
        Calculate weakness score (0-10).
        """
        score = 0.0
        
        # Low rating penalty
        if business.rating and business.rating < 3.0:
            score += (3.0 - business.rating) * 1.5  # More penalty for lower ratings
        
        # Few reviews penalty
        if not business.review_count or business.review_count < 5:
            score += 2.0
        
        # Negative review analysis
        negative_reviews = [r for r in reviews if r.rating and r.rating < 3.0]
        if negative_reviews:
            negative_ratio = len(negative_reviews) / max(len(reviews), 1)
            score += negative_ratio * 3.0
        
        # Missing information penalties
        if not business.phone:
            score += 0.5
        if not business.website:
            score += 0.5
        if not business.opening_hours:
            score += 0.5
        
        return min(score, 10.0)
    
    def _estimate_market_share(
        self,
        business: BusinessData,
        all_businesses: List[BusinessData]
    ) -> float:
        """
        Estimate market share based on review count and rating.
        """
        if not all_businesses:
            return 0.0
        
        # Calculate total review weight
        total_weight = 0
        business_weight = 0
        
        for b in all_businesses:
            weight = self._calculate_business_weight(b)
            total_weight += weight
            
            if b.name == business.name:
                business_weight = weight
        
        if total_weight == 0:
            return 0.0
        
        return business_weight / total_weight
    
    def _calculate_business_weight(self, business: BusinessData) -> float:
        """
        Calculate weight for market share estimation.
        """
        weight = 0.0
        
        # Base weight from review count
        if business.review_count:
            weight += min(business.review_count / 10, 10.0)
        
        # Rating multiplier
        if business.rating:
            if business.rating >= 4.5:
                weight *= 1.5
            elif business.rating >= 4.0:
                weight *= 1.2
            elif business.rating < 3.0:
                weight *= 0.7
        
        # Price level adjustment
        if business.price_level:
            if business.price_level >= 3:  # Premium
                weight *= 1.3
        
        return max(weight, 0.1)  # Minimum weight
    
    def _calculate_customer_sentiment(self, reviews: List[ReviewData]) -> float:
        """
        Calculate customer sentiment from reviews (-1 to 1).
        """
        if not reviews:
            return 0.0
        
        # Use review ratings if available
        ratings = [r.rating for r in reviews if r.rating]
        if ratings:
            # Convert 1-5 rating to -1 to 1 scale
            avg_rating = sum(ratings) / len(ratings)
            sentiment = (avg_rating - 3) / 2  # 1->-1, 3->0, 5->1
            return max(-1.0, min(1.0, sentiment))
        
        return 0.0
    
    def _extract_key_insights(
        self,
        business: BusinessData,
        reviews: List[ReviewData]
    ) -> List[str]:
        """
        Extract key insights about the competitor.
        """
        insights = []
        
        # Rating insights
        if business.rating:
            if business.rating >= 4.5:
                insights.append("Exceptionally high customer ratings")
            elif business.rating >= 4.0:
                insights.append("Strong customer satisfaction")
            elif business.rating < 3.0:
                insights.append("Below average customer ratings")
        
        # Review volume insights
        if business.review_count:
            if business.review_count > 100:
                insights.append("High review volume indicates strong market presence")
            elif business.review_count < 10:
                insights.append("Limited customer feedback available")
        
        # Price insights
        if business.price_level:
            if business.price_level >= 3:
                insights.append("Premium pricing positioning")
            elif business.price_level == 1:
                insights.append("Budget-friendly pricing")
        
        # Feature-based insights
        if business.features:
            premium_features = ['delivery', 'reservations', 'outdoor seating', 'parking']
            has_premium = any(feat in business.features for feat in premium_features)
            if has_premium:
                insights.append("Offers premium amenities and services")
        
        # Category insights
        if business.categories:
            if len(business.categories) > 3:
                insights.append("Diverse service/category offerings")
        
        return insights[:5]  # Limit to top 5 insights
    
    def _generate_recommendations(
        self,
        business: BusinessData,
        strength_score: float,
        weakness_score: float,
        sentiment: float
    ) -> List[str]:
        """
        Generate strategic recommendations based on competitor analysis.
        """
        recommendations = []
        
        # Address weaknesses
        if weakness_score > 6.0:
            recommendations.append("High vulnerability - consider targeting their weaknesses")
        
        if strength_score < 5.0:
            if not business.website:
                recommendations.append("Lack of online presence - opportunity for digital advantage")
            if business.review_count and business.review_count < 20:
                recommendations.append("Limited customer base - opportunity for market penetration")
        
        # Exploit gaps
        if sentiment < 0:
            recommendations.append("Negative customer sentiment - opportunity to attract dissatisfied customers")
        
        if business.price_level and business.price_level >= 3:
            recommendations.append("Premium pricing - consider competitive pricing strategy")
        elif business.price_level and business.price_level == 1:
            recommendations.append("Budget pricing - differentiate with premium features or services")
        
        # Strategic positioning
        if strength_score > 7.0 and weakness_score < 3.0:
            recommendations.append("Strong competitor - consider partnership or differentiation strategy")
        
        return recommendations[:3]  # Limit to top 3 recommendations
    
    async def compare_competitors(
        self,
        competitors: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare multiple competitors and identify market gaps.
        """
        if not competitors:
            return {"market_gaps": [], "competitive_landscape": "No competitors found"}
        
        # Identify market gaps
        market_gaps = self._identify_market_gaps(competitors)
        
        # Analyze competitive landscape
        landscape = self._analyze_competitive_landscape(competitors)
        
        # Identify opportunities
        opportunities = self._identify_opportunities(competitors)
        
        return {
            "market_gaps": market_gaps,
            "competitive_landscape": landscape,
            "opportunities": opportunities,
            "competitor_count": len(competitors),
            "average_strength": sum(c.get("strength_score", 0) for c in competitors) / len(competitors),
            "average_weakness": sum(c.get("weakness_score", 0) for c in competitors) / len(competitors)
        }
    
    def _identify_market_gaps(self, competitors: List[Dict[str, Any]]) -> List[str]:
        """Identify gaps in the market based on competitor analysis."""
        gaps = []
        
        # Check for price gaps
        price_levels = [c.get("metadata", {}).get("price_level") for c in competitors]
        price_levels = [p for p in price_levels if p is not None]
        
        if price_levels:
            min_price = min(price_levels)
            max_price = max(price_levels)
            
            if max_price - min_price > 1:
                if min_price == 1:
                    gaps.append("Mid-range price gap between budget and premium options")
                elif max_price == 4:
                    gaps.append("Luxury price segment may be underserved")
        
        # Check for service gaps
        all_features = set()
        for competitor in competitors:
            features = competitor.get("metadata", {}).get("features", [])
            all_features.update(features)
        
        # Common expected features that might be missing
        expected_features = ['delivery', 'reservations', 'online_ordering', 'parking']
        missing_features = [f for f in expected_features if f not in all_features]
        
        if missing_features:
            gaps.append(f"Missing features: {', '.join(missing_features)}")
        
        # Check for rating gaps
        ratings = [c.get("metadata", {}).get("rating") for c in competitors]
        ratings = [r for r in ratings if r is not None]
        
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            if avg_rating < 3.5:
                gaps.append("Overall market quality below expectations")
        
        return gaps[:5]
    
    def _analyze_competitive_landscape(self, competitors: List[Dict[str, Any]]) -> str:
        """Analyze the overall competitive landscape."""
        if not competitors:
            return "No competition detected"
        
        # Calculate metrics
        avg_strength = sum(c.get("strength_score", 0) for c in competitors) / len(competitors)
        avg_weakness = sum(c.get("weakness_score", 0) for c in competitors) / len(competitors)
        max_market_share = max(c.get("market_share_estimate", 0) for c in competitors)
        
        if len(competitors) <= 2:
            landscape = "Limited competition"
        elif len(competitors) <= 5:
            landscape = "Moderate competition"
        else:
            landscape = "Highly competitive market"
        
        if avg_strength > 7.0:
            landscape += " with strong competitors"
        elif avg_strength < 4.0:
            landscape += " with weak overall competition"
        
        if max_market_share > 0.4:
            landscape += " and dominant market leader"
        
        return landscape
    
    def _identify_opportunities(self, competitors: List[Dict[str, Any]]) -> List[str]:
        """Identify business opportunities based on competitor weaknesses."""
        opportunities = []
        
        # Look for competitors with high weakness scores
        weak_competitors = [c for c in competitors if c.get("weakness_score", 0) > 6.0]
        if weak_competitors:
            opportunities.append(f"Multiple weak competitors ({len(weak_competitors)}) - opportunity for market entry")
        
        # Look for price opportunities
        price_levels = [c.get("metadata", {}).get("price_level") for c in competitors]
        price_levels = [p for p in price_levels if p is not None]
        
        if price_levels:
            if all(p >= 3 for p in price_levels):
                opportunities.append("Market dominated by premium pricing - opportunity for value segment")
            elif all(p <= 2 for p in price_levels):
                opportunities.append("Market dominated by budget options - opportunity for premium segment")
        
        # Look for service gaps
        for competitor in competitors:
            features = competitor.get("metadata", {}).get("features", [])
            if 'delivery' not in features:
                opportunities.append(f"Delivery service gap at {competitor.get('competitor_name')}")
                break
        
        return opportunities[:3]


# Singleton instance
competitor_analyzer = CompetitorAnalyzer()