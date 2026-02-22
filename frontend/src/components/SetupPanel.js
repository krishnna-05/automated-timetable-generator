import React, { useState } from "react";

const GROUP_COLORS = ["#6c8ef5", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#38bdf8"];

export default function SetupPanel({ inputData, setInputData, onGenerate, onLoadSample, generating }) {
  const [newLecturer, setNewLecturer] = useState({ name: "" });
  const [newRoom, setNewRoom] = useState({ name: "", capacity: 60, is_lab: false });
  const [newCourse, setNewCourse] = useState({ name: "", lecturer_id: "", student_group: "", requires_lab: false });
  const [gaParams, setGaParams] = useState({
    population_size: 50,
    generations: 200,
    mutation_rate: 0.05,
    elitism_count: 2,
  });

  const data = inputData || { lecturers: [], rooms: [], courses: [], days: [], hours: [] };

  const uid = () => Math.random().toString(36).slice(2, 7).toUpperCase();

  const addLecturer = () => {
    if (!newLecturer.name.trim()) return;
    const updated = {
      ...data,
      lecturers: [...data.lecturers, { id: "L" + uid(), name: newLecturer.name.trim() }],
    };
    setInputData(updated);
    setNewLecturer({ name: "" });
  };

  const removeLecturer = (id) =>
    setInputData({ ...data, lecturers: data.lecturers.filter((l) => l.id !== id) });

  const addRoom = () => {
    if (!newRoom.name.trim()) return;
    const updated = {
      ...data,
      rooms: [
        ...data.rooms,
        { id: "R" + uid(), name: newRoom.name.trim(), capacity: +newRoom.capacity, is_lab: newRoom.is_lab },
      ],
    };
    setInputData(updated);
    setNewRoom({ name: "", capacity: 60, is_lab: false });
  };

  const removeRoom = (id) =>
    setInputData({ ...data, rooms: data.rooms.filter((r) => r.id !== id) });

  const addCourse = () => {
    if (!newCourse.name.trim() || !newCourse.lecturer_id || !newCourse.student_group.trim()) return;
    const updated = {
      ...data,
      courses: [
        ...data.courses,
        {
          id: "C" + uid(),
          name: newCourse.name.trim(),
          lecturer_id: newCourse.lecturer_id,
          student_group: newCourse.student_group.trim(),
          requires_lab: newCourse.requires_lab,
          duration: 1,
        },
      ],
    };
    setInputData(updated);
    setNewCourse({ name: "", lecturer_id: "", student_group: "", requires_lab: false });
  };

  const removeCourse = (id) =>
    setInputData({ ...data, courses: data.courses.filter((c) => c.id !== id) });

  const handleGenerate = () => {
    if (!data.courses.length || !data.rooms.length || !data.lecturers.length) return;
    onGenerate({
      ...data,
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      ...gaParams,
    });
  };

  const groups = [...new Set(data.courses.map((c) => c.student_group))];

  return (
    <div className="setup-layout">
      {/* Left column */}
      <div className="setup-col">
        {/* Lecturers */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Lecturers</span>
            <span className="tag tag-blue">{data.lecturers.length} added</span>
          </div>
          <div className="add-form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Full Name</label>
              <input
                value={newLecturer.name}
                onChange={(e) => setNewLecturer({ name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addLecturer()}
                placeholder="e.g. Dr. Mehta"
              />
            </div>
            <button className="btn btn-ghost" onClick={addLecturer}>+ Add</button>
          </div>
          {data.lecturers.length > 0 && (
            <table className="entity-table">
              <thead><tr><th>ID</th><th>Name</th><th></th></tr></thead>
              <tbody>
                {data.lecturers.map((l) => (
                  <tr key={l.id}>
                    <td><code style={{ color: "var(--muted)", fontSize: 11 }}>{l.id}</code></td>
                    <td>{l.name}</td>
                    <td><button className="btn btn-danger" onClick={() => removeLecturer(l.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rooms */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Rooms & Labs</span>
            <span className="tag tag-purple">{data.rooms.length} added</span>
          </div>
          <div className="add-form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Room Name</label>
              <input
                value={newRoom.name}
                onChange={(e) => setNewRoom((r) => ({ ...r, name: e.target.value }))}
                placeholder="e.g. Room 101"
              />
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom((r) => ({ ...r, capacity: e.target.value }))}
              />
            </div>
            <div className="form-group checkbox-row" style={{ flex: 0, marginBottom: 2 }}>
              <input
                type="checkbox"
                checked={newRoom.is_lab}
                onChange={(e) => setNewRoom((r) => ({ ...r, is_lab: e.target.checked }))}
                id="islab"
              />
              <label htmlFor="islab" style={{ cursor: "pointer", textTransform: "none", letterSpacing: 0 }}>Lab?</label>
            </div>
            <button className="btn btn-ghost" onClick={addRoom}>+ Add</button>
          </div>
          {data.rooms.length > 0 && (
            <table className="entity-table">
              <thead><tr><th>Name</th><th>Cap</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {data.rooms.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.capacity}</td>
                    <td>
                      <span className={`tag ${r.is_lab ? "tag-purple" : "tag-blue"}`} style={{ fontSize: 10 }}>
                        {r.is_lab ? "LAB" : "Room"}
                      </span>
                    </td>
                    <td><button className="btn btn-danger" onClick={() => removeRoom(r.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="setup-col">
        {/* Courses */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Courses</span>
            <span className="tag tag-green">{data.courses.length} added</span>
          </div>
          <div className="add-form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Course Name</label>
              <input
                value={newCourse.name}
                onChange={(e) => setNewCourse((c) => ({ ...c, name: e.target.value }))}
                placeholder="e.g. Data Structures"
              />
            </div>
            <div className="form-group" style={{ flex: 1.5 }}>
              <label>Lecturer</label>
              <select
                value={newCourse.lecturer_id}
                onChange={(e) => setNewCourse((c) => ({ ...c, lecturer_id: e.target.value }))}
              >
                <option value="">Select...</option>
                {data.lecturers.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Group</label>
              <input
                value={newCourse.student_group}
                onChange={(e) => setNewCourse((c) => ({ ...c, student_group: e.target.value }))}
                placeholder="e.g. CS-A"
                list="group-suggestions"
              />
              <datalist id="group-suggestions">
                {groups.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div className="form-group checkbox-row" style={{ flex: 0, marginBottom: 2 }}>
              <input
                type="checkbox"
                checked={newCourse.requires_lab}
                onChange={(e) => setNewCourse((c) => ({ ...c, requires_lab: e.target.checked }))}
                id="reqlab"
              />
              <label htmlFor="reqlab" style={{ cursor: "pointer", textTransform: "none", letterSpacing: 0 }}>Lab?</label>
            </div>
            <button className="btn btn-ghost" onClick={addCourse}>+ Add</button>
          </div>

          {data.courses.length > 0 && (
            <table className="entity-table">
              <thead><tr><th>Course</th><th>Lecturer</th><th>Group</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {data.courses.map((c) => {
                  const lec = data.lecturers.find((l) => l.id === c.lecturer_id);
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>{lec?.name || "—"}</td>
                      <td><span className="tag tag-blue" style={{ fontSize: 10 }}>{c.student_group}</span></td>
                      <td>{c.requires_lab && <span className="tag tag-purple" style={{ fontSize: 10 }}>LAB</span>}</td>
                      <td><button className="btn btn-danger" onClick={() => removeCourse(c.id)}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* GA Parameters */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>GA Parameters</div>
          <div className="ga-params">
            <div className="form-group">
              <label>Population Size</label>
              <input
                type="number"
                value={gaParams.population_size}
                onChange={(e) => setGaParams((p) => ({ ...p, population_size: +e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Generations</label>
              <input
                type="number"
                value={gaParams.generations}
                onChange={(e) => setGaParams((p) => ({ ...p, generations: +e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Mutation Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={gaParams.mutation_rate}
                onChange={(e) => setGaParams((p) => ({ ...p, mutation_rate: +e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Elitism Count</label>
              <input
                type="number"
                value={gaParams.elitism_count}
                onChange={(e) => setGaParams((p) => ({ ...p, elitism_count: +e.target.value }))}
              />
            </div>
          </div>

          <div className="generate-section">
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !data.courses.length}
            >
              {generating ? "⏳ Generating..." : "⬡ Generate Timetable"}
            </button>
            <button className="btn btn-ghost" onClick={onLoadSample}>
              Load Sample Data
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}