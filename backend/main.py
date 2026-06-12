import os
from datetime import date, datetime, timedelta
import logging
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import auth
from database import engine, get_db, wait_for_db, Base

# Setup standard python logging
logger = logging.getLogger("uvicorn")

app = FastAPI(title="75 Hard Tracker API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it runs inside docker compose, we allow all for local dev simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to log application events to the DB
def db_log(db: Session, level: str, message: str):
    try:
        log_entry = models.Log(level=level, message=message)
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to write log to database: {e}")

# Startup event to verify database connectivity, create tables, and seed admin user
@app.on_event("startup")
def startup_event():
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    
    # Seed admin user if not exists
    db = next(get_db())
    try:
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            logger.info("Admin user not found. Seeding admin user...")
            hashed_pwd = auth.get_password_hash("admin")
            new_admin = models.User(
                username="admin",
                name="System Admin",
                password_hash=hashed_pwd,
                failed_attempts=0,
                completions=0
            )
            db.add(new_admin)
            db.commit()
            db_log(db, "INFO", "Seeded default admin user into database.")
            logger.info("Admin user successfully seeded!")
        else:
            logger.info("Admin user already exists.")
    except Exception as e:
        logger.error(f"Error seeding admin user: {e}")
    finally:
        db.close()

# --- Authentication Endpoints ---

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if username exists
    existing_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    hashed_pwd = auth.get_password_hash(user_in.password)
    new_user = models.User(
        username=user_in.username,
        name=user_in.name or user_in.username,
        password_hash=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    db_log(db, "INFO", f"Registered new user: {new_user.username}")
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if not user or not auth.verify_password(user_in.password, user.password_hash):
        db_log(db, "WARNING", f"Failed login attempt for username: {user_in.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.username})
    db_log(db, "INFO", f"User logged in: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --- Challenge & Days Endpoints ---

@app.post("/api/challenges/start", response_model=schemas.ChallengeResponse)
def start_challenge(
    client_date: str = Query(..., description="Client local date in YYYY-MM-DD format"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        start_date_obj = date.fromisoformat(client_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client_date format. Must be YYYY-MM-DD"
        )

    # Check if there is already an active challenge
    active_challenge = db.query(models.Challenge).filter(
        models.Challenge.user_id == current_user.id,
        models.Challenge.status == "active"
    ).first()
    
    if active_challenge:
        # We fail the previous active challenge as they are choosing to start a new one
        active_challenge.status = "failed"
        current_user.failed_attempts += 1
        db.add(active_challenge)
        db.add(current_user)
        db_log(db, "WARNING", f"User {current_user.username} abandoned active challenge ID {active_challenge.id} to start a new one.")

    # Create new challenge
    new_challenge = models.Challenge(
        user_id=current_user.id,
        status="active",
        start_date=start_date_obj
    )
    db.add(new_challenge)
    db.commit() # Commit to get the challenge ID
    db.refresh(new_challenge)

    # Pre-populate all 75 days in the database
    days_to_insert = []
    for day_num in range(1, 76):
        day_date = start_date_obj + timedelta(days=day_num - 1)
        day_record = models.Day(
            challenge_id=new_challenge.id,
            day_number=day_num,
            date=day_date,
            diet=False,
            workout_1=False,
            workout_2_outdoor=False,
            water=False,
            reading=False,
            picture=False,
            is_completed=False
        )
        days_to_insert.append(day_record)
    
    db.bulk_save_objects(days_to_insert)
    db.commit()
    
    # Reload challenge with days
    db.refresh(new_challenge)
    db_log(db, "INFO", f"User {current_user.username} started challenge ID {new_challenge.id} on {client_date}.")
    
    return new_challenge

@app.get("/api/challenges/current")
def get_current_challenge(
    client_date: str = Query(..., description="Client local date in YYYY-MM-DD format"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        client_date_obj = date.fromisoformat(client_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client_date format. Must be YYYY-MM-DD"
        )

    # Fetch active challenge
    challenge = db.query(models.Challenge).filter(
        models.Challenge.user_id == current_user.id,
        models.Challenge.status == "active"
    ).first()

    # If there is no active challenge, return empty challenge details
    if not challenge:
        return {
            "challenge": None,
            "current_expected_day": None,
            "user_stats": {
                "failed_attempts": current_user.failed_attempts,
                "completions": current_user.completions
            }
        }

    # Strict Real-Time Time Enforcement Logic
    # 1. Calculate the day number the user is expected to be on
    current_expected_day = (client_date_obj - challenge.start_date).days + 1

    # 2. Check if the challenge is finished (i.e. expected day > 75)
    if current_expected_day > 75:
        # Check if all days from 1 to 75 are completed
        uncompleted_days_count = db.query(models.Day).filter(
            models.Day.challenge_id == challenge.id,
            models.Day.is_completed == False
        ).count()

        if uncompleted_days_count == 0:
            # User successfully completed the challenge!
            challenge.status = "completed"
            current_user.completions += 1
            db.add(challenge)
            db.add(current_user)
            db.commit()
            db_log(db, "INFO", f"User {current_user.username} successfully COMPLETED 75 Hard Challenge ID {challenge.id}!")
        else:
            # Challenge finished in terms of time, but some days were not completed
            challenge.status = "failed"
            current_user.failed_attempts += 1
            db.add(challenge)
            db.add(current_user)
            db.commit()
            db_log(db, "WARNING", f"User {current_user.username} FAILED 75 Hard Challenge ID {challenge.id} (time expired but incomplete days).")
            
        return {
            "challenge": schemas.ChallengeResponse.model_validate(challenge),
            "current_expected_day": current_expected_day,
            "user_stats": {
                "failed_attempts": current_user.failed_attempts,
                "completions": current_user.completions
            }
        }

    # 3. Check if any day prior to current_expected_day is incomplete
    if current_expected_day > 1:
        # Query for any day prior to the expected day where is_completed is false
        failed_past_days = db.query(models.Day).filter(
            models.Day.challenge_id == challenge.id,
            models.Day.day_number < current_expected_day,
            models.Day.is_completed == False
        ).all()

        if failed_past_days:
            # User failed to complete a past day on time. Mark challenge as failed.
            failed_day_nums = [d.day_number for d in failed_past_days]
            challenge.status = "failed"
            current_user.failed_attempts += 1
            db.add(challenge)
            db.add(current_user)
            db.commit()
            
            db_log(db, "WARNING", f"User {current_user.username} FAILED 75 Hard Challenge ID {challenge.id} (incomplete days: {failed_day_nums}).")
            
            return {
                "challenge": schemas.ChallengeResponse.model_validate(challenge),
                "current_expected_day": current_expected_day,
                "user_stats": {
                    "failed_attempts": current_user.failed_attempts,
                    "completions": current_user.completions
                }
            }

    # If the challenge is active and no failures detected, return normally
    return {
        "challenge": schemas.ChallengeResponse.model_validate(challenge),
        "current_expected_day": current_expected_day,
        "user_stats": {
            "failed_attempts": current_user.failed_attempts,
            "completions": current_user.completions
        }
    }

@app.put("/api/challenges/days/{day_id}", response_model=schemas.DayResponse)
def update_day(
    day_id: int,
    day_update: schemas.DayUpdate,
    client_date: str = Query(..., description="Client local date in YYYY-MM-DD format"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        client_date_obj = date.fromisoformat(client_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client_date format. Must be YYYY-MM-DD"
        )

    # Fetch the day record
    day = db.query(models.Day).join(models.Challenge).filter(
        models.Day.id == day_id,
        models.Challenge.user_id == current_user.id,
        models.Challenge.status == "active"
    ).first()

    if not day:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Day not found or challenge is no longer active."
        )

    # Strict Time Enforcement: Compare challenge start date with client date
    challenge = day.challenge
    current_expected_day = (client_date_obj - challenge.start_date).days + 1

    # Check if the day is editable (only current_expected_day can be edited)
    if day.day_number != current_expected_day:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This day is locked (read-only). You can only update Day {current_expected_day}."
        )

    was_completed = day.is_completed

    # Update the rules completion states
    day.diet = day_update.diet
    day.workout_1 = day_update.workout_1
    day.workout_2_outdoor = day_update.workout_2_outdoor
    day.water = day_update.water
    day.reading = day_update.reading
    day.picture = day_update.picture

    # Recalculate is_completed
    day.is_completed = (
        day.diet and
        day.workout_1 and
        day.workout_2_outdoor and
        day.water and
        day.reading and
        day.picture
    )

    db.add(day)
    db.commit()
    db.refresh(day)

    # Logs
    if day.is_completed and not was_completed:
        db_log(db, "INFO", f"User {current_user.username} completed day {day.day_number} checkmarks.")
    elif not day.is_completed and was_completed:
        db_log(db, "INFO", f"User {current_user.username} un-completed day {day.day_number} checkmarks.")

    return day


# --- Log Management Endpoints (Admin Only) ---

@app.get("/api/logs", response_model=List[schemas.LogResponse])
def get_logs(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Strict admin check
    if current_user.username != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
    
    logs = db.query(models.Log).order_by(models.Log.timestamp.desc()).limit(100).all()
    return logs
