export default function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      style={{
        minHeight: "45vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <span
        aria-hidden="true"
        className="jp loading-mark"
        style={{
          display: "grid",
          placeItems: "center",
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "var(--accent)",
          color: "var(--on-accent)",
          fontSize: 26,
          paddingTop: 3,
        }}
      >
        こ
      </span>
      <p className="caption" role="status">
        {label}
      </p>
    </div>
  );
}
