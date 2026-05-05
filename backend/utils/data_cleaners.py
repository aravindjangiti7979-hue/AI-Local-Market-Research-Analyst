"""
Data cleaning and preprocessing utilities.
"""
import re
import html
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import emoji
from bs4 import BeautifulSoup

from models.market_models import (
    ReviewData, NewsArticle, SocialMediaPost,
    ProcessedReview, ProcessedArticle
)


class DataCleaner:
    """Data cleaning and preprocessing class."""
    
    @staticmethod
    def clean_text(text: str, remove_html: bool = True) -> str:
        """
        Clean text by removing HTML, special characters, and normalizing.
        
        Args:
            text: Input text
            remove_html: Whether to remove HTML tags
        
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Convert to string
        text = str(text)
        
        # Remove HTML tags if requested
        if remove_html:
            # First unescape HTML entities
            text = html.unescape(text)
            # Then remove HTML tags
            text = BeautifulSoup(text, "html.parser").get_text()
        
        # Remove URLs
        text = re.sub(r'https?://\S+|www\.\S+', '', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?\'"-]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove emojis
        text = emoji.replace_emoji(text, replace='')
        
        # Normalize quotes
        text = text.replace('"', "'")
        
        # Trim
        text = text.strip()
        
        return text
    
    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """
        Normalize whitespace in text.
        """
        if not text:
            return ""
        
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text
    
    @staticmethod
    def extract_hashtags(text: str) -> List[str]:
        """
        Extract hashtags from text.
        """
        if not text:
            return []
        
        hashtags = re.findall(r'#(\w+)', text)
        # Remove duplicates while preserving order
        seen = set()
        unique_hashtags = []
        for tag in hashtags:
            if tag.lower() not in seen:
                seen.add(tag.lower())
                unique_hashtags.append(tag)
        
        return unique_hashtags
    
    @staticmethod
    def extract_mentions(text: str) -> List[str]:
        """
        Extract mentions (@username) from text.
        """
        if not text:
            return []
        
        mentions = re.findall(r'@(\w+)', text)
        # Remove duplicates while preserving order
        seen = set()
        unique_mentions = []
        for mention in mentions:
            if mention.lower() not in seen:
                seen.add(mention.lower())
                unique_mentions.append(mention)
        
        return unique_mentions
    
    @staticmethod
    def clean_review_data(review: ReviewData) -> ProcessedReview:
        """
        Clean and process review data.
        
        Args:
            review: Raw review data
        
        Returns:
            Processed review data
        """
        # Clean review text
        cleaned_text = DataCleaner.clean_text(review.text)
        
        # Calculate basic metrics
        word_count = len(cleaned_text.split())
        char_count = len(cleaned_text)
        
        # Extract aspects (simplified - in real app, use NLP)
        aspects = DataCleaner._extract_review_aspects(cleaned_text)
        
        # Determine if review is constructive
        is_constructive = DataCleaner._is_constructive_review(
            cleaned_text, word_count
        )
        
        # Generate summary (simplified)
        summary = DataCleaner._generate_review_summary(cleaned_text)
        
        # Calculate sentiment if not provided
        if review.sentiment_score is None:
            sentiment_score = DataCleaner._calculate_basic_sentiment(
                cleaned_text
            )
        else:
            sentiment_score = review.sentiment_score
        
        # Determine sentiment category
        if sentiment_score >= 0.3:
            sentiment = "positive"
        elif sentiment_score <= -0.3:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        # Extract key phrases (simplified)
        key_phrases = DataCleaner._extract_key_phrases(cleaned_text)
        
        return ProcessedReview(
            original_review=review,
            cleaned_text=cleaned_text,
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            key_phrases=key_phrases,
            aspects=aspects,
            is_constructive=is_constructive,
            summary=summary
        )
    
    @staticmethod
    def clean_article_data(article: NewsArticle) -> ProcessedArticle:
        """
        Clean and process news article data.
        
        Args:
            article: Raw news article
        
        Returns:
            Processed article data
        """
        # Clean article content
        cleaned_content = DataCleaner.clean_text(article.content)
        cleaned_title = DataCleaner.clean_text(article.title)
        cleaned_desc = DataCleaner.clean_text(article.description)
        
        # Combine for full text
        full_text = f"{cleaned_title}. {cleaned_desc}. {cleaned_content}"
        
        # Extract entities (simplified - in real app, use NER)
        entities = DataCleaner._extract_entities(full_text)
        
        # Extract topics (simplified)
        topics = DataCleaner._extract_topics(full_text)
        
        # Generate summary
        summary = DataCleaner._generate_article_summary(
            cleaned_title, cleaned_content
        )
        
        # Extract key points
        key_points = DataCleaner._extract_key_points(full_text)
        
        # Calculate relevance score (simplified)
        relevance_score = DataCleaner._calculate_relevance_score(
            full_text, article.keywords
        )
        
        # Calculate impact score (simplified)
        impact_score = DataCleaner._calculate_impact_score(
            article.source_name, len(full_text)
        )
        
        return ProcessedArticle(
            original_article=article,
            summary=summary,
            entities=entities,
            topics=topics,
            relevance_score=relevance_score,
            impact_score=impact_score,
            key_points=key_points
        )
    
    @staticmethod
    def clean_social_post_data(post: SocialMediaPost) -> SocialMediaPost:
        """
        Clean social media post data.
        """
        # Clean post text
        cleaned_text = DataCleaner.clean_text(post.text, remove_html=False)
        
        # Update post with cleaned data
        post.text = cleaned_text
        
        # Extract hashtags and mentions if not already done
        if not post.hashtags:
            post.hashtags = DataCleaner.extract_hashtags(cleaned_text)
        
        if not post.mentions:
            post.mentions = DataCleaner.extract_mentions(cleaned_text)
        
        return post
    
    @staticmethod
    def _extract_review_aspects(text: str) -> Dict[str, float]:
        """
        Extract aspects mentioned in review (simplified).
        
        In a real application, you would use NLP techniques like
        aspect-based sentiment analysis.
        """
        aspects = {}
        
        # Common aspects for different business types
        common_aspects = {
            "food": ["food", "taste", "flavor", "menu", "dish"],
            "service": ["service", "staff", "waiter", "server", "helpful"],
            "price": ["price", "cost", "expensive", "cheap", "value"],
            "ambiance": ["ambiance", "atmosphere", "decor", "music", "lighting"],
            "location": ["location", "parking", "access", "neighborhood"]
        }
        
        text_lower = text.lower()
        
        for aspect, keywords in common_aspects.items():
            count = 0
            for keyword in keywords:
                if keyword in text_lower:
                    count += 1
            
            if count > 0:
                # Simple scoring based on keyword frequency
                aspects[aspect] = min(count / len(keywords), 1.0)
        
        return aspects
    
    @staticmethod
    def _is_constructive_review(text: str, word_count: int) -> bool:
        """
        Determine if a review is constructive.
        """
        # Minimum word count for constructive review
        if word_count < 10:
            return False
        
        # Check for specific constructive indicators
        constructive_indicators = [
            "because", "reason", "suggest", "recommend",
            "improve", "better", "could", "should"
        ]
        
        text_lower = text.lower()
        indicators_found = sum(
            1 for indicator in constructive_indicators 
            if indicator in text_lower
        )
        
        # Consider review constructive if it has at least 2 indicators
        # or is longer than 50 words
        return indicators_found >= 2 or word_count > 50
    
    @staticmethod
    def _generate_review_summary(text: str, max_length: int = 100) -> str:
        """
        Generate a summary of a review (simplified).
        """
        if not text:
            return ""
        
        # Simple approach: take first few sentences
        sentences = re.split(r'[.!?]+', text)
        summary_parts = []
        total_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence:
                if total_length + len(sentence) <= max_length:
                    summary_parts.append(sentence)
                    total_length += len(sentence)
                else:
                    break
        
        summary = '. '.join(summary_parts)
        if summary and not summary.endswith('.'):
            summary += '.'
        
        return summary
    
    @staticmethod
    def _calculate_basic_sentiment(text: str) -> float:
        """
        Calculate basic sentiment score (simplified).
        
        In a real application, you would use a proper sentiment analysis model.
        """
        if not text:
            return 0.0
        
        # Simple keyword-based sentiment
        positive_words = {
            'good', 'great', 'excellent', 'amazing', 'wonderful',
            'best', 'love', 'like', 'happy', 'pleased', 'perfect',
            'awesome', 'fantastic', 'outstanding', 'superb'
        }
        
        negative_words = {
            'bad', 'terrible', 'awful', 'horrible', 'worst',
            'hate', 'dislike', 'unhappy', 'angry', 'poor',
            'disappointing', 'frustrating', 'annoying', 'ridiculous'
        }
        
        text_lower = text.lower()
        words = text_lower.split()
        
        if not words:
            return 0.0
        
        positive_count = sum(1 for word in words if word in positive_words)
        negative_count = sum(1 for word in words if word in negative_words)
        
        # Calculate sentiment score between -1 and 1
        total_sentiment_words = positive_count + negative_count
        if total_sentiment_words == 0:
            return 0.0
        
        sentiment_score = (positive_count - negative_count) / total_sentiment_words
        return max(-1.0, min(1.0, sentiment_score))
    
    @staticmethod
    def _extract_key_phrases(text: str, max_phrases: int = 5) -> List[str]:
        """
        Extract key phrases from text (simplified).
        """
        if not text:
            return []
        
        # Simple approach: extract noun phrases (very simplified)
        words = text.lower().split()
        
        # Common stop words to filter
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
            'to', 'for', 'of', 'with', 'by', 'is', 'was', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'do',
            'does', 'did', 'will', 'would', 'should', 'could',
            'can', 'may', 'might', 'must'
        }
        
        # Filter out stop words and short words
        filtered_words = [
            word for word in words 
            if word not in stop_words and len(word) > 2
        ]
        
        # Count word frequencies
        from collections import Counter
        word_counts = Counter(filtered_words)
        
        # Get most common words as key phrases
        common_words = word_counts.most_common(max_phrases)
        key_phrases = [word for word, count in common_words]
        
        return key_phrases
    
    @staticmethod
    def _extract_entities(text: str) -> List[str]:
        """
        Extract entities from text (simplified).
        """
        # In a real application, use NER from spaCy, NLTK, or similar
        # This is a very simplified version
        
        # Common entity patterns
        patterns = {
            'organization': r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',
            'person': r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',
            'location': r'\b(?:Street|Avenue|Road|Boulevard|Drive|Lane)\b',
        }
        
        entities = []
        for pattern in patterns.values():
            matches = re.findall(pattern, text)
            entities.extend(matches)
        
        # Remove duplicates
        entities = list(set(entities))
        
        return entities[:10]  # Limit to 10 entities
    
    @staticmethod
    def _extract_topics(text: str) -> List[str]:
        """
        Extract topics from text (simplified).
        """
        # In a real application, use topic modeling (LDA, etc.)
        # This is a very simplified version
        
        # Common topics based on keywords
        topic_keywords = {
            'food': ['food', 'menu', 'dish', 'meal', 'cuisine', 'restaurant'],
            'service': ['service', 'staff', 'waiter', 'server', 'manager'],
            'price': ['price', 'cost', 'expensive', 'cheap', 'value', 'money'],
            'quality': ['quality', 'fresh', 'clean', 'tasty', 'delicious'],
            'atmosphere': ['atmosphere', 'ambiance', 'decor', 'music', 'seating'],
        }
        
        text_lower = text.lower()
        topics_found = []
        
        for topic, keywords in topic_keywords.items():
            keyword_count = sum(1 for keyword in keywords if keyword in text_lower)
            if keyword_count >= 2:  # At least 2 keywords to consider it a topic
                topics_found.append(topic)
        
        return topics_found
    
    @staticmethod
    def _generate_article_summary(title: str, content: str) -> str:
        """
        Generate article summary.
        """
        # Simple approach: combine title with first sentence of content
        if not content:
            return title
        
        # Get first sentence of content
        first_sentence_match = re.match(r'^[^.!?]*[.!?]', content)
        if first_sentence_match:
            first_sentence = first_sentence_match.group(0)
            summary = f"{title}. {first_sentence}"
        else:
            # If no sentence ending found, take first 100 chars
            summary = f"{title}. {content[:100]}..."
        
        return summary
    
    @staticmethod
    def _extract_key_points(text: str, max_points: int = 5) -> List[str]:
        """
        Extract key points from text.
        """
        # Simple approach: extract sentences with important keywords
        sentences = re.split(r'[.!?]+', text)
        
        important_keywords = {
            'important', 'key', 'major', 'significant', 'critical',
            'essential', 'crucial', 'vital', 'main', 'primary'
        }
        
        key_points = []
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            sentence_lower = sentence.lower()
            # Check if sentence contains important keywords
            if any(keyword in sentence_lower for keyword in important_keywords):
                key_points.append(sentence)
            
            if len(key_points) >= max_points:
                break
        
        # If no important sentences found, use first few sentences
        if not key_points and sentences:
            key_points = [s.strip() for s in sentences[:3] if s.strip()]
        
        return key_points
    
    @staticmethod
    def _calculate_relevance_score(text: str, keywords: List[str]) -> float:
        """
        Calculate relevance score based on keywords.
        """
        if not text or not keywords:
            return 0.5  # Default score
        
        text_lower = text.lower()
        keyword_matches = 0
        
        for keyword in keywords:
            if keyword.lower() in text_lower:
                keyword_matches += 1
        
        # Score between 0 and 1 based on keyword matches
        score = keyword_matches / len(keywords)
        return min(score, 1.0)
    
    @staticmethod
    def _calculate_impact_score(source: str, text_length: int) -> float:
        """
        Calculate impact score based on source and content length.
        """
        # Source credibility weights
        source_weights = {
            'new york times': 0.9,
            'bbc': 0.9,
            'cnn': 0.8,
            'reuters': 0.85,
            'associated press': 0.85,
            'forbes': 0.8,
            'wall street journal': 0.9,
            'local news': 0.6,
            'blog': 0.4,
            'social media': 0.3,
        }
        
        # Get source weight
        source_lower = source.lower()
        source_score = 0.5  # Default
        
        for source_name, weight in source_weights.items():
            if source_name in source_lower:
                source_score = weight
                break
        
        # Length score (longer articles are often more comprehensive)
        length_score = min(text_length / 1000, 1.0)
        
        # Combined score (weighted average)
        impact_score = (source_score * 0.7) + (length_score * 0.3)
        
        return round(impact_score, 2)
    
    @staticmethod
    def normalize_business_categories(categories: List[str]) -> List[str]:
        """
        Normalize business categories to standard set.
        """
        if not categories:
            return []
        
        # Mapping of common category variations to standard categories
        category_mapping = {
            # Restaurants
            'restaurant': 'restaurant',
            'cafe': 'cafe',
            'coffee shop': 'cafe',
            'bakery': 'bakery',
            'pizzeria': 'pizza',
            'pizza': 'pizza',
            'italian restaurant': 'italian',
            'chinese restaurant': 'chinese',
            'mexican restaurant': 'mexican',
            'indian restaurant': 'indian',
            'japanese restaurant': 'japanese',
            'fast food': 'fast_food',
            'fine dining': 'fine_dining',
            
            # Retail
            'clothing store': 'clothing',
            'shoe store': 'shoes',
            'electronics store': 'electronics',
            'bookstore': 'books',
            'grocery store': 'grocery',
            'supermarket': 'grocery',
            'convenience store': 'convenience',
            'pharmacy': 'pharmacy',
            'hardware store': 'hardware',
            'furniture store': 'furniture',
            
            # Services
            'hair salon': 'hair_salon',
            'barber shop': 'barber',
            'spa': 'spa',
            'nail salon': 'nail_salon',
            'dry cleaner': 'dry_cleaning',
            'laundry': 'laundry',
            'bank': 'bank',
            'post office': 'post_office',
            'gas station': 'gas_station',
            'car wash': 'car_wash',
            'auto repair': 'auto_repair',
            
            # Professional
            'lawyer': 'legal',
            'accountant': 'accounting',
            'dentist': 'dentist',
            'doctor': 'doctor',
            'veterinarian': 'veterinarian',
            'real estate': 'real_estate',
            'insurance': 'insurance',
        }
        
        normalized = []
        for category in categories:
            category_lower = category.lower().strip()
            if category_lower in category_mapping:
                normalized.append(category_mapping[category_lower])
            else:
                # Keep original if no mapping found
                normalized.append(category_lower)
        
        # Remove duplicates
        return list(set(normalized))