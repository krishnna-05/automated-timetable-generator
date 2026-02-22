# ChromoSchedule 
### Automated University Timetable Generator
**Genetic Algorithm + Fuzzy Logic | FastAPI + React**

---

## Features

| Feature | Details |
|---|---|
| **Genetic Algorithm** | Selection → Crossover → Mutation → Elitism |
| **Fuzzy Logic Soft Constraints** | Penalizes student idle gaps & lecturer back-to-back sessions with membership functions |
| **Elitism** | Top N chromosomes preserved across generations to prevent regression |
| **Hard Constraints** | No room double-booking, no lecturer double-booking, no student group clash, lab room enforcement |
| **Drag-and-Drop** | Manually reschedule classes post-generation with live conflict validation |
| **Streaming Progress** | Real-time generation progress via Server-Sent Events |

---

## Project Structure

```
timetable-app/
├── backend/
│   ├── main.py            # FastAPI app — GA engine + Fuzzy Logic + API
│   └── requirements.txt
└── frontend/
    ├── public/index.html
    ├── package.json
    └── src/
        ├── App.js          # Root component + SSE generation flow
        ├── App.css         # Dark academic design system
        └── components/
            ├── SetupPanel.js    # Data input + GA params
            ├── TimetableGrid.js # Drag-and-drop timetable grid
            └── StatsPanel.js    # Fitness + conflict stats
```

---

## Setup & Run

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be at: http://localhost:8000  
Swagger docs at: http://localhost:8000/docs

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start
```

Opens at: http://localhost:3000

---

## How It Works

### Genetic Algorithm Flow
```
Initial Population (random chromosomes)
        ↓
Evaluate fitness (hard + fuzzy soft constraints)
        ↓
Selection (tournament)  ← Elitism preserves top N
        ↓
Crossover (single-point)
        ↓
Mutation (random gene replacement)
        ↓
New Population → repeat until generations complete
```

### Fitness Function
```
fitness = 1 / (1 + (hard_violations × 100) + fuzzy_soft_penalty)
```

### Fuzzy Logic Soft Constraints

**Student Gap Penalty** (how bad is idle time between classes?):
| Gap (hours) | Fuzzy Weight |
|---|---|
| 0 | 0.0 — No gap, fine |
| 1 | 0.2 — Short break, acceptable |
| 2 | 0.6 — Moderately bad |
| 3 | 0.9 — Very bad |
| 4+ | 1.0 — Unacceptable |

**Lecturer Back-to-Back Penalty** (how tired does a lecturer get?):
| Consecutive | Fuzzy Weight |
|---|---|
| ≤2 | 0.0 — Fine |
| 3 | 0.3 — Slightly tiring |
| 4 | 0.7 — Quite tiring |
| 5+ | 1.0 — Exhausting |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/sample-data` | Load sample university data |
| POST | `/generate/stream` | SSE stream — generates timetable |
| POST | `/validate-move` | Validate drag-and-drop move |

---

## Improvements Over Original Paper

| Paper | This Implementation |
|---|---|
| Basic fitness function | **Hard + Fuzzy soft** weighted fitness |
| No elitism | **Elitism** — top N preserved per generation |
| CSS/JS UI suggestion | **Full React UI** with drag-and-drop |
| Manual timetabling | **Real-time streaming** generation with progress |
| No conflict feedback | **Live conflict detection** on manual moves |
