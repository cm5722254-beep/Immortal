-- PostgreSQL & MySQL Advanced Video Streaming Schema & Analytics

CREATE TABLE IF NOT EXISTS movies (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(128) UNIQUE NOT NULL,
    title_khmer VARCHAR(255) NOT NULL,
    title_english VARCHAR(255),
    poster_url TEXT,
    rating NUMERIC(3, 1) DEFAULT 9.5,
    views_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS episodes (
    id VARCHAR(64) PRIMARY KEY,
    movie_id VARCHAR(64) REFERENCES movies(id) ON DELETE CASCADE,
    episode_number INT NOT NULL,
    stream_m3u8_url TEXT NOT NULL,
    duration_seconds INT DEFAULT 1200,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Full-Text Search Index for instant search
CREATE INDEX IF NOT EXISTS idx_movies_title_khmer ON movies USING gin(to_tsvector('simple', title_khmer));
CREATE INDEX IF NOT EXISTS idx_movies_views ON movies(views_count DESC);
