from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class UserRegister(BaseModel):
    username: str
    name: Optional[str] = None
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    name: Optional[str]
    failed_attempts: int
    completions: int
    
    model_config = ConfigDict(from_attributes=True)

class DayResponse(BaseModel):
    id: int
    challenge_id: int
    day_number: int
    date: date
    diet: bool
    workout_1: bool
    workout_2_outdoor: bool
    water: bool
    reading: bool
    picture: bool
    is_completed: bool

    model_config = ConfigDict(from_attributes=True)

class DayUpdate(BaseModel):
    diet: bool
    workout_1: bool
    workout_2_outdoor: bool
    water: bool
    reading: bool
    picture: bool

class ChallengeResponse(BaseModel):
    id: int
    user_id: int
    status: str
    start_date: date
    days: List[DayResponse]

    model_config = ConfigDict(from_attributes=True)

class LogResponse(BaseModel):
    id: int
    timestamp: datetime
    level: str
    message: str

    model_config = ConfigDict(from_attributes=True)
