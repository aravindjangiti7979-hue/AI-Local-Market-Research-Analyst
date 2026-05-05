"""
Database connection and session management.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import QueuePool
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Get database URL from environment or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/market_analysis"
)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base for declarative models
Base = declarative_base()

# Dependency for FastAPI
async def get_db():
    """
    Get database session dependency.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """
    Initialize database tables.
    """
    from models.database_models import Base  # Import here to avoid circular import
    
    try:
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


async def close_db():
    """
    Close database connections.
    """
    await engine.dispose()
    logger.info("Database connections closed")


async def test_connection():
    """
    Test database connection.
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute("SELECT 1")
            test = result.scalar()
            if test == 1:
                logger.info("Database connection test successful")
                return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
    return False


async def get_db_stats():
    """
    Get database statistics.
    """
    try:
        async with AsyncSessionLocal() as session:
            # Get table counts
            tables = [
                "users", "analysis_requests", "analysis_results", 
                "reports", "data_sources", "api_usage"
            ]
            
            stats = {}
            for table in tables:
                try:
                    result = await session.execute(f"SELECT COUNT(*) FROM {table}")
                    count = result.scalar()
                    stats[table] = count or 0
                except:
                    stats[table] = 0
            
            # Try to get database size (might require special permissions)
            try:
                result = await session.execute(
                    "SELECT pg_database_size(current_database())"
                )
                db_size = result.scalar()
                stats["database_size_bytes"] = db_size
            except:
                stats["database_size_bytes"] = 0
            
            return stats
            
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        return {}