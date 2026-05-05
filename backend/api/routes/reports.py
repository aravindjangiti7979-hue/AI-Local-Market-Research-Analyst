"""
Report generation and management routes.
"""
from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
import uuid
import json
import os
import logging
import io
import csv
from datetime import datetime, timedelta

from database.connection import get_db
from database.queries import (
    get_report,
    get_user_reports,
    create_report as create_report_db,
    increment_report_download,
    get_analysis_request,
    get_analysis_result_by_request,
    save_insights,
    get_recent_insights
)
from models.schemas import ReportCreate, UserResponse
from api.dependencies import get_current_active_user_with_db
from models.database_models import Report, AnalysisRequest, AnalysisResult
from services.report_generator import generate_report

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[Dict[str, Any]])
async def get_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    format: Optional[str] = Query(None, description="Filter by format (pdf, html, json)"),
    sort_by: str = Query("date", description="Sort by: date, title, size"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    search: Optional[str] = Query(None, description="Search in title"),
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get all reports for current user with filtering and sorting.
    """
    # Build query
    query = select(Report).where(Report.user_id == current_user.id)
    
    # Apply format filter
    if format and format != 'all':
        from models.database_models import ReportFormatEnum
        format_map = {
            'pdf': ReportFormatEnum.PDF,
            'html': ReportFormatEnum.HTML,
            'json': ReportFormatEnum.JSON,
            'markdown': ReportFormatEnum.MARKDOWN
        }
        if format in format_map:
            query = query.where(Report.format == format_map[format])
    
    # Apply search filter
    if search:
        query = query.where(Report.title.ilike(f"%{search}%"))
    
    # Apply sorting
    if sort_by == 'date':
        if sort_order == 'desc':
            query = query.order_by(desc(Report.generated_at))
        else:
            query = query.order_by(Report.generated_at)
    elif sort_by == 'title':
        if sort_order == 'desc':
            query = query.order_by(desc(Report.title))
        else:
            query = query.order_by(Report.title)
    elif sort_by == 'size':
        # Size is not a direct column, so we'll handle in memory
        pass
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    # Handle size sorting in memory if needed
    if sort_by == 'size':
        reports = list(reports)
        reports.sort(
            key=lambda r: len(json.dumps(r.content)) if r.content else 0,
            reverse=(sort_order == 'desc')
        )

    # Format response
    result = []
    for report in reports:
        content_size = len(json.dumps(report.content)) if report.content else 0
        result.append({
            "id": report.id,
            "title": report.title,
            "format": report.format.value if hasattr(report.format, 'value') else str(report.format),
            "analysis_request_id": report.analysis_request_id,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "download_url": report.download_url,
            "preview_url": report.preview_url,
            "content_summary": report.content.get("summary", "No summary available") if isinstance(report.content, dict) else "Report content",
            "confidence_score": report.content.get("confidence_score", 0.85) if isinstance(report.content, dict) else 0.85,
            "size": content_size,
            "status": "completed",
            "location": report.content.get("location", "Unknown") if isinstance(report.content, dict) else "Unknown",
            "business_type": report.content.get("business_type", "Unknown") if isinstance(report.content, dict) else "Unknown",
            "key_findings_count": len(report.content.get("key_findings", [])) if isinstance(report.content, dict) else 0,
            "competitors_count": len(report.content.get("competitor_analysis", {}).get("competitor_analysis", [])) if isinstance(report.content, dict) else 0
        })

    return result


@router.get("/stats", response_model=Dict[str, Any])
async def get_report_stats(
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get report statistics for current user.
    """
    # Get all reports for user
    result = await db.execute(
        select(Report).where(Report.user_id == current_user.id)
    )
    reports = result.scalars().all()
    
    if not reports:
        return {
            "total_reports": 0,
            "pdf_count": 0,
            "html_count": 0,
            "json_count": 0,
            "total_size": 0,
            "avg_size": 0,
            "most_recent": None,
            "most_recent_title": None
        }
    
    # Calculate statistics
    total_reports = len(reports)
    
    # Count by format
    pdf_count = 0
    html_count = 0
    json_count = 0
    
    # Calculate total size
    total_size = 0
    for report in reports:
        size = len(json.dumps(report.content)) if report.content else 0
        total_size += size
        
        # Count by format
        format_val = report.format.value if hasattr(report.format, 'value') else str(report.format)
        if format_val == 'pdf':
            pdf_count += 1
        elif format_val == 'html':
            html_count += 1
        elif format_val == 'json':
            json_count += 1
    
    # Get most recent report
    most_recent = max(reports, key=lambda r: r.generated_at or datetime.min)
    
    return {
        "total_reports": total_reports,
        "pdf_count": pdf_count,
        "html_count": html_count,
        "json_count": json_count,
        "total_size": total_size,
        "avg_size": total_size / total_reports if total_reports > 0 else 0,
        "most_recent": most_recent.generated_at.isoformat() if most_recent else None,
        "most_recent_title": most_recent.title if most_recent else None
    }


@router.get("/recent", response_model=List[Dict[str, Any]])
async def get_recent_reports(
    limit: int = Query(5, ge=1, le=20),
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get recent reports for current user.
    """
    query = select(Report).where(
        Report.user_id == current_user.id
    ).order_by(desc(Report.generated_at)).limit(limit)

    result = await db.execute(query)
    reports = result.scalars().all()

    # Format response
    formatted_reports = []
    for report in reports:
        content = report.content if isinstance(report.content, dict) else {}
        formatted_reports.append({
            "id": report.id,
            "title": report.title,
            "format": report.format.value if hasattr(report.format, 'value') else str(report.format),
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "confidence_score": content.get("confidence_score", 0.85),
            "summary": content.get("summary", "No summary available"),
            "location": content.get("location", "Unknown"),
            "business_type": content.get("business_type", "Unknown"),
            "key_findings": content.get("key_findings", [])[:3]
        })

    return formatted_reports


@router.get("/user/{user_id}", response_model=List[Dict[str, Any]])
async def get_user_reports_endpoint(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get reports for a specific user (admin only).
    """
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    reports = await get_user_reports(
        db, user_id, limit=limit, offset=skip
    )

    # Format response
    result = []
    for report in reports:
        result.append({
            "id": report.id,
            "title": report.title,
            "format": report.format.value if hasattr(report.format, 'value') else str(report.format),
            "analysis_request_id": report.analysis_request_id,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "download_url": report.download_url,
            "preview_url": report.preview_url,
            "user_id": report.user_id
        })

    return result


@router.post("/generate/{request_id}")
async def generate_report_endpoint(
    request_id: str,
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Generate a report from analysis results.
    """
    # Get analysis request
    analysis_request = await get_analysis_request(db, request_id)
    if not analysis_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis request not found"
        )

    # Check ownership
    if analysis_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this analysis"
        )

    # Get analysis result
    analysis_result = await get_analysis_result_by_request(db, request_id)
    if not analysis_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis not completed yet"
        )

    # Generate report ID
    report_id = f"rep_{uuid.uuid4().hex[:16]}"

    # Default title
    title = f"Market Analysis Report: {analysis_request.location} - {analysis_request.business_type}"

    # Get format from request body or default to html
    import json
    try:
        body = await (await db.get_bind()).raw_connection().read()
        if body:
            data = json.loads(body)
            requested_format = data.get('format', 'html')
        else:
            requested_format = 'html'
    except:
        requested_format = 'html'

    # Start report generation in background
    background_tasks.add_task(
        generate_report_async,
        db,
        report_id,
        current_user.id,
        request_id,
        title,
        analysis_result,
        analysis_request,
        requested_format
    )

    # Also generate and save insights
    background_tasks.add_task(
        generate_and_save_insights,
        db,
        current_user.id,
        analysis_result,
        analysis_request
    )

    return {
        "report_id": report_id,
        "message": "Report generation started",
        "status": "processing",
        "title": title,
        "analysis_request_id": request_id,
        "estimated_time": "30 seconds",
        "format": requested_format
    }


@router.get("/{report_id}", response_model=Dict[str, Any])
async def get_report_details(
    report_id: str,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get report details.
    """
    report = await get_report(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Check ownership
    if report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this report"
        )

    content = report.content if isinstance(report.content, dict) else {}
    
    return {
        "id": report.id,
        "title": report.title,
        "format": report.format.value if hasattr(report.format, 'value') else str(report.format),
        "analysis_request_id": report.analysis_request_id,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
        "download_url": report.download_url,
        "preview_url": report.preview_url,
        "content": content,
        "summary": content.get("summary", "No summary available"),
        "confidence_score": content.get("confidence_score", 0.85),
        "key_findings": content.get("key_findings", []),
        "market_opportunities": content.get("market_opportunities", []),
        "potential_risks": content.get("potential_risks", []),
        "competitor_analysis": content.get("competitor_analysis", {}),
        "sentiment_analysis": content.get("sentiment_analysis", {}),
        "trend_analysis": content.get("trend_analysis", {}),
        "recommendations": content.get("recommendations", []),
        "data_sources_used": content.get("data_sources_used", []),
        "metadata": content.get("metadata", {})
    }


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Download a report in its original format.
    """
    report = await get_report(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Check ownership
    if report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download this report"
        )

    # Increment download count safely
    try:
        await increment_report_download(db, report_id)
    except Exception as e:
        logger.warning(f"Could not increment download count: {e}")
    
    content = report.content if isinstance(report.content, dict) else {}
    report_format = report.format.value if hasattr(report.format, 'value') else str(report.format)

    # Generate filename - sanitize for safety
    safe_title = "".join(c for c in report.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    safe_title = safe_title.replace(' ', '_')
    filename = f"{safe_title}_{report_id[:8]}.{report_format}"

    # Create response with headers ONCE
    headers = {
        "Content-Disposition": f"attachment; filename=\"{filename}\""
    }

    # Serve based on format
    if report_format == "json":
        return JSONResponse(
            content=content,
            media_type="application/json",
            headers=headers
        )
    
    elif report_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write CSV content (simplified for clarity)
        writer.writerow(['Report', report.title])
        writer.writerow(['Generated', str(report.generated_at)])
        writer.writerow(['Format', report_format])
        
        csv_content = output.getvalue()
        output.close()
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers=headers
        )
    
    elif report_format in ["html", "pdf"]:
        html_content = generate_html_report_content(report, content)
        return HTMLResponse(
            content=html_content,
            headers=headers
        )
    
    else:
        return JSONResponse(
            content=content,
            media_type="application/json",
            headers=headers
        )
    
def generate_html_report_content(report, content):
    """Generate HTML content for a report."""
    # Build competitor rows
    competitor_rows = ""
    competitors = content.get('competitor_analysis', {}).get('competitor_analysis', [])
    for comp in competitors[:10]:
        comp_name = comp.get('competitor_name', 'N/A')
        strength = comp.get('strength_score', 0)
        weakness = comp.get('weakness_score', 0)
        sentiment = comp.get('customer_sentiment', 0)
        market_share = comp.get('market_share_estimate', 0) * 100
        
        competitor_rows += f"""
            <tr>
                <td>{comp_name}</td>
                <td>{strength}/10</td>
                <td>{weakness}/10</td>
                <td>{sentiment:.2f}</td>
                <td>{market_share:.1f}%</td>
            </tr>"""
    
    # Build key findings list
    key_findings_items = ""
    for finding in content.get('key_findings', []):
        key_findings_items += f"<li>{finding}</li>"
    
    # Build recommendations list
    recommendations_items = ""
    for rec in content.get('recommendations', []):
        recommendations_items += f"<li>{rec}</li>"
    
    # Build opportunities list
    opportunities_items = ""
    for opp in content.get('market_opportunities', []):
        opportunities_items += f"<li>{opp}</li>"
    
    # Build risks list
    risks_items = ""
    for risk in content.get('potential_risks', []):
        risks_items += f"<li>{risk}</li>"
    
    # Get location and business type
    location = content.get('location', 'Unknown')
    business_type = content.get('business_type', 'Unknown')
    confidence = content.get('confidence_score', 0) * 100
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>{report.title}</title>
    <style>
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
            color: #333;
            background: #fff;
        }}
        h1 {{ 
            color: #2563eb;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }}
        h2 {{ 
            color: #4b5563; 
            margin-top: 30px;
            border-left: 4px solid #2563eb;
            padding-left: 15px;
        }}
        .section {{ margin-bottom: 30px; }}
        .card {{ 
            background: #f9fafb; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        .metric-container {{
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 15px;
        }}
        .metric {{ 
            background: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            text-align: center;
            flex: 1;
            min-width: 120px;
        }}
        .metric-value {{ 
            font-size: 28px; 
            font-weight: bold; 
            color: #2563eb; 
        }}
        .metric-label {{ 
            color: #6b7280; 
            font-size: 14px;
            margin-top: 5px;
        }}
        table {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        th {{ 
            background: #2563eb; 
            color: white; 
            padding: 12px; 
            text-align: left; 
        }}
        td {{ 
            padding: 12px; 
            border-bottom: 1px solid #e5e7eb; 
        }}
        tr:hover {{ background: #f3f4f6; }}
        .badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }}
        .badge-success {{ background: #10b981; color: white; }}
        .badge-warning {{ background: #f59e0b; color: white; }}
        .badge-info {{ background: #3b82f6; color: white; }}
        .footer {{ 
            margin-top: 50px; 
            color: #9ca3af; 
            font-size: 12px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }}
        .summary {{
            font-size: 16px;
            line-height: 1.8;
            color: #4b5563;
        }}
        ul, ol {{
            background: white;
            padding: 20px 40px;
            border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }}
        li {{
            margin-bottom: 8px;
        }}
    </style>
</head>
<body>
    <h1>{report.title}</h1>
    
    <div class="card">
        <p class="summary">{content.get('summary', 'No summary available')}</p>
        
        <div class="metric-container">
            <div class="metric">
                <div class="metric-value">{location}</div>
                <div class="metric-label">Location</div>
            </div>
            <div class="metric">
                <div class="metric-value">{business_type}</div>
                <div class="metric-label">Business Type</div>
            </div>
            <div class="metric">
                <div class="metric-value">{confidence:.0f}%</div>
                <div class="metric-label">Confidence</div>
            </div>
        </div>
        
        <div class="metric-container">
            <div class="metric">
                <div class="metric-value">{content.get('competitors_count', 0)}</div>
                <div class="metric-label">Competitors</div>
            </div>
            <div class="metric">
                <div class="metric-value">{len(content.get('key_findings', []))}</div>
                <div class="metric-label">Key Findings</div>
            </div>
            <div class="metric">
                <div class="metric-value">{len(content.get('recommendations', []))}</div>
                <div class="metric-label">Recommendations</div>
            </div>
        </div>
    </div>
    
    <h2>Key Findings</h2>
    <ul>
        {key_findings_items}
    </ul>
    
    <h2>Competitor Analysis</h2>
    <table>
        <tr>
            <th>Competitor</th>
            <th>Strength</th>
            <th>Weakness</th>
            <th>Sentiment</th>
            <th>Market Share</th>
        </tr>
        {competitor_rows}
    </table>
    <p style="text-align: right; margin-top: -10px;">
        <span class="badge badge-info">Top {min(len(competitors), 10)} competitors shown</span>
    </p>
    
    <h2>Recommendations</h2>
    <ol>
        {recommendations_items}
    </ol>
    
    <h2>Market Opportunities</h2>
    <ul>
        {opportunities_items}
    </ul>
    
    <h2>Potential Risks</h2>
    <ul>
        {risks_items}
    </ul>
    
    <div class="footer">
        <p>Generated by AI Local Market Research Analyst • Report ID: {report.id}</p>
        <p>Generated on: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S') if report.generated_at else 'N/A'}</p>
    </div>
</body>
</html>"""
    
    return html_content


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: UserResponse = Depends(get_current_active_user_with_db),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Delete a report.
    """
    report = await get_report(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Check ownership
    if report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this report"
        )

    # Delete from database
    from sqlalchemy import delete
    await db.execute(
        delete(Report).where(Report.id == report_id)
    )
    await db.commit()

    logger.info(f"Report {report_id} deleted by user {current_user.id}")
    return {"message": "Report deleted successfully"}


@router.post("/preview")
async def preview_report(
    report_data: Dict[str, Any],
    current_user: UserResponse = Depends(get_current_active_user_with_db)
) -> Any:
    """
    Preview a report without saving.
    """
    # Generate preview of report
    preview_content = {
        "title": report_data.get("title", "Market Analysis Report"),
        "format": report_data.get("format", "json"),
        "content": {
            "summary": report_data.get("summary", "Preview summary"),
            "key_findings": report_data.get("key_findings", ["Finding 1", "Finding 2"]),
            "sections": report_data.get("sections", ["Executive Summary", "Market Analysis", "Competitor Analysis"]),
            "generated_at": report_data.get("generated_at", datetime.utcnow().isoformat())
        }
    }

    return {
        "preview": preview_content,
        "message": "Report preview generated"
    }


async def generate_report_async(
    db: AsyncSession,
    report_id: str,
    user_id: int,
    request_id: str,
    title: str,
    analysis_result: AnalysisResult,
    analysis_request: AnalysisRequest,
    requested_format: str = "html"
) -> None:
    """
    Generate report asynchronously.
    """
    try:
        logger.info(f"Starting report generation for report {report_id} in format: {requested_format}")

        # Extract competitor data
        competitor_data = analysis_result.competitor_analysis or {}
        competitors = competitor_data.get('competitor_analysis', [])
        
        # Get sentiment data
        sentiment_data = analysis_result.sentiment_analysis or {}
        
        # Get trend data
        trend_data = analysis_result.trend_analysis or {}
        
        # Generate report content with all data
        report_content = {
            "title": title,
            "request_id": request_id,
            "location": analysis_request.location if analysis_request else "Unknown",
            "business_type": analysis_request.business_type.value if analysis_request and hasattr(analysis_request.business_type, 'value') else str(analysis_request.business_type) if analysis_request else "Unknown",
            "summary": analysis_result.summary or "No summary available",
            "key_findings": analysis_result.key_findings or [],
            "market_opportunities": analysis_result.market_opportunities or [],
            "potential_risks": analysis_result.potential_risks or [],
            "competitor_analysis": competitor_data,
            "competitors_count": len(competitors),
            "top_competitors": competitors[:10],
            "sentiment_analysis": sentiment_data,
            "trend_analysis": trend_data,
            "data_sources_used": analysis_result.data_sources_used or ["geoapify", "foursquare", "news"],
            "confidence_score": analysis_result.confidence_score or 0.85,
            "recommendations": [
                "Focus on digital presence to capture emerging market segments",
                "Enhance customer experience based on sentiment analysis",
                "Monitor competitor pricing strategies closely",
                "Consider strategic partnerships to enhance market position"
            ],
            "generated_at": datetime.utcnow().isoformat(),
            "metadata": analysis_result.analysis_metadata or {}
        }

        # Use the requested format
        report_format = requested_format

        # Create download URL
        download_url = f"/api/v1/reports/{report_id}/download"
        preview_url = f"/api/v1/reports/{report_id}"

        # Save report to database
        await create_report_db(
            db,
            user_id=user_id,
            request_id=request_id,
            report_id=report_id,
            title=title,
            format=report_format,
            content=report_content,
            download_url=download_url,
            preview_url=preview_url
        )

        logger.info(f"✅ Report generated: {report_id} with {len(competitors)} competitors in {report_format} format")

    except Exception as e:
        logger.error(f"❌ Error generating report {report_id}: {str(e)}")


async def generate_and_save_insights(
    db: AsyncSession,
    user_id: int,
    analysis_result: AnalysisResult,
    analysis_request: AnalysisRequest
) -> None:
    """
    Generate and save AI insights from analysis results.
    """
    try:
        logger.info(f"Generating insights for user {user_id}")
        
        insights = []
        
        # Extract insights from key findings
        if analysis_result.key_findings:
            for finding in analysis_result.key_findings[:3]:
                insights.append({
                    "type": "insight",
                    "title": "Key Finding",
                    "description": finding,
                    "confidence": analysis_result.confidence_score or 0.8
                })
        
        # Extract insights from market opportunities
        if analysis_result.market_opportunities:
            for opp in analysis_result.market_opportunities[:2]:
                insights.append({
                    "type": "opportunity",
                    "title": "Market Opportunity",
                    "description": opp,
                    "confidence": analysis_result.confidence_score or 0.8
                })
        
        # Add competitor insights
        competitor_data = analysis_result.competitor_analysis or {}
        competitors = competitor_data.get('competitor_analysis', [])
        
        if competitors:
            # Find strongest competitor
            strongest = max(competitors, key=lambda x: x.get('strength_score', 0))
            insights.append({
                "type": "advantage",
                "title": "Strongest Competitor",
                "description": f"{strongest.get('competitor_name', 'Unknown')} leads the market with strength score {strongest.get('strength_score', 0)}/10",
                "confidence": 0.9
            })
            
            # Market concentration insight
            if len(competitors) > 10:
                insights.append({
                    "type": "insight",
                    "title": "Market Concentration",
                    "description": f"Highly competitive market with {len(competitors)} active businesses",
                    "confidence": 0.85
                })
        
        # Add location-based insight
        if analysis_request and analysis_request.location:
            insights.append({
                "type": "insight",
                "title": "Regional Data Concentration",
                "description": f"With {analysis_request.location} accounting for a significant portion of analyzed businesses, the current data set is heavily weighted toward this market.",
                "confidence": 0.9
            })
        
        # Save insights to database
        if insights:
            await save_insights(db, user_id, insights)
            logger.info(f"✅ Saved {len(insights)} insights for user {user_id}")
        
    except Exception as e:
        logger.error(f"❌ Error generating insights: {str(e)}")