# Aviator Predictor Restructure Plan

## Problem
The repository currently mixes Python scripts, scraping logic, and a Next.js frontend without a clear backend pipeline.

## Solution
Refactor into:

backend/
  scraper/
  predictor/
  server/
  data/
frontend/
scripts/

## Data Flow
Scraper -> JSON data -> Predictor -> API -> Frontend

## Next Steps
1. Isolate Python scripts into backend
2. Create FastAPI server
3. Connect frontend via API
4. Use interceptor for real-time data
