export default function MetricCard({
  icon,
  color,
  label,
  value,
}: {
  icon: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className="card"
      style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          width: 38,
          height: 38,
          borderRadius: 11,
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
          color: color,
          fontSize: 20,
        }}
      >
        <i className={`ti ${icon}`} />
      </span>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}
