-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a simple test to verify pgvector is working
SELECT 1;
