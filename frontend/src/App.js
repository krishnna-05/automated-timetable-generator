import React, { useState, useCallback, useRef } from "react";
import SetupPanel from "./components/SetupPanel";
import TimetableGrid from "./components/TimetableGrid";
import StatsPanel from "./components/StatsPanel";
import "./App.css";

const API = "http://localhost:8000";

export default function App() {
  const [inputData, setInputData] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [stats, setStats] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [activeView, setActiveView] = useState("setup"); // setup | timetable
  const [notification, setNotification] = useState(null);
  const abortRef = useRef(null);

  const showNotif = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadSample = async () => {
    const res = await fetch(`${API}/sample-data`);
    const data = await res.json();
    setInputData(data);
    showNotif("Sample data loaded!", "success");
  };

  const generate = useCallback(async (data) => {
    setGenerating(true);
    setProgress({ generation: 0, fitness: 0, total: data.generations });
    setTimetable(null);
    setStats(null);

    try {
      const res = await fetch(`${API}/generate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6));

          if (payload.type === "progress") {
            setProgress({
              generation: payload.generation,
              fitness: payload.fitness,
              total: payload.total,
            });
          } else if (payload.type === "result") {
            setTimetable(payload.timetable);
            setStats({
              fitness: payload.fitness,
              hardViolations: payload.hard_violations,
              softPenalty: payload.soft_penalty,
              generationsRun: payload.generations_run,
            });
            setActiveView("timetable");
            showNotif(
              payload.hard_violations === 0
                ? "✓ Conflict-free timetable generated!"
                : `Generated with ${payload.hard_violations} conflict(s)`,
              payload.hard_violations === 0 ? "success" : "warning"
            );
          }
        }
      }
    } catch (e) {
      showNotif("Generation failed: " + e.message, "error");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, []);

  const handleManualMove = async (geneIndex, newDay, newHour, newRoomId) => {
    if (!inputData || !timetable) return;
    const res = await fetch(`${API}/validate-move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timetable: timetable,
        gene_index: geneIndex,
        new_day: newDay,
        new_hour: newHour,
        new_room_id: newRoomId,
        courses: inputData.courses,
        rooms: inputData.rooms,
      }),
    });
    const result = await res.json();
    if (result.valid) {
      setTimetable(result.timetable);
      setStats((s) => ({ ...s, softPenalty: result.soft_penalty, hardViolations: 0 }));
      showNotif("Move applied successfully", "success");
    } else {
      showNotif(`Move blocked: ${result.hard_violations} conflict(s) detected`, "error");
    }
    return result.valid;
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">⬡</span>
          <div>
            <h1>ChromoSchedule</h1>
            <p>Genetic Algorithm + Fuzzy Logic Timetable Engine</p>
          </div>
        </div>
        <nav className="header-nav">
          <button
            className={activeView === "setup" ? "nav-btn active" : "nav-btn"}
            onClick={() => setActiveView("setup")}
          >
            Setup
          </button>
          <button
            className={activeView === "timetable" ? "nav-btn active" : "nav-btn"}
            onClick={() => setActiveView("timetable")}
            disabled={!timetable}
          >
            Timetable
          </button>
        </nav>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`notif notif-${notification.type}`}>{notification.msg}</div>
      )}

      {/* Progress bar */}
      {generating && progress && (
        <div className="progress-bar-wrap">
          <div className="progress-info">
            <span>Generation {progress.generation} / {progress.total}</span>
            <span>Fitness: {(progress.fitness * 100).toFixed(1)}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(progress.generation / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <main className="app-main">
        {activeView === "setup" && (
          <SetupPanel
            inputData={inputData}
            setInputData={setInputData}
            onGenerate={generate}
            onLoadSample={loadSample}
            generating={generating}
          />
        )}
        {activeView === "timetable" && timetable && inputData && (
          <div className="timetable-view">
            {stats && <StatsPanel stats={stats} />}
            <TimetableGrid
              timetable={timetable}
              courses={inputData.courses}
              rooms={inputData.rooms}
              days={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}
              hours={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17]}
              onManualMove={handleManualMove}
            />
          </div>
        )}
      </main>
    </div>
  );
}