import React, { useState } from "react";

const PALETTE = [
  { bg: "rgba(108,142,245,0.15)", border: "rgba(108,142,245,0.5)", text: "#6c8ef5" },
  { bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.5)", text: "#a78bfa" },
  { bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.5)",  text: "#34d399" },
  { bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.5)",  text: "#fbbf24" },
  { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.5)", text: "#f87171" },
  { bg: "rgba(56,189,248,0.15)",  border: "rgba(56,189,248,0.5)",  text: "#38bdf8" },
];

const DEFAULT_DAYS  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DEFAULT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function getGroupColor(group, groups) {
  const idx = groups.indexOf(group) % PALETTE.length;
  return PALETTE[Math.max(0, idx)];
}

export default function TimetableGrid({ timetable, courses, rooms, days, hours, onManualMove }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [filterGroup, setFilterGroup] = useState("ALL");

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));
  const roomMap   = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const groups    = [...new Set(courses.map((c) => c.student_group))];

  // ── Always show ALL days and ALL hours so slots never disappear ──
  const resolvedDays  = (days && days.length > 0) ? days : DEFAULT_DAYS;
  const resolvedHours = (hours && hours.length > 0) ? hours.map(Number) : DEFAULT_HOURS;

  // ── Build grid lookup: "Day::Hour" -> [{ gene, index }] ──
  const gridData = {};
  timetable.forEach((gene, idx) => {
    const key = `${gene.day}::${Number(gene.hour)}`;
    if (!gridData[key]) gridData[key] = [];
    gridData[key].push({ gene, index: idx });
  });

  // ── Conflict detection ──
  const conflictIndices = new Set();
  const slotRoom = {}, slotLec = {}, slotGrp = {};
  timetable.forEach((gene, i) => {
    const key    = `${gene.day}::${Number(gene.hour)}`;
    const course = courseMap[gene.course_id];
    if (!course) return;
    const checks = [
      [`${key}::${gene.room_id}`,           slotRoom],
      [`${key}::${course.lecturer_id}`,      slotLec],
      [`${key}::${course.student_group}`,    slotGrp],
    ];
    checks.forEach(([k, store]) => {
      if (store[k] !== undefined) {
        conflictIndices.add(i);
        conflictIndices.add(store[k]);
      } else {
        store[k] = i;
      }
    });
  });

  // ── Drag handlers ──
  const handleDragStart = (e, index) => {
    setDragging(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, day, hour) => {
    e.preventDefault();
    setDragOver({ day, hour });
  };
  const handleDrop = async (e, day, hour) => {
    e.preventDefault();
    setDragOver(null);
    if (dragging === null) return;
    const gene = timetable[dragging];
    await onManualMove(dragging, day, hour, gene.room_id);
    setDragging(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  return (
    <div>
      {/* Filter + hint bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="drag-hint">🖱 Drag classes to reschedule — conflicts are blocked</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)" }}>GROUP:</label>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text)", fontFamily: "var(--sans)", fontSize: 13 }}
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="legend" style={{ marginBottom: 16 }}>
        {groups.map((g, i) => {
          const color = PALETTE[i % PALETTE.length];
          return (
            <div key={g} className="legend-item">
              <div className="legend-dot" style={{ background: color.border }} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{g}</span>
            </div>
          );
        })}
        {conflictIndices.size > 0 && (
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "#f87171", boxShadow: "0 0 6px #f87171" }} />
            <span style={{ fontSize: 12, color: "#f87171" }}>Conflict</span>
          </div>
        )}
      </div>

      {/* Timetable Grid */}
      <div className="grid-wrap">
        <table className="tt-grid">
          <thead>
            <tr>
              <th className="hour-label">TIME</th>
              {resolvedDays.map((d) => <th key={d}>{d.slice(0, 3).toUpperCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {resolvedHours.map((hour) => (
              <tr key={hour}>
                <td className="hour-label">{hour}:00</td>
                {resolvedDays.map((day) => {
                  const key     = `${day}::${hour}`;
                  const cells   = gridData[key] || [];
                  const isOver  = dragOver?.day === day && dragOver?.hour === hour;
                  const filtered = filterGroup === "ALL"
                    ? cells
                    : cells.filter(({ gene }) => courseMap[gene.course_id]?.student_group === filterGroup);

                  return (
                    <td
                      key={day}
                      className={isOver ? "drag-over" : ""}
                      onDragOver={(e) => handleDragOver(e, day, hour)}
                      onDrop={(e) => handleDrop(e, day, hour)}
                      onDragLeave={() => setDragOver(null)}
                    >
                      {filtered.map(({ gene, index }) => {
                        const course = courseMap[gene.course_id];
                        const room   = roomMap[gene.room_id];
                        if (!course) return null;
                        const color        = getGroupColor(course.student_group, groups);
                        const isConflict   = conflictIndices.has(index);
                        const isDraggingThis = dragging === index;

                        return (
                          <div
                            key={index}
                            className={`class-card${isDraggingThis ? " dragging" : ""}${isConflict ? " conflict" : ""}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            style={{
                              background:  isConflict ? "rgba(248,113,113,0.15)" : color.bg,
                              borderColor: isConflict ? "#f87171" : color.border,
                              color:       isConflict ? "#f87171" : color.text,
                            }}
                            title={`${course.name} | ${room?.name || gene.room_id} | ${course.student_group}`}
                          >
                            <div className="card-course-name">
                              {course.name}
                              {course.requires_lab
                                ? <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(167,139,250,0.25)", color: "#a78bfa", verticalAlign: "middle" }}>LAB</span>
                                : <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(108,142,245,0.2)", color: "#6c8ef5", verticalAlign: "middle" }}>THEORY</span>
                              }
                            </div>
                            <div className="card-meta">{room?.name || gene.room_id}</div>
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}