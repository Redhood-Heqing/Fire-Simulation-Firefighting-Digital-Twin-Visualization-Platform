import type { ReactNode } from "react";

interface HudPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}

export function HudPanel({ title, subtitle, children, className = "", dense = false }: HudPanelProps) {
  return (
    <section className={`hud-panel ${dense ? "hud-panel--dense" : ""} ${className}`}>
      <div className="hud-panel__header">
        <span className="hud-panel__marker" />
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="hud-panel__body">{children}</div>
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "cyan" | "green" | "amber" | "red" | "violet";
}

export function MetricCard({ label, value, unit, tone = "cyan" }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <span>{label}</span>
      <strong>
        {value}
        {unit ? <small>{unit}</small> : null}
      </strong>
    </div>
  );
}
