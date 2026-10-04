export type NoticeProps = {
  text: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  tone?: "info" | "warning" | "error";
};

export function Notice({ text, action, onDismiss, tone = "info" }: NoticeProps) {
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <p>{text}</p>
      {action && (
        <button type="button" className="primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button type="button" className="dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
