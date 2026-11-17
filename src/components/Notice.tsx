import { Icon } from "@/components/Icon";

export function Notice({ tone = "info", title, children }: { tone?: "info" | "success" | "warning" | "error"; title?: string; children?: React.ReactNode }) {
  const icon = tone === "success" ? "check-octagon" : tone === "error" ? "alert-octagon" : tone === "warning" ? "alert-triangle" : "info";
  return (
    <div className={`notice ${tone === "info" ? "" : tone}`.trim()} role={tone === "error" ? "alert" : "status"}>
      <Icon name={icon} />
      <div className="notice-body">
        {title ? <span className="notice-title">{title}</span> : null}
        {children}
      </div>
    </div>
  );
}
