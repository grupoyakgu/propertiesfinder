-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[] DEFAULT '{"analysis_engine"}',
  map_locked BOOLEAN DEFAULT false,
  show_all_on_map BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cadastral parcels table
CREATE TABLE IF NOT EXISTS catastro_parcels (
  id TEXT PRIMARY KEY,
  referencia_catastral TEXT UNIQUE NOT NULL,
  municipality TEXT NOT NULL,
  province TEXT NOT NULL,
  autonomous_community TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  boundary JSONB NOT NULL,
  street_name TEXT,
  street_number TEXT,
  plot_size FLOAT NOT NULL,
  built_area FLOAT,
  construction_year INTEGER,
  number_of_floors INTEGER,
  cadastral_use TEXT NOT NULL,
  land_use TEXT,
  source_dataset TEXT NOT NULL,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catastro_parcels_municipality_province ON catastro_parcels(municipality, province);
CREATE INDEX IF NOT EXISTS idx_catastro_parcels_coordinates ON catastro_parcels(latitude, longitude);

-- Favorites (Opportunities) table
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  assigned_user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  property_id TEXT NOT NULL,
  status TEXT DEFAULT 'IN_REVIEW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, property_id),
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  property_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_source_property ON comments(source, property_id);

-- Map presets table
CREATE TABLE IF NOT EXISTS map_presets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  south FLOAT NOT NULL,
  west FLOAT NOT NULL,
  north FLOAT NOT NULL,
  east FLOAT NOT NULL,
  filters JSONB,
  polygon JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  parcel_ids TEXT[] NOT NULL,
  parcel_key TEXT NOT NULL,
  mode TEXT NOT NULL,
  report TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, parcel_key, mode),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- App settings table (singleton)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  max_analysis_plots INTEGER DEFAULT 2,
  max_web_searches INTEGER DEFAULT 4,
  custom_prompt TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE catastro_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Insert default app settings
INSERT INTO app_settings (id, max_analysis_plots, max_web_searches, custom_prompt)
VALUES ('singleton', 2, 4, NULL)
ON CONFLICT (id) DO NOTHING;
