# RadioCalico - Local Development Setup

A Flask web application with PostgreSQL database for local prototyping.

## Stack

- **Web Framework**: Flask (Python)
- **Database**: PostgreSQL 16 (running in Docker)
- **ORM**: SQLAlchemy

## Prerequisites

- Python 3.11+
- Docker Desktop (running)

## Getting Started

### 1. Start the Database

```bash
docker-compose up -d
```

This starts a PostgreSQL container with the following credentials:
- Database: `radiocalico_dev`
- User: `dev_user`
- Password: `dev_password`
- Port: `5432`

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies (if needed)

```bash
pip install -r requirements.txt
```

### 4. Run the Application

```bash
python app.py
```

The server will start at `http://localhost:5000`

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check (includes database status)
- `GET /users` - List all users

## Database Management

**View container logs:**
```bash
docker-compose logs -f postgres
```

**Access PostgreSQL CLI:**
```bash
docker exec -it radiocalico_postgres psql -U dev_user -d radiocalico_dev
```

**Stop the database:**
```bash
docker-compose down
```

**Stop and remove data:**
```bash
docker-compose down -v
```

## Development Notes

- The `.env` file contains configuration (excluded from git by default)
- Database tables are automatically created when you run `app.py`
- The app runs in debug mode with auto-reload enabled
- Change `SECRET_KEY` in `.env` for production use

## Project Structure

```
radiocalico/
├── app.py                 # Main Flask application
├── docker-compose.yml     # PostgreSQL container configuration
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (database credentials, etc.)
├── venv/                  # Python virtual environment
└── README.md             # This file
```
