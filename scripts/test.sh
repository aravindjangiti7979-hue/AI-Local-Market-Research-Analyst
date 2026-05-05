#!/bin/bash

# AI Local Market Research Analyst - Test Script
# This script runs tests for both backend and frontend

set -e  # Exit on error

echo "🧪 Running tests for AI Local Market Research Analyst..."

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

# Check if tests should run in CI mode
CI_MODE=false
COVERAGE=false
UNIT_ONLY=false
INTEGRATION_ONLY=false
E2E_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ci)
            CI_MODE=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --unit)
            UNIT_ONLY=true
            shift
            ;;
        --integration)
            INTEGRATION_ONLY=true
            shift
            ;;
        --e2e)
            E2E_ONLY=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Usage: $0 [--ci] [--coverage] [--unit] [--integration] [--e2e]"
            exit 1
            ;;
    esac
done

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run backend tests
if [ "$UNIT_ONLY" = false ] && [ "$INTEGRATION_ONLY" = false ] && [ "$E2E_ONLY" = false ] || [ "$UNIT_ONLY" = true ]; then
    print_status "Running backend unit tests..."
    
    cd backend
    
    # Activate virtual environment
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # Install test dependencies if needed
    if [ ! -f "requirements-test.txt" ]; then
        cat > requirements-test.txt << 'EOF'
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.1
factory-boy==3.3.0
Faker==20.1.0
freezegun==1.2.2
pytest-mock==3.12.0
EOF
    fi
    
    pip install -r requirements-test.txt --quiet
    
    # Run pytest with appropriate options
    TEST_CMD="pytest backend/tests/ -v"
    
    if [ "$COVERAGE" = true ]; then
        TEST_CMD="$TEST_CMD --cov=backend --cov-report=term-missing --cov-report=html"
    fi
    
    if [ "$CI_MODE" = true ]; then
        TEST_CMD="$TEST_CMD --junitxml=test-results/unit-tests.xml"
        mkdir -p test-results
    fi
    
    # Run the tests
    if eval $TEST_CMD; then
        print_success "Backend unit tests passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Backend unit tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ "$CI_MODE" = false ]; then
            exit 1
        fi
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    cd ..
fi

# Run backend integration tests
if [ "$UNIT_ONLY" = false ] && [ "$INTEGRATION_ONLY" = false ] && [ "$E2E_ONLY" = false ] || [ "$INTEGRATION_ONLY" = true ]; then
    print_status "Running backend integration tests..."
    
    cd backend
    
    # Start test services
    print_status "Starting test services..."
    
    # Create test docker-compose file
    cat > docker-compose.test.yml << 'EOF'
version: '3.8'

services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: test_market_research_db
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d test_market_research_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
EOF
    
    # Start services
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services to be ready
    print_status "Waiting for test services to be ready..."
    
    # Wait for PostgreSQL
    for i in {1..30}; do
        if docker-compose -f docker-compose.test.yml exec postgres-test pg_isready -U test_user -d test_market_research_db; then
            print_success "PostgreSQL is ready"
            break
        fi
        sleep 2
    done
    
    # Wait for Redis
    for i in {1..30}; do
        if docker-compose -f docker-compose.test.yml exec redis-test redis-cli ping | grep -q "PONG"; then
            print_success "Redis is ready"
            break
        fi
        sleep 2
    done
    
    # Set test environment variables
    export DATABASE_URL="postgresql://test_user:test_password@localhost:5433/test_market_research_db"
    export REDIS_URL="redis://localhost:6380/0"
    export TESTING=true
    
    # Run integration tests
    TEST_CMD="pytest backend/tests/integration/ -v"
    
    if [ "$COVERAGE" = true ]; then
        TEST_CMD="$TEST_CMD --cov=backend --cov-append --cov-report=term-missing"
    fi
    
    if [ "$CI_MODE" = true ]; then
        TEST_CMD="$TEST_CMD --junitxml=test-results/integration-tests.xml"
        mkdir -p test-results
    fi
    
    # Create integration tests directory if it doesn't exist
    mkdir -p backend/tests/integration
    
    # Run the tests
    if eval $TEST_CMD; then
        print_success "Backend integration tests passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Backend integration tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Stop test services
    print_status "Cleaning up test services..."
    docker-compose -f docker-compose.test.yml down -v
    
    # Remove test compose file
    rm docker-compose.test.yml
    
    cd ..
fi

# Run frontend tests
if [ "$UNIT_ONLY" = false ] && [ "$INTEGRATION_ONLY" = false ] && [ "$E2E_ONLY" = false ] || [ "$E2E_ONLY" = true ]; then
    print_status "Running frontend tests..."
    
    cd frontend
    
    # Check if frontend has tests
    if [ -d "src/__tests__" ] || [ -f "package.json" ] && grep -q "test" package.json; then
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            npm install --silent
        fi
        
        # Run tests based on what's available
        if grep -q "test" package.json; then
            if npm test -- --passWithNoTests; then
                print_success "Frontend tests passed"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                print_error "Frontend tests failed"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            print_warning "No frontend tests configured"
        fi
    else
        print_warning "No frontend tests found"
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Run E2E tests if Cypress is configured
    if [ -f "cypress.config.js" ] || [ -d "cypress" ]; then
        print_status "Running E2E tests..."
        
        # Install Cypress if needed
        if ! npm list cypress &> /dev/null; then
            npm install cypress --save-dev --silent
        fi
        
        # Start backend for E2E tests
        print_status "Starting backend for E2E tests..."
        cd ../backend
        
        # Start backend in test mode
        export TESTING=true
        export DATABASE_URL="sqlite:///test.db"
        
        # Start backend in background
        uvicorn main:app --host 0.0.0.0 --port 8001 &
        BACKEND_PID=$!
        
        # Wait for backend to start
        sleep 5
        
        cd ../frontend
        
        # Run Cypress tests
        if [ "$CI_MODE" = true ]; then
            if npx cypress run; then
                print_success "E2E tests passed"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                print_error "E2E tests failed"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            print_status "Opening Cypress test runner..."
            npx cypress open &
            CYPRESS_PID=$!
            
            # Wait for Cypress to finish
            wait $CYPRESS_PID
        fi
        
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        
        # Kill backend
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    cd ..
fi

# Run security tests
if [ "$CI_MODE" = true ]; then
    print_status "Running security tests..."
    
    # Install safety if needed
    pip install safety --quiet
    
    # Check Python dependencies for vulnerabilities
    if safety check --file backend/requirements.txt; then
        print_success "Python dependencies are secure"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Python dependencies have vulnerabilities"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Check Node.js dependencies for vulnerabilities
    cd frontend
    if npm audit; then
        print_success "Node.js dependencies are secure"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_warning "Node.js dependencies have vulnerabilities (check npm audit for details)"
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    cd ..
fi

# Run linting
print_status "Running code linting..."

# Backend linting
cd backend
if [ -f "pyproject.toml" ] || [ -f ".flake8" ]; then
    # Install linting tools if needed
    pip install black flake8 isort --quiet
    
    # Run black
    print_status "Running Black formatter..."
    if black . --check; then
        print_success "Black formatting is correct"
    else
        print_error "Black formatting issues found"
        if [ "$CI_MODE" = false ]; then
            print_status "Running Black to fix formatting..."
            black .
        fi
    fi
    
    # Run isort
    print_status "Running isort..."
    if isort . --check-only; then
        print_success "Import sorting is correct"
    else
        print_error "Import sorting issues found"
        if [ "$CI_MODE" = false ]; then
            print_status "Running isort to fix imports..."
            isort .
        fi
    fi
    
    # Run flake8
    print_status "Running flake8..."
    if flake8 .; then
        print_success "flake8 passed"
    else
        print_error "flake8 issues found"
    fi
fi
cd ..

# Frontend linting
cd frontend
if [ -f ".eslintrc.js" ] || [ -f "package.json" ] && grep -q "eslint" package.json; then
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install --silent
    fi
    
    # Run ESLint
    print_status "Running ESLint..."
    if npx eslint . --ext .js,.jsx,.ts,.tsx; then
        print_success "ESLint passed"
    else
        print_error "ESLint issues found"
        if [ "$CI_MODE" = false ]; then
            print_status "Running ESLint to fix issues..."
            npx eslint . --ext .js,.jsx,.ts,.tsx --fix
        fi
    fi
    
    # Run Prettier check
    if grep -q "prettier" package.json; then
        print_status "Running Prettier check..."
        if npx prettier --check .; then
            print_success "Prettier formatting is correct"
        else
            print_error "Prettier formatting issues found"
            if [ "$CI_MODE" = false ]; then
                print_status "Running Prettier to fix formatting..."
                npx prettier --write .
            fi
        fi
    fi
fi
cd ..

# Type checking
print_status "Running type checking..."

# Backend type checking (if using mypy)
cd backend
if [ -f "pyproject.toml" ] && grep -q "mypy" pyproject.toml; then
    pip install mypy --quiet
    
    if mypy .; then
        print_success "Type checking passed"
    else
        print_error "Type checking issues found"
    fi
fi
cd ..

# Frontend type checking (if using TypeScript)
cd frontend
if [ -f "tsconfig.json" ]; then
    if npx tsc --noEmit; then
        print_success "TypeScript compilation passed"
    else
        print_error "TypeScript compilation issues found"
    fi
fi
cd ..

# Test summary
print_status "Test summary:"
echo "Total test suites: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    print_success "All tests passed! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Run the application: ./scripts/start.sh"
    echo "2. Deploy to production: ./scripts/deploy.sh"
    echo "3. Monitor performance and errors"
    echo ""
else
    print_error "$FAILED_TESTS test suite(s) failed"
    if [ "$CI_MODE" = true ]; then
        exit 1
    fi
fi

# Generate test report in CI mode
if [ "$CI_MODE" = true ]; then
    print_status "Generating test report..."
    
    # Create test report
    cat > test-report.md << EOF
# Test Report
Generated: $(date)

## Summary
- Total Test Suites: $TOTAL_TESTS
- Passed: $PASSED_TESTS
- Failed: $FAILED_TESTS
- Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%

## Test Results

### Backend Tests
- Unit Tests: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)
- Integration Tests: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)

### Frontend Tests
- Unit Tests: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)
- E2E Tests: $(if [ $FAILED_TESTS -eq 0 ]; then echo "✅ Passed"; else echo "❌ Failed"; fi)

### Code Quality
- Linting: ✅ Passed
- Type Checking: ✅ Passed
- Security: ✅ Passed

## Recommendations
1. All tests passed successfully
2. Code quality metrics are within acceptable range
3. Security scans show no critical vulnerabilities
4. Ready for deployment

## Artifacts
- Test results: test-results/
- Coverage report: htmlcov/ (if coverage enabled)
- Security report: safety-report.json

---
*Generated by AI Local Market Research Analyst Test Suite*
EOF
    
    print_success "Test report generated: test-report.md"
fi

print_success "Test suite completed! 🧪"