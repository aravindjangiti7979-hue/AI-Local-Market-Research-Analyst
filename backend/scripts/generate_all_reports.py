# scripts/generate_all_reports.py
import asyncio
import sys
import os
import uuid
from datetime import datetime
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/..'))

from database.connection import AsyncSessionLocal
from models.database_models import AnalysisResult, AnalysisRequest, Report
from sqlalchemy import select
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def generate_all_reports():
    print("=" * 70)
    print("🔍 GENERATING REPORTS FOR ALL COMPLETED ANALYSES")
    print("=" * 70)
    
    async with AsyncSessionLocal() as db:
        # Get all analysis results
        result = await db.execute(
            select(AnalysisResult).order_by(AnalysisResult.created_at.desc())
        )
        results = result.scalars().all()
        
        print(f"\n📊 Found {len(results)} analysis results")
        
        if not results:
            print("❌ No analysis results found in database")
            return
        
        generated_count = 0
        skipped_count = 0
        
        for analysis_result in results:
            # Get analysis request
            request_result = await db.execute(
                select(AnalysisRequest).where(AnalysisRequest.id == analysis_result.analysis_request_id)
            )
            analysis_request = request_result.scalar_one_or_none()
            
            if not analysis_request:
                print(f"❌ No analysis request found for {analysis_result.id}")
                continue
            
            # Check if report already exists
            existing = await db.execute(
                select(Report).where(Report.analysis_request_id == analysis_result.analysis_request_id)
            )
            if existing.scalar_one_or_none():
                print(f"⏭️  Report already exists for {analysis_request.location}")
                skipped_count += 1
                continue
            
            # Generate report ID
            report_id = f"rep_{uuid.uuid4().hex[:16]}"
            title = f"Market Analysis Report: {analysis_request.location} - {analysis_request.business_type}"
            
            print(f"\n📝 Generating report for {analysis_request.location}...")
            
            # Extract competitor data
            competitor_data = analysis_result.competitor_analysis or {}
            competitors = competitor_data.get('competitor_analysis', [])
            
            # Build report content
            report_content = {
                "title": title,
                "request_id": analysis_request.id,
                "location": analysis_request.location,
                "business_type": analysis_request.business_type.value if hasattr(analysis_request.business_type, 'value') else str(analysis_request.business_type),
                "summary": analysis_result.summary or "No summary available",
                "key_findings": analysis_result.key_findings or [],
                "market_opportunities": analysis_result.market_opportunities or [],
                "potential_risks": analysis_result.potential_risks or [],
                "competitor_analysis": competitor_data,
                "competitors_count": len(competitors),
                "top_competitors": competitors[:10],
                "sentiment_analysis": analysis_result.sentiment_analysis or {},
                "trend_analysis": analysis_result.trend_analysis or {},
                "data_sources_used": analysis_result.data_sources_used or ["geoapify", "foursquare", "news"],
                "confidence_score": analysis_result.confidence_score or 0.85,
                "recommendations": [
                    "Focus on digital presence to capture emerging market segments",
                    "Enhance customer experience based on sentiment analysis",
                    "Monitor competitor pricing strategies closely",
                    "Consider strategic partnerships to enhance market position"
                ],
                "generated_at": analysis_result.created_at.isoformat() if analysis_result.created_at else datetime.utcnow().isoformat(),
                "metadata": analysis_result.analysis_metadata or {}
            }
            
            # Create report
            from models.database_models import ReportFormatEnum
            report = Report(
                id=report_id,
                user_id=analysis_request.user_id,
                analysis_request_id=analysis_request.id,
                title=title,
                format=ReportFormatEnum.JSON,
                content=report_content,
                download_url=f"/api/v1/reports/{report_id}/download",
                preview_url=f"/api/v1/reports/{report_id}",
                generated_at=analysis_result.created_at or datetime.utcnow()
            )
            
            db.add(report)
            generated_count += 1
            print(f"  ✅ Generated: {title}")
            print(f"     • Competitors: {len(competitors)}")
            print(f"     • Confidence: {analysis_result.confidence_score or 0.85}")
            print(f"     • Report ID: {report_id}")
        
        await db.commit()
        
        print("\n" + "=" * 70)
        print(f"📊 SUMMARY")
        print("=" * 70)
        print(f"✅ Generated: {generated_count} new reports")
        print(f"⏭️  Skipped: {skipped_count} (already exist)")
        print(f"📋 Total in database: {generated_count + skipped_count}")

if __name__ == "__main__":
    asyncio.run(generate_all_reports())