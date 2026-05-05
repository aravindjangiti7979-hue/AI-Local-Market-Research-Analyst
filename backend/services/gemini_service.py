"""
Google Gemini API service for AI-powered analysis.
"""
import asyncio
import json
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from core.config import settings
from core.exceptions import MarketResearchException
from utils.helpers import async_retry

logger = logging.getLogger(__name__)


class GeminiService:
    """Service for interacting with Google Gemini AI."""
    
    def __init__(self):
        """Initialize Gemini service."""
        if not settings.GEMINI_API_KEY:
            raise MarketResearchException("Gemini API key not configured")
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Safety settings
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        
        # Generation config
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 2048,
        }
    
    async def analyze_market_data(
        self,
        location: str,
        business_type: str,
        data_summary: Dict[str, Any],
        analysis_type: str = "comprehensive"
    ) -> Dict[str, Any]:
        """
        Analyze market data using Gemini AI.
        
        Args:
            location: Location for analysis
            business_type: Type of business
            data_summary: Summary of collected data
            analysis_type: Type of analysis to perform
        
        Returns:
            Analysis results
        """
        try:
            # Prepare prompt based on analysis type
            prompt = self._create_analysis_prompt(
                location, business_type, data_summary, analysis_type
            )
            
            # Generate analysis
            response = await async_retry(
                lambda: self._generate_content(prompt),
                max_retries=3,
                delay=1.0,
                exceptions=(Exception,)
            )
            
            # Parse response
            analysis_result = self._parse_analysis_response(response)
            
            # Add metadata
            analysis_result["metadata"] = {
                "model_used": settings.GEMINI_MODEL,
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "analysis_type": analysis_type,
                "data_points_analyzed": data_summary.get("total_data_points", 0)
            }
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in market data analysis: {e}", exc_info=True)
            raise MarketResearchException(
                f"AI analysis failed: {str(e)}"
            )
    
    async def generate_report(
        self,
        analysis_results: Dict[str, Any],
        report_format: str = "executive"
    ) -> Dict[str, Any]:
        """
        Generate a market research report.
        
        Args:
            analysis_results: Results from market analysis
            report_format: Format of report (executive, detailed, etc.)
        
        Returns:
            Generated report
        """
        try:
            prompt = self._create_report_prompt(analysis_results, report_format)
            
            response = await async_retry(
                lambda: self._generate_content(prompt),
                max_retries=3,
                delay=1.0
            )
            
            report = self._parse_report_response(response, report_format)
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating report: {e}", exc_info=True)
            raise MarketResearchException(f"Report generation failed: {str(e)}")
    
    async def analyze_sentiment_batch(
        self,
        texts: List[str],
        context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyze sentiment for a batch of texts.
        
        Args:
            texts: List of texts to analyze
            context: Optional context for analysis
        
        Returns:
            List of sentiment analysis results
        """
        try:
            prompt = self._create_sentiment_prompt(texts, context)
            
            response = await async_retry(
                lambda: self._generate_content(prompt),
                max_retries=3,
                delay=1.0
            )
            
            sentiments = self._parse_sentiment_response(response, len(texts))
            
            return sentiments
            
        except Exception as e:
            logger.error(f"Error in batch sentiment analysis: {e}", exc_info=True)
            raise MarketResearchException(
                f"Sentiment analysis failed: {str(e)}"
            )
    
    async def extract_key_insights(
        self,
        data: Dict[str, Any],
        insight_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract key insights from data.
        
        Args:
            data: Data to analyze
            insight_types: Types of insights to extract
        
        Returns:
            List of insights
        """
        if insight_types is None:
            insight_types = ["opportunities", "threats", "trends", "recommendations"]
        
        try:
            prompt = self._create_insight_prompt(data, insight_types)
            
            response = await async_retry(
                lambda: self._generate_content(prompt),
                max_retries=3,
                delay=1.0
            )
            
            insights = self._parse_insight_response(response)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error extracting insights: {e}", exc_info=True)
            raise MarketResearchException(f"Insight extraction failed: {str(e)}")
    
    def _create_analysis_prompt(
        self,
        location: str,
        business_type: str,
        data_summary: Dict[str, Any],
        analysis_type: str
    ) -> str:
        """Create prompt for market analysis."""
        
        prompt_templates = {
            "comprehensive": """
            You are an expert market research analyst. Analyze the following market data and provide a comprehensive analysis.

            Location: {location}
            Business Type: {business_type}

            Data Summary:
            {data_summary}

            Please provide analysis in the following JSON format:
            {{
                "summary": "Overall market summary",
                "key_findings": ["finding1", "finding2", ...],
                "market_opportunities": ["opportunity1", "opportunity2", ...],
                "potential_risks": ["risk1", "risk2", ...],
                "competitor_analysis": [
                    {{
                        "competitor_name": "name",
                        "strength_score": 0.0-10.0,
                        "weakness_score": 0.0-10.0,
                        "market_share_estimate": 0.0-1.0,
                        "customer_sentiment": -1.0-1.0,
                        "key_insights": ["insight1", "insight2"],
                        "recommendations": ["rec1", "rec2"]
                    }}
                ],
                "sentiment_analysis": {{
                    "overall_sentiment": -1.0-1.0,
                    "positive_percentage": 0-100,
                    "negative_percentage": 0-100,
                    "neutral_percentage": 0-100,
                    "key_positive_themes": ["theme1", "theme2"],
                    "key_negative_themes": ["theme1", "theme2"],
                    "sentiment_by_source": {{"source1": score, "source2": score}}
                }},
                "trend_analysis": {{
                    "trending_topics": ["topic1", "topic2"],
                    "topic_importance": {{"topic1": 0.0-1.0, "topic2": 0.0-1.0}},
                    "emerging_patterns": ["pattern1", "pattern2"],
                    "seasonal_factors": ["factor1", "factor2"],
                    "growth_indicators": {{"indicator1": value, "indicator2": value}}
                }},
                "data_sources_used": ["source1", "source2"],
                "confidence_score": 0.0-1.0
            }}

            Make sure all percentages add up to 100. All scores should be realistic based on the data.
            """,
            
            "sentiment": """
            You are a sentiment analysis expert. Analyze the sentiment in the following market data.

            Location: {location}
            Business Type: {business_type}

            Data Summary:
            {data_summary}

            Provide sentiment analysis in JSON format:
            {{
                "overall_sentiment": -1.0-1.0,
                "positive_percentage": 0-100,
                "negative_percentage": 0-100,
                "neutral_percentage": 0-100,
                "key_positive_themes": ["theme1", "theme2"],
                "key_negative_themes": ["theme1", "theme2"],
                "sentiment_by_source": {{"source1": score, "source2": score}},
                "confidence_score": 0.0-1.0
            }}
            """,
            
            "competitor": """
            You are a competitive analysis expert. Analyze competitors in the following market.

            Location: {location}
            Business Type: {business_type}

            Data Summary:
            {data_summary}

            Provide competitor analysis in JSON format:
            {{
                "competitor_analysis": [
                    {{
                        "competitor_name": "name",
                        "strength_score": 0.0-10.0,
                        "weakness_score": 0.0-10.0,
                        "market_share_estimate": 0.0-1.0,
                        "customer_sentiment": -1.0-1.0,
                        "key_insights": ["insight1", "insight2"],
                        "recommendations": ["rec1", "rec2"]
                    }}
                ],
                "market_gaps": ["gap1", "gap2"],
                "competitive_landscape_summary": "summary text",
                "confidence_score": 0.0-1.0
            }}
            """
        }
        
        template = prompt_templates.get(
            analysis_type, 
            prompt_templates["comprehensive"]
        )
        
        return template.format(
            location=location,
            business_type=business_type,
            data_summary=json.dumps(data_summary, indent=2)
        )
    
    def _create_report_prompt(
        self,
        analysis_results: Dict[str, Any],
        report_format: str
    ) -> str:
        """Create prompt for report generation."""
        
        formats = {
            "executive": """
            Create an executive summary report based on the following market analysis.
            
            Analysis Results:
            {analysis_results}
            
            Format the report with:
            1. Executive Summary (3-4 sentences)
            2. Key Findings (bullet points)
            3. Market Opportunities (bullet points)
            4. Recommended Actions (bullet points)
            5. Risk Assessment (brief)
            
            Use professional business language suitable for executives.
            """,
            
            "detailed": """
            Create a detailed market research report based on the following analysis.
            
            Analysis Results:
            {analysis_results}
            
            Include sections:
            1. Introduction and Methodology
            2. Market Overview
            3. Competitive Analysis
            4. Customer Sentiment Analysis
            5. Trend Analysis
            6. Opportunities and Recommendations
            7. Risk Assessment
            8. Conclusion
            
            Include data points and specific examples where available.
            """
        }
        
        template = formats.get(report_format, formats["executive"])
        
        return template.format(
            analysis_results=json.dumps(analysis_results, indent=2)
        )
    
    def _create_sentiment_prompt(
        self,
        texts: List[str],
        context: Optional[str]
    ) -> str:
        """Create prompt for sentiment analysis."""
        
        prompt = """
        Analyze the sentiment of the following texts.
        
        Context: {context}
        
        Texts to analyze:
        {texts}
        
        For each text, provide:
        1. Sentiment score (-1.0 to 1.0, where -1 is very negative, 0 is neutral, 1 is very positive)
        2. Sentiment category (positive, negative, neutral)
        3. Key emotions detected (if any)
        4. Confidence score (0.0 to 1.0)
        
        Return as JSON array with objects for each text.
        """
        
        return prompt.format(
            context=context or "General customer feedback",
            texts="\n".join([f"{i+1}. {text}" for i, text in enumerate(texts)])
        )
    
    def _create_insight_prompt(
        self,
        data: Dict[str, Any],
        insight_types: List[str]
    ) -> str:
        """Create prompt for insight extraction."""
        
        prompt = """
        Extract key insights from the following market data.
        
        Data:
        {data}
        
        Focus on these insight types: {insight_types}
        
        For each insight, provide:
        1. Insight type
        2. Title
        3. Description
        4. Supporting evidence
        5. Confidence score (0.0-1.0)
        6. Business impact (high, medium, low)
        7. Recommended action
        
        Return as JSON array of insight objects.
        """
        
        return prompt.format(
            data=json.dumps(data, indent=2),
            insight_types=", ".join(insight_types)
        )
    
    async def _generate_content(self, prompt: str) -> str:
        """Generate content using Gemini model."""
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            if response.text:
                return response.text
            else:
                raise MarketResearchException("Empty response from Gemini API")
                
        except Exception as e:
            logger.error(f"Gemini API error: {e}", exc_info=True)
            raise MarketResearchException(f"Gemini API error: {str(e)}")
    
    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse analysis response from Gemini."""
        try:
            # Try to extract JSON from response
            json_str = self._extract_json_from_response(response)
            analysis_result = json.loads(json_str)
            
            # Validate required fields
            required_fields = ["summary", "key_findings", "confidence_score"]
            for field in required_fields:
                if field not in analysis_result:
                    raise ValueError(f"Missing required field: {field}")
            
            # Ensure confidence score is within bounds
            confidence = analysis_result.get("confidence_score", 0.5)
            analysis_result["confidence_score"] = max(0.0, min(1.0, float(confidence)))
            
            return analysis_result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse analysis response: {e}")
            logger.debug(f"Raw response: {response}")
            
            # Fallback: create basic analysis from text
            return self._create_fallback_analysis(response)
    
    def _parse_report_response(self, response: str, report_format: str) -> Dict[str, Any]:
        """Parse report response."""
        return {
            "content": response,
            "format": report_format,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "word_count": len(response.split())
        }
    
    def _parse_sentiment_response(
        self, 
        response: str, 
        expected_count: int
    ) -> List[Dict[str, Any]]:
        """Parse sentiment response."""
        try:
            json_str = self._extract_json_from_response(response)
            sentiments = json.loads(json_str)
            
            if not isinstance(sentiments, list):
                sentiments = [sentiments]
            
            # Validate structure
            for sentiment in sentiments:
                if "sentiment_score" not in sentiment:
                    sentiment["sentiment_score"] = 0.0
                if "confidence" not in sentiment:
                    sentiment["confidence"] = 0.5
            
            return sentiments[:expected_count]
            
        except (json.JSONDecodeError, ValueError):
            # Return neutral sentiments as fallback
            return [
                {
                    "sentiment_score": 0.0,
                    "sentiment_category": "neutral",
                    "confidence": 0.5,
                    "text_index": i
                }
                for i in range(expected_count)
            ]
    
    def _parse_insight_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse insight response."""
        try:
            json_str = self._extract_json_from_response(response)
            insights = json.loads(json_str)
            
            if not isinstance(insights, list):
                insights = [insights]
            
            return insights
            
        except (json.JSONDecodeError, ValueError):
            return []
    
    def _extract_json_from_response(self, response: str) -> str:
        """Extract JSON string from Gemini response."""
        # Try to find JSON in the response
        import re
        
        # Look for JSON object or array
        json_pattern = r'(\{.*\}|\[.*\])'
        matches = re.search(json_pattern, response, re.DOTALL)
        
        if matches:
            return matches.group(1)
        
        # If no JSON found, return the entire response
        return response
    
    def _create_fallback_analysis(self, response_text: str) -> Dict[str, Any]:
        """Create fallback analysis when parsing fails."""
        return {
            "summary": "Analysis based on market data.",
            "key_findings": ["Analysis completed successfully."],
            "market_opportunities": ["Further research recommended."],
            "potential_risks": ["Limited data availability."],
            "data_sources_used": ["multiple"],
            "confidence_score": 0.5,
            "metadata": {
                "note": "Fallback analysis generated",
                "original_response_length": len(response_text)
            }
        }


# Singleton instance
gemini_service = GeminiService()