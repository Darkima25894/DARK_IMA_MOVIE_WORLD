// public/script.js

// State
let state = {
  movies: [],
  currentPage: 1,
  totalPages: 1,
  searchQuery: '',
  currentFilter: 'all',
  currentSection: 'home',
  isLoading: false
};

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const searchStatus = document.getElementById('searchStatus');
const sectionTitle = document.getElementById('sectionTitle');
const movieCount = document.getElementById('movieCount');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const modal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const genreModal = document.getElementById('genreModal');
const aboutModal = document.getElementById('aboutModal');

// API Base URL
const API_BASE = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadHome();
});

// Navigation
function loadHome() {
  state.currentSection = 'home';
  state.searchQuery = '';
  searchInput.value = '';
  updateNavButtons('home');
  sectionTitle.textContent = '🔥 Trending Now';
  loadTrending();
}

function loadTrending() {
  state.currentSection = 'trending';
  updateNavButtons('trending');
  sectionTitle.textContent = '🔥 Trending Now';
  fetchTrending();
}

function showGenreSelector() {
  updateNavButtons('genres');
  openGenreModal();
}

function showAbout() {
  updateNavButtons('about');
  openAboutModal();
}

function updateNavButtons(active) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === active);
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Theme Toggle
function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.style.getPropertyValue('--bg-primary') === '#f5f5f5';
  
  if (isDark) {
    root.style.setProperty('--bg-primary', '#0a0a1a');
    root.style.setProperty('--bg-secondary', '#1a1a2e');
    root.style.setProperty('--bg-card', '#2d2d44');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#94a3b8');
    root.style.setProperty('--border-color', '#3d3d5c');
    document.querySelector('.theme-toggle').textContent = '🌙';
  } else {
    root.style.setProperty('--bg-primary', '#f5f5f5');
    root.style.setProperty('--bg-secondary', '#ffffff');
    root.style.setProperty('--bg-card', '#e8e8e8');
    root.style.setProperty('--text-primary', '#1a1a2e');
    root.style.setProperty('--text-secondary', '#4a4a6a');
    root.style.setProperty('--border-color', '#d0d0d0');
    document.querySelector('.theme-toggle').textContent = '☀️';
  }
}

// Search
function handleSearch(event) {
  if (event.key === 'Enter') {
    performSearch();
  }
}

function performSearch() {
  const query = searchInput.value.trim();
  if (query) {
    state.searchQuery = query;
    state.currentPage = 1;
    state.currentSection = 'search';
    sectionTitle.textContent = `🔍 Results for "${query}"`;
    fetchSearch(query, 1);
  }
}

function filterMovies(quality) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === quality || (quality === 'all' && btn.textContent === 'All'));
  });
  state.currentFilter = quality;
  // Re-render current movies with filter
  renderMovies(state.movies);
}

// API Functions
async function fetchTrending(page = 1) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE}/trending?page=${page}`);
    const data = await response.json();
    
    if (data.success) {
      if (page === 1) {
        state.movies = data.movies;
      } else {
        state.movies = [...state.movies, ...data.movies];
      }
      state.currentPage = page;
      state.totalPages = Math.ceil(data.total / 30);
      renderMovies(state.movies);
      updateMovieCount();
    } else {
      showError('Failed to load trending movies');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error loading movies');
  } finally {
    hideLoading();
  }
}

async function fetchSearch(query, page = 1) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}`);
    const data = await response.json();
    
    if (data.success) {
      if (page === 1) {
        state.movies = data.movies;
      } else {
        state.movies = [...state.movies, ...data.movies];
      }
      state.currentPage = page;
      state.totalPages = Math.ceil(data.total_results / 30);
      renderMovies(state.movies);
      updateMovieCount();
      searchStatus.textContent = `Found ${data.total_results} results for "${query}"`;
    } else {
      showError('No movies found');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error searching movies');
  } finally {
    hideLoading();
  }
}

async function fetchMovieDetails(url) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE}/movie?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.success) {
      showMovieDetails(data.details);
    } else {
      showError('Failed to load movie details');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error loading movie details');
  } finally {
    hideLoading();
  }
}

async function fetchGenres() {
  const genres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
    'Romance', 'Sci-Fi', 'Thriller', 'Western', 'Musical',
    'War', 'History', 'Sport', 'Family', 'Biography'
  ];
  
  const genreGrid = document.getElementById('genreGrid');
  genreGrid.innerHTML = '';
  
  genres.forEach(genre => {
    const item = document.createElement('div');
    item.className = 'genre-item';
    item.textContent = genre;
    item.onclick = () => {
      closeGenreModal();
      loadGenreMovies(genre);
    };
    genreGrid.appendChild(item);
  });
}

async function loadGenreMovies(genre) {
  state.currentSection = 'genres';
  state.searchQuery = genre;
  sectionTitle.textContent = `🎭 ${genre} Movies`;
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/genres?genre=${encodeURIComponent(genre)}&page=1`);
    const data = await response.json();
    
    if (data.success) {
      state.movies = data.movies;
      state.currentPage = 1;
      state.totalPages = Math.ceil(data.total / 30);
      renderMovies(state.movies);
      updateMovieCount();
    } else {
      showError('Failed to load genre movies');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error loading genre movies');
  } finally {
    hideLoading();
  }
}

// Render Functions
function renderMovies(movies) {
  if (!movies || movies.length === 0) {
    moviesGrid.innerHTML = `
      <div class="no-movies">
        <p style="text-align: center; color: var(--text-muted); padding: 40px;">
          No movies found. Try a different search.
        </p>
      </div>
    `;
    loadMoreContainer.style.display = 'none';
    return;
  }
  
  let filteredMovies = movies;
  if (state.currentFilter !== 'all') {
    // In a real app, you'd filter by quality from the movie data
    // For now, we'll just show all movies
    filteredMovies = movies;
  }
  
  moviesGrid.innerHTML = filteredMovies.map(movie => `
    <div class="movie-card" onclick="openMovie('${movie.url}')">
      <div class="movie-poster">
        <img src="${movie.poster || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22><rect fill=%22%232d2d44%22 width=%22200%22 height=%22300%22/><text x=%2250%22 y=%22150%22 fill=%22%2394a3b8%22 font-size=%2216%22>No Poster</text></svg>'}" 
             alt="${movie.title}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22><rect fill=%22%232d2d44%22 width=%22200%22 height=%22300%22/><text x=%2250%22 y=%22150%22 fill=%22%2394a3b8%22 font-size=%2216%22>No Poster</text></svg>'"
        />
        <div class="movie-overlay">
          <div class="play-icon">▶</div>
        </div>
        ${movie.rating && movie.rating !== 'N/A' ? `
          <div class="movie-rating">⭐ ${movie.rating}</div>
        ` : ''}
        ${movie.year && movie.year !== 'N/A' ? `
          <div class="movie-year">${movie.year}</div>
        ` : ''}
      </div>
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-quality">
          <span class="quality-badge">HD</span>
          <span class="quality-badge">1080p</span>
        </div>
      </div>
    </div>
  `).join('');
  
  // Show/hide load more button
  if (state.currentPage < state.totalPages) {
    loadMoreContainer.style.display = 'block';
  } else {
    loadMoreContainer.style.display = 'none';
  }
}

function updateMovieCount() {
  movieCount.textContent = `${state.movies.length} movies`;
}

function showMovieDetails(details) {
  const downloadLinks = details.download_links || {};
  const subtitleLinks = details.subtitle_links || [];
  const qualityOptions = details.quality_options || [];
  
  modalBody.innerHTML = `
    <div class="movie-details">
      ${details.poster ? `
        <img src="${details.poster}" alt="${details.title}" class="detail-poster" />
      ` : ''}
      <h1 class="detail-title">${details.title}</h1>
      
      <div class="detail-meta">
        ${details.year && details.year !== 'N/A' ? `<span>📅 ${details.year}</span>` : ''}
        ${details.duration && details.duration !== 'N/A' ? `<span>⏱️ ${details.duration}</span>` : ''}
        ${details.rating && details.rating !== 'N/A' ? `<span>⭐ ${details.rating}</span>` : ''}
        ${details.imdb_rating && details.imdb_rating !== 'N/A' ? `<span>🎬 IMDb ${details.imdb_rating}</span>` : ''}
      </div>
      
      ${details.genres && details.genres.length > 0 ? `
        <div class="detail-genres">
          ${details.genres.map(genre => `<span class="detail-genre">${genre}</span>`).join('')}
        </div>
      ` : ''}
      
      ${details.director && details.director !== 'Unknown' ? `
        <p><strong>Director:</strong> ${details.director}</p>
      ` : ''}
      
      ${details.synopsis ? `
        <div class="detail-synopsis">${details.synopsis}</div>
      ` : ''}
      
      ${details.cast && details.cast.length > 0 ? `
        <div>
          <h4>Cast</h4>
          <div class="detail-cast">
            ${details.cast.map(actor => `<span class="detail-cast-item">${actor}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${Object.keys(downloadLinks).length > 0 ? `
        <div>
          <h4>Download</h4>
          <div class="detail-actions">
            ${Object.entries(downloadLinks).map(([quality, links]) => 
              links.map(link => `
                <button class="detail-btn download" onclick="downloadMovie('${link.url}', '${quality}')">
                  ⬇️ Download ${quality}
                </button>
              `).join('')
            ).join('')}
          </div>
        </div>
      ` : `
        <div>
          <h4>Download</h4>
          <div class="detail-actions">
            ${qualityOptions.map(quality => `
              <button class="detail-btn download" onclick="downloadMovie('${details.url}', '${quality}')">
                ⬇️ Download ${quality}
              </button>
            `).join('')}
          </div>
        </div>
      `}
      
      ${subtitleLinks.length > 0 ? `
        <div class="detail-subtitles">
          <h4>📝 Subtitles</h4>
          <div class="subtitle-list">
            ${subtitleLinks.map(sub => `
              <span class="subtitle-item" onclick="downloadSubtitle('${sub.url}')">
                ${sub.language}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${details.trailer ? `
        <div>
          <button class="detail-btn trailer" onclick="window.open('${details.trailer}', '_blank')">
            ▶️ Watch Trailer
          </button>
        </div>
      ` : ''}
    </div>
  `;
  
  openModal();
}

// Modal Functions
function openModal() {
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function openGenreModal() {
  fetchGenres();
  genreModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeGenreModal() {
  genreModal.classList.remove('show');
  document.body.style.overflow = '';
}

function openAboutModal() {
  aboutModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
  aboutModal.classList.remove('show');
  document.body.style.overflow = '';
}

// Close modals on outside click
document.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
  if (e.target === genreModal) closeGenreModal();
  if (e.target === aboutModal) closeAboutModal();
});

// Movie Actions
function openMovie(url) {
  fetchMovieDetails(url);
}

function downloadMovie(url, quality) {
  if (url && url !== '#') {
    window.open(url, '_blank');
    showToast(`Downloading ${quality} version...`);
  } else {
    showToast('Download link not available');
  }
}

function downloadSubtitle(url) {
  if (url && url !== '#') {
    window.open(url, '_blank');
    showToast('Downloading subtitle...');
  } else {
    showToast('Subtitle link not available');
  }
}

// Load More
function loadMore() {
  if (state.isLoading) return;
  
  const nextPage = state.currentPage + 1;
  if (nextPage > state.totalPages) return;
  
  state.isLoading = true;
  
  if (state.currentSection === 'search' || state.currentSection === 'home') {
    fetchSearch(state.searchQuery, nextPage);
  } else if (state.currentSection === 'trending') {
    fetchTrending(nextPage);
  }
  
  state.isLoading = false;
}

// Utility Functions
function showLoading() {
  loadingOverlay.classList.add('show');
}

function hideLoading() {
  loadingOverlay.classList.remove('show');
}

function showError(message) {
  searchStatus.textContent = `❌ ${message}`;
  searchStatus.style.color = '#ef4444';
  setTimeout(() => {
    searchStatus.textContent = '';
    searchStatus.style.color = '';
  }, 5000);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px 24px;
    color: var(--text-primary);
    box-shadow: var(--shadow);
    z-index: 9999;
    animation: slideUp 0.3s ease;
    font-size: 14px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeGenreModal();
    closeAboutModal();
  }
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
});

// Infinite scroll
let scrollTimeout;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
    if (nearBottom && !state.isLoading && state.currentPage < state.totalPages) {
      loadMore();
    }
  }, 100);
});

console.log('🎬 DARK IMA MOVIE WORLD loaded!');
console.log('👤 Owner: Dark Ima');
console.log('⚡ Powered by StreamBox.top API');
