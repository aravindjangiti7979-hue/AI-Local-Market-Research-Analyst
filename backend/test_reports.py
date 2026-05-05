"""
Test script for report generation in multiple formats.
Run with: python test_reports.py
"""
import asyncio
import sys
import os
import json
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database.connection import AsyncSessionLocal
from models.database_models import AnalysisResult, AnalysisRequest, Report
from sqlalchemy import select
from api.routes.reports import generate_report_async
import uuid


async def test_report_generation():
    """Test generating reports in different formats."""
    print("=" * 70)
    print("🔍 TESTING REPORT GENERATION IN MULTIPLE FORMATS")
    print("=" * 70)
    
    async with AsyncSessionLocal() as db:
        # Get a completed analysis result
        result = await db.execute(
            select(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(1)
        )
        analysis_result = result.scalar_one_or_none()
        
        if not analysis_result:
            print("❌ No analysis results found")
            return
        
        # Get the associated analysis request
        request_result = await db.execute(
            select(AnalysisRequest).where(AnalysisRequest.id == analysis_result.analysis_request_id)
        )
        analysis_request = request_result.scalar_one_or_none()
        
        if not analysis_request:
            print("❌ No analysis request found")
            return
        
        print(f"\n📊 Found analysis result: {analysis_result.id}")
        print(f"   Location: {analysis_request.location}")
        print(f"   Business Type: {analysis_request.business_type}")
        print(f"   Confidence: {analysis_result.confidence_score}")
        
        # Test formats
        formats_to_test = ["json", "csv", "html", "pdf"]
        
        for fmt in formats_to_test:
            print(f"\n{'-' * 50}")
            print(f"📄 Testing {fmt.upper()} format...")
            
            # Generate report ID
            report_id = f"test_{fmt}_{uuid.uuid4().hex[:8]}"
            title = f"Test Report: {analysis_request.location} - {fmt.upper()}"
            
            try:
                # Generate report
                await generate_report_async(
                    db=db,
                    report_id=report_id,
                    user_id=analysis_request.user_id,
                    request_id=analysis_request.id,
                    title=title,
                    analysis_result=analysis_result,
                    analysis_request=analysis_request,
                    requested_format=fmt
                )
                
                # Verify report was created
                report_result = await db.execute(
                    select(Report).where(Report.id == report_id)
                )
                report = report_result.scalar_one_or_none()
                
                if report:
                    print(f"✅ Successfully created {fmt.upper()} report:")
                    print(f"   ID: {report.id}")
                    print(f"   Title: {report.title}")
                    print(f"   Format: {report.format}")
                    print(f"   Size: {len(json.dumps(report.content)) if report.content else 0} bytes")
                else:
                    print(f"❌ Failed to create {fmt.upper()} report")
                    
            except Exception as e:
                print(f"❌ Error generating {fmt.upper()} report: {str(e)}")
        
        print("\n" + "=" * 70)
        print("✅ Test complete - Check database for test reports")
        print("=" * 70)


async def check_report_stats():
    """Check report statistics in database."""
    print("\n" + "=" * 70)
    print("📊 REPORT STATISTICS")
    print("=" * 70)
    
    async with AsyncSessionLocal() as db:
        # Get all reports
        result = await db.execute(select(Report))
        reports = result.scalars().all()
        
        if not reports:
            print("❌ No reports found")
            return
        
        # Count by format
        format_counts = {}
        for report in reports:
            fmt = report.format.value if hasattr(report.format, 'value') else str(report.format)
            format_counts[fmt] = format_counts.get(fmt, 0) + 1
        
        print(f"\n📈 Total Reports: {len(reports)}")
        print("\n📋 Reports by Format:")
        for fmt, count in format_counts.items():
            print(f"   • {fmt.upper()}: {count}")
        
        # Show recent reports
        print("\n🆕 Recent Reports (last 5):")
        recent = sorted(reports, key=lambda r: r.generated_at or datetime.min, reverse=True)[:5]
        for i, report in enumerate(recent, 1):
            fmt = report.format.value if hasattr(report.format, 'value') else str(report.format)
            print(f"   {i}. {report.title} [{fmt.upper()}] - {report.generated_at}")


async def delete_test_reports():
    """Delete test reports."""
    print("\n" + "=" * 70)
    print("🗑️ DELETING TEST REPORTS")
    print("=" * 70)
    
    async with AsyncSessionLocal() as db:
        from sqlalchemy import delete
        
        # Delete reports with test_ prefix
        result = await db.execute(
            delete(Report).where(Report.id.like("test_%"))
        )
        await db.commit()
        
        print(f"✅ Deleted {result.rowcount} test reports")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test report generation")
    parser.add_argument("--generate", action="store_true", help="Generate test reports")
    parser.add_argument("--stats", action="store_true", help="Show report statistics")
    parser.add_argument("--clean", action="store_true", help="Delete test reports")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    
    args = parser.parse_args()
    
    if args.all or args.generate:
        asyncio.run(test_report_generation())
    
    if args.all or args.stats:
        asyncio.run(check_report_stats())
    
    if args.all or args.clean:
        asyncio.run(delete_test_reports())
    
    if not (args.generate or args.stats or args.clean or args.all):
        parser.print_help()