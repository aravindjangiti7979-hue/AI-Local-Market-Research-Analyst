"""
Sentiment analysis service using Google Gemini AI.
"""
import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict

from services.gemini_service import gemini_service
from utils.data_cleaners import DataCleaner
from models.market_models import ReviewData, ProcessedReview

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """Service for analyzing sentiment in market data."""
    
    def __init__(self):
        self.data_cleaner = DataCleaner()
    
    async def analyze_reviews_sentiment(
        self,
        reviews: List[ReviewData],
        batch_size: int = 50
    ) -> List[ProcessedReview]:
        """
        Analyze sentiment in customer reviews.
        
        Args:
            reviews: List of reviews to analyze
            batch_size: Number of reviews to process in each batch
        
        Returns:
            List of processed reviews with sentiment analysis
        """
        try:
            logger.info(f"Starting sentiment analysis for {len(reviews)} reviews")
            
            processed_reviews = []
            
            # Process in batches to avoid overwhelming the AI
            for i in range(0, len(reviews), batch_size):
                batch = reviews[i:i + batch_size]
                logger.info(f"Processing batch {i//batch_size + 1} with {len(batch)} reviews")
                
                # Clean and prepare batch
                cleaned_texts = []
                original_reviews = []
                
                for review in batch:
                    try:
                        cleaned_text = self.data_cleaner.clean_text(review.text)
                        if cleaned_text and len(cleaned_text) > 10:  # Minimum length
                            cleaned_texts.append(cleaned_text)
                            original_reviews.append(review)
                    except Exception as e:
                        logger.debug(f"Error cleaning review text: {e}")
                        continue
                
                if not cleaned_texts:
                    continue
                
                # Analyze sentiment using Gemini AI
                try:
                    sentiments = await gemini_service.analyze_sentiment_batch(
                        texts=cleaned_texts,
                        context="customer reviews for local businesses"
                    )
                    
                    # Process results
                    for j, (review, cleaned_text, sentiment_result) in enumerate(
                        zip(original_reviews, cleaned_texts, sentiments)
                    ):
                        try:
                            processed_review = self._create_processed_review(
                                review, cleaned_text, sentiment_result
                            )
                            processed_reviews.append(processed_review)
                        except Exception as e:
                            logger.debug(f"Error processing sentiment result: {e}")
                            # Create fallback processed review
                            processed_reviews.append(
                                self.data_cleaner.clean_review_data(review)
                            )
                
                except Exception as e:
                    logger.error(f"Error in AI sentiment analysis: {e}")
                    # Fallback to basic sentiment analysis
                    for review in batch:
                        try:
                            processed_review = self.data_cleaner.clean_review_data(review)
                            processed_reviews.append(processed_review)
                        except Exception as e:
                            logger.debug(f"Error in fallback sentiment analysis: {e}")
                            continue
            
            logger.info(f"Completed sentiment analysis: {len(processed_reviews)} reviews processed")
            return processed_reviews
            
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}", exc_info=True)
            raise
    
    async def analyze_overall_sentiment(
        self,
        processed_reviews: List[ProcessedReview],
        sources: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate overall sentiment statistics.
        
        Args:
            processed_reviews: List of processed reviews
            sources: Optional list of sources to filter by
        
        Returns:
            Overall sentiment analysis
        """
        try:
            # Filter by sources if specified
            if sources:
                filtered_reviews = [
                    r for r in processed_reviews 
                    if r.original_review.source in sources
                ]
            else:
                filtered_reviews = processed_reviews
            
            if not filtered_reviews:
                return self._create_empty_sentiment_analysis()
            
            # Calculate statistics
            sentiment_scores = [r.sentiment_score for r in filtered_reviews]
            total_reviews = len(filtered_reviews)
            
            # Categorize sentiments
            positive_count = sum(1 for s in sentiment_scores if s >= 0.3)
            negative_count = sum(1 for s in sentiment_scores if s <= -0.3)
            neutral_count = total_reviews - positive_count - negative_count
            
            # Calculate percentages
            positive_pct = (positive_count / total_reviews) * 100
            negative_pct = (negative_count / total_reviews) * 100
            neutral_pct = (neutral_count / total_reviews) * 100
            
            # Calculate average sentiment
            avg_sentiment = sum(sentiment_scores) / total_reviews
            
            # Extract key themes
            key_themes = await self._extract_key_themes(filtered_reviews)
            
            # Analyze sentiment by source
            sentiment_by_source = self._analyze_sentiment_by_source(filtered_reviews)
            
            return {
                "overall_sentiment": round(avg_sentiment, 3),
                "positive_percentage": round(positive_pct, 1),
                "negative_percentage": round(negative_pct, 1),
                "neutral_percentage": round(neutral_pct, 1),
                "key_positive_themes": key_themes.get("positive", [])[:5],
                "key_negative_themes": key_themes.get("negative", [])[:5],
                "sentiment_by_source": sentiment_by_source,
                "total_reviews_analyzed": total_reviews,
                "confidence_score": self._calculate_sentiment_confidence(filtered_reviews)
            }
            
        except Exception as e:
            logger.error(f"Error calculating overall sentiment: {e}")
            return self._create_empty_sentiment_analysis()
    
    async def analyze_sentiment_trends(
        self,
        processed_reviews: List[ProcessedReview],
        timeframe_days: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze sentiment trends over time.
        
        Args:
            processed_reviews: List of processed reviews
            timeframe_days: Number of days to analyze
        
        Returns:
            Sentiment trend analysis
        """
        from datetime import datetime, timedelta
        from collections import defaultdict
        
        try:
            # Group reviews by time period
            daily_sentiment = defaultdict(list)
            weekly_sentiment = defaultdict(list)
            
            for review in processed_reviews:
                review_date = review.original_review.date
                if not review_date:
                    continue
                
                # Daily grouping
                day_key = review_date.strftime("%Y-%m-%d")
                daily_sentiment[day_key].append(review.sentiment_score)
                
                # Weekly grouping
                week_key = review_date.strftime("%Y-W%W")
                weekly_sentiment[week_key].append(review.sentiment_score)
            
            # Calculate trends
            daily_trends = []
            for day, scores in sorted(daily_sentiment.items()):
                if scores:
                    daily_trends.append({
                        "date": day,
                        "average_sentiment": sum(scores) / len(scores),
                        "review_count": len(scores)
                    })
            
            weekly_trends = []
            for week, scores in sorted(weekly_sentiment.items()):
                if scores:
                    weekly_trends.append({
                        "week": week,
                        "average_sentiment": sum(scores) / len(scores),
                        "review_count": len(scores)
                    })
            
            # Calculate trend direction
            trend_direction = "stable"
            if len(daily_trends) >= 2:
                recent = daily_trends[-1]["average_sentiment"]
                previous = daily_trends[-2]["average_sentiment"]
                if recent - previous > 0.1:
                    trend_direction = "improving"
                elif recent - previous < -0.1:
                    trend_direction = "declining"
            
            return {
                "daily_trends": daily_trends[-14:],  # Last 14 days
                "weekly_trends": weekly_trends[-8:],  # Last 8 weeks
                "trend_direction": trend_direction,
                "volatility": self._calculate_sentiment_volatility(daily_trends),
                "seasonal_patterns": self._identify_seasonal_patterns(weekly_trends)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment trends: {e}")
            return {
                "daily_trends": [],
                "weekly_trends": [],
                "trend_direction": "unknown",
                "volatility": 0.0,
                "seasonal_patterns": []
            }
    
    async def analyze_aspect_sentiment(
        self,
        processed_reviews: List[ProcessedReview]
    ) -> Dict[str, Any]:
        """
        Analyze sentiment for different aspects (food, service, price, etc.).
        
        Args:
            processed_reviews: List of processed reviews
        
        Returns:
            Aspect-based sentiment analysis
        """
        try:
            # Aggregate aspect sentiments
            aspect_sentiments = defaultdict(list)
            aspect_mentions = defaultdict(int)
            
            for review in processed_reviews:
                for aspect, score in review.aspects.items():
                    aspect_sentiments[aspect].append(score)
                    aspect_mentions[aspect] += 1
            
            # Calculate average sentiment per aspect
            aspect_analysis = {}
            for aspect, scores in aspect_sentiments.items():
                if scores:
                    avg_score = sum(scores) / len(scores)
                    mention_count = aspect_mentions[aspect]
                    
                    # Determine sentiment category
                    if avg_score >= 0.6:
                        sentiment = "very_positive"
                    elif avg_score >= 0.3:
                        sentiment = "positive"
                    elif avg_score <= -0.3:
                        sentiment = "negative"
                    elif avg_score <= -0.6:
                        sentiment = "very_negative"
                    else:
                        sentiment = "neutral"
                    
                    aspect_analysis[aspect] = {
                        "average_sentiment": round(avg_score, 3),
                        "sentiment_category": sentiment,
                        "mention_count": mention_count,
                        "mention_percentage": round((mention_count / len(processed_reviews)) * 100, 1)
                    }
            
            # Sort by mention count
            sorted_aspects = dict(sorted(
                aspect_analysis.items(),
                key=lambda x: x[1]["mention_count"],
                reverse=True
            ))
            
            # Identify strongest and weakest aspects
            aspects = list(sorted_aspects.items())
            if aspects:
                strongest = max(aspects, key=lambda x: x[1]["average_sentiment"])
                weakest = min(aspects, key=lambda x: x[1]["average_sentiment"])
            else:
                strongest = weakest = ("none", {})
            
            return {
                "aspect_sentiments": sorted_aspects,
                "strongest_aspect": strongest[0] if strongest[0] != "none" else None,
                "weakest_aspect": weakest[0] if weakest[0] != "none" else None,
                "total_aspects_analyzed": len(aspect_sentiments)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing aspect sentiment: {e}")
            return {
                "aspect_sentiments": {},
                "strongest_aspect": None,
                "weakest_aspect": None,
                "total_aspects_analyzed": 0
            }
    
    def _create_processed_review(
        self,
        review: ReviewData,
        cleaned_text: str,
        sentiment_result: Dict[str, Any]
    ) -> ProcessedReview:
        """Create processed review from sentiment analysis results."""
        # Extract sentiment from AI result
        sentiment_score = sentiment_result.get("sentiment_score", 0.0)
        sentiment_category = sentiment_result.get("sentiment_category", "neutral")
        
        # Create processed review
        processed_review = ProcessedReview(
            original_review=review,
            cleaned_text=cleaned_text,
            sentiment=sentiment_category,
            sentiment_score=sentiment_score,
            key_phrases=sentiment_result.get("key_phrases", []),
            aspects=sentiment_result.get("aspects", {}),
            is_constructive=self._is_constructive_review(cleaned_text, sentiment_score),
            summary=sentiment_result.get("summary")
        )
        
        return processed_review
    
    def _is_constructive_review(self, text: str, sentiment_score: float) -> bool:
        """Determine if a review is constructive."""
        # Check length
        if len(text.split()) < 10:
            return False
        
        # Check for specific constructive indicators
        constructive_indicators = [
            "because", "reason", "suggest", "recommend",
            "improve", "better", "could", "should", "would"
        ]
        
        text_lower = text.lower()
        indicators_found = sum(
            1 for indicator in constructive_indicators 
            if indicator in text_lower
        )
        
        return indicators_found >= 2
    
    async def _extract_key_themes(
        self, 
        processed_reviews: List[ProcessedReview]
    ) -> Dict[str, List[str]]:
        """Extract key positive and negative themes from reviews."""
        positive_themes = []
        negative_themes = []
        
        try:
            # Collect text from positive and negative reviews
            positive_texts = []
            negative_texts = []
            
            for review in processed_reviews:
                if review.sentiment_score >= 0.3:
                    positive_texts.append(review.cleaned_text[:500])  # Limit length
                elif review.sentiment_score <= -0.3:
                    negative_texts.append(review.cleaned_text[:500])
            
            # Use AI to extract themes if we have enough text
            if positive_texts and len(positive_texts) >= 3:
                try:
                    themes_prompt = f"""
                    Extract the most common positive themes from these customer reviews:
                    
                    {" ".join(positive_texts[:10])}
                    
                    Return as a JSON array of theme strings.
                    """
                    
                    response = await gemini_service._generate_content(themes_prompt)
                    # Parse response to extract themes
                    import re
                    themes = re.findall(r'"([^"]+)"', response)
                    positive_themes = themes[:5]  # Limit to top 5
                except:
                    pass
            
            if negative_texts and len(negative_texts) >= 3:
                try:
                    themes_prompt = f"""
                    Extract the most common negative themes from these customer reviews:
                    
                    {" ".join(negative_texts[:10])}
                    
                    Return as a JSON array of theme strings.
                    """
                    
                    response = await gemini_service._generate_content(themes_prompt)
                    import re
                    themes = re.findall(r'"([^"]+)"', response)
                    negative_themes = themes[:5]
                except:
                    pass
            
        except Exception as e:
            logger.error(f"Error extracting key themes: {e}")
        
        # Fallback to aspect-based themes
        if not positive_themes or not negative_themes:
            aspects = defaultdict(list)
            for review in processed_reviews:
                for aspect, score in review.aspects.items():
                    aspects[aspect].append(score)
            
            for aspect, scores in aspects.items():
                avg_score = sum(scores) / len(scores)
                if avg_score >= 0.3 and len(positive_themes) < 5:
                    positive_themes.append(f"Good {aspect}")
                elif avg_score <= -0.3 and len(negative_themes) < 5:
                    negative_themes.append(f"Poor {aspect}")
        
        return {
            "positive": positive_themes[:5],
            "negative": negative_themes[:5]
        }
    
    def _analyze_sentiment_by_source(
        self, 
        processed_reviews: List[ProcessedReview]
    ) -> Dict[str, float]:
        """Analyze sentiment scores by data source."""
        sentiment_by_source = defaultdict(list)
        
        for review in processed_reviews:
            source = review.original_review.source
            sentiment_by_source[source].append(review.sentiment_score)
        
        # Calculate average per source
        result = {}
        for source, scores in sentiment_by_source.items():
            if scores:
                result[source] = round(sum(scores) / len(scores), 3)
        
        return result
    
    def _calculate_sentiment_confidence(
        self, 
        processed_reviews: List[ProcessedReview]
    ) -> float:
        """Calculate confidence score for sentiment analysis."""
        if not processed_reviews:
            return 0.0
        
        total_reviews = len(processed_reviews)
        
        # Confidence based on review count
        if total_reviews >= 50:
            count_confidence = 0.3
        elif total_reviews >= 20:
            count_confidence = 0.2
        elif total_reviews >= 10:
            count_confidence = 0.1
        else:
            count_confidence = 0.05
        
        # Confidence based on sentiment consistency
        sentiment_scores = [r.sentiment_score for r in processed_reviews]
        if sentiment_scores:
            import statistics
            try:
                stdev = statistics.stdev(sentiment_scores)
                consistency_confidence = max(0, 0.4 - (stdev * 0.3))
            except:
                consistency_confidence = 0.2
        else:
            consistency_confidence = 0.0
        
        # Confidence based on review quality
        constructive_count = sum(1 for r in processed_reviews if r.is_constructive)
        quality_confidence = min(constructive_count / max(total_reviews, 1) * 0.3, 0.3)
        
        total_confidence = count_confidence + consistency_confidence + quality_confidence
        
        return round(min(total_confidence, 1.0), 2)
    
    def _calculate_sentiment_volatility(
        self, 
        daily_trends: List[Dict[str, Any]]
    ) -> float:
        """Calculate sentiment volatility."""
        if len(daily_trends) < 2:
            return 0.0
        
        sentiments = [day["average_sentiment"] for day in daily_trends]
        
        # Calculate average daily change
        changes = []
        for i in range(1, len(sentiments)):
            changes.append(abs(sentiments[i] - sentiments[i-1]))
        
        if changes:
            avg_change = sum(changes) / len(changes)
            # Normalize to 0-1 scale
            volatility = min(avg_change * 10, 1.0)
            return round(volatility, 2)
        
        return 0.0
    
    def _identify_seasonal_patterns(
        self, 
        weekly_trends: List[Dict[str, Any]]
    ) -> List[str]:
        """Identify seasonal patterns in sentiment."""
        patterns = []
        
        if len(weekly_trends) < 8:  # Need at least 8 weeks for pattern detection
            return patterns
        
        # Look for consistent weekly patterns
        weekends = []
        weekdays = []
        
        # This is simplified - in reality, you'd need date information
        # to properly identify weekends vs weekdays
        
        if len(weekends) > 2 and len(weekdays) > 2:
            avg_weekend = sum(weekends) / len(weekends)
            avg_weekday = sum(weekdays) / len(weekdays)
            
            if avg_weekend - avg_weekday > 0.2:
                patterns.append("Higher sentiment on weekends")
            elif avg_weekday - avg_weekend > 0.2:
                patterns.append("Higher sentiment on weekdays")
        
        return patterns
    
    def _create_empty_sentiment_analysis(self) -> Dict[str, Any]:
        """Create empty sentiment analysis result."""
        return {
            "overall_sentiment": 0.0,
            "positive_percentage": 0.0,
            "negative_percentage": 0.0,
            "neutral_percentage": 100.0,
            "key_positive_themes": [],
            "key_negative_themes": [],
            "sentiment_by_source": {},
            "total_reviews_analyzed": 0,
            "confidence_score": 0.0
        }


# Singleton instance
sentiment_analyzer = SentimentAnalyzer()