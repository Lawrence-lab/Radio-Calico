# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RadioCalico is a Flask-based web radio player application that streams high-quality audio (24-bit/48kHz lossless) from CloudFront. The app features a radio player UI, song rating system, and admin panel for user management.

## Development Commands

### Running the Application

```bash
# Activate virtual environment (Windows)
venv\Scripts\activate

# Activate virtual environment (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask development server
python app.py
```

The application runs on `http://localhost:5000` with auto-reload enabled in debug mode.

### Database Management

The app uses SQLite by default (`sqlite:///radiocalico.db`). PostgreSQL is supported via Docker:

```bash
# Start PostgreSQL container
docker-compose up -d

# View PostgreSQL logs
docker-compose logs -f postgres

# Access PostgreSQL CLI
docker exec -it radiocalico_postgres psql -U dev_user -d radiocalico_dev

# Stop database
docker-compose down

# Stop and remove data volumes
docker-compose down -v
```

Note: Currently the app is configured to use SQLite (see `app.py:14`), not PostgreSQL. To switch to PostgreSQL, update the `SQLALCHEMY_DATABASE_URI` in `app.py`.

## Architecture

### File Structure

```
radiocalico/
├── app.py                          # Main Flask application with routes and models
├── index.html                      # Standalone radio player page (root-level)
├── requirements.txt                # Python dependencies
├── .env                            # Environment variables (not in git)
├── docker-compose.yml              # PostgreSQL database container config
├── stream_URL.txt                  # HLS stream URL reference
├── CLAUDE.md                       # This file - project documentation
├── RadioCalico_Style_Guide.txt     # Brand guidelines and design system
├── RadioCalicoLogoTM.png          # Logo image file
├── radiocalico.db                  # SQLite database (auto-generated)
│
├── venv/                           # Python virtual environment (not in git)
│
├── templates/                      # Jinja2 HTML templates (Flask-served)
│   ├── player.html                # Main radio player (route: /)
│   ├── admin.html                 # User management panel (route: /admin)
│   └── index.html                 # Legacy template with metadata widgets
│
└── static/                         # Static assets (CSS, JS, images)
    ├── logo.png                   # Logo for templates
    ├── player.css                 # Styles for index.html (root-level)
    ├── player.js                  # JavaScript for index.html (root-level)
    └── index.css                  # Styles for templates/index.html
```

**Key Files:**
- **Root `index.html`**: Standalone player page with HLS streaming, metadata display, and rating system. Uses `static/player.css` and `static/player.js`.
- **`templates/player.html`**: Flask-served main player interface (route: `/`).
- **`templates/index.html`**: Flask-served legacy page with track history. Uses `static/index.css`.
- **`app.py`**: Contains all Flask routes, SQLAlchemy models (User, Song, Rating), and database configuration.

### Application Structure

- **Flask Backend** (`app.py`): Main application file containing all routes, models, and database configuration
- **Database**: SQLAlchemy ORM with three models:
  - `User`: User accounts (username, email)
  - `Song`: Song metadata (artist, title, album) with relationship to ratings
  - `Rating`: User ratings for songs (thumbs up/down) with unique constraint per user/song
- **Templates**: HTML templates using Jinja2
  - `player.html`: Main radio player interface (route: `/`)
  - `admin.html`: User management admin panel (route: `/admin`)
  - `index.html`: Legacy template
- **Static Assets**: Logo and other static files in `/static`

### Key Routes

**Web Pages:**
- `GET /` - Radio player home page
- `GET /admin` - Admin panel with user management
- `POST /add-user` - Form handler for creating users

**API Endpoints:**
- `GET /api` - API welcome message
- `GET /health` - Health check with database status
- `GET /users` - List all users (JSON)
- `GET /api/now-playing` - Fetch current track metadata from CloudFront
- `GET /api/song-ratings?artist=X&title=Y&album=Z&user_identifier=UUID` - Get ratings for a song
- `POST /api/rate-song` - Submit song rating (requires: artist, title, album, rating_type, user_identifier)

### External Dependencies

**Stream Source:**
- HLS stream URL: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8` (stored in `stream_URL.txt`)
- Metadata endpoint: `https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json`

**Metadata Structure:**
The metadata endpoint returns current track info plus 5 previous tracks with fields like:
- `artist`, `title`, `album`, `date`
- `bit_depth`, `sample_rate`
- Boolean flags: `is_new`, `is_summer`, `is_vidgames`, `is_explicit`
- Previous tracks: `prev_artist_1` through `prev_artist_5`, `prev_title_1` through `prev_title_5`

### Database Initialization

The database is automatically initialized on application startup via `init_db()` which calls `db.create_all()` (see `app.py:337-348`). Tables are created if they don't exist.

## Brand Guidelines

The project includes detailed brand guidelines in `RadioCalico_Style_Guide.txt`. Key design elements:

**Color Palette:**
- Mint (#D8F2D5) - Logo circle, backgrounds, accents
- Forest Green (#1F4E23) - Borders, primary buttons, headings
- Teal (#38A29D) - Nav bar, headphone ear-cups
- Calico Orange (#EFA63C) - Call-to-action elements
- Charcoal (#231F20) - Body text, icons
- Cream (#F5EADA) - Secondary backgrounds
- White (#FFFFFF) - Text on dark backgrounds

**Typography:**
- Headings: Montserrat (weights: 700/600/500)
- Body: Open Sans (weight: 400)
- Fallback: `"Montserrat", "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

**Tone:**
- Friendly & inviting
- Expert & trustworthy (emphasize "24-bit / 48 kHz lossless")
- Ad-free, data-free, subscription-free

## Configuration

Environment variables are stored in `.env`:
- `DATABASE_URL` - Database connection string (currently commented for SQLite)
- `FLASK_APP` - Entry point (`app.py`)
- `FLASK_ENV` - Environment mode (`development`)
- `SECRET_KEY` - Flask secret key (change for production)

## Important Notes

- The app uses SQLite by default despite having PostgreSQL in docker-compose. The connection string in `app.py` is hardcoded to SQLite.
- Database tables are created automatically on startup, no migrations needed for development.
- CORS is enabled for all API endpoints via Flask-CORS.
- The rating system uses a `user_identifier` (browser fingerprint/UUID) instead of authenticated users.
- Song ratings enforce a unique constraint: one rating per user per song (updates are allowed).

## Style Guide
- A text version of the styling guide for the webpage is at "RadioCalico_Style_Guide.txt"
- The Radio Caligo logo is at "RadioCalicoLogoTM.png"