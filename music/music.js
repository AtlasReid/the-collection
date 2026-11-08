import { collectionAlbums as albums } from './catalogue.js';
import { createPlayer } from './player.js';

const $ = (query) => document.querySelector(query);
const collection = $('#collection');
const laptop = $('.laptop');
const drive = $('#drive');
const status = $('#desk-status');
const driveStatus = $('#drive-status');
const desktop = $('#desktop');
const loading = $('#screen-loading');
const loadingLabel = $('#loading-label');
const screenPlayer = $('#screen-player');
const playerRoot = $('#player-root');
const dialog = $('#player-dialog');
const expanded = $('#expanded-player');
const expandButton = $('#expand-player');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let currentAlbum = null;
let busy = false;
let operation = 0;
let noticeTimer;
let flight = null;
let activeAnimation = null;

function notice(message) {
  clearTimeout(noticeTimer);
  $('#notice').textContent = message;
  $('#notice').hidden = false;
  noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 4800);
}

const player = createPlayer(playerRoot, { albums, onEject: eject, onNotice: notice });
const buttons = new Map();
for (const album of albums) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cd-case';
  const provider = album.appleMusicURL ? 'Apple Music links and matched SoundCloud tracks' : album.bandcampAlbumId ? 'Bandcamp album' : 'SoundCloud album';
  button.setAttribute('aria-label', `Load ${album.title} by ${album.artist}, ${provider}, virtual CD`);
  button.setAttribute('aria-pressed', 'false');
  button.dataset.album = album.id;
  const jewel = document.createElement('span');
  jewel.className = 'jewel';
  const spine = document.createElement('span');
  spine.className = 'case-spine';
  const cover = document.createElement('img');
  cover.src = album.cover;
  cover.alt = '';
  cover.draggable = false;
  jewel.append(spine, cover);
  const tooltip = document.createElement('span');
  tooltip.className = 'album-tooltip';
  tooltip.textContent = album.title;
  const artist = document.createElement('span');
  artist.textContent = album.artist;
  tooltip.append(artist);
  button.append(jewel, tooltip);
  button.addEventListener('click', () => loadDisc(album, button));
  collection.append(button);
  buttons.set(album.id, button);
}
$('#disc-count').textContent = String(albums.length).padStart(2, '0');

function markSelected(id) {
  for (const [albumId, button] of buttons) {
    button.setAttribute('aria-pressed', String(albumId === id));
    button.classList.toggle('is-empty', albumId === id);
  }
}

function sizePlayer() {
  const container = playerRoot.parentElement;
  if (!container) return;
  const isExpandedMobile = dialog.open && innerWidth <= 700;
  // A full-size horizontal player remains scrollable on a phone, preserving
  // usable controls instead of squeezing the entire desktop UI to tiny text.
  const scale = isExpandedMobile ? Math.min(1, Math.max(.74, container.clientWidth / 800)) : Math.min(container.clientWidth / 800, container.clientHeight / 490);
  playerRoot.style.transform = `scale(${scale})`;
  if (isExpandedMobile) {
    playerRoot.style.marginBottom = `${-490 * (1 - scale)}px`;
    container.style.setProperty('--player-width', `${800 * scale}px`);
  } else {
    playerRoot.style.marginBottom = '';
  }
}
const resizeObserver = new ResizeObserver(sizePlayer);
resizeObserver.observe($('.laptop-screen'));
resizeObserver.observe(expanded);
window.addEventListener('resize', sizePlayer);

function openPlayer() {
  if ((!currentAlbum && !player.hasLibrary) || busy || dialog.open) return;
  player.showWindow();
  expanded.append(playerRoot);
  dialog.showModal();
  sizePlayer();
}
function closePlayer() {
  if (dialog.open) dialog.close();
  screenPlayer.append(playerRoot);
  sizePlayer();
}
expandButton.addEventListener('click', openPlayer);
$('#close-player').addEventListener('click', closePlayer);
dialog.addEventListener('close', () => {
  if (playerRoot.parentElement !== screenPlayer) {
    screenPlayer.append(playerRoot);
    sizePlayer();
  }
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePlayer();
  }
});

async function animateDisc(album, button, reverse = false) {
  if (reducedMotion.matches) return;
  const source = button.getBoundingClientRect();
  const target = $('.drive-slot').getBoundingClientRect();
  const size = Math.min(source.width * .92, 160);
  flight = document.createElement('div');
  flight.className = 'flying-disc';
  flight.style.width = `${size}px`;
  flight.style.height = `${size}px`;
  flight.style.setProperty('--cover', `url("${new URL(album.cover, location.href).href}")`);
  document.body.append(flight);
  const startX = source.left + (source.width - size) / 2;
  const startY = source.top + (source.height - size) / 2;
  const endX = target.left + target.width / 2 - size / 2;
  const endY = target.top - size * .48;
  const frames = [
    { transform: `translate(${startX}px,${startY}px) rotate(0deg) scale(1)`, opacity: 1 },
    { transform: `translate(${(startX + endX) / 2}px,${Math.min(startY, endY) - 65}px) rotate(165deg) scale(.85)`, opacity: 1, offset: .48 },
    { transform: `translate(${endX}px,${endY}px) rotate(330deg) scale(.5,.09)`, opacity: 1, offset: .83 },
    { transform: `translate(${endX}px,${endY - size * .03}px) rotate(330deg) scale(.45,.015)`, opacity: 0 }
  ];
  activeAnimation = flight.animate(reverse ? [...frames].reverse().map(({offset, ...frame}) => frame) : frames, { duration: reverse ? 850 : 1450, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
  try { await activeAnimation.finished; } catch { /* Resize/navigation can cancel safely. */ }
  flight?.remove();
  flight = null;
  activeAnimation = null;
}

async function loadDisc(album, button) {
  if (busy) return;
  if (currentAlbum?.id === album.id) { openPlayer(); return; }
  const token = ++operation;
  busy = true;
  closePlayer();
  player.clear();
  currentAlbum = null;
  markSelected(null);
  for (const b of buttons.values()) b.disabled = true;
  expandButton.disabled = true;
  loading.hidden = false;
  screenPlayer.hidden = true;
  desktop.hidden = false;
  loadingLabel.textContent = 'Reading disc…';
  drive.classList.add('is-loading');
  driveStatus.textContent = 'READING DISC';
  status.textContent = `Loading ${album.title}…`;
  await animateDisc(album, button);
  if (token !== operation) return;
  currentAlbum = album;
  player.loadAlbum(album);
  markSelected(album.id);
  desktop.hidden = true;
  loading.hidden = true;
  screenPlayer.hidden = false;
  drive.classList.remove('is-loading');
  driveStatus.textContent = 'AUDIO CD LOADED';
  status.textContent = `${album.title} · ${album.artist}`;
  for (const b of buttons.values()) b.disabled = false;
  expandButton.disabled = false;
  busy = false;
  sizePlayer();
  if (innerWidth <= 700) openPlayer();
}

async function eject() {
  if (busy || !currentAlbum) return;
  const album = currentAlbum;
  busy = true;
  ++operation;
  closePlayer();
  player.clear();
  currentAlbum = null;
  expandButton.disabled = true;
  screenPlayer.hidden = true;
  desktop.hidden = false;
  driveStatus.textContent = 'EJECTING';
  drive.classList.add('is-loading');
  status.textContent = `Returning ${album.title} to its case…`;
  for (const b of buttons.values()) b.disabled = true;
  await animateDisc(album, buttons.get(album.id), true);
  markSelected(null);
  drive.classList.remove('is-loading');
  driveStatus.textContent = 'APPLE SUPERDRIVE';
  status.textContent = 'Choose any CD to start listening';
  for (const b of buttons.values()) b.disabled = false;
  busy = false;
  if (player.hasLibrary) {
    expandButton.disabled = false;
    screenPlayer.hidden = false;
    desktop.hidden = true;
  }
  buttons.get(album.id).focus({ preventScroll: true });
}

reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) activeAnimation?.finish(); });
window.addEventListener('pagehide', () => { player.destroy(); clearTimeout(noticeTimer); resizeObserver.disconnect(); activeAnimation?.cancel(); });
window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
if (player.hasLibrary) {
  expandButton.disabled = false;
  screenPlayer.hidden = false;
  desktop.hidden = true;
}
sizePlayer();
