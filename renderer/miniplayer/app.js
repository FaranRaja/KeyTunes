const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const progressFill = document.getElementById('progress-fill');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const volSlider = document.getElementById('volume-slider');

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
    return;
  }

  titleEl.textContent = status.title || 'Unknown track';
  artistEl.textContent = status.artist || '\u00A0';

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
