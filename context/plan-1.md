# 75 Hard Tracker - Technical Plan

## 1. Tech Stack & Environment
*   **Frontend:** React (Vite) + Tailwind CSS (Single Page App).
*   **Backend:** Python + FastAPI + SQLAlchemy ORM.
*   **Database:** PostgreSQL.
*   **Infrastructure:** Docker Compose (for seamless local development of DB, API, and UI).
*   **Styling:** "Tokyo Night Storm" aesthetic (`#24283b` background, `#c0caf5` text, custom accents for UI elements).

## 2. Architecture & Strict Time Enforcement Logic
*   **Strict Real-Time Enforcement:** 
    *   The backend will anchor a challenge to a specific `start_date`.
    *   Whenever the dashboard is loaded, the backend will calculate the `current_expected_day` based on `(Current Date) - (start_date)`.
    *   If any day *prior* to `current_expected_day` has `is_completed = false`, the backend will automatically flag the challenge as `Failed`, increment the user's `failed_attempts`, and prompt the user to start a new Day 1.
    *   Users will only be allowed to edit the state of `current_expected_day` (Today). Future days will be locked, and past days will be locked (read-only).

## 3. Database Schema (PostgreSQL)
*   **`users`**: `id`, `username`, `password_hash`, `failed_attempts`, `completions`.
*   **`challenges`**: `id`, `user_id` (FK), `status` (active, failed, completed), `start_date`.
*   **`days`**: `id`, `challenge_id` (FK), `day_number` (1-75), `date`, `diet` (bool), `workout_1` (bool), `workout_2_outdoor` (bool), `water` (bool), `reading` (bool), `picture` (bool), `is_completed` (bool).
*   **`logs`**: `id`, `timestamp`, `level`, `message`.

## 4. Frontend UI/UX (React + Tailwind)
*   **Dashboard View:**
    *   **Header:** Challenge Title, Current Day/Streak Number, Completions count, Failed Restarts count.
    *   **Grid:** 75 distinct circular components. 
        *   Green = Completed
        *   Tokyo Night Accent (e.g., Blue/Purple) = Current Day (Active)
        *   Outline/Muted = Locked (Future or Failed)
*   **Interaction:** Clicking the *Current Day* circle opens a floating modal/dialog.
*   **Modal View:** Contains 6 checkboxes corresponding to the 75 Hard rules. Checking all 6 triggers a backend `PUT` to mark the day complete and updates the UI instantly.

## 5. Execution Steps
1.  **Repository Scaffolding:** Set up `docker-compose.yml`, `backend/` directory (FastAPI, Alembic for migrations), and `frontend/` directory (Vite/React).
2.  **Database & API:** Define SQLAlchemy models, create the time-enforcement logic, and build the REST API endpoints (`/user`, `/challenge`, `/day/{id}`).
3.  **Frontend Foundation:** Configure Tailwind with Tokyo Night Storm colors, build the basic routing and API service calls.
4.  **UI Implementation:** Build the Dashboard Grid, the Day Circle components, and the Rule Checklist Modal.
5.  **Integration & Testing:** Connect the frontend to the backend, verify the strict real-time failure logic works correctly, and ensure state persists to Postgres.
