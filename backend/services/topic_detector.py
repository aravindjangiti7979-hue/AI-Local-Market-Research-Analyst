"""
Topic detection and trend analysis service.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import re

from services.gemini_service import gemini_service
from utils.data_cleaners import DataCleaner
from models.market_models import NewsArticle, SocialMediaPost, ProcessedArticle

logger = logging.getLogger(__name__)


class TopicDetector:
    """Service for detecting topics and trends in market data."""
    
    def __init__(self):
        self.data_cleaner = DataCleaner()
    
    async def detect_topics(
        self,
        articles: List[NewsArticle],
        social_posts: List[SocialMediaPost],
        timeframe_days: int = 30
    ) -> Dict[str, Any]:
        """
        Detect topics and trends from news and social media.
        
        Args:
            articles: List of news articles
            social_posts: List of social media posts
            timeframe_days: Timeframe for analysis
        
        Returns:
            Topic and trend analysis
        """
        try:
            logger.info(f"Starting topic detection with {len(articles)} articles and {len(social_posts)} social posts")
            
            # Process articles
            processed_articles = []
            for article in articles:
                try:
                    processed = self.data_cleaner.clean_article_data(article)
                    processed_articles.append(processed)
                except Exception as e:
                    logger.debug(f"Error processing article: {e}")
                    continue
            
            # Extract topics from multiple sources
            news_topics = await self._extract_news_topics(processed_articles)
            social_topics = await self._extract_social_topics(social_posts)
            
            # Combine and analyze topics
            all_topics = self._combine_topics(news_topics, social_topics)
            
            # Calculate topic importance
            topic_importance = self._calculate_topic_importance(
                all_topics, processed_articles, social_posts
            )
            
            # Identify emerging patterns
            emerging_patterns = await self._identify_emerging_patterns(
                all_topics, processed_articles, social_posts
            )
            
            # Analyze seasonal factors
            seasonal_factors = self._analyze_seasonal_factors(processed_articles)
            
            # Calculate growth indicators
            growth_indicators = self._calculate_growth_indicators(
                all_topics, processed_articles
            )
            
            return {
                "trending_topics": list(all_topics.keys())[:20],
                "topic_importance": topic_importance,
                "emerging_patterns": emerging_patterns,
                "seasonal_factors": seasonal_factors,
                "growth_indicators": growth_indicators,
                "total_articles_analyzed": len(processed_articles),
                "total_social_posts_analyzed": len(social_posts),
                "timeframe_days": timeframe_days
            }
            
        except Exception as e:
            logger.error(f"Error in topic detection: {e}", exc_info=True)
            raise
    
    async def _extract_news_topics(
        self, 
        processed_articles: List[ProcessedArticle]
    ) -> Dict[str, float]:
        """
        Extract topics from news articles.
        """
        topics = defaultdict(float)
        
        if not processed_articles:
            return topics
        
        try:
            # Combine article content for analysis
            combined_text = " ".join([
                f"{article.summary} {' '.join(article.key_points)}"
                for article in processed_articles[:20]  # Limit for performance
            ])
            
            if len(combined_text) < 100:  # Not enough text
                # Fallback to keyword extraction
                for article in processed_articles:
                    for keyword in article.original_article.keywords:
                        topics[keyword.lower()] += article.relevance_score
                return topics
            
            # Use AI to extract topics
            prompt = f"""
            Extract the main topics and themes from these news articles.
            For each topic, estimate its importance score from 0 to 1.
            
            Article Content:
            {combined_text[:3000]}  # Limit length
            
            Return as JSON object with topics as keys and importance scores as values.
            """
            
            try:
                response = await gemini_service._generate_content(prompt)
                
                # Parse JSON response
                import json
                import re
                
                # Try to extract JSON
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    ai_topics = json.loads(json_match.group())
                    for topic, score in ai_topics.items():
                        topics[topic] = float(score)
            except Exception as e:
                logger.debug(f"AI topic extraction failed: {e}")
                # Fallback to keyword-based topics
                pass
            
        except Exception as e:
            logger.error(f"Error extracting news topics: {e}")
        
        # Ensure we have at least some topics
        if not topics:
            topics = self._extract_keyword_topics(processed_articles)
        
        return topics
    
    def _extract_keyword_topics(
        self, 
        processed_articles: List[ProcessedArticle]
    ) -> Dict[str, float]:
        """Extract topics using keyword frequency."""
        keyword_counter = Counter()
        
        for article in processed_articles:
            # Add original keywords
            for keyword in article.original_article.keywords:
                if len(keyword) > 3:  # Filter out short keywords
                    keyword_counter[keyword.lower()] += 1
            
            # Add entities as potential topics
            for entity in article.entities:
                if len(entity.split()) <= 3:  # Single words or short phrases
                    keyword_counter[entity.lower()] += 1
        
        # Convert to weighted scores
        total_keywords = sum(keyword_counter.values())
        topics = {}
        
        for keyword, count in keyword_counter.most_common(30):
            if total_keywords > 0:
                score = count / total_keywords
                topics[keyword] = min(score * 10, 1.0)  # Scale to 0-1
        
        return topics
    
    async def _extract_social_topics(
        self, 
        social_posts: List[SocialMediaPost]
    ) -> Dict[str, float]:
        """
        Extract topics from social media posts.
        """
        topics = defaultdict(float)
        
        if not social_posts:
            return topics
        
        try:
            # Combine post text for analysis
            combined_text = " ".join([
                post.text for post in social_posts[:50]  # Limit for performance
            ])
            
            if len(combined_text) < 100:
                # Fallback to hashtag analysis
                for post in social_posts:
                    for hashtag in post.hashtags:
                        topics[f"#{hashtag}"] += post.engagement_score or 0.1
                return topics
            
            # Use AI to extract topics
            prompt = f"""
            Extract the main topics and trends from these social media posts.
            Focus on consumer sentiment, emerging trends, and popular discussions.
            
            Social Media Posts:
            {combined_text[:2000]}  # Limit length
            
            Return as JSON object with topics as keys and relevance scores (0-1) as values.
            """
            
            try:
                response = await gemini_service._generate_content(prompt)
                
                import json
                import re
                
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    ai_topics = json.loads(json_match.group())
                    for topic, score in ai_topics.items():
                        topics[topic] = float(score)
            except Exception as e:
                logger.debug(f"AI social topic extraction failed: {e}")
                # Fallback to hashtag-based topics
                pass
            
        except Exception as e:
            logger.error(f"Error extracting social topics: {e}")
        
        # Add hashtags as topics
        if not topics:
            for post in social_posts:
                for hashtag in post.hashtags:
                    topics[f"#{hashtag}"] += 0.1
        
        return topics
    
    def _combine_topics(
        self, 
        news_topics: Dict[str, float], 
        social_topics: Dict[str, float]
    ) -> Dict[str, float]:
        """Combine and normalize topics from different sources."""
        combined = defaultdict(float)
        
        # Add news topics with weight
        for topic, score in news_topics.items():
            combined[topic] += score * 0.6  # News weight
        
        # Add social topics with weight
        for topic, score in social_topics.items():
            combined[topic] += score * 0.4  # Social weight
        
        # Normalize scores to 0-1 range
        if combined:
            max_score = max(combined.values())
            if max_score > 0:
                combined = {k: v/max_score for k, v in combined.items()}
        
        # Sort by score
        return dict(sorted(combined.items(), key=lambda x: x[1], reverse=True))
    
    def _calculate_topic_importance(
        self,
        topics: Dict[str, float],
        processed_articles: List[ProcessedArticle],
        social_posts: List[SocialMediaPost]
    ) -> Dict[str, float]:
        """Calculate importance score for each topic."""
        importance = {}
        
        for topic, base_score in topics.items():
            importance_score = base_score
            
            # Adjust based on article relevance
            article_relevance = self._calculate_topic_article_relevance(topic, processed_articles)
            importance_score += article_relevance * 0.3
            
            # Adjust based on social engagement
            social_engagement = self._calculate_topic_social_engagement(topic, social_posts)
            importance_score += social_engagement * 0.2
            
            # Normalize
            importance[topic] = min(round(importance_score, 3), 1.0)
        
        return importance
    
    def _calculate_topic_article_relevance(
        self,
        topic: str,
        processed_articles: List[ProcessedArticle]
    ) -> float:
        """Calculate how relevant a topic is across articles."""
        if not processed_articles:
            return 0.0
        
        relevance_sum = 0
        topic_lower = topic.lower()
        
        for article in processed_articles:
            # Check if topic appears in article content
            article_text = f"{article.summary} {' '.join(article.key_points)}".lower()
            if topic_lower in article_text:
                relevance_sum += article.relevance_score
        
        if processed_articles:
            return relevance_sum / len(processed_articles)
        
        return 0.0
    
    def _calculate_topic_social_engagement(
        self,
        topic: str,
        social_posts: List[SocialMediaPost]
    ) -> float:
        """Calculate social engagement for a topic."""
        if not social_posts:
            return 0.0
        
        engagement_sum = 0
        count = 0
        topic_lower = topic.lower()
        
        for post in social_posts:
            post_text = post.text.lower()
            if topic_lower in post_text:
                engagement = (post.engagement_score or 0.5)
                engagement_sum += engagement
                count += 1
        
        if count > 0:
            return engagement_sum / count
        
        return 0.0
    
    async def _identify_emerging_patterns(
        self,
        topics: Dict[str, float],
        processed_articles: List[ProcessedArticle],
        social_posts: List[SocialMediaPost]
    ) -> List[str]:
        """Identify emerging patterns and trends."""
        patterns = []
        
        try:
            # Look for topic clusters
            topic_clusters = self._cluster_topics(list(topics.keys())[:20])
            
            # Identify growth patterns
            for cluster in topic_clusters:
                if len(cluster) >= 3:
                    pattern = f"Growing interest in {', '.join(cluster[:3])}"
                    patterns.append(pattern)
            
            # Look for temporal patterns in articles
            if processed_articles:
                recent_articles = [
                    a for a in processed_articles 
                    if a.original_article.published_at
                ]
                
                if recent_articles:
                    # Sort by date
                    recent_articles.sort(
                        key=lambda x: x.original_article.published_at, 
                        reverse=True
                    )
                    
                    # Check for recent topic spikes
                    recent_topics = set()
                    for article in recent_articles[:10]:  # Last 10 articles
                        for entity in article.entities[:5]:
                            recent_topics.add(entity)
                    
                    if recent_topics:
                        patterns.append(f"Recent focus on: {', '.join(list(recent_topics)[:3])}")
            
            # Look for social media patterns
            if social_posts:
                high_engagement_posts = [
                    p for p in social_posts 
                    if p.engagement_score and p.engagement_score > 0.7
                ]
                
                if high_engagement_posts:
                    common_hashtags = Counter()
                    for post in high_engagement_posts:
                        for hashtag in post.hashtags:
                            common_hashtags[hashtag] += 1
                    
                    top_hashtags = [h for h, c in common_hashtags.most_common(3)]
                    if top_hashtags:
                        patterns.append(f"High engagement around: {', '.join(top_hashtags)}")
        
        except Exception as e:
            logger.error(f"Error identifying emerging patterns: {e}")
        
        # Ensure we have at least some patterns
        if not patterns and topics:
            top_topics = list(topics.keys())[:3]
            patterns.append(f"Key market topics: {', '.join(top_topics)}")
        
        return patterns[:5]  # Limit to top 5 patterns
    
    def _cluster_topics(self, topics: List[str]) -> List[List[str]]:
        """Group similar topics into clusters."""
        clusters = []
        used_topics = set()
        
        for i, topic1 in enumerate(topics):
            if topic1 in used_topics:
                continue
            
            cluster = [topic1]
            used_topics.add(topic1)
            
            for j, topic2 in enumerate(topics[i+1:], i+1):
                if topic2 in used_topics:
                    continue
                
                # Simple similarity check (could be improved)
                if self._topics_are_similar(topic1, topic2):
                    cluster.append(topic2)
                    used_topics.add(topic2)
            
            if len(cluster) > 1:
                clusters.append(cluster)
        
        return clusters
    
    def _topics_are_similar(self, topic1: str, topic2: str) -> bool:
        """Check if two topics are similar."""
        # Remove common prefixes/suffixes
        t1 = topic1.lower().replace('#', '').strip()
        t2 = topic2.lower().replace('#', '').strip()
        
        # Check for word overlap
        words1 = set(t1.split())
        words2 = set(t2.split())
        
        if words1.intersection(words2):
            return True
        
        # Check for substring
        if t1 in t2 or t2 in t1:
            return True
        
        return False
    
    def _analyze_seasonal_factors(
        self, 
        processed_articles: List[ProcessedArticle]
    ) -> List[str]:
        """Analyze seasonal factors from articles."""
        seasonal_terms = {
            "holiday": ["christmas", "thanksgiving", "easter", "halloween", "holiday"],
            "season": ["summer", "winter", "spring", "fall", "autumn"],
            "event": ["sale", "festival", "celebration", "event", "fair"]
        }
        
        factors = defaultdict(int)
        
        for article in processed_articles:
            article_text = f"{article.summary} {' '.join(article.key_points)}".lower()
            
            for category, terms in seasonal_terms.items():
                for term in terms:
                    if term in article_text:
                        factors[f"{category}_{term}"] += 1
        
        # Identify significant factors
        significant_factors = []
        for factor, count in factors.items():
            if count >= 2:  # Appears in at least 2 articles
                _, term = factor.split('_', 1)
                significant_factors.append(f"Increased {term} activity")
        
        return significant_factors[:3]
    
    def _calculate_growth_indicators(
        self,
        topics: Dict[str, float],
        processed_articles: List[ProcessedArticle]
    ) -> Dict[str, float]:
        """Calculate growth indicators for the market."""
        indicators = {}
        
        # Topic diversity indicator
        if topics:
            topic_count = len(topics)
            if topic_count > 20:
                indicators["topic_diversity"] = 0.8
            elif topic_count > 10:
                indicators["topic_diversity"] = 0.5
            else:
                indicators["topic_diversity"] = 0.2
        
        # Article volume indicator
        if processed_articles:
            article_count = len(processed_articles)
            if article_count > 50:
                indicators["media_coverage"] = 0.9
            elif article_count > 20:
                indicators["media_coverage"] = 0.6
            elif article_count > 5:
                indicators["media_coverage"] = 0.3
            else:
                indicators["media_coverage"] = 0.1
        
        # Sentiment trend indicator (simplified)
        if processed_articles:
            avg_relevance = sum(a.relevance_score for a in processed_articles) / len(processed_articles)
            avg_impact = sum(a.impact_score for a in processed_articles) / len(processed_articles)
            indicators["content_quality"] = round((avg_relevance + avg_impact) / 2, 2)
        
        # Topic momentum indicator
        if len(topics) >= 5:
            top_topics = list(topics.items())[:5]
            avg_score = sum(score for _, score in top_topics) / 5
            indicators["trend_momentum"] = round(avg_score, 2)
        
        return indicators
    
    async def analyze_topic_evolution(
        self,
        articles: List[NewsArticle],
        timeframe_weeks: int = 8
    ) -> Dict[str, Any]:
        """
        Analyze how topics evolve over time.
        """
        from collections import defaultdict
        from datetime import datetime, timedelta
        
        try:
            # Group articles by week
            weekly_articles = defaultdict(list)
            
            for article in articles:
                if article.published_at:
                    week_start = article.published_at - timedelta(
                        days=article.published_at.weekday()
                    )
                    week_key = week_start.strftime("%Y-W%W")
                    weekly_articles[week_key].append(article)
            
            # Sort weeks
            sorted_weeks = sorted(weekly_articles.keys())
            
            # Analyze topics per week
            weekly_topics = {}
            for week in sorted_weeks[-timeframe_weeks:]:  # Last N weeks
                week_articles = weekly_articles[week]
                if week_articles:
                    # Process articles for this week
                    processed = []
                    for article in week_articles:
                        try:
                            processed.append(self.data_cleaner.clean_article_data(article))
                        except:
                            continue
                    
                    # Extract topics for this week
                    if processed:
                        topics = await self._extract_news_topics(processed)
                        weekly_topics[week] = topics
            
            # Analyze evolution
            evolution = self._analyze_topic_evolution_over_time(weekly_topics)
            
            return {
                "weekly_topics": weekly_topics,
                "evolution_analysis": evolution,
                "timeframe_weeks": timeframe_weeks,
                "total_weeks_analyzed": len(weekly_topics)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing topic evolution: {e}")
            return {
                "weekly_topics": {},
                "evolution_analysis": {},
                "timeframe_weeks": timeframe_weeks,
                "total_weeks_analyzed": 0
            }
    
    def _analyze_topic_evolution_over_time(
        self, 
        weekly_topics: Dict[str, Dict[str, float]]
    ) -> Dict[str, Any]:
        """Analyze how topics change over weeks."""
        if len(weekly_topics) < 2:
            return {"trend": "insufficient_data"}
        
        # Track topic persistence
        all_topics = set()
        for topics in weekly_topics.values():
            all_topics.update(topics.keys())
        
        topic_persistence = {}
        for topic in all_topics:
            weeks_present = sum(1 for week_topics in weekly_topics.values() if topic in week_topics)
            persistence = weeks_present / len(weekly_topics)
            topic_persistence[topic] = persistence
        
        # Identify emerging topics (present in recent weeks only)
        recent_weeks = list(weekly_topics.keys())[-2:]  # Last 2 weeks
        emerging_topics = []
        
        for topic, persistence in topic_persistence.items():
            if persistence <= 0.5:  # Not persistent
                # Check if present in recent weeks
                recent_present = any(
                    topic in weekly_topics[week] for week in recent_weeks
                )
                if recent_present:
                    emerging_topics.append(topic)
        
        # Identify declining topics
        early_weeks = list(weekly_topics.keys())[:2]  # First 2 weeks
        declining_topics = []
        
        for topic, persistence in topic_persistence.items():
            if persistence >= 0.5:  # Was persistent
                # Check if absent in recent weeks
                recent_absent = all(
                    topic not in weekly_topics[week] for week in recent_weeks
                )
                if recent_absent:
                    declining_topics.append(topic)
        
        return {
            "total_topics_tracked": len(all_topics),
            "emerging_topics": emerging_topics[:5],
            "declining_topics": declining_topics[:5],
            "most_persistent_topics": sorted(
                topic_persistence.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5],
            "trend_stability": self._calculate_trend_stability(weekly_topics)
        }
    
    def _calculate_trend_stability(
        self, 
        weekly_topics: Dict[str, Dict[str, float]]
    ) -> float:
        """Calculate how stable topics are over time."""
        if len(weekly_topics) < 2:
            return 0.0
        
        # Calculate topic overlap between consecutive weeks
        overlaps = []
        weeks = list(weekly_topics.keys())
        
        for i in range(len(weeks) - 1):
            week1_topics = set(weekly_topics[weeks[i]].keys())
            week2_topics = set(weekly_topics[weeks[i+1]].keys())
            
            if week1_topics and week2_topics:
                overlap = len(week1_topics.intersection(week2_topics)) / len(week1_topics.union(week2_topics))
                overlaps.append(overlap)
        
        if overlaps:
            return round(sum(overlaps) / len(overlaps), 2)
        
        return 0.0


# Singleton instance
topic_detector = TopicDetector()