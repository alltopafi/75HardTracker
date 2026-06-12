from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    failed_attempts = Column(Integer, default=0, nullable=False)
    completions = Column(Integer, default=0, nullable=False)

    challenges = relationship("Challenge", back_populates="user", cascade="all, delete-orphan")

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="active", nullable=False) # "active", "failed", "completed"
    start_date = Column(Date, nullable=False)

    user = relationship("User", back_populates="challenges")
    days = relationship("Day", back_populates="challenge", cascade="all, delete-orphan", order_by="Day.day_number")

class Day(Base):
    __tablename__ = "days"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    day_number = Column(Integer, nullable=False) # 1 to 75
    date = Column(Date, nullable=False)
    
    # The 6 rules of 75 Hard
    diet = Column(Boolean, default=False, nullable=False)
    workout_1 = Column(Boolean, default=False, nullable=False)
    workout_2_outdoor = Column(Boolean, default=False, nullable=False)
    water = Column(Boolean, default=False, nullable=False)
    reading = Column(Boolean, default=False, nullable=False)
    picture = Column(Boolean, default=False, nullable=False)
    
    is_completed = Column(Boolean, default=False, nullable=False)

    challenge = relationship("Challenge", back_populates="days")

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    level = Column(String, nullable=False) # "INFO", "WARNING", "ERROR"
    message = Column(Text, nullable=False)
