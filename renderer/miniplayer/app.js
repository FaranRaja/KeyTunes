const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const progressFill = document.getElementById('progress-fill');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const volSlider = document.getElementById('volume-slider');
const artImg = document.getElementById('art-img');

let currentArtKey = '';

async function fetchAlbumArt(title, artist) {
  try {
    const query = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

function updateSliderTrack(val) {
  const pct = val * 100;
  volSlider.style.background = `linear-gradient(to right, var(--amber) ${pct}%, var(--surface-raised) ${pct}%)`;
}

function renderState(status) {
  if (!status || !status.active) {
    titleEl.textContent = 'Spotify not detected';
    artistEl.textContent = '\u00A0';
    progressFill.style.width = '0%';
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    artImg.style.display = 'none';
    artImg.src = '';
    currentArtKey = '';
    return;
  }

  titleEl.textContent = status.title || 'Unknown track';
  artistEl.textContent = status.artist || '\u00A0';

  const newArtKey = `${status.title}-${status.artist}`;
  if (newArtKey !== currentArtKey) {
    currentArtKey = newArtKey;
    
    if (status.thumbnail) {
      artImg.src = "data:image/jpeg;base64," + status.thumbnail;
      artImg.style.display = 'block';
    } else {
      artImg.style.display = 'none';
      artImg.src = '';
    }

    if (status.title && status.artist) {
      fetchAlbumArt(status.title, status.artist).then(artUrl => {
        if (artUrl && currentArtKey === newArtKey) {
          artImg.src = artUrl;
          artImg.style.display = 'block';
        }
      });
    }
  }

  const pct = status.durationMs
    ? Math.min(100, (status.positionMs / status.durationMs) * 100)
    : 0;
  progressFill.style.width = `${pct}%`;

  if (status.isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }

  if (status.volume !== undefined && status.volume >= 0 && document.activeElement !== volSlider) {
    volSlider.value = status.volume;
    updateSliderTrack(status.volume);
  }
}

document.getElementById('playpause').addEventListener('click', () => {
  window.api.playerAction({ type: 'playPause' });
});
document.getElementById('next').addEventListener('click', () => {
  window.api.playerAction({ type: 'next' });
});
document.getElementById('prev').addEventListener('click', () => {
  window.api.playerAction({ type: 'previous' });
});

volSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  updateSliderTrack(val);
  window.api.setVolume(val);
});

window.api.onTrackUpdate(renderState);

// Initial fetch on load
window.api.getStatus().then(renderState);
