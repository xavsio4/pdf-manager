#!/bin/bash

# PDF Manager Docker Setup Script

echo "🚀 Setting up PDF Manager with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create project structure
echo "📁 Creating project structure..."
mkdir -p backend frontend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your OpenAI API key!"
fi

# Create backend init SQL file
echo "📝 Creating database initialization file..."
cat > backend/init.sql << 'EOF'
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a simple test to verify pgvector is working
SELECT 1;
EOF

# Build and start services
echo "🔨 Building Docker containers..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service status..."
docker-compose ps

# Display useful information
echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Service URLs:"
echo "   - Backend API: http://localhost:8000"
echo "   - Frontend: http://localhost:3000"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - Flower (Celery Monitor): http://localhost:5555"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "🛠️  Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Access backend shell: docker-compose exec backend bash"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Add your OpenAI API key to .env file"
echo "   2. Create your FastAPI application in backend/"
echo "   3. Create your Next.js application in frontend/"
echo ""
echo "📚 Next steps:"
echo "   - Run database migrations"
echo "   - Set up your FastAPI routes"
echo "   - Configure authentication"
echo "   - Implement PDF upload and processing"