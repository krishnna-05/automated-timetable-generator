#!/bin/bash
echo "🧬 Starting ChromoSchedule..."
echo ""

# Backend
echo "▶ Starting FastAPI backend on port 8000..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 2
echo "✓ Backend running at http://localhost:8000"
echo ""

# Frontend
echo "▶ Starting React frontend on port 3000..."
cd frontend
npm install --silent
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ ChromoSchedule is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
