const styles = {
  error: "border-danger/30 bg-danger/5 text-danger-soft",
  info: "border-gold/30 bg-gold/10 text-bone",
};

export default function Notice({ kind, children }: { kind: keyof typeof styles; children: React.ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}
