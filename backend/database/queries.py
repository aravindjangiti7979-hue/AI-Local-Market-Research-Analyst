"""
Database query functions.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
import logging
import uuid

# At the top of your file, add Alert to the imports from models.database_models
from models.database_models import (
    User, AnalysisRequest, AnalysisResult, Report,
    DataSource, ApiUsage, RawBusinessData, RawReviewData,
    RawNewsData, RawSocialData, BusinessTypeEnum, AnalysisTypeEnum,
    Insight, Alert  # Add Alert here
)

# Also import the Alert schemas
from models.schemas import (
    UserCreate, UserInDB, MarketAnalysisRequest,
    AnalysisType, BusinessType, AlertCreate, AlertUpdate
)
from models.schemas import (
    UserCreate, UserInDB, MarketAnalysisRequest,
    AnalysisType, BusinessType, AlertCreate, AlertUpdate
)

logger = logging.getLogger(__name__)


# User Queries
async def create_user(db: AsyncSession, user_create: UserCreate) -> User:
    """
    Create a new user.
    """
    from core.security import get_password_hash
    
    user = User(
        email=user_create.email,
        full_name=user_create.full_name,
        company=user_create.company,
        phone=user_create.phone,
        hashed_password=get_password_hash(user_create.password)
    )
    
    db.add(user)
    await db.flush()
    await db.refresh(user)
    
    logger.info(f"Created user: {user.email}")
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """
    Get user by email.
    """
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """
    Get user by ID.
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def update_user(
    db: AsyncSession, user_id: int, update_data: Dict[str, Any]
) -> Optional[User]:
    """
    Update user information.
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    
    for key, value in update_data.items():
        if hasattr(user, key):
            setattr(user, key, value)
    
    user.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(user)
    
    logger.info(f"Updated user: {user.email}")
    return user


async def update_user_last_login(db: AsyncSession, user_id: int) -> bool:
    """
    Update user's last login time.
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.last_login = datetime.utcnow()
    await db.flush()
    return True


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    """
    Delete a user.
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        return False
    
    await db.delete(user)
    await db.flush()
    
    logger.info(f"Deleted user: {user.email}")
    return True


# Analysis Request Queries
async def create_analysis_request(
    db: AsyncSession, 
    user_id: int, 
    request_data: MarketAnalysisRequest,
    request_id: str
) -> Optional[AnalysisRequest]:
    """
    Create a new analysis request.
    """
    try:
        from models.database_models import BusinessTypeEnum, AnalysisTypeEnum
        
        # Convert string to enum - ensure UPPERCASE
        business_type_str = request_data.business_type.upper() if request_data.business_type else "OTHER"
        analysis_type_str = request_data.analysis_type.upper() if request_data.analysis_type else "COMPREHENSIVE"
        
        # Map to enum
        try:
            business_type = BusinessTypeEnum[business_type_str]
        except (KeyError, AttributeError):
            business_type = BusinessTypeEnum.OTHER
            logger.warning(f"Unknown business type: {request_data.business_type}, using OTHER")
        
        try:
            analysis_type = AnalysisTypeEnum[analysis_type_str]
        except (KeyError, AttributeError):
            analysis_type = AnalysisTypeEnum.COMPREHENSIVE
            logger.warning(f"Unknown analysis type: {request_data.analysis_type}, using COMPREHENSIVE")
        
        request = AnalysisRequest(
            id=request_id,
            user_id=user_id,
            location=request_data.location,
            business_type=business_type,
            analysis_type=analysis_type,
            competitors=request_data.competitors,
            timeframe_days=request_data.timeframe_days or 30,
            include_sources=request_data.include_sources or ["reviews", "news", "social"],
            custom_prompt=request_data.custom_prompt,
            status="pending",
            created_at=datetime.utcnow()
        )
        
        db.add(request)
        await db.flush()
        await db.refresh(request)
        
        logger.info(f"Created analysis request: {request_id} for user {user_id}")
        return request
        
    except Exception as e:
        logger.error(f"Error creating analysis request: {e}")
        await db.rollback()
        return None


async def get_analysis_request(
    db: AsyncSession, request_id: str
) -> Optional[AnalysisRequest]:
    """
    Get analysis request by ID.
    """
    result = await db.execute(
        select(AnalysisRequest).where(AnalysisRequest.id == request_id)
    )
    return result.scalar_one_or_none()


async def get_user_analysis_requests(
    db: AsyncSession, user_id: int, limit: int = 50, offset: int = 0
) -> List[AnalysisRequest]:
    """
    Get analysis requests for a user.
    """
    result = await db.execute(
        select(AnalysisRequest)
        .where(AnalysisRequest.user_id == user_id)
        .order_by(AnalysisRequest.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


async def update_analysis_request_status(
    db: AsyncSession, 
    request_id: str, 
    status: str,
    error_message: Optional[str] = None
) -> Optional[AnalysisRequest]:
    """
    Update analysis request status.
    """
    request = await get_analysis_request(db, request_id)
    if not request:
        return None
    
    request.status = status
    
    if status == "processing":
        request.started_at = datetime.utcnow()
    elif status in ["completed", "failed"]:
        request.completed_at = datetime.utcnow()
    
    if error_message:
        request.error_message = error_message
    
    await db.flush()
    await db.refresh(request)
    
    logger.info(f"Updated analysis request {request_id} status to {status}")
    return request


# Analysis Result Queries
async def create_analysis_result(
    db: AsyncSession, 
    request_id: str, 
    result_id: str,
    result_data: Dict[str, Any]
) -> Optional[AnalysisResult]:
    """
    Create analysis result.
    """
    try:
        result = AnalysisResult(
            id=result_id,
            analysis_request_id=request_id,
            summary=result_data.get("summary"),
            key_findings=result_data.get("key_findings"),
            market_opportunities=result_data.get("market_opportunities"),
            potential_risks=result_data.get("potential_risks"),
            competitor_analysis=result_data.get("competitor_analysis"),
            sentiment_analysis=result_data.get("sentiment_analysis"),
            trend_analysis=result_data.get("trend_analysis"),
            data_sources_used=result_data.get("data_sources_used"),
            confidence_score=result_data.get("confidence_score", 0.0),
            analysis_metadata=result_data.get("metadata", {})
        )
        
        db.add(result)
        await db.flush()
        await db.refresh(result)
        
        logger.info(f"Created analysis result: {result_id}")
        return result
        
    except Exception as e:
        logger.error(f"Error creating analysis result: {e}")
        await db.rollback()
        return None


async def get_analysis_result(
    db: AsyncSession, result_id: str
) -> Optional[AnalysisResult]:
    """
    Get analysis result by ID.
    """
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == result_id)
    )
    return result.scalar_one_or_none()


async def get_analysis_result_by_request(
    db: AsyncSession, request_id: str
) -> Optional[AnalysisResult]:
    """
    Get analysis result by request ID.
    """
    result = await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.analysis_request_id == request_id)
    )
    return result.scalar_one_or_none()


# Report Queries - FIXED VERSION
async def create_report(
    db: AsyncSession,
    user_id: int,
    request_id: str,
    report_id: str,
    title: str,
    format: str,
    content: Dict[str, Any],
    download_url: Optional[str] = None,
    preview_url: Optional[str] = None
) -> Optional[Report]:
    """
    Create a report.
    """
    try:
        from models.database_models import ReportFormatEnum
        
        # Map format to enum - handle case-insensitive
        format_lower = format.lower()
        format_map = {
            "json": ReportFormatEnum.JSON,
            "pdf": ReportFormatEnum.PDF,
            "html": ReportFormatEnum.HTML,
            "csv": ReportFormatEnum.CSV,
            "markdown": ReportFormatEnum.MARKDOWN
        }
        
        if format_lower not in format_map:
            logger.warning(f"Unknown format: {format}, defaulting to JSON")
            report_format = ReportFormatEnum.JSON
        else:
            report_format = format_map[format_lower]
        
        report = Report(
            id=report_id,
            user_id=user_id,
            analysis_request_id=request_id,
            title=title,
            format=report_format,
            content=content,
            download_url=download_url,
            preview_url=preview_url
        )
        
        db.add(report)
        await db.commit()
        await db.refresh(report)
        
        logger.info(f"✅ Created report: {report_id} with format: {format}")
        return report
        
    except Exception as e:
        logger.error(f"❌ Error creating report: {e}")
        await db.rollback()
        return None


async def get_report(
    db: AsyncSession, report_id: str
) -> Optional[Report]:
    """
    Get report by ID.
    """
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    return result.scalar_one_or_none()


async def get_user_reports(
    db: AsyncSession, user_id: int, limit: int = 50, offset: int = 0
) -> List[Report]:
    """
    Get reports for a user.
    """
    result = await db.execute(
        select(Report)
        .where(Report.user_id == user_id)
        .order_by(Report.generated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


async def increment_report_download(
    db: AsyncSession, report_id: str
) -> bool:
    """
    Increment report download count.
    """
    report = await get_report(db, report_id)
    if not report:
        return False
    
    report.download_count += 1
    await db.flush()
    return True


# Insight Queries
async def save_insights(db: AsyncSession, user_id: int, insights: List[Dict[str, Any]]) -> bool:
    """
    Save generated insights to database.
    """
    try:
        from models.database_models import Insight
        import uuid
        
        for insight in insights:
            db_insight = Insight(
                id=str(uuid.uuid4()),
                user_id=user_id,
                type=insight.get('type', 'insight'),
                title=insight.get('title', ''),
                description=insight.get('description', ''),
                confidence=insight.get('confidence', 0.5),
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=30)
            )
            db.add(db_insight)
        
        await db.commit()
        logger.info(f"✅ Saved {len(insights)} insights for user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error saving insights: {e}")
        await db.rollback()
        return False


async def get_recent_insights(db: AsyncSession, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get recent insights for a user.
    """
    try:
        from models.database_models import Insight
        
        result = await db.execute(
            select(Insight)
            .where(
                Insight.user_id == user_id,
                Insight.expires_at > datetime.utcnow()
            )
            .order_by(Insight.created_at.desc())
            .limit(limit)
        )
        insights = result.scalars().all()
        
        return [
            {
                "type": i.type,
                "title": i.title,
                "description": i.description,
                "confidence": i.confidence
            }
            for i in insights
        ]
        
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        return []


# Raw Data Cache Queries
async def cache_raw_business_data(
    db: AsyncSession,
    cache_id: str,
    source: str,
    location: str,
    business_type: str,
    data: Dict[str, Any],
    expires_hours: int = 24
) -> Optional[RawBusinessData]:
    """
    Cache raw business data.
    """
    try:
        expires_at = datetime.utcnow() + timedelta(hours=expires_hours)
        
        cache_entry = RawBusinessData(
            id=cache_id,
            source=source,
            location=location,
            business_type=business_type,
            data=data,
            expires_at=expires_at
        )
        
        db.add(cache_entry)
        await db.flush()
        
        return cache_entry
        
    except Exception as e:
        logger.error(f"Error caching business data: {e}")
        await db.rollback()
        return None


async def get_cached_business_data(
    db: AsyncSession,
    location: str,
    source: Optional[str] = None,
    business_type: Optional[str] = None
) -> List[RawBusinessData]:
    """
    Get cached business data.
    """
    try:
        query = select(RawBusinessData).where(
            and_(
                RawBusinessData.location == location,
                RawBusinessData.expires_at > datetime.utcnow()
            )
        )
        
        if source:
            query = query.where(RawBusinessData.source == source)
        
        if business_type:
            query = query.where(RawBusinessData.business_type == business_type)
        
        result = await db.execute(query)
        return result.scalars().all()
        
    except Exception as e:
        logger.error(f"Error getting cached data: {e}")
        return []


# API Usage Queries
async def log_api_usage(
    db: AsyncSession,
    user_id: int,
    endpoint: str,
    method: str,
    status_code: int,
    response_time: float,
    request_size: int,
    response_size: int,
    ip_address: str,
    user_agent: str
) -> Optional[ApiUsage]:
    """
    Log API usage.
    """
    try:
        usage = ApiUsage(
            user_id=user_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time=response_time,
            request_size=request_size,
            response_size=response_size,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(usage)
        await db.flush()
        await db.refresh(usage)
        
        return usage
        
    except Exception as e:
        logger.error(f"Error logging API usage: {e}")
        await db.rollback()
        return None


async def get_user_api_usage_stats(
    db: AsyncSession, user_id: int
) -> Dict[str, Any]:
    """
    Get API usage statistics for a user.
    """
    try:
        # Today's usage
        today_start = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        
        result = await db.execute(
            select(func.count(ApiUsage.id))
            .where(
                and_(
                    ApiUsage.user_id == user_id,
                    ApiUsage.created_at >= today_start
                )
            )
        )
        requests_today = result.scalar() or 0
        
        # This month's usage
        month_start = datetime.utcnow().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        
        result = await db.execute(
            select(func.count(ApiUsage.id))
            .where(
                and_(
                    ApiUsage.user_id == user_id,
                    ApiUsage.created_at >= month_start
                )
            )
        )
        requests_this_month = result.scalar() or 0
        
        # Total usage
        result = await db.execute(
            select(func.count(ApiUsage.id))
            .where(ApiUsage.user_id == user_id)
        )
        total_requests = result.scalar() or 0
        
        # Last request
        result = await db.execute(
            select(ApiUsage.created_at)
            .where(ApiUsage.user_id == user_id)
            .order_by(ApiUsage.created_at.desc())
            .limit(1)
        )
        last_request = result.scalar_one_or_none()
        
        return {
            "total_requests": total_requests,
            "requests_today": requests_today,
            "requests_this_month": requests_this_month,
            "last_request_at": last_request,
            "plan_limit": 100,
            "remaining_requests": max(0, 100 - requests_today)
        }
        
    except Exception as e:
        logger.error(f"Error getting API usage stats: {e}")
        return {
            "total_requests": 0,
            "requests_today": 0,
            "requests_this_month": 0,
            "plan_limit": 100,
            "remaining_requests": 100
        }

# Alert Queries
async def create_alert(
    db: AsyncSession,
    user_id: int,
    alert_data: AlertCreate
) -> Optional[Alert]:
    """
    Create a new alert for a user.
    """
    try:
        from models.database_models import Alert
        
        alert = Alert(
            user_id=user_id,
            name=alert_data.name,
            description=alert_data.description,
            type=alert_data.type,
            enabled=alert_data.enabled,
            frequency=alert_data.frequency,
            threshold=alert_data.threshold
        )
        
        db.add(alert)
        await db.commit()
        await db.refresh(alert)
        
        logger.info(f"✅ Created alert {alert.id} for user {user_id}")
        return alert
        
    except Exception as e:
        logger.error(f"❌ Error creating alert: {e}")
        await db.rollback()
        return None


async def get_user_alerts(
    db: AsyncSession,
    user_id: int,
    enabled_only: bool = False
) -> List[Alert]:
    """
    Get all alerts for a user.
    """
    try:
        from models.database_models import Alert
        
        query = select(Alert).where(Alert.user_id == user_id)
        
        if enabled_only:
            query = query.where(Alert.enabled == True)
        
        query = query.order_by(Alert.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
        
    except Exception as e:
        logger.error(f"Error getting alerts for user {user_id}: {e}")
        return []


async def get_alert(
    db: AsyncSession,
    alert_id: int,
    user_id: int
) -> Optional[Alert]:
    """
    Get a specific alert by ID.
    """
    try:
        from models.database_models import Alert
        
        result = await db.execute(
            select(Alert).where(
                Alert.id == alert_id,
                Alert.user_id == user_id
            )
        )
        return result.scalar_one_or_none()
        
    except Exception as e:
        logger.error(f"Error getting alert {alert_id}: {e}")
        return None


async def update_alert(
    db: AsyncSession,
    alert_id: int,
    user_id: int,
    update_data: AlertUpdate
) -> Optional[Alert]:
    """
    Update an alert.
    """
    try:
        from models.database_models import Alert
        
        alert = await get_alert(db, alert_id, user_id)
        if not alert:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(alert, key):
                setattr(alert, key, value)
        
        alert.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(alert)
        
        logger.info(f"✅ Updated alert {alert_id}")
        return alert
        
    except Exception as e:
        logger.error(f"❌ Error updating alert {alert_id}: {e}")
        await db.rollback()
        return None


async def toggle_alert(
    db: AsyncSession,
    alert_id: int,
    user_id: int,
    enabled: bool
) -> bool:
    """
    Toggle alert enabled status.
    """
    try:
        from models.database_models import Alert
        
        result = await db.execute(
            update(Alert)
            .where(
                Alert.id == alert_id,
                Alert.user_id == user_id
            )
            .values(
                enabled=enabled,
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()
        
        return result.rowcount > 0
        
    except Exception as e:
        logger.error(f"Error toggling alert {alert_id}: {e}")
        await db.rollback()
        return False


async def delete_alert(
    db: AsyncSession,
    alert_id: int,
    user_id: int
) -> bool:
    """
    Delete an alert.
    """
    try:
        from models.database_models import Alert
        
        result = await db.execute(
            delete(Alert)
            .where(
                Alert.id == alert_id,
                Alert.user_id == user_id
            )
        )
        await db.commit()
        
        return result.rowcount > 0
        
    except Exception as e:
        logger.error(f"Error deleting alert {alert_id}: {e}")
        await db.rollback()
        return False
    
# Cleanup Queries
async def cleanup_expired_cache(db: AsyncSession) -> int:
    """
    Clean up expired cache entries.
    """
    total_deleted = 0
    
    try:
        # Business data
        result = await db.execute(
            delete(RawBusinessData)
            .where(RawBusinessData.expires_at <= datetime.utcnow())
        )
        total_deleted += result.rowcount
        
        # Review data
        result = await db.execute(
            delete(RawReviewData)
            .where(RawReviewData.expires_at <= datetime.utcnow())
        )
        total_deleted += result.rowcount
        
        # News data
        result = await db.execute(
            delete(RawNewsData)
            .where(RawNewsData.expires_at <= datetime.utcnow())
        )
        total_deleted += result.rowcount
        
        # Social data
        result = await db.execute(
            delete(RawSocialData)
            .where(RawSocialData.expires_at <= datetime.utcnow())
        )
        total_deleted += result.rowcount
        
        # Insights cleanup
        result = await db.execute(
            delete(Insight)
            .where(Insight.expires_at <= datetime.utcnow())
        )
        total_deleted += result.rowcount
        
        if total_deleted > 0:
            logger.info(f"Cleaned up {total_deleted} expired cache entries")
        
        await db.commit()
        
    except Exception as e:
        logger.error(f"Error cleaning up cache: {e}")
        await db.rollback()
    
    return total_deleted