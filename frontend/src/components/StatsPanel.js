import React from "react";

export default function StatsPanel({ stats }) {
  const fitnessPercent = Math.round(stats.fitness * 100);
  const qualityLabel =
    fitnessPercent >= 95 ? "Excellent" :
    fitnessPercent >= 80 ? "Good" :
    fitnessPercent >= 60 ? "Acceptable" : "Poor";

  const qualityColor =
    fitnessPercent >= 95 ? "var(--success)" :
    fitnessPercent >= 80 ? "var(--accent)" :
    fitnessPercent >= 60 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">Fitness Score</div>
        <div className="stat-value" style={{ color: qualityColor }}>{fitnessPercent}%</div>
        <div className="stat-sub">{qualityLabel} solution</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Hard Conflicts</div>
        <div className="stat-value" style={{ color: stats.hardViolations === 0 ? "var(--success)" : "var(--danger)" }}>
          {stats.hardViolations}
        </div>
        <div className="stat-sub">{stats.hardViolations === 0 ? "No double-bookings" : "Conflicts detected"}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Fuzzy Soft Penalty</div>
        <div className="stat-value" style={{ color: "var(--accent2)" }}>{stats.softPenalty.toFixed(1)}</div>
        <div className="stat-sub">Gap + back-to-back score</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Generations Run</div>
        <div className="stat-value" style={{ color: "var(--muted)" }}>{stats.generationsRun}</div>
        <div className="stat-sub">With elitism enabled</div>
      </div>
    </div>
  );
}
