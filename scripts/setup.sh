#!/bin/bash

# AI Local Market Research Analyst - Setup Script
# This script sets up the development environment for the application

set -e  # Exit on error

echo "🚀 Setting up AI Local Market Research Analyst..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_status "Found Python $PYTHON_VERSION"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
print_status "Found Node.js $NODE_VERSION"

# Check if Docker is installed (optional, but recommended)
if command -v docker &> /dev/null; then
    print_status "Found Docker"
else
    print_warning "Docker not found. Database setup will use local installation."
fi

# Check if Docker Compose is installed
if command -v docker-compose &> /dev/null; then
    print_status "Found Docker Compose"
else
    print_warning "Docker Compose not found. You'll need to set up database manually."
fi

# Create virtual environment for backend
print_status "Setting up Python virtual environment..."

cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Created virtual environment"
else
    print_warning "Virtual environment already exists"
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Install development dependencies
if [ -f "requirements-dev.txt" ]; then
    print_status "Installing development dependencies..."
    pip install -r requirements-dev.txt
fi

print_success "Backend dependencies installed"

# Setup frontend
print_status "Setting up frontend..."

cd ../frontend

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

print_success "Frontend dependencies installed"

# Setup environment files
print_status "Setting up environment files..."

cd ..

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    print_warning "Created backend/.env from example. Please update with your actual values."
else
    print_warning "backend/.env already exists"
fi

# Create frontend .env file if it doesn't exist
if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    print_warning "Created frontend/.env from example. Please update with your actual values."
else
    print_warning "frontend/.env already exists"
fi

# Setup database
print_status "Setting up database..."

# Check if Docker Compose is available
if command -v docker-compose &> /dev/null; then
    print_status "Starting PostgreSQL with Docker Compose..."
    docker-compose up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Test database connection
    if docker-compose exec postgres pg_isready -U market_user -d market_research_db; then
        print_success "PostgreSQL is ready"
    else
        print_error "PostgreSQL failed to start"
        exit 1
    fi
else
    print_warning "Docker Compose not available. Please set up PostgreSQL manually."
    print_warning "Required database: market_research_db"
    print_warning "User: market_user"
    print_warning "Password: market_password"
fi

# Run database migrations
print_status "Running database migrations..."

cd backend
source venv/bin/activate

# Initialize Alembic if needed
if [ ! -f "alembic.ini" ]; then
    print_status "Initializing Alembic..."
    alembic init migrations
    # Update alembic.ini with correct database URL
    sed -i '' "s|sqlalchemy.url = .*|sqlalchemy.url = ${DATABASE_URL:-postgresql://market_user:market_password@localhost:5432/market_research_db}|" alembic.ini
fi

# Run migrations
alembic upgrade head

print_success "Database migrations completed"

# Create initial data
print_status "Creating initial data..."

# Create a Python script to initialize data
cat > init_data.py << 'EOF'
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import init_db, get_db
from database.queries import create_user
from models.schemas import UserCreate
from core.security import get_password_hash

async def initialize_data():
    await init_db()
    
    # Create admin user if not exists
    async for db in get_db():
        # Check if admin user exists
        from sqlalchemy import select
        from models.database_models import User
        
        result = await db.execute(select(User).where(User.email == "admin@marketresearch.com"))
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            admin_data = UserCreate(
                email="admin@marketresearch.com",
                full_name="Admin User",
                company="Market Research Inc",
                phone="+1234567890",
                password="Admin123!"
            )
            
            try:
                await create_user(db, admin_data)
                print("✓ Created admin user")
                print("  Email: admin@marketresearch.com")
                print("  Password: Admin123!")
                print("  Please change this password immediately!")
            except Exception as e:
                print(f"✗ Failed to create admin user: {e}")
        
        # Create test user
        result = await db.execute(select(User).where(User.email == "test@example.com"))
        test_user = result.scalar_one_or_none()
        
        if not test_user:
            test_data = UserCreate(
                email="test@example.com",
                full_name="Test User",
                company="Test Company",
                phone="+0987654321",
                password="Test123!"
            )
            
            try:
                await create_user(db, test_data)
                print("✓ Created test user")
                print("  Email: test@example.com")
                print("  Password: Test123!")
            except Exception as e:
                print(f"✗ Failed to create test user: {e}")

if __name__ == "__main__":
    asyncio.run(initialize_data())
EOF

python init_data.py
rm init_data.py

print_success "Initial data created"

# Build frontend
print_status "Building frontend..."

cd ../frontend
npm run build

print_success "Frontend built successfully"

# Setup complete
print_status "Setup complete! 🎉"

echo ""
echo "========================================"
echo "AI Local Market Research Analyst Setup Complete"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Update API keys in backend/.env and frontend/.env"
echo "   - Get Google Gemini API key: https://makersuite.google.com/app/apikey"
echo "   - Get Google Places API key: https://developers.google.com/maps/documentation/places/web-service/get-api-key"
echo "   - Get Yelp API key: https://www.yelp.com/developers"
echo "   - Get News API key: https://newsapi.org"
echo ""
echo "2. Start the application:"
echo "   cd ai-local-market-research-analyst"
echo "   ./scripts/start.sh"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "4. Default login credentials:"
echo "   Admin: admin@marketresearch.com / Admin123!"
echo "   Test: test@example.com / Test123!"
echo ""
echo "========================================"
echo ""

# Make scripts executable
print_status "Making scripts executable..."
chmod +x ../scripts/*.sh

print_success "All setup tasks completed! 🚀"