const styles = {
  error: "border-danger/30 bg-danger/5 text-danger",
  info: "border-warning/40 bg-warning/10 text-ink",
};

export default function Notice({ kind, children }: { kind: keyof typeof styles; children: React.ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}
