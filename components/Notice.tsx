const styles = {
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-amber-200 bg-amber-50 text-amber-900",
};

export default function Notice({ kind, children }: { kind: keyof typeof styles; children: React.ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}
