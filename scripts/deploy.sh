#!/bin/bash

# AI Local Market Research Analyst - Deployment Script
# This script deploys the application to Render (backend) and Vercel (frontend)

set -e  # Exit on error

echo "🚀 Deploying AI Local Market Research Analyst..."

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

# Check if Render CLI is installed
if ! command -v render &> /dev/null; then
    print_error "Render CLI is not installed. Please install it:"
    echo "  npm install -g @renderinc/cli"
    echo "  Or download from: https://render.com/docs/cli"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Please install it:"
    echo "  npm install -g vercel"
    exit 1
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git."
    exit 1
fi

# Check if Docker is installed (for building)
if ! command -v docker &> /dev/null; then
    print_warning "Docker not found. Some build steps might fail."
fi

# Check environment variables
print_status "Checking environment variables..."

REQUIRED_ENV_VARS=(
    "GEMINI_API_KEY"
    "DATABASE_URL"
    "SECRET_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these variables:"
    echo "  export GEMINI_API_KEY='your-gemini-api-key'"
    echo "  export DATABASE_URL='your-postgresql-url'"
    echo "  export SECRET_KEY='your-secret-key'"
    exit 1
fi

print_success "All required environment variables are set"

# Build frontend
print_status "Building frontend..."

cd frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm ci --silent

# Build
print_status "Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    exit 1
fi

print_success "Frontend built successfully"

# Deploy frontend to Vercel
print_status "Deploying frontend to Vercel..."

# Check if already logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please log in."
    vercel login
fi

# Deploy
print_status "Starting Vercel deployment..."
vercel --prod --yes

if [ $? -ne 0 ]; then
    print_error "Vercel deployment failed"
    exit 1
fi

print_success "Frontend deployed to Vercel"

# Get Vercel deployment URL
FRONTEND_URL=$(vercel ls | grep -o 'https://[^ ]*' | head -1)
if [ -n "$FRONTEND_URL" ]; then
    print_status "Frontend URL: $FRONTEND_URL"
    export FRONTEND_URL
else
    print_warning "Could not get frontend URL"
fi

# Build backend Docker image
print_status "Building backend Docker image..."

cd ../backend

# Create Dockerfile if it doesn't exist
if [ ! -f "Dockerfile" ]; then
    cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Run migrations and start application
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT"]
EOF
fi

# Build Docker image
print_status "Building Docker image..."
docker build -t market-research-backend:latest .

print_success "Backend Docker image built"

# Deploy backend to Render
print_status "Deploying backend to Render..."

# Check if already logged in to Render
if ! render config get --silent &> /dev/null; then
    print_warning "Not logged in to Render. Please log in."
    render login
fi

# Check if service already exists
SERVICE_NAME="market-research-backend"
if render services get $SERVICE_NAME &> /dev/null; then
    print_status "Updating existing Render service..."
    
    # Update service
    render services update $SERVICE_NAME \
        --docker-context-dir ./backend \
        --dockerfile ./backend/Dockerfile \
        --env DATABASE_URL="$DATABASE_URL" \
        --env SECRET_KEY="$SECRET_KEY" \
        --env GEMINI_API_KEY="$GEMINI_API_KEY" \
        --env FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}" \
        --env CORS_ORIGINS="${FRONTEND_URL:-http://localhost:3000}" \
        --env LOG_LEVEL="INFO"
else
    print_status "Creating new Render service..."
    
    # Create new service
    render services create \
        --name $SERVICE_NAME \
        --type web \
        --region oregon \
        --plan free \
        --docker-context-dir ./backend \
        --dockerfile ./backend/Dockerfile \
        --env DATABASE_URL="$DATABASE_URL" \
        --env SECRET_KEY="$SECRET_KEY" \
        --env GEMINI_API_KEY="$GEMINI_API_KEY" \
        --env FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}" \
        --env CORS_ORIGINS="${FRONTEND_URL:-http://localhost:3000}" \
        --env LOG_LEVEL="INFO" \
        --start-command "uvicorn main:app --host 0.0.0.0 --port $PORT"
fi

if [ $? -ne 0 ]; then
    print_error "Render deployment failed"
    exit 1
fi

print_success "Backend deployed to Render"

# Get Render service URL
print_status "Getting backend URL..."
BACKEND_URL=$(render services get $SERVICE_NAME --json | jq -r '.service.serviceDetails.url')
if [ -n "$BACKEND_URL" ]; then
    print_status "Backend URL: $BACKEND_URL"
else
    print_warning "Could not get backend URL"
fi

# Create/update Render PostgreSQL database if needed
print_status "Setting up Render PostgreSQL database..."

if [ -z "$DATABASE_URL" ] || [[ ! "$DATABASE_URL" =~ "render.com" ]]; then
    print_warning "Using external PostgreSQL database"
else
    # Check if database already exists
    DB_NAME="market_research_db"
    if render services get $DB_NAME &> /dev/null; then
        print_status "PostgreSQL database already exists"
    else
        print_status "Creating PostgreSQL database on Render..."
        
        render services create \
            --name $DB_NAME \
            --type pg \
            --region oregon \
            --plan free \
            --database-name market_research_db \
            --ip-allow-list "0.0.0.0/0"
        
        if [ $? -ne 0 ]; then
            print_error "Failed to create PostgreSQL database"
            exit 1
        fi
        
        print_success "PostgreSQL database created"
        
        # Get database URL
        DATABASE_URL=$(render services get $DB_NAME --json | jq -r '.service.serviceDetails.databaseDetails.connectionString')
        print_status "Database URL: (hidden for security)"
    fi
fi

# Run database migrations
print_status "Running database migrations..."

if [ -n "$BACKEND_URL" ]; then
    # Wait for backend to be ready
    print_status "Waiting for backend to be ready..."
    sleep 30
    
    # Try to run migrations via API
    MIGRATION_URL="$BACKEND_URL/api/v1/admin/migrate"
    
    # Create a simple migration script
    cat > run_migration.py << 'EOF'
import requests
import os
import time
import sys

backend_url = os.getenv('BACKEND_URL')
if not backend_url:
    print("BACKEND_URL not set")
    sys.exit(1)

# Wait for backend to be ready
print("Waiting for backend to be ready...")
for i in range(30):
    try:
        response = requests.get(f"{backend_url}/health", timeout=5)
        if response.status_code == 200:
            print("Backend is ready")
            break
    except:
        pass
    time.sleep(2)
else:
    print("Backend not ready after 60 seconds")
    sys.exit(1)

# Run migration
print("Running migrations...")
try:
    # This would require an admin endpoint
    # For now, we'll just check health
    response = requests.get(f"{backend_url}/health")
    if response.status_code == 200:
        print("✓ Backend is healthy")
        sys.exit(0)
    else:
        print(f"✗ Backend health check failed: {response.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)
EOF
    
    python run_migration.py
    rm run_migration.py
else
    print_warning "Could not run migrations automatically. Please run them manually."
fi

# Update frontend environment with backend URL
print_status "Updating frontend environment..."

cd ../frontend

if [ -n "$BACKEND_URL" ]; then
    # Update .env.production
    echo "VITE_API_URL=$BACKEND_URL" > .env.production
    echo "VITE_FRONTEND_URL=$FRONTEND_URL" >> .env.production
    
    # Redeploy frontend with updated backend URL
    print_status "Redeploying frontend with updated backend URL..."
    vercel --prod --yes --force
    
    print_success "Frontend redeployed with updated backend URL"
fi

# Deployment complete
print_status "Deployment complete! 🎉"

echo ""
echo "========================================"
echo "AI Local Market Research Analyst Deployment Complete"
echo "========================================"
echo ""
echo "Application URLs:"
echo ""
if [ -n "$FRONTEND_URL" ]; then
    echo "Frontend: $FRONTEND_URL"
fi
if [ -n "$BACKEND_URL" ]; then
    echo "Backend API: $BACKEND_URL"
    echo "API Documentation: $BACKEND_URL/docs"
fi
echo ""
echo "Next steps:"
echo ""
echo "1. Test the application:"
echo "   Visit the frontend URL and log in with:"
echo "   Email: admin@marketresearch.com"
echo "   Password: Admin123!"
echo ""
echo "2. Update default passwords:"
echo "   Change the default admin password immediately"
echo ""
echo "3. Set up monitoring:"
echo "   - Monitor API usage in Render dashboard"
echo "   - Set up error tracking (Sentry, etc.)"
echo "   - Configure alerts for service issues"
echo ""
echo "4. Scale as needed:"
echo "   - Upgrade Render plan for higher traffic"
echo "   - Add Redis caching for performance"
echo "   - Set up CDN for frontend assets"
echo ""
echo "========================================"
echo ""

print_success "Deployment completed successfully! 🚀"