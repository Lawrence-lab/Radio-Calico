const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const playIcon = document.getElementById('playIcon');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const statusElement = document.getElementById('status');
const errorMessage = document.getElementById('errorMessage');

const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';

let hls;
let isPlaying = false;

// Set initial volume
audio.volume = volumeSlider.value / 100;

// Initialize HLS
function initPlayer() {
    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('HLS manifest loaded, stream ready to play');
            playButton.disabled = false;
            updateStatus('offline');
        });

        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS error:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showError('Network error - attempting to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        showError('Media error - attempting to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        showError('Fatal error - cannot recover');
                        updateStatus('offline');
                        destroyPlayer();
                        break;
                }
            }
        });

    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        audio.src = streamUrl;
        playButton.disabled = false;
        updateStatus('offline');
    } else {
        showError('HLS is not supported in this browser');
    }
}

function destroyPlayer() {
    if (hls) {
        hls.destroy();
        hls = null;
    }
}

function updateStatus(status) {
    statusElement.className = 'status ' + status;
    switch(status) {
        case 'live':
            statusElement.textContent = '🔴 LIVE';
            break;
        case 'connecting':
            statusElement.textContent = '⏳ Connecting...';
            break;
        case 'offline':
            statusElement.textContent = '⚫ Offline';
            break;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Play/Pause toggle
playButton.addEventListener('click', function() {
    if (isPlaying) {
        audio.pause();
        playIcon.textContent = '▶';
        isPlaying = false;
        updateStatus('offline');
    } else {
        updateStatus('connecting');
        audio.play().then(() => {
            playIcon.textContent = '⏸';
            isPlaying = true;
            updateStatus('live');
        }).catch((error) => {
            console.error('Play error:', error);
            showError('Failed to play stream: ' + error.message);
            updateStatus('offline');
        });
    }
});

// Volume control
volumeSlider.addEventListener('input', function() {
    const volume = this.value;
    audio.volume = volume / 100;
    volumeValue.textContent = volume + '%';
});

// Audio event listeners
audio.addEventListener('playing', function() {
    updateStatus('live');
});

audio.addEventListener('pause', function() {
    updateStatus('offline');
});

audio.addEventListener('waiting', function() {
    updateStatus('connecting');
});

audio.addEventListener('error', function(e) {
    console.error('Audio error:', e);
    showError('Playback error occurred');
    updateStatus('offline');
});

// Initialize player on page load
initPlayer();

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (audio) {
        audio.pause();
    }
    destroyPlayer();
});

// Get or create unique user identifier
function getUserIdentifier() {
    let userId = localStorage.getItem('radio_calico_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('radio_calico_user_id', userId);
    }
    return userId;
}

// Store current track info globally
let currentTrack = null;

// Metadata fetching and display
async function updateNowPlaying() {
    try {
        const response = await fetch('https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json');
        const metadata = await response.json();

        if (metadata) {
            currentTrack = {
                artist: metadata.artist || 'Unknown Artist',
                title: metadata.title || 'Unknown Title',
                album: metadata.album || ''
            };
            updateNowPlayingWidget(metadata);
            updateRecentlyPlayedWidget(metadata);
            await fetchAndDisplayRatings();
        } else {
            showMetadataError('Failed to load track information');
        }
    } catch (error) {
        console.error('Error fetching metadata:', error);
        showMetadataError('Unable to load track information');
    }
}

function updateNowPlayingWidget(metadata) {
    const container = document.getElementById('nowPlaying');

    // Create badges HTML
    let badgesHtml = '';
    if (metadata.is_new) badgesHtml += '<span class="badge new">NEW</span>';
    if (metadata.is_explicit) badgesHtml += '<span class="badge explicit">EXPLICIT</span>';
    if (metadata.is_summer) badgesHtml += '<span class="badge summer">SUMMER</span>';
    if (metadata.is_vidgames) badgesHtml += '<span class="badge vidgames">VIDEO GAMES</span>';

    const badgesSection = badgesHtml ? `<div class="track-badges">${badgesHtml}</div>` : '';

    // Format audio quality
    const audioQuality = metadata.bit_depth && metadata.sample_rate
        ? `${metadata.bit_depth}-bit / ${(metadata.sample_rate / 1000).toFixed(1)} kHz`
        : '';

    const audioQualitySection = audioQuality
        ? `<div class="audio-quality">${audioQuality}</div>`
        : '';

    const albumYear = metadata.album && metadata.date
        ? `${metadata.album} (${metadata.date})`
        : metadata.album || '';

    const artist = metadata.artist || 'Unknown Artist';
    const title = metadata.title || 'Unknown Title';

    container.innerHTML = `
        <h2>Now Playing</h2>
        <div class="track-info">
            <div class="album-art" id="albumArt">
                <span class="placeholder">🎵</span>
            </div>
            <div class="track-details">
                <div class="track-title">${title}</div>
                <div class="track-artist">${artist}</div>
                ${albumYear ? `<div class="track-album">${albumYear}</div>` : ''}
                ${audioQualitySection}
                ${badgesSection}
            </div>
        </div>
        <div class="rating-container">
            <div class="rating-buttons">
                <button class="rating-btn thumbs-up" id="thumbsUpBtn" onclick="rateSong('up')">
                    <span class="icon">👍</span>
                    <span class="count" id="thumbsUpCount">0</span>
                </button>
                <button class="rating-btn thumbs-down" id="thumbsDownBtn" onclick="rateSong('down')">
                    <span class="icon">👎</span>
                    <span class="count" id="thumbsDownCount">0</span>
                </button>
            </div>
        </div>
    `;

    // Load album art image
    loadAlbumArt();
}

function loadAlbumArt() {
    const albumArtContainer = document.getElementById('albumArt');
    if (!albumArtContainer) return;

    const coverUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg';

    // Add cache-busting parameter to ensure we get the latest image
    const img = new Image();
    img.src = `${coverUrl}?t=${Date.now()}`;

    img.onload = function() {
        albumArtContainer.innerHTML = `<img src="${img.src}" alt="Album Art">`;
    };

    img.onerror = function() {
        // Keep the placeholder if the image fails to load
        console.log('Album art not available, using placeholder');
    };
}

function updateRecentlyPlayedWidget(metadata) {
    const container = document.getElementById('recentlyPlayed');

    // Build tracks array from metadata
    const tracks = [];
    for (let i = 1; i <= 5; i++) {
        const artist = metadata[`prev_artist_${i}`];
        const title = metadata[`prev_title_${i}`];
        if (artist && title) {
            tracks.push({ artist, title });
        }
    }

    if (tracks.length === 0) {
        container.innerHTML = `
            <h2>Recently Played</h2>
            <div class="loading">No recently played tracks available</div>
        `;
        return;
    }

    const tracksHtml = tracks.map((track, index) => `
        <div class="recent-track">
            <div class="recent-track-number">${index + 1}</div>
            <div class="recent-track-info">
                <div class="recent-track-title">${track.title}</div>
                <div class="recent-track-artist">${track.artist}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <h2>Recently Played</h2>
        ${tracksHtml}
    `;
}

function showMetadataError(message) {
    const nowPlayingContainer = document.getElementById('nowPlaying');
    const recentlyPlayedContainer = document.getElementById('recentlyPlayed');

    nowPlayingContainer.innerHTML = `
        <h2>Now Playing</h2>
        <div class="metadata-error">${message}</div>
    `;

    recentlyPlayedContainer.innerHTML = `
        <h2>Recently Played</h2>
        <div class="metadata-error">${message}</div>
    `;
}

// Fetch and display ratings for current song
async function fetchAndDisplayRatings() {
    if (!currentTrack) return;

    try {
        const userId = getUserIdentifier();
        const params = new URLSearchParams({
            artist: currentTrack.artist,
            title: currentTrack.title,
            album: currentTrack.album,
            user_identifier: userId
        });

        const response = await fetch(`http://localhost:5000/api/song-ratings?${params}`);
        const data = await response.json();

        if (data.success) {
            updateRatingDisplay(data.thumbs_up, data.thumbs_down, data.user_rating);
        }
    } catch (error) {
        console.error('Error fetching ratings:', error);
    }
}

// Update the rating display with counts and user's selection
function updateRatingDisplay(thumbsUp, thumbsDown, userRating) {
    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');
    const thumbsUpCount = document.getElementById('thumbsUpCount');
    const thumbsDownCount = document.getElementById('thumbsDownCount');

    if (!thumbsUpBtn || !thumbsDownBtn) return;

    // Update counts
    thumbsUpCount.textContent = thumbsUp;
    thumbsDownCount.textContent = thumbsDown;

    // Remove active class from both buttons
    thumbsUpBtn.classList.remove('active');
    thumbsDownBtn.classList.remove('active');

    // Highlight user's rating
    if (userRating === 'up') {
        thumbsUpBtn.classList.add('active');
    } else if (userRating === 'down') {
        thumbsDownBtn.classList.add('active');
    }
}

// Submit a rating
async function rateSong(ratingType) {
    if (!currentTrack) {
        console.error('No current track to rate');
        return;
    }

    const userId = getUserIdentifier();

    // Disable buttons during submission
    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');
    thumbsUpBtn.disabled = true;
    thumbsDownBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:5000/api/rate-song', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                artist: currentTrack.artist,
                title: currentTrack.title,
                album: currentTrack.album,
                rating_type: ratingType,
                user_identifier: userId
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update display with new counts
            updateRatingDisplay(
                data.song.thumbs_up,
                data.song.thumbs_down,
                ratingType
            );
        } else {
            console.error('Failed to submit rating:', data.error);
            alert('Failed to submit rating. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Error submitting rating. Please check your connection.');
    } finally {
        // Re-enable buttons
        thumbsUpBtn.disabled = false;
        thumbsDownBtn.disabled = false;
    }
}

// Update metadata immediately on page load
updateNowPlaying();

// Update metadata every 10 seconds
setInterval(updateNowPlaying, 10000);
