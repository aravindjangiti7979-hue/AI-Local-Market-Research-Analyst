# AI Local Market Research Analyst

## Overview
An automated, AI-powered tool that transforms public local data into actionable market intelligence for small and medium-sized businesses.

## Features
- Automated data collection from local news, reviews, and social media
- AI-powered sentiment analysis using Google Gemini
- Competitor analysis and market gap identification
- Automated report generation
- Interactive dashboard with visualizations
- Real-time data processing

## Tech Stack
- **Backend**: Python/FastAPI, PostgreSQL, SQLAlchemy
- **Frontend**: React.js, Vite, Tailwind CSS
- **AI/ML**: Google Gemini API
- **Data Collection**: Various public APIs (Google Places, News API, etc.)
- **Deployment**: Docker, Render (Backend), Vercel (Frontend)

## Project Structure  
## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt