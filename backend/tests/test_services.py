"""
Tests for backend services.
"""
import pytest
import pytest_asyncio
from unittest.mock import Mock, patch, AsyncMock
import json

from services.gemini_service import GeminiService
from services.data_collector import DataCollector
from services.market_analyzer import MarketAnalyzer
from core.exceptions import MarketResearchException, APIConnectionError


class TestGeminiService:
    """Tests for GeminiService."""
    
    @pytest.fixture
    def gemini_service(self):
        """Create GeminiService instance for testing."""
        with patch('google.generativeai.configure'):
            with patch('google.generativeai.GenerativeModel'):
                service = GeminiService()
                service.model = Mock()
                service.model.generate_content = AsyncMock()
                return service
    
    @pytest.mark.asyncio
    async def test_analyze_market_data_success(self, gemini_service):
        """Test successful market data analysis."""
        # Mock response
        mock_response = Mock()
        mock_response.text = json.dumps({
            "summary": "Test summary",
            "key_findings": ["Finding 1", "Finding 2"],
            "confidence_score": 0.8
        })
        gemini_service.model.generate_content.return_value = mock_response
        
        # Test data
        data_summary = {
            "location": "Test Location",
            "business_type": "restaurant",
            "total_data_points": 100
        }
        
        result = await gemini_service.analyze_market_data(
            location="Test Location",
            business_type="restaurant",
            data_summary=data_summary,
            analysis_type="comprehensive"
        )
        
        assert result["summary"] == "Test summary"
        assert len(result["key_findings"]) == 2
        assert result["confidence_score"] == 0.8
        assert "metadata" in result
    
    @pytest.mark.asyncio
    async def test_analyze_market_data_failure(self, gemini_service):
        """Test market data analysis failure."""
        gemini_service.model.generate_content.side_effect = Exception("API Error")
        
        data_summary = {
            "location": "Test Location",
            "business_type": "restaurant",
            "total_data_points": 100
        }
        
        with pytest.raises(MarketResearchException):
            await gemini_service.analyze_market_data(
                location="Test Location",
                business_type="restaurant",
                data_summary=data_summary
            )
    
    @pytest.mark.asyncio
    async def test_generate_report(self, gemini_service):
        """Test report generation."""
        mock_response = Mock()
        mock_response.text = "Test report content"
        gemini_service.model.generate_content.return_value = mock_response
        
        analysis_results = {
            "summary": "Test analysis",
            "key_findings": ["Test finding"]
        }
        
        result = await gemini_service.generate_report(
            analysis_results=analysis_results,
            report_format="executive"
        )
        
        assert "content" in result
        assert result["format"] == "executive"


class TestDataCollector:
    """Tests for DataCollector."""
    
    @pytest.fixture
    def data_collector(self):
        """Create DataCollector instance for testing."""
        collector = DataCollector()
        collector.gmaps_client = None  # Disable Google Maps for tests
        return collector
    
    @pytest.mark.asyncio
    async def test_collect_market_data_empty(self, data_collector):
        """Test market data collection with no sources."""
        result = await data_collector.collect_market_data(
            location="Test Location",
            business_type="restaurant",
            data_sources=[],
            max_results=10,
            timeframe_days=30
        )
        
        assert result.location == "Test Location"
        assert result.business_type == "restaurant"
        assert len(result.businesses) == 0
        assert len(result.reviews) == 0
    
    @pytest.mark.asyncio
    async def test_parse_location(self, data_collector):
        """Test location parsing."""
        city, region = data_collector._parse_location("New York, NY")
        assert city == "New York"
        assert region == "NY"
        
        city, region = data_collector._parse_location("London")
        assert city == "London"
        assert region == ""


class TestMarketAnalyzer:
    """Tests for MarketAnalyzer."""
    
    @pytest.fixture
    def market_analyzer(self):
        """Create MarketAnalyzer instance for testing."""
        analyzer = MarketAnalyzer()
        
        # Mock dependencies
        analyzer.data_cleaner = Mock()
        analyzer.data_cleaner.clean_review_data = Mock()
        analyzer.data_cleaner.clean_article_data = Mock()
        
        return analyzer
    
    @pytest.fixture
    def sample_market_data(self):
        """Create sample market data for testing."""
        from models.market_models import MarketDataCollection, BusinessData, ReviewData
        from datetime import datetime
        
        return MarketDataCollection(
            location="Test Location",
            business_type="restaurant",
            collection_id="test_123",
            collected_at=datetime.utcnow(),
            businesses=[
                BusinessData(
                    name="Test Business",
                    address="123 Test St",
                    city="Test City",
                    state="TS",
                    country="Testland",
                    business_type="restaurant",
                    rating=4.5,
                    review_count=100,
                    source="test"
                )
            ],
            reviews=[
                ReviewData(
                    business_id="test_1",
                    business_name="Test Business",
                    source="test",
                    review_id="rev_1",
                    author="Test User",
                    rating=5.0,
                    text="Great service!",
                    date=datetime.utcnow()
                )
            ]
        )
    
    @pytest.mark.asyncio
    async def test_prepare_data_summary(self, market_analyzer, sample_market_data):
        """Test data summary preparation."""
        processed_data = {
            "reviews": [],
            "articles": [],
            "businesses": sample_market_data.businesses,
            "sentiment_scores": [0.8, 0.9, -0.2],
            "categories": ["restaurant", "food"],
            "keywords": ["delicious", "service"]
        }
        
        summary = market_analyzer._prepare_data_summary(
            sample_market_data,
            processed_data
        )
        
        assert summary["location"] == "Test Location"
        assert summary["business_type"] == "restaurant"
        assert "data_collection" in summary
        assert "sentiment_analysis" in summary
        assert "business_insights" in summary
    
    def test_calculate_analysis_confidence(self, market_analyzer):
        """Test confidence score calculation."""
        data_summary = {
            "data_collection": {
                "total_businesses": 50,
                "total_reviews": 200,
                "total_articles": 30
            }
        }
        
        analysis_result = {
            "summary": "Test summary",
            "key_findings": ["Finding 1", "Finding 2"],
            "market_opportunities": ["Opp 1"],
            "potential_risks": ["Risk 1"],
            "data_sources_used": ["source1", "source2", "source3"]
        }
        
        confidence = market_analyzer._calculate_analysis_confidence(
            data_summary,
            analysis_result
        )
        
        assert 0.0 <= confidence <= 1.0
    
    def test_validate_data_sufficiency_sufficient(self, market_analyzer):
        """Test data sufficiency validation with sufficient data."""
        data_summary = {
            "data_collection": {
                "total_businesses": 10,
                "total_reviews": 20,
                "total_articles": 5
            }
        }
        
        # Should not raise exception
        market_analyzer._validate_data_sufficiency(data_summary)
    
    def test_validate_data_sufficiency_insufficient(self, market_analyzer):
        """Test data sufficiency validation with insufficient data."""
        data_summary = {
            "data_collection": {
                "total_businesses": 2,
                "total_reviews": 3,
                "total_articles": 0
            }
        }
        
        with pytest.raises(MarketResearchException):
            market_analyzer._validate_data_sufficiency(data_summary)


@pytest.mark.asyncio
async def test_sentiment_analyzer():
    """Test SentimentAnalyzer."""
    from services.sentiment_analyzer import SentimentAnalyzer
    from models.market_models import ReviewData
    from datetime import datetime
    
    analyzer = SentimentAnalyzer()
    analyzer.data_cleaner = Mock()
    analyzer.data_cleaner.clean_text = Mock(return_value="Cleaned text")
    
    # Mock Gemini service
    with patch.object(analyzer, 'data_cleaner'):
        reviews = [
            ReviewData(
                business_id="test_1",
                business_name="Test Business",
                source="test",
                review_id="rev_1",
                author="Test User",
                rating=4.5,
                text="Great service and food!",
                date=datetime.utcnow()
            )
        ]
        
        # Test with empty reviews
        result = await analyzer.analyze_reviews_sentiment([])
        assert len(result) == 0


@pytest.mark.asyncio
async def test_competitor_analyzer():
    """Test CompetitorAnalyzer."""
    from services.competitor_analyzer import CompetitorAnalyzer
    from models.market_models import BusinessData
    from datetime import datetime
    
    analyzer = CompetitorAnalyzer()
    
    businesses = [
        BusinessData(
            name="Competitor A",
            address="123 St",
            city="Test City",
            state="TS",
            country="Testland",
            business_type="restaurant",
            rating=4.5,
            review_count=100,
            price_level=2,
            categories=["restaurant", "food"],
            features=["delivery", "parking"],
            source="test"
        )
    ]
    
    result = await analyzer.analyze_competitors(
        businesses=businesses,
        reviews=[],
        target_business_type="restaurant"
    )
    
    if result:  # May be empty if no relevant businesses
        analysis = result[0]
        assert "competitor_name" in analysis
        assert "strength_score" in analysis
        assert "weakness_score" in analysis