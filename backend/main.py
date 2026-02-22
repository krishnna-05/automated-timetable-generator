from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import random
import copy
import json
import asyncio

app = FastAPI(title="Timetable Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data Models ────────────────────────────────────────────────────────────────

class Course(BaseModel):
    id: str
    name: str
    lecturer_id: str
    duration: int = 1       # hours
    requires_lab: bool = False
    student_group: str

class Room(BaseModel):
    id: str
    name: str
    capacity: int
    is_lab: bool = False

class Lecturer(BaseModel):
    id: str
    name: str

class TimeSlot(BaseModel):
    day: str       # Mon–Fri
    hour: int      # 8–17

class TimetableInput(BaseModel):
    courses: List[Course]
    rooms: List[Room]
    lecturers: List[Lecturer]
    days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    hours: List[int] = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    population_size: int = 50
    generations: int = 200
    mutation_rate: float = 0.05
    elitism_count: int = 2

class Gene(BaseModel):
    course_id: str
    room_id: str
    day: str
    hour: int

class ManualMoveRequest(BaseModel):
    timetable: List[Gene]
    gene_index: int
    new_day: str
    new_hour: int
    new_room_id: str
    courses: List[Course]
    rooms: List[Room]

# ─── Fuzzy Logic ────────────────────────────────────────────────────────────────

def fuzzy_gap_penalty(gap_hours: int) -> float:
    """Fuzzy membership: how BAD is a gap between classes for a student?"""
    if gap_hours == 0:
        return 0.0   # No gap
    elif gap_hours == 1:
        return 0.2   # Slightly bad (short break)
    elif gap_hours == 2:
        return 0.6   # Moderately bad
    elif gap_hours == 3:
        return 0.9   # Very bad
    else:
        return 1.0   # Extremely bad (large idle gap)

def fuzzy_back_to_back_penalty(consecutive: int) -> float:
    """Fuzzy membership: how BAD is it for a lecturer to have consecutive sessions?"""
    if consecutive <= 2:
        return 0.0   # Fine
    elif consecutive == 3:
        return 0.3   # Slightly tiring
    elif consecutive == 4:
        return 0.7   # Quite tiring
    else:
        return 1.0   # Exhausting

# ─── Genetic Algorithm ──────────────────────────────────────────────────────────

class TimetableGA:
    def __init__(self, data: TimetableInput):
        self.data = data
        self.courses = {c.id: c for c in data.courses}
        self.rooms = {r.id: r for r in data.rooms}
        self.lecturers = {l.id: l for l in data.lecturers}
        self.days = data.days
        self.hours = data.hours
        self.slots = [(d, h) for d in self.days for h in self.hours]

    def random_chromosome(self) -> List[dict]:
        chromosome = []
        for course in self.data.courses:
            valid_rooms = [
                r for r in self.data.rooms
                if r.is_lab == course.requires_lab
            ]
            if not valid_rooms:
                valid_rooms = self.data.rooms
            room = random.choice(valid_rooms)
            day, hour = random.choice(self.slots)
            chromosome.append({
                "course_id": course.id,
                "room_id": room.id,
                "day": day,
                "hour": hour
            })
        return chromosome

    def hard_constraint_violations(self, chromosome: List[dict]) -> int:
        """Count hard constraint violations (return count, lower = better)."""
        violations = 0
        slot_room = {}
        slot_lecturer = {}
        slot_group = {}

        for gene in chromosome:
            course = self.courses[gene["course_id"]]
            slot = (gene["day"], gene["hour"])

            # Room double-booking
            room_key = (slot, gene["room_id"])
            if room_key in slot_room:
                violations += 1
            slot_room[room_key] = True

            # Lecturer double-booking
            lec_key = (slot, course.lecturer_id)
            if lec_key in slot_lecturer:
                violations += 1
            slot_lecturer[lec_key] = True

            # Student group double-booking
            group_key = (slot, course.student_group)
            if group_key in slot_group:
                violations += 1
            slot_group[group_key] = True

            # Room type mismatch
            room = self.rooms[gene["room_id"]]
            if course.requires_lab and not room.is_lab:
                violations += 2

        return violations

    def soft_constraint_score(self, chromosome: List[dict]) -> float:
        """
        Fuzzy Logic weighted soft constraints.
        Returns penalty score — lower is better.
        """
        total_penalty = 0.0

        # Group genes by student group (for gap analysis)
        group_schedule: dict = {}
        for gene in chromosome:
            course = self.courses[gene["course_id"]]
            g = course.student_group
            day = gene["day"]
            hour = gene["hour"]
            key = (g, day)
            group_schedule.setdefault(key, []).append(hour)

        for (group, day), hours_list in group_schedule.items():
            hours_sorted = sorted(hours_list)
            for i in range(len(hours_sorted) - 1):
                gap = hours_sorted[i+1] - hours_sorted[i] - 1
                if gap > 0:
                    total_penalty += fuzzy_gap_penalty(gap) * 5  # weight=5

        # Lecturer back-to-back sessions
        lec_schedule: dict = {}
        for gene in chromosome:
            course = self.courses[gene["course_id"]]
            lec = course.lecturer_id
            day = gene["day"]
            hour = gene["hour"]
            lec_schedule.setdefault((lec, day), []).append(hour)

        for (lec, day), hours_list in lec_schedule.items():
            hours_sorted = sorted(hours_list)
            consecutive = 1
            max_consec = 1
            for i in range(1, len(hours_sorted)):
                if hours_sorted[i] == hours_sorted[i-1] + 1:
                    consecutive += 1
                    max_consec = max(max_consec, consecutive)
                else:
                    consecutive = 1
            total_penalty += fuzzy_back_to_back_penalty(max_consec) * 3  # weight=3

        return total_penalty

    def fitness(self, chromosome: List[dict]) -> float:
        hard = self.hard_constraint_violations(chromosome)
        soft = self.soft_constraint_score(chromosome)
        # Hard violations are penalized much more heavily
        penalty = (hard * 100) + soft
        return 1.0 / (1.0 + penalty)

    def selection(self, population: List, fitnesses: List[float]):
        """Tournament selection."""
        tournament = random.sample(list(zip(population, fitnesses)), min(5, len(population)))
        return max(tournament, key=lambda x: x[1])[0]

    def crossover(self, p1: List[dict], p2: List[dict]) -> List[dict]:
        """Single-point crossover."""
        point = random.randint(1, len(p1) - 1)
        return p1[:point] + p2[point:]

    def mutate(self, chromosome: List[dict]) -> List[dict]:
        result = copy.deepcopy(chromosome)
        for i, gene in enumerate(result):
            if random.random() < self.data.mutation_rate:
                course = self.courses[gene["course_id"]]
                valid_rooms = [r for r in self.data.rooms if r.is_lab == course.requires_lab]
                if not valid_rooms:
                    valid_rooms = self.data.rooms
                room = random.choice(valid_rooms)
                day, hour = random.choice(self.slots)
                result[i] = {
                    "course_id": gene["course_id"],
                    "room_id": room.id,
                    "day": day,
                    "hour": hour
                }
        return result

    def evolve(self):
        """Generator: yields progress events each generation."""
        population = [self.random_chromosome() for _ in range(self.data.population_size)]
        best_ever = None
        best_fitness_ever = -1

        for gen in range(self.data.generations):
            fitnesses = [self.fitness(ch) for ch in population]
            best_idx = fitnesses.index(max(fitnesses))
            best_fitness = fitnesses[best_idx]

            if best_fitness > best_fitness_ever:
                best_fitness_ever = best_fitness
                best_ever = copy.deepcopy(population[best_idx])

            # Early exit if perfect
            if best_fitness_ever >= 0.999:
                yield gen, best_fitness_ever, best_ever
                break

            # Elitism: carry top N chromosomes unchanged
            sorted_pop = sorted(zip(population, fitnesses), key=lambda x: -x[1])
            new_population = [copy.deepcopy(ch) for ch, _ in sorted_pop[:self.data.elitism_count]]

            # Fill rest via crossover + mutation
            while len(new_population) < self.data.population_size:
                p1 = self.selection(population, fitnesses)
                p2 = self.selection(population, fitnesses)
                child = self.crossover(p1, p2)
                child = self.mutate(child)
                new_population.append(child)

            population = new_population
            yield gen, best_fitness_ever, best_ever

    def check_move_validity(self, timetable: List[dict], gene_index: int,
                             new_day: str, new_hour: int, new_room_id: str):
        """Check if a manual drag-and-drop move is valid."""
        modified = copy.deepcopy(timetable)
        modified[gene_index]["day"] = new_day
        modified[gene_index]["hour"] = new_hour
        modified[gene_index]["room_id"] = new_room_id
        hard = self.hard_constraint_violations(modified)
        soft = self.soft_constraint_score(modified)
        return {
            "valid": hard == 0,
            "hard_violations": hard,
            "soft_penalty": round(soft, 2),
            "timetable": modified
        }


# ─── API Endpoints ───────────────────────────────────────────────────────────────

@app.post("/generate/stream")
async def generate_stream(data: TimetableInput):
    """SSE stream: yields generation progress + final timetable."""
    ga = TimetableGA(data)

    async def event_stream():
        loop = asyncio.get_event_loop()
        gen_iter = ga.evolve()
        last_gen = 0
        last_best = None

        for gen, fitness, best in gen_iter:
            last_gen = gen
            last_best = best
            if gen % 10 == 0 or fitness >= 0.999:
                payload = json.dumps({
                    "type": "progress",
                    "generation": gen,
                    "fitness": round(fitness, 4),
                    "total": data.generations
                })
                yield f"data: {payload}\n\n"
            await asyncio.sleep(0)

        # Send final timetable
        hard = ga.hard_constraint_violations(last_best)
        soft = ga.soft_constraint_score(last_best)
        payload = json.dumps({
            "type": "result",
            "timetable": last_best,
            "fitness": round(ga.fitness(last_best), 4),
            "hard_violations": hard,
            "soft_penalty": round(soft, 2),
            "generations_run": last_gen + 1
        })
        yield f"data: {payload}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/validate-move")
async def validate_move(req: ManualMoveRequest):
    """Validate a drag-and-drop move and return updated timetable."""
    data = TimetableInput(
        courses=req.courses,
        rooms=req.rooms,
        lecturers=[],
        population_size=1,
        generations=1
    )
    ga = TimetableGA(data)
    timetable_dicts = [g.dict() for g in req.timetable]
    result = ga.check_move_validity(
        timetable_dicts, req.gene_index,
        req.new_day, req.new_hour, req.new_room_id
    )
    return result


@app.get("/sample-data")
async def get_sample_data():
    """Return realistic sample university data."""
    return {
        "lecturers": [
            {"id": "L1", "name": "Dr. Mehta"},
            {"id": "L2", "name": "Prof. Rao"},
            {"id": "L3", "name": "Dr. Patel"},
            {"id": "L4", "name": "Prof. Sharma"},
        ],
        "rooms": [
            {"id": "R1", "name": "Room 101", "capacity": 60, "is_lab": False},
            {"id": "R2", "name": "Room 102", "capacity": 80, "is_lab": False},
            {"id": "R3", "name": "Room 201", "capacity": 40, "is_lab": False},
            {"id": "LAB1", "name": "CS Lab A", "capacity": 30, "is_lab": True},
            {"id": "LAB2", "name": "CS Lab B", "capacity": 30, "is_lab": True},
        ],
        "courses": [
            {"id": "C1", "name": "Data Structures", "lecturer_id": "L1", "duration": 1, "requires_lab": False, "student_group": "CS-A"},
            {"id": "C2", "name": "Algorithms", "lecturer_id": "L2", "duration": 1, "requires_lab": False, "student_group": "CS-A"},
            {"id": "C3", "name": "DBMS", "lecturer_id": "L3", "duration": 1, "requires_lab": False, "student_group": "CS-B"},
            {"id": "C4", "name": "OS Lab", "lecturer_id": "L1", "duration": 2, "requires_lab": True, "student_group": "CS-A"},
            {"id": "C5", "name": "Networks", "lecturer_id": "L4", "duration": 1, "requires_lab": False, "student_group": "CS-B"},
            {"id": "C6", "name": "DBMS Lab", "lecturer_id": "L3", "duration": 2, "requires_lab": True, "student_group": "CS-B"},
            {"id": "C7", "name": "Software Engineering", "lecturer_id": "L2", "duration": 1, "requires_lab": False, "student_group": "CS-A"},
            {"id": "C8", "name": "Machine Learning", "lecturer_id": "L4", "duration": 1, "requires_lab": False, "student_group": "CS-B"},
        ],
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "hours": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        "population_size": 50,
        "generations": 200,
        "mutation_rate": 0.05,
        "elitism_count": 2
    }

@app.get("/health")
async def health():
    return {"status": "ok"}