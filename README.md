# RadioCalico

![RadioCalico Logo](RadioCalicoLogoTM.png)

A Flask-based web radio player that streams **high-quality lossless audio (24-bit / 48 kHz)** from CloudFront. RadioCalico features a modern player interface, song rating system, and admin panel for user management.

**Ad-free. Data-free. Subscription-free.**

## Features

- **HLS Audio Streaming**: High-quality lossless audio streaming via HTTP Live Streaming
- **Real-time Metadata**: Display current track information (artist, title, album) from CloudFront
- **Song Rating System**: Thumbs up/down rating with user-specific tracking
- **Admin Panel**: User management interface
- **REST API**: CORS-enabled API for metadata and ratings
- **Responsive Design**: Modern UI following RadioCalico brand guidelines

## Stack

- **Backend**: Flask (Python 3.11+)
- **Database**: SQLAlchemy ORM with SQLite (PostgreSQL supported)
- **Frontend**: Vanilla JavaScript with HLS.js for audio streaming
- **Streaming**: CloudFront CDN serving HLS streams

## Prerequisites

- Python 3.11+
- (Optional) Docker Desktop for PostgreSQL

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Lawrence-lab/Radio-Calico.git
cd Radio-Calico
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

```bash
python app.py
```

The application will start at **http://localhost:5000** with auto-reload enabled in debug mode.

## Project Structure

```
radiocalico/
├── app.py                          # Main Flask application with routes and models
├── index.html                      # Standalone radio player page (root-level)
├── requirements.txt                # Python dependencies
├── .env                            # Environment variables (not in git)
├── docker-compose.yml              # PostgreSQL database container config
├── stream_URL.txt                  # HLS stream URL reference
├── CLAUDE.md                       # Project documentation for Claude Code
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

## Routes

### Web Pages
- `GET /` - Radio player home page
- `GET /admin` - Admin panel with user management
- `POST /add-user` - Form handler for creating users

### API Endpoints
- `GET /api` - API welcome message
- `GET /health` - Health check with database status
- `GET /users` - List all users (JSON)
- `GET /api/now-playing` - Fetch current track metadata from CloudFront
- `GET /api/song-ratings` - Get ratings for a song
  - Query params: `artist`, `title`, `album`, `user_identifier` (UUID)
- `POST /api/rate-song` - Submit song rating
  - Body: `artist`, `title`, `album`, `rating_type` (thumbs_up/thumbs_down), `user_identifier`

## Database Models

The application uses SQLAlchemy with three main models:

### User
- `id` (Integer, Primary Key)
- `username` (String, Unique)
- `email` (String, Unique)

### Song
- `id` (Integer, Primary Key)
- `artist` (String)
- `title` (String)
- `album` (String)
- Unique constraint on (artist, title, album)
- Relationship to `Rating` model

### Rating
- `id` (Integer, Primary Key)
- `song_id` (Foreign Key to Song)
- `user_identifier` (String) - Browser fingerprint/UUID
- `rating_type` (String) - "thumbs_up" or "thumbs_down"
- Unique constraint on (song_id, user_identifier)

## Streaming & Metadata

**HLS Stream URL:**
```
https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8
```

**Metadata Endpoint:**
```
https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json
```

The metadata endpoint returns current track info plus 5 previous tracks with fields including:
- `artist`, `title`, `album`, `date`
- `bit_depth`, `sample_rate`
- Boolean flags: `is_new`, `is_summer`, `is_vidgames`, `is_explicit`
- Previous tracks: `prev_artist_1` through `prev_artist_5`, etc.

## Database Configuration

By default, the application uses **SQLite** (`sqlite:///radiocalico.db`). To switch to PostgreSQL:

### Using PostgreSQL with Docker

1. Start PostgreSQL container:
```bash
docker-compose up -d
```

2. Update `app.py` line 14 to use PostgreSQL connection string:
```python
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://dev_user:dev_password@localhost:5432/radiocalico_dev')
```

3. Access PostgreSQL CLI:
```bash
docker exec -it radiocalico_postgres psql -U dev_user -d radiocalico_dev
```

4. Stop database:
```bash
docker-compose down
```

## Brand Guidelines

RadioCalico follows a specific design system detailed in `RadioCalico_Style_Guide.txt`.

### Color Palette
- **Mint** (#D8F2D5) - Logo circle, backgrounds, accents
- **Forest Green** (#1F4E23) - Borders, primary buttons, headings
- **Teal** (#38A29D) - Nav bar, headphone ear-cups
- **Calico Orange** (#EFA63C) - Call-to-action elements
- **Charcoal** (#231F20) - Body text, icons
- **Cream** (#F5EADA) - Secondary backgrounds
- **White** (#FFFFFF) - Text on dark backgrounds

### Typography
- **Headings**: Montserrat (weights: 700/600/500)
- **Body**: Open Sans (weight: 400)
- **Fallback**: `"Montserrat", "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Tone
- Friendly & inviting
- Expert & trustworthy (emphasize "24-bit / 48 kHz lossless")
- Ad-free, data-free, subscription-free

## Configuration

Environment variables in `.env`:

```bash
# Database (optional - defaults to SQLite)
# DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/radiocalico_dev

# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development

# Security (change for production!)
SECRET_KEY=dev-secret-key-change-in-production
```

## Development Notes

- Database tables are automatically initialized on startup via `db.create_all()`
- CORS is enabled for all API endpoints via Flask-CORS
- The rating system uses `user_identifier` (browser fingerprint/UUID) instead of authenticated users
- Song ratings enforce a unique constraint: one rating per user per song (updates allowed)
- Debug mode is enabled by default for development

## Production Considerations

Before deploying to production:

1. **Change SECRET_KEY**: Generate a secure random key
2. **Database**: Use PostgreSQL for production
3. **Debug Mode**: Set `debug=False` in `app.run()`
4. **HTTPS**: Enable SSL/TLS
5. **Environment Variables**: Use proper environment variable management
6. **WSGI Server**: Use Gunicorn or uWSGI instead of Flask's development server

## Contributing

This is a personal project. For questions or suggestions, please open an issue.

## License

Copyright © RadioCalico. All rights reserved.
