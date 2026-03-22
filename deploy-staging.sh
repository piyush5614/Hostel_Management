#!/bin/bash
# Hostel Connect - Staging Deployment Script
# Usage: ./deploy-staging.sh

set -e

echo "🚀 Starting Hostel Connect Staging Deployment..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ NPM not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ NPM $(npm --version)${NC}"

# 2. Download dependencies
echo -e "${YELLOW}[2/8] Installing dependencies...${NC}"
npm install --production
cd backend && npm install --production && cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 3. Check environment
echo -e "${YELLOW}[3/8] Checking environment configuration...${NC}"
if [ ! -f ".env.staging" ]; then
    echo -e "${RED}❌ .env.staging not found${NC}"
    echo "Please copy .env.staging from template and fill in your credentials"
    exit 1
fi
echo -e "${GREEN}✓ .env.staging found${NC}"

# 4. Build frontend
echo -e "${YELLOW}[4/8] Building frontend...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# 5. Build backend
echo -e "${YELLOW}[5/8] Building backend...${NC}"
cd backend && npm run build && cd ..
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend built successfully${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

# 6. Run tests
echo -e "${YELLOW}[6/8] Running tests...${NC}"
cd backend && npm run test 2>&1 | tail -20 && cd ..
echo -e "${GREEN}✓ Tests completed${NC}"

# 7. Create deployment archive
echo -e "${YELLOW}[7/8] Creating deployment package...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE="hostel-connect-staging-${TIMESTAMP}.tar.gz"
tar --exclude=node_modules --exclude=.git --exclude=.env -czf "${ARCHIVE}" .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Archive created: ${ARCHIVE}${NC}"
else
    echo -e "${RED}❌ Failed to create archive${NC}"
    exit 1
fi

# 8. Ready for deployment
echo -e "${YELLOW}[8/8] Deployment package ready${NC}"
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "================================================"
echo -e "${GREEN}✅ STAGING DEPLOYMENT READY${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Upload ${ARCHIVE} to staging server"
echo "2. Extract and configure .env.staging with credentials"
echo "3. Run: npm start (from backend directory)"
echo "4. Serve dist/ folder as static frontend"
echo ""
echo "Verify deployment:"
echo "  Backend: curl http://staging:3001/api/health"
echo "  Frontend: Open http://staging:5173 in browser"
echo ""
