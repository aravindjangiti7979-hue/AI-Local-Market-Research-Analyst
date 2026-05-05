"""
Market analysis service that orchestrates data processing and AI analysis.
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from collections import defaultdict

from core.exceptions import MarketResearchException, InsufficientDataError
from services.gemini_service import gemini_service
from services.data_collector import data_collector
from utils.data_cleaners import DataCleaner
from utils.helpers import calculate_confidence_score
from models.market_models import (
    MarketDataCollection, ProcessedReview, ProcessedArticle,
    ReviewData, NewsArticle, BusinessData
)

logger = logging.getLogger(__name__)


class MarketAnalyzer:
    """Main service for market analysis orchestration."""
    
    def __init__(self):
        self.data_cleaner = DataCleaner()
    
    async def analyze_market(
        self,
        market_data: MarketDataCollection,
        analysis_type: str = "comprehensive",
        custom_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform complete market analysis.
        
        Args:
            market_data: Collected market data
            analysis_type: Type of analysis to perform
            custom_prompt: Custom instructions for analysis
        
        Returns:
            Analysis results
        """
        try:
            logger.info(f"Starting market analysis for {market_data.location}")
            
            # Step 1: Process raw data
            logger.info("Processing raw data...")
            processed_data = await self._process_market_data(market_data)
            
            # Step 2: Prepare data summary for AI
            logger.info("Preparing data summary...")
            data_summary = self._prepare_data_summary(market_data, processed_data)
            
            # Step 3: Validate data sufficiency
            self._validate_data_sufficiency(data_summary)
            
            # Step 4: Perform AI analysis
            logger.info("Performing AI analysis...")
            ai_analysis = await gemini_service.analyze_market_data(
                location=market_data.location,
                business_type=market_data.business_type,
                data_summary=data_summary,
                analysis_type=analysis_type
            )
            
            # Step 5: Enhance analysis with additional processing
            logger.info("Enhancing analysis...")
            enhanced_analysis = await self._enhance_analysis(
                ai_analysis, processed_data, market_data
            )
            
            # Step 6: Calculate confidence score
            confidence_score = self._calculate_analysis_confidence(
                data_summary, enhanced_analysis
            )
            enhanced_analysis["confidence_score"] = confidence_score
            
            logger.info(f"Analysis completed with confidence: {confidence_score}")
            return enhanced_analysis
            
        except InsufficientDataError as e:
            logger.warning(f"Insufficient data: {e.message}")
            raise
            
        except Exception as e:
            logger.error(f"Error in market analysis: {e}", exc_info=True)
            raise MarketResearchException(f"Market analysis failed: {str(e)}")
    
    async def _process_market_data(
        self, 
        market_data: MarketDataCollection
    ) -> Dict[str, Any]:
        """
        Process raw market data.
        """
        processed = {
            "reviews": [],
            "articles": [],
            "businesses": [],
            "sentiment_scores": [],
            "categories": set(),
            "keywords": []
        }
        
        # Process reviews
        if market_data.reviews:
            for review in market_data.reviews:
                try:
                    processed_review = self.data_cleaner.clean_review_data(review)
                    processed["reviews"].append(processed_review)
                    processed["sentiment_scores"].append(processed_review.sentiment_score)
                    
                    # Extract categories from aspects
                    if processed_review.aspects:
                        processed["categories"].update(processed_review.aspects.keys())
                    
                except Exception as e:
                    logger.debug(f"Error processing review: {e}")
                    continue
        
        # Process articles
        if market_data.news_articles:
            for article in market_data.news_articles:
                try:
                    processed_article = self.data_cleaner.clean_article_data(article)
                    processed["articles"].append(processed_article)
                    processed["keywords"].extend(article.keywords)
                except Exception as e:
                    logger.debug(f"Error processing article: {e}")
                    continue
        
        # Process businesses
        if market_data.businesses:
            for business in market_data.businesses:
                try:
                    processed["businesses"].append(business)
                    processed["categories"].update(business.categories)
                except Exception as e:
                    logger.debug(f"Error processing business: {e}")
                    continue
        
        # Convert set to list
        processed["categories"] = list(processed["categories"])
        
        return processed
    
    def _prepare_data_summary(
        self,
        market_data: MarketDataCollection,
        processed_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Prepare summary of data for AI analysis.
        """
        # Calculate sentiment statistics
        sentiment_scores = processed_data.get("sentiment_scores", [])
        if sentiment_scores:
            avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)
            positive_count = sum(1 for s in sentiment_scores if s > 0.3)
            negative_count = sum(1 for s in sentiment_scores if s < -0.3)
            neutral_count = len(sentiment_scores) - positive_count - negative_count
        else:
            avg_sentiment = 0.0
            positive_count = negative_count = neutral_count = 0
        
        # Prepare business statistics
        businesses = processed_data.get("businesses", [])
        business_stats = {
            "total": len(businesses),
            "avg_rating": None,
            "price_distribution": defaultdict(int),
            "category_distribution": defaultdict(int)
        }
        
        if businesses:
            ratings = [b.rating for b in businesses if b.rating]
            if ratings:
                business_stats["avg_rating"] = sum(ratings) / len(ratings)
            
            for business in businesses:
                if business.price_level:
                    business_stats["price_distribution"][business.price_level] += 1
                for category in business.categories:
                    business_stats["category_distribution"][category] += 1
        
        # Prepare review statistics
        reviews = processed_data.get("reviews", [])
        review_stats = {
            "total": len(reviews),
            "avg_rating": None,
            "constructive_count": sum(1 for r in reviews if r.is_constructive),
            "sentiment_distribution": {
                "positive": positive_count,
                "negative": negative_count,
                "neutral": neutral_count
            }
        }
        
        if reviews:
            ratings = [r.original_review.rating for r in reviews]
            review_stats["avg_rating"] = sum(ratings) / len(ratings)
        
        # Prepare article statistics
        articles = processed_data.get("articles", [])
        article_stats = {
            "total": len(articles),
            "avg_relevance": None,
            "avg_impact": None,
            "source_distribution": defaultdict(int)
        }
        
        if articles:
            relevance_scores = [a.relevance_score for a in articles]
            impact_scores = [a.impact_score for a in articles]
            
            if relevance_scores:
                article_stats["avg_relevance"] = sum(relevance_scores) / len(relevance_scores)
            if impact_scores:
                article_stats["avg_impact"] = sum(impact_scores) / len(impact_scores)
            
            for article in articles:
                source = article.original_article.source_name
                article_stats["source_distribution"][source] += 1
        
        # Compile summary
        summary = {
            "location": market_data.location,
            "business_type": market_data.business_type,
            "data_collection": {
                "total_businesses": len(market_data.businesses),
                "total_reviews": len(market_data.reviews),
                "total_articles": len(market_data.news_articles),
                "total_social_posts": len(market_data.social_posts),
                "total_indicators": len(market_data.indicators),
                "date_range": market_data.get_summary().get("date_range", {})
            },
            "sentiment_analysis": {
                "average_sentiment": avg_sentiment,
                "positive_count": positive_count,
                "negative_count": negative_count,
                "neutral_count": neutral_count,
                "total_reviews_analyzed": len(sentiment_scores)
            },
            "business_insights": business_stats,
            "review_insights": review_stats,
            "news_insights": article_stats,
            "key_categories": list(processed_data.get("categories", []))[:10],
            "top_keywords": self._get_top_keywords(processed_data.get("keywords", [])),
            "market_indicators": [
                {
                    "type": indicator.indicator_type,
                    "value": indicator.value,
                    "unit": indicator.unit,
                    "period": indicator.period
                }
                for indicator in market_data.indicators
            ]
        }
        
        return summary
    
    def _validate_data_sufficiency(self, data_summary: Dict[str, Any]) -> None:
        """
        Validate if there is sufficient data for meaningful analysis.
        """
        min_data_points = 10
        
        total_data_points = (
            data_summary["data_collection"]["total_businesses"] +
            data_summary["data_collection"]["total_reviews"] +
            data_summary["data_collection"]["total_articles"]
        )
        
        if total_data_points < min_data_points:
            raise InsufficientDataError(
                f"Insufficient data for analysis. Found {total_data_points} data points, "
                f"minimum required is {min_data_points}."
            )
    
    async def _enhance_analysis(
        self,
        ai_analysis: Dict[str, Any],
        processed_data: Dict[str, Any],
        market_data: MarketDataCollection
    ) -> Dict[str, Any]:
        """
        Enhance AI analysis with additional data processing.
        """
        enhanced = ai_analysis.copy()
        
        # Add data sources used
        enhanced["data_sources_used"] = self._get_data_sources_used(market_data)
        
        # Add competitor names if available
        if "competitor_analysis" in enhanced and enhanced["competitor_analysis"]:
            competitor_names = [b.name for b in market_data.businesses]
            enhanced["competitor_names_found"] = competitor_names[:10]
        
        # Add additional statistics
        enhanced["statistics"] = {
            "businesses_analyzed": len(market_data.businesses),
            "reviews_analyzed": len(market_data.reviews),
            "articles_analyzed": len(market_data.news_articles),
            "social_posts_analyzed": len(market_data.social_posts),
            "data_collection_date": datetime.utcnow().isoformat() + "Z"
        }
        
        # Add processed insights
        enhanced["processed_insights"] = await self._extract_additional_insights(
            processed_data, market_data
        )
        
        return enhanced
    
    def _calculate_analysis_confidence(
        self,
        data_summary: Dict[str, Any],
        analysis_result: Dict[str, Any]
    ) -> float:
        """
        Calculate confidence score for analysis.
        """
        # Data points score
        total_data_points = (
            data_summary["data_collection"]["total_businesses"] +
            data_summary["data_collection"]["total_reviews"] +
            data_summary["data_collection"]["total_articles"]
        )
        data_points_score = min(total_data_points / 100, 0.4)
        
        # Source diversity score
        sources_used = len(analysis_result.get("data_sources_used", []))
        source_diversity_score = min(sources_used / 5, 0.3)
        
        # Analysis completeness score
        analysis_fields = [
            "summary", "key_findings", "market_opportunities",
            "potential_risks", "data_sources_used"
        ]
        completeness_score = sum(
            1 for field in analysis_fields if field in analysis_result and analysis_result[field]
        ) / len(analysis_fields) * 0.3
        
        total_score = data_points_score + source_diversity_score + completeness_score
        
        # Adjust based on specific factors
        if total_data_points < 20:
            total_score *= 0.8  # Penalize for low data volume
        elif total_data_points > 200:
            total_score *= 1.1  # Bonus for high data volume
        
        return min(round(total_score, 2), 1.0)
    
    def _get_top_keywords(self, keywords: List[str], top_n: int = 20) -> List[str]:
        """
        Get top keywords by frequency.
        """
        from collections import Counter
        
        if not keywords:
            return []
        
        keyword_counter = Counter(keywords)
        return [kw for kw, count in keyword_counter.most_common(top_n)]
    
    def _get_data_sources_used(self, market_data: MarketDataCollection) -> List[str]:
        """
        Extract unique data sources used.
        """
        sources = set()
        
        if market_data.businesses:
            sources.add("business_listings")
        
        if market_data.reviews:
            sources.add("customer_reviews")
        
        if market_data.news_articles:
            sources.add("news_articles")
        
        if market_data.social_posts:
            sources.add("social_media")
        
        if market_data.indicators:
            sources.add("market_indicators")
        
        return list(sources)
    
    async def _extract_additional_insights(
        self,
        processed_data: Dict[str, Any],
        market_data: MarketDataCollection
    ) -> Dict[str, Any]:
        """
        Extract additional insights beyond AI analysis.
        """
        insights = {
            "price_analysis": {},
            "category_analysis": {},
            "geographic_coverage": {},
            "temporal_patterns": {}
        }
        
        # Price analysis
        businesses = processed_data.get("businesses", [])
        if businesses:
            prices = [b.price_level for b in businesses if b.price_level is not None]
            if prices:
                insights["price_analysis"] = {
                    "average_price_level": sum(prices) / len(prices),
                    "min_price": min(prices),
                    "max_price": max(prices),
                    "price_distribution": dict(Counter(prices))
                }
        
        # Category analysis
        categories = processed_data.get("categories", [])
        if categories:
            from collections import Counter
            category_counts = Counter(categories)
            insights["category_analysis"] = {
                "total_categories": len(categories),
                "top_categories": dict(category_counts.most_common(10))
            }
        
        # Geographic coverage
        if businesses:
            locations = [(b.latitude, b.longitude) for b in businesses if b.latitude and b.longitude]
            if locations:
                insights["geographic_coverage"] = {
                    "total_locations": len(locations),
                    "has_coordinates": len(locations) > 0
                }
        
        # Temporal patterns from reviews
        reviews = processed_data.get("reviews", [])
        if reviews:
            # Group by month or week (simplified)
            from collections import defaultdict
            monthly_reviews = defaultdict(int)
            
            for review in reviews:
                if review.original_review.date:
                    month = review.original_review.date.strftime("%Y-%m")
                    monthly_reviews[month] += 1
            
            insights["temporal_patterns"] = {
                "review_trend": dict(monthly_reviews),
                "peak_months": sorted(
                    monthly_reviews.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:3]
            }
        
        return insights


# Singleton instance
market_analyzer = MarketAnalyzer()