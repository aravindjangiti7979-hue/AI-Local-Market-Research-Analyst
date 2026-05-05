"""
Report generation service.
"""
from typing import Dict, Any, Optional
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


async def generate_report(
    analysis_data: Dict[str, Any],
    report_format: str = "json",
    title: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a report from analysis data.
    
    Args:
        analysis_data: Analysis result data
        report_format: Format of report (json, html, pdf)
        title: Report title
    
    Returns:
        Generated report content
    """
    try:
        # Default title
        if not title:
            location = analysis_data.get("location", "Unknown Location")
            business_type = analysis_data.get("business_type", "Unknown Business")
            title = f"Market Analysis Report: {location} - {business_type}"
        
        # Prepare report content based on format
        if report_format == "json":
            report_content = generate_json_report(analysis_data, title)
        elif report_format == "html":
            report_content = generate_html_report(analysis_data, title)
        elif report_format == "pdf":
            report_content = generate_pdf_report(analysis_data, title)
        else:
            report_content = generate_json_report(analysis_data, title)
        
        logger.info(f"Generated {report_format} report: {title}")
        return report_content
        
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise


def generate_json_report(analysis_data: Dict[str, Any], title: str) -> Dict[str, Any]:
    """
    Generate JSON format report.
    """
    return {
        "title": title,
        "format": "json",
        "generated_at": datetime.utcnow().isoformat(),
        "metadata": {
            "version": "1.0",
            "generator": "AI Local Market Research Analyst"
        },
        "executive_summary": create_executive_summary(analysis_data),
        "detailed_analysis": create_detailed_analysis(analysis_data),
        "recommendations": create_recommendations(analysis_data),
        "appendix": create_appendix(analysis_data)
    }


def generate_html_report(analysis_data: Dict[str, Any], title: str) -> Dict[str, Any]:
    """
    Generate HTML format report.
    """
    json_report = generate_json_report(analysis_data, title)
    
    # Convert JSON to HTML (simplified)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{title}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            h1 {{ color: #333; }}
            .section {{ margin-bottom: 30px; }}
            .highlight {{ background-color: #f5f5f5; padding: 10px; border-radius: 5px; }}
        </style>
    </head>
    <body>
        <h1>{title}</h1>
        <p>Generated: {json_report['generated_at']}</p>
        
        <div class="section">
            <h2>Executive Summary</h2>
            <p>{json_report['executive_summary']['overview']}</p>
        </div>
        
        <div class="section">
            <h2>Key Findings</h2>
            <ul>
                {"".join(f"<li>{finding}</li>" for finding in json_report['executive_summary']['key_findings'])}
            </ul>
        </div>
        
        <div class="section">
            <h2>Recommendations</h2>
            <ol>
                {"".join(f"<li>{rec}</li>" for rec in json_report['recommendations'])}
            </ol>
        </div>
    </body>
    </html>
    """
    
    return {
        "title": title,
        "format": "html",
        "content": html_content,
        "generated_at": json_report["generated_at"]
    }


def generate_pdf_report(analysis_data: Dict[str, Any], title: str) -> Dict[str, Any]:
    """
    Generate PDF format report (placeholder).
    In production, use a library like ReportLab or WeasyPrint.
    """
    # For now, return JSON with a note
    json_report = generate_json_report(analysis_data, title)
    
    return {
        "title": title,
        "format": "pdf",
        "content": json_report,
        "note": "PDF generation requires additional libraries. Currently returning JSON format.",
        "generated_at": json_report["generated_at"]
    }


def create_executive_summary(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create executive summary from analysis data.
    """
    location = analysis_data.get("location", "the specified location")
    business_type = analysis_data.get("business_type", "the business sector")
    
    return {
        "overview": f"This report provides a comprehensive analysis of the {business_type} market in {location}. "
                   f"The analysis identifies key market trends, competitor landscape, and potential opportunities.",
        "key_findings": [
            f"Market size and growth potential for {business_type} in {location}",
            "Key competitor strengths and weaknesses",
            "Customer sentiment analysis results",
            "Emerging market trends and opportunities"
        ],
        "confidence_score": analysis_data.get("confidence_score", 0.0),
        "data_sources": analysis_data.get("data_sources_used", [])
    }


def create_detailed_analysis(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create detailed analysis sections.
    """
    return {
        "market_overview": {
            "description": analysis_data.get("summary", "No summary available"),
            "size_estimate": "Based on available data and market indicators",
            "growth_rate": "Estimated growth rate based on trend analysis"
        },
        "competitor_analysis": analysis_data.get("competitor_analysis", {}),
        "sentiment_analysis": analysis_data.get("sentiment_analysis", {}),
        "trend_analysis": analysis_data.get("trend_analysis", {}),
        "opportunities": analysis_data.get("market_opportunities", []),
        "risks": analysis_data.get("potential_risks", [])
    }


def create_recommendations(analysis_data: Dict[str, Any]) -> list:
    """
    Create actionable recommendations.
    """
    recommendations = []
    
    # Add recommendations from analysis data if available
    if "recommendations" in analysis_data:
        recommendations.extend(analysis_data["recommendations"])
    
    # Add default recommendations
    if not recommendations:
        recommendations = [
            "Focus on customer segments with highest growth potential",
            "Differentiate from competitors through unique value propositions",
            "Monitor emerging trends for early adoption opportunities",
            "Establish partnerships with complementary businesses",
            "Implement customer feedback loop for continuous improvement"
        ]
    
    return recommendations


def create_appendix(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create report appendix.
    """
    return {
        "methodology": {
            "data_collection": "Collected from various public sources including reviews, news, and social media",
            "analysis_method": "AI-enhanced analysis using Google Gemini model",
            "limitations": "Based on publicly available data; may not include proprietary business information"
        },
        "data_sources": analysis_data.get("data_sources_used", []),
        "generated_at": datetime.utcnow().isoformat(),
        "version": "1.0"
    }