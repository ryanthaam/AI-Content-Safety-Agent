#!/bin/bash

# Sentinel AI Content Safety Agent Setup Script

set -e

echo "🚀 Setting up Sentinel AI Content Safety Agent..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker detected"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found. You'll need to set up MongoDB and Redis manually."
    DOCKER_AVAILABLE=false
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p temp
mkdir -p config

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys and configuration"
else
    echo "✅ Environment file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Set up database (if Docker is available)
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Setting up database with Docker..."
    docker-compose -f docker/docker-compose.yml up -d mongodb redis
    
    # Wait for databases to be ready
    echo "⏳ Waiting for databases to be ready..."
    sleep 10
    
    echo "✅ Databases are running"
else
    echo "⚠️  Please ensure MongoDB and Redis are running on your system"
fi

# Run tests (if they exist)
if [ -d "tests" ]; then
    echo "🧪 Running tests..."
    npm test
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start the application with: npm run dev"
echo "3. Visit http://localhost:3000 to see the API"
echo ""
echo "📚 Documentation:"
echo "- API docs: http://localhost:3000/api/v1/docs"
echo "- Health check: http://localhost:3000/health"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Docker commands:"
    echo "- Start all services: docker-compose -f docker/docker-compose.yml up -d"
    echo "- Stop all services: docker-compose -f docker/docker-compose.yml down"
    echo "- View logs: docker-compose -f docker/docker-compose.yml logs -f"
fi

echo ""
echo "🎉 Sentinel AI Content Safety Agent is ready!"