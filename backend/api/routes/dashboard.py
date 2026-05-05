"""
Dashboard routes.
"""
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from database.connection import get_db
from core.security import get_current_active_user
from models.database_models import AnalysisRequest, Report
from models.schemas import UserInDB

router = APIRouter()


@router.get("/")
async def get_dashboard_data(
    time_range: str = "30d",
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get dashboard statistics and data.
    """
    try:
        # Calculate time filter
        from datetime import datetime, timedelta
        import time
        
        if time_range == "7d":
            days = 7
        elif time_range == "30d":
            days = 30
        elif time_range == "90d":
            days = 90
        else:
            days = 30
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get analysis statistics
        analysis_count = await db.execute(
            select(func.count(AnalysisRequest.id)).where(
                and_(
                    AnalysisRequest.user_id == current_user.id,
                    AnalysisRequest.created_at >= start_date
                )
            )
        )
        total_analyses = analysis_count.scalar() or 0
        
        # Get completed analyses
        completed_count = await db.execute(
            select(func.count(AnalysisRequest.id)).where(
                and_(
                    AnalysisRequest.user_id == current_user.id,
                    AnalysisRequest.status == "completed",
                    AnalysisRequest.created_at >= start_date
                )
            )
        )
        completed_analyses = completed_count.scalar() or 0
        
        # Get report statistics
        report_count = await db.execute(
            select(func.count(Report.id)).where(
                and_(
                    Report.user_id == current_user.id,
                    Report.generated_at >= start_date
                )
            )
        )
        total_reports = report_count.scalar() or 0
        
        # Calculate average confidence score
        confidence_result = await db.execute(
            select(func.avg(Report.confidence_score)).where(
                and_(
                    Report.user_id == current_user.id,
                    Report.generated_at >= start_date
                )
            )
        )
        avg_confidence = round(confidence_result.scalar() or 0.0, 2)
        
        # Get latest analyses
        latest_analyses_result = await db.execute(
            select(AnalysisRequest).where(
                AnalysisRequest.user_id == current_user.id
            ).order_by(AnalysisRequest.created_at.desc()).limit(5)
        )
        latest_analyses = latest_analyses_result.scalars().all()
        
        # Format latest analyses
        formatted_analyses = []
        for analysis in latest_analyses:
            formatted_analyses.append({
                "id": analysis.id,
                "location": analysis.location,
                "business_type": analysis.business_type,
                "status": analysis.status,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None
            })
        
        # Get recent reports
        recent_reports_result = await db.execute(
            select(Report).where(
                Report.user_id == current_user.id
            ).order_by(Report.generated_at.desc()).limit(5)
        )
        recent_reports = recent_reports_result.scalars().all()
        
        # Format recent reports
        formatted_reports = []
        for report in recent_reports:
            formatted_reports.append({
                "id": report.id,
                "title": report.title,
                "format": report.format,
                "generated_at": report.generated_at.isoformat() if report.generated_at else None,
                "confidence_score": report.confidence_score
            })
        
        # Calculate success rate
        if total_analyses > 0:
            success_rate = (completed_analyses / total_analyses) * 100
        else:
            success_rate = 0
        
        # Mock data for competitors (in production, this would come from analysis results)
        top_competitors = [
            {
                "id": 1,
                "name": "The Coffee Spot",
                "rating": 4.5,
                "reviews": 234,
                "sentiment": 0.85,
                "growth": "+12%",
                "market_share": "18%"
            },
            {
                "id": 2,
                "name": "Urban Bites",
                "rating": 4.3,
                "reviews": 187,
                "sentiment": 0.72,
                "growth": "+8%",
                "market_share": "15%"
            },
            {
                "id": 3,
                "name": "Fresh Market",
                "rating": 4.7,
                "reviews": 312,
                "sentiment": 0.91,
                "growth": "+15%",
                "market_share": "22%"
            }
        ]
        
        return {
            "total_analysis": total_analyses,
            "completed_analysis": completed_analyses,
            "success_rate": round(success_rate, 1),
            "total_reports": total_reports,
            "average_confidence": avg_confidence,
            "competitors_tracked": len(top_competitors) * 3,  # Mock data
            "revenue_opportunity": 245000,  # Mock data
            "sentiment_score": 0.78,  # Mock data
            "business_count": 89,  # Mock data
            "coverage_area": 12.5,  # Mock data
            "density_score": 7.8,  # Mock data
            "top_competitors": top_competitors,
            "latest_analyses": formatted_analyses,
            "recent_reports": formatted_reports,
            "time_range": time_range,
            "time_period": f"Last {days} days"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard data: {str(e)}"
        )


@router.get("/stats")
async def get_dashboard_stats(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get dashboard statistics summary.
    """
    try:
        # Get total analyses
        total_result = await db.execute(
            select(func.count(AnalysisRequest.id)).where(
                AnalysisRequest.user_id == current_user.id
            )
        )
        total_analyses = total_result.scalar() or 0
        
        # Get today's analyses
        from datetime import datetime, timedelta
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        today_result = await db.execute(
            select(func.count(AnalysisRequest.id)).where(
                and_(
                    AnalysisRequest.user_id == current_user.id,
                    AnalysisRequest.created_at >= today_start
                )
            )
        )
        today_analyses = today_result.scalar() or 0
        
        # Get this week's analyses
        week_start = today_start - timedelta(days=today_start.weekday())
        
        week_result = await db.execute(
            select(func.count(AnalysisRequest.id)).where(
                and_(
                    AnalysisRequest.user_id == current_user.id,
                    AnalysisRequest.created_at >= week_start
                )
            )
        )
        week_analyses = week_result.scalar() or 0
        
        # Get this month's analyses
        month_start = today_start.replace(day=1)
        
        month_result = await db.execute(
            select(func.count(AnalysisRequest.id)).where(
                and_(
                    AnalysisRequest.user_id == current_user.id,
                    AnalysisRequest.created_at >= month_start
                )
            )
        )
        month_analyses = month_result.scalar() or 0
        
        # Get locations analyzed
        locations_result = await db.execute(
            select(AnalysisRequest.location).where(
                AnalysisRequest.user_id == current_user.id
            ).distinct()
        )
        locations = [loc[0] for loc in locations_result.all()]
        
        # Get business types analyzed
        business_types_result = await db.execute(
            select(AnalysisRequest.business_type).where(
                AnalysisRequest.user_id == current_user.id
            ).distinct()
        )
        business_types = [bt[0] for bt in business_types_result.all()]
        
        return {
            "total_analyses": total_analyses,
            "today_analyses": today_analyses,
            "week_analyses": week_analyses,
            "month_analyses": month_analyses,
            "unique_locations": len(locations),
            "unique_business_types": len(business_types),
            "locations": locations[:5],  # Top 5 locations
            "business_types": business_types[:5]  # Top 5 business types
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard stats: {str(e)}"
        )