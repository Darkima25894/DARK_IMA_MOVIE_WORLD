// api/index.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Middleware
app.use(cors());
app.use(express.json());

// Constants
const BASE_URL = 'https://streambox.top';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
};

// Helper Functions
const extractYear = (text) => {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : 'N/A';
};

const detectLanguage = (text) => {
  const languages = {
    'english': 'English',
    'spanish': 'Spanish',
    'french': 'French',
    'german': 'German',
    'chinese': 'Chinese',
    'japanese': 'Japanese',
    'korean': 'Korean',
    'hindi': 'Hindi',
    'tamil': 'Tamil',
    'telugu': 'Telugu',
    'malayalam': 'Malayalam',
    'arabic': 'Arabic',
    'russian': 'Russian',
    'portuguese': 'Portuguese',
    'italian': 'Italian',
    'dutch': 'Dutch',
    'vietnamese': 'Vietnamese',
    'thai': 'Thai',
    'indonesian': 'Indonesian'
  };
  
  const textLower = text.toLowerCase();
  for (const [key, lang] of Object.entries(languages)) {
    if (textLower.includes(key)) return lang;
  }
  return 'Unknown';
};

const extractMovieItems = ($) => {
  let items = $('div.item, div.movie, div.film, div.post, div.entry, article.item, article.movie, article.film, li.item, li.movie');
  if (items.length === 0) {
    items = $('.post-item, .movie-item, .film-item');
  }
  return items;
};

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    owner: 'Dark Ima',
    service: 'DARK IMA MOVIE WORLD API'
  });
});

// Search Movies
app.get('/api/search', async (req, res) => {
  const { q, page = 1 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  const cacheKey = `search_${q}_${page}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const searchUrl = `${BASE_URL}/search/${encodeURIComponent(q)}/page/${page}/`;
    const response = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    const movies = [];
    const items = extractMovieItems($);
    
    items.each((index, element) => {
      try {
        const $item = $(element);
        const titleElem = $item.find('h2, h3, h4, a').filter('.title, .name, .heading').first();
        const linkElem = $item.find('a[href]').first();
        const imgElem = $item.find('img[src]').first();
        const ratingElem = $item.find('.rating, .score, .vote, .imdb').first();
        
        if (titleElem.length && linkElem.length) {
          const title = titleElem.text().trim();
          let link = linkElem.attr('href');
          if (link && !link.startsWith('http')) {
            link = BASE_URL + link;
          }
          
          let poster = null;
          if (imgElem.length) {
            poster = imgElem.attr('src');
            if (poster && !poster.startsWith('http')) {
              poster = BASE_URL + poster;
            }
          }
          
          let rating = 'N/A';
          if (ratingElem.length) {
            const ratingText = ratingElem.text().trim();
            const match = ratingText.match(/[\d.]+/);
            if (match) rating = match[0];
          }
          
          movies.push({
            id: link ? link.split('/').filter(Boolean).pop() : `movie_${index}`,
            title: title || 'Unknown Title',
            url: link || '#',
            poster: poster || null,
            rating: rating,
            year: extractYear(title)
          });
        }
      } catch (err) {
        // Skip this item
      }
    });
    
    const result = {
      success: true,
      query: q,
      page: parseInt(page),
      total_results: movies.length,
      movies: movies.slice(0, 30)
    };
    
    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search movies',
      details: error.message 
    });
  }
});

// Get Movie Details
app.get('/api/movie', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Movie URL is required' });
  }
  
  const cacheKey = `details_${url}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    let movieUrl = url;
    if (!movieUrl.startsWith('http')) {
      movieUrl = BASE_URL + movieUrl;
    }
    
    const response = await axios.get(movieUrl, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    // Extract title
    let title = 'Unknown Title';
    const titleElem = $('h1.title, h1.name, h1.heading, h1.entry-title, h1').first();
    if (titleElem.length) {
      title = titleElem.text().trim();
    } else {
      const metaTitle = $('meta[property="og:title"]');
      if (metaTitle.length) {
        title = metaTitle.attr('content') || 'Unknown Title';
      }
    }
    
    // Extract year
    let year = 'N/A';
    const yearPattern = /\b(19|20)\d{2}\b/;
    const yearElem = $('.year, .release, .date').first();
    if (yearElem.length) {
      const match = yearElem.text().match(yearPattern);
      if (match) year = match[0];
    } else {
      const text = $('body').text();
      const matches = text.match(/\b(19|20)\d{2}\b/g);
      if (matches && matches.length > 0) {
        year = matches[0];
      }
    }
    
    // Extract rating
    let rating = 'N/A';
    const ratingElem = $('.rating, .score, .vote-average, .imdb').first();
    if (ratingElem.length) {
      const match = ratingElem.text().match(/[\d.]+/);
      if (match) rating = match[0];
    }
    
    // Extract IMDb rating
    let imdbRating = 'N/A';
    const imdbElem = $('.imdb-rating, .imdb, .IMDb').first();
    if (imdbElem.length) {
      const match = imdbElem.text().match(/[\d.]+/);
      if (match) imdbRating = match[0];
    }
    
    // Extract genres
    const genres = [];
    const genreElem = $('.genre, .category, .genres').first();
    if (genreElem.length) {
      genreElem.find('a').each((i, el) => {
        const genre = $(el).text().trim();
        if (genre) genres.push(genre);
      });
    }
    if (genres.length === 0) {
      // Try to find genres in text
      const text = $('body').text();
      const genrePattern = /Action|Adventure|Animation|Comedy|Crime|Documentary|Drama|Fantasy|Horror|Mystery|Romance|Sci-Fi|Thriller|Western/i;
      const matches = text.match(new RegExp(genrePattern, 'g'));
      if (matches) {
        genres.push(...matches.slice(0, 5));
      }
    }
    
    // Extract director
    let director = 'Unknown';
    const directorElem = $('.director, [class*="director"]').first();
    if (directorElem.length) {
      director = directorElem.text().replace(/Director:|Directed by:/i, '').trim() || 'Unknown';
    }
    
    // Extract cast
    const cast = [];
    const castElem = $('.cast, .actors, .starring, [class*="cast"]').first();
    if (castElem.length) {
      castElem.find('a').each((i, el) => {
        const actor = $(el).text().trim();
        if (actor && cast.length < 10) cast.push(actor);
      });
    }
    
    // Extract synopsis
    let synopsis = 'No synopsis available';
    const synopsisElem = $('.synopsis, .plot, .description, .story, .Summary').first();
    if (synopsisElem.length) {
      synopsis = synopsisElem.text().trim();
    } else {
      const metaDesc = $('meta[property="og:description"]');
      if (metaDesc.length) {
        synopsis = metaDesc.attr('content') || 'No synopsis available';
      }
    }
    
    // Extract duration
    let duration = 'N/A';
    const durationElem = $('.duration, .runtime, .time, .length').first();
    if (durationElem.length) {
      duration = durationElem.text().trim();
    }
    
    // Extract poster
    let poster = null;
    const posterElem = $('img.poster, img.cover, img.image, img.featured').first();
    if (posterElem.length) {
      poster = posterElem.attr('src');
      if (poster && !poster.startsWith('http')) {
        poster = BASE_URL + poster;
      }
    }
    if (!poster) {
      const metaImage = $('meta[property="og:image"]');
      if (metaImage.length) {
        poster = metaImage.attr('content') || null;
      }
    }
    
    // Extract download links
    const downloadLinks = {};
    const downloadElems = $('a[href]').filter('.download, .dl, .button, .btn');
    downloadElems.each((i, el) => {
      const $el = $(el);
      const text = $el.text().toLowerCase();
      const href = $el.attr('href');
      
      if (!href || href.startsWith('javascript:')) return;
      
      let quality = 'unknown';
      if (text.includes('1080') || text.includes('1080p')) quality = '1080p';
      else if (text.includes('720') || text.includes('720p')) quality = '720p';
      else if (text.includes('480') || text.includes('480p')) quality = '480p';
      else if (text.includes('4k') || text.includes('2160')) quality = '4K';
      else if (text.includes('hd')) quality = 'HD';
      else if (text.includes('sd')) quality = 'SD';
      else if (text.includes('bluray')) quality = 'BluRay';
      
      const link = href.startsWith('http') ? href : BASE_URL + href;
      
      if (!downloadLinks[quality]) {
        downloadLinks[quality] = [];
      }
      downloadLinks[quality].push({
        url: link,
        label: text
      });
    });
    
    // Extract subtitle links
    const subtitleLinks = [];
    const subElems = $('a[href]').filter('.subtitle, .sub, .srt, .subtitles');
    subElems.each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (!href || href.startsWith('javascript:')) return;
      
      const label = $el.text().trim();
      const link = href.startsWith('http') ? href : BASE_URL + href;
      subtitleLinks.push({
        url: link,
        label: label || 'Subtitle',
        language: detectLanguage(label)
      });
    });
    
    // Extract quality options
    const qualityOptions = [];
    const qualityElems = $('.quality, .q-, .resolution, .Q');
    qualityElems.each((i, el) => {
      const text = $(el).text().trim();
      if (text) qualityOptions.push(text);
    });
    
    // Add qualities from download links
    Object.keys(downloadLinks).forEach(q => {
      if (!qualityOptions.includes(q)) qualityOptions.push(q);
    });
    
    if (qualityOptions.length === 0) {
      qualityOptions.push('1080p', '720p', '480p');
    }
    
    // Extract trailer
    let trailer = null;
    const iframe = $('iframe[src]').first();
    if (iframe.length) {
      const src = iframe.attr('src');
      if (src && (src.includes('youtube') || src.includes('vimeo'))) {
        trailer = src;
      }
    }
    if (!trailer) {
      const youtubeLink = $('a[href*="youtube.com/watch"]').first();
      if (youtubeLink.length) {
        trailer = youtubeLink.attr('href');
      }
    }
    
    const details = {
      title,
      year,
      rating,
      imdb_rating: imdbRating,
      genres: genres.slice(0, 5),
      director,
      cast: cast.slice(0, 10),
      synopsis,
      duration,
      poster,
      download_links: downloadLinks,
      subtitle_links: subtitleLinks,
      quality_options: qualityOptions,
      trailer
    };
    
    const result = {
      success: true,
      details
    };
    
    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Movie details error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get movie details',
      details: error.message
    });
  }
});

// Get Trending Movies
app.get('/api/trending', async (req, res) => {
  const { page = 1 } = req.query;
  
  const cacheKey = `trending_${page}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const trendingUrl = `${BASE_URL}/trending/page/${page}/`;
    const response = await axios.get(trendingUrl, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    const movies = [];
    const items = extractMovieItems($);
    
    items.each((index, element) => {
      try {
        const $item = $(element);
        const titleElem = $item.find('h2, h3, h4, a').filter('.title, .name, .heading').first();
        const linkElem = $item.find('a[href]').first();
        const ratingElem = $item.find('.rating, .score, .vote').first();
        const imgElem = $item.find('img[src]').first();
        
        if (titleElem.length && linkElem.length) {
          const title = titleElem.text().trim();
          let link = linkElem.attr('href');
          if (link && !link.startsWith('http')) {
            link = BASE_URL + link;
          }
          
          let poster = null;
          if (imgElem.length) {
            poster = imgElem.attr('src');
            if (poster && !poster.startsWith('http')) {
              poster = BASE_URL + poster;
            }
          }
          
          let rating = 'N/A';
          if (ratingElem.length) {
            const match = ratingElem.text().match(/[\d.]+/);
            if (match) rating = match[0];
          }
          
          movies.push({
            id: link ? link.split('/').filter(Boolean).pop() : `movie_${index}`,
            title: title || 'Unknown Title',
            url: link || '#',
            poster: poster || null,
            rating: rating,
            year: extractYear(title)
          });
        }
      } catch (err) {
        // Skip this item
      }
    });
    
    const result = {
      success: true,
      page: parseInt(page),
      movies: movies.slice(0, 30),
      total: movies.length
    };
    
    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Trending error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending movies',
      details: error.message
    });
  }
});

// Get Movies by Genre
app.get('/api/genres', async (req, res) => {
  const { genre, page = 1 } = req.query;
  
  if (!genre) {
    return res.status(400).json({ error: 'Genre is required' });
  }
  
  const cacheKey = `genre_${genre}_${page}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const genreUrl = `${BASE_URL}/genre/${encodeURIComponent(genre)}/page/${page}/`;
    const response = await axios.get(genreUrl, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    const movies = [];
    const items = extractMovieItems($);
    
    items.each((index, element) => {
      try {
        const $item = $(element);
        const titleElem = $item.find('h2, h3, h4, a').filter('.title, .name, .heading').first();
        const linkElem = $item.find('a[href]').first();
        const imgElem = $item.find('img[src]').first();
        
        if (titleElem.length && linkElem.length) {
          const title = titleElem.text().trim();
          let link = linkElem.attr('href');
          if (link && !link.startsWith('http')) {
            link = BASE_URL + link;
          }
          
          let poster = null;
          if (imgElem.length) {
            poster = imgElem.attr('src');
            if (poster && !poster.startsWith('http')) {
              poster = BASE_URL + poster;
            }
          }
          
          movies.push({
            id: link ? link.split('/').filter(Boolean).pop() : `movie_${index}`,
            title: title || 'Unknown Title',
            url: link || '#',
            poster: poster || null,
            year: extractYear(title)
          });
        }
      } catch (err) {
        // Skip this item
      }
    });
    
    const result = {
      success: true,
      genre: genre,
      page: parseInt(page),
      movies: movies.slice(0, 30),
      total: movies.length
    };
    
    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Genre error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get movies by genre',
      details: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Export the Vercel serverless function
module.exports = app;
