import os
import time
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/tracker_db")

# Setup SQLAlchemy engine
# We set pool_pre_ping=True to check connection viability before executing queries
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def wait_for_db(max_retries=10, delay=2):
    """Wait for the PostgreSQL database to start up and become available."""
    logger = logging.getLogger("uvicorn")
    logger.info("Checking database connection availability...")
    retries = 0
    while retries < max_retries:
        try:
            # Try to connect
            conn = engine.connect()
            conn.close()
            logger.info("Successfully connected to database!")
            return True
        except Exception as e:
            retries += 1
            logger.warning(f"Database connection attempt {retries}/{max_retries} failed: {e}")
            time.sleep(delay)
    logger.error("Could not connect to database after maximum retries.")
    raise Exception("Database not available")
