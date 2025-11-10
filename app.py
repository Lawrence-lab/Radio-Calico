import os
import requests
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# Use SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///radiocalico.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Enable CORS for API endpoints
CORS(app)

# Initialize database
db = SQLAlchemy(app)


# Example model
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }


# Song model
class Song(db.Model):
    __tablename__ = 'songs'

    id = db.Column(db.Integer, primary_key=True)
    artist = db.Column(db.String(200), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    album = db.Column(db.String(200), nullable=True)

    # Relationships
    ratings = db.relationship('Rating', backref='song', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Song {self.artist} - {self.title}>'

    def to_dict(self):
        thumbs_up = sum(1 for r in self.ratings if r.rating_type == 'up')
        thumbs_down = sum(1 for r in self.ratings if r.rating_type == 'down')

        return {
            'id': self.id,
            'artist': self.artist,
            'title': self.title,
            'album': self.album,
            'thumbs_up': thumbs_up,
            'thumbs_down': thumbs_down
        }


# Rating model
class Rating(db.Model):
    __tablename__ = 'ratings'

    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    user_identifier = db.Column(db.String(100), nullable=False)  # Browser fingerprint/UUID
    rating_type = db.Column(db.String(10), nullable=False)  # 'up' or 'down'
    created_at = db.Column(db.DateTime, default=db.func.now())

    # Unique constraint: one rating per user per song
    __table_args__ = (
        db.UniqueConstraint('song_id', 'user_identifier', name='unique_user_song_rating'),
    )

    def __repr__(self):
        return f'<Rating {self.rating_type} for Song {self.song_id}>'


# Routes
@app.route('/')
def index():
    """Radio player home page"""
    return render_template('player.html')


@app.route('/admin')
def admin():
    """Admin page with user management"""
    users = User.query.all()
    return render_template('admin.html', users=users)


@app.route('/add-user', methods=['POST'])
def add_user():
    """Handle user creation from form"""
    username = request.form.get('username', '').strip()
    email = request.form.get('email', '').strip()

    # Validation
    if not username or not email:
        flash('Username and email are required!', 'error')
        return redirect(url_for('admin'))

    if len(username) < 3:
        flash('Username must be at least 3 characters long!', 'error')
        return redirect(url_for('admin'))

    # Check if user already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        if existing_user.username == username:
            flash(f'Username "{username}" is already taken!', 'error')
        else:
            flash(f'Email "{email}" is already registered!', 'error')
        return redirect(url_for('admin'))

    try:
        # Create new user
        new_user = User(username=username, email=email)
        db.session.add(new_user)
        db.session.commit()
        flash(f'User "{username}" added successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error adding user: {str(e)}', 'error')

    return redirect(url_for('admin'))


@app.route('/api')
def api_index():
    """API welcome endpoint"""
    return jsonify({
        'message': 'Welcome to RadioCalico API!',
        'status': 'running',
        'database': 'connected'
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'

    return jsonify({
        'status': 'ok',
        'database': db_status
    })


@app.route('/users')
def get_users():
    """Get all users"""
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])


@app.route('/api/now-playing')
def now_playing():
    """Get current track and recently played tracks from CloudFront metadata"""
    try:
        response = requests.get('https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json', timeout=5)
        response.raise_for_status()
        metadata = response.json()

        # Format the response
        return jsonify({
            'success': True,
            'current_track': {
                'artist': metadata.get('artist', 'Unknown Artist'),
                'title': metadata.get('title', 'Unknown Title'),
                'album': metadata.get('album', ''),
                'date': metadata.get('date', ''),
                'bit_depth': metadata.get('bit_depth', 0),
                'sample_rate': metadata.get('sample_rate', 0),
                'is_new': metadata.get('is_new', False),
                'is_summer': metadata.get('is_summer', False),
                'is_vidgames': metadata.get('is_vidgames', False),
                'is_explicit': metadata.get('is_explicit', False)
            },
            'recently_played': [
                {
                    'artist': metadata.get('prev_artist_1', ''),
                    'title': metadata.get('prev_title_1', '')
                },
                {
                    'artist': metadata.get('prev_artist_2', ''),
                    'title': metadata.get('prev_title_2', '')
                },
                {
                    'artist': metadata.get('prev_artist_3', ''),
                    'title': metadata.get('prev_title_3', '')
                },
                {
                    'artist': metadata.get('prev_artist_4', ''),
                    'title': metadata.get('prev_title_4', '')
                },
                {
                    'artist': metadata.get('prev_artist_5', ''),
                    'title': metadata.get('prev_title_5', '')
                }
            ]
        })
    except requests.RequestException as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/rate-song', methods=['POST'])
def rate_song():
    """Submit a rating for a song"""
    try:
        data = request.json
        artist = data.get('artist', '').strip()
        title = data.get('title', '').strip()
        album = data.get('album', '').strip()
        rating_type = data.get('rating_type', '').lower()
        user_identifier = data.get('user_identifier', '').strip()

        # Validate input
        if not artist or not title:
            return jsonify({'success': False, 'error': 'Artist and title are required'}), 400

        if rating_type not in ['up', 'down']:
            return jsonify({'success': False, 'error': 'Invalid rating type'}), 400

        if not user_identifier:
            return jsonify({'success': False, 'error': 'User identifier is required'}), 400

        # Find or create song
        song = Song.query.filter_by(artist=artist, title=title, album=album).first()
        if not song:
            song = Song(artist=artist, title=title, album=album)
            db.session.add(song)
            db.session.flush()  # Get the song ID

        # Check if user already rated this song
        existing_rating = Rating.query.filter_by(
            song_id=song.id,
            user_identifier=user_identifier
        ).first()

        if existing_rating:
            # Update existing rating
            existing_rating.rating_type = rating_type
        else:
            # Create new rating
            new_rating = Rating(
                song_id=song.id,
                user_identifier=user_identifier,
                rating_type=rating_type
            )
            db.session.add(new_rating)

        db.session.commit()

        # Get updated counts
        song_data = song.to_dict()

        return jsonify({
            'success': True,
            'message': 'Rating submitted successfully',
            'song': song_data
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/song-ratings', methods=['GET'])
def get_song_ratings():
    """Get ratings for a specific song"""
    artist = request.args.get('artist', '').strip()
    title = request.args.get('title', '').strip()
    album = request.args.get('album', '').strip()
    user_identifier = request.args.get('user_identifier', '').strip()

    if not artist or not title:
        return jsonify({'success': False, 'error': 'Artist and title are required'}), 400

    # Find song
    song = Song.query.filter_by(artist=artist, title=title, album=album).first()

    if not song:
        return jsonify({
            'success': True,
            'thumbs_up': 0,
            'thumbs_down': 0,
            'user_rating': None
        })

    # Get user's rating if user_identifier provided
    user_rating = None
    if user_identifier:
        rating = Rating.query.filter_by(
            song_id=song.id,
            user_identifier=user_identifier
        ).first()
        if rating:
            user_rating = rating.rating_type

    song_data = song.to_dict()
    song_data['user_rating'] = user_rating

    return jsonify({
        'success': True,
        'thumbs_up': song_data['thumbs_up'],
        'thumbs_down': song_data['thumbs_down'],
        'user_rating': user_rating
    })


# Database initialization
def init_db():
    """Create all database tables"""
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")


if __name__ == '__main__':
    # Create tables if they don't exist
    init_db()

    # Run the development server
    print("\n" + "="*50)
    print("RadioCalico Development Server")
    print("="*50)
    print("Server running at: http://localhost:5000")
    print("\nWeb UI:")
    print("  - GET  /            : Home page with user form")
    print("\nAPI Endpoints:")
    print("  - GET  /api         : API welcome message")
    print("  - GET  /health      : Health check")
    print("  - GET  /users       : List all users (JSON)")
    print("  - POST /add-user    : Add new user")
    print("="*50 + "\n")

    app.run(debug=True, host='0.0.0.0', port=5000)
