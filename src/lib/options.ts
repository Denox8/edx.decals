import type { CustomStatus, OrderStatus, Palette, PaymentStatus, CustomPaymentStatus } from "@/lib/types";

export const ORDER_STATUS: Record<OrderStatus, string> = {
  received: "Received",
  processing: "Processing",
  printing: "Printing",
  ready: "Ready",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled"
};
export const ORDER_FLOW: OrderStatus[] = ["received", "processing", "printing", "ready", "shipped", "completed"];

export const PAYMENT_STATUS: Record<CustomPaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  refunded: "Refunded",
  offline: "Paid (offline)"
};
export function paymentBadge(status: CustomPaymentStatus | PaymentStatus): string {
  if (status === "paid" || status === "offline") return "badge badge-success";
  if (status === "pending") return "badge badge-warning";
  if (status === "failed" || status === "expired") return "badge badge-danger";
  return "badge badge-outline";
}
export function orderBadge(status: OrderStatus): string {
  if (status === "completed") return "badge badge-success";
  if (status === "cancelled") return "badge badge-danger";
  if (status === "received") return "badge badge-info";
  return "badge badge-accent";
}

export const CUSTOM_STATUS: Record<CustomStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

export const CONTACT_OPTIONS = { email: "Email", phone: "Phone", social: "Social media", any: "Any available method" } as const;

export const PALETTES: Record<Palette, { label: string; description: string; chips: [string, string, string] }> = {
  cyber: { label: "Cyberpunk Yellow", description: "High-contrast yellow cyberpunk with bold HUD-style glow.", chips: ["#15130D", "#FFC72E", "#FFF8E3"] },
  blue: { label: "Cyberpunk Blue", description: "Electric blue cyberpunk with cool neon highlights.", chips: ["#0F131B", "#4AC7FF", "#EEF5FF"] },
  noel: { label: "Cyberpunk Noel", description: "Holiday cyberpunk with neon red, green, and gold accents.", chips: ["#0E1311", "#FF4D6D", "#7DFFB3"] },
  araw: { label: "Cyberpunk Araw", description: "Heritage-inspired cyberpunk with warm amber and sunrise tones.", chips: ["#120E0B", "#FF9F1C", "#FFD166"] },
  festival: { label: "Cyberpunk Fiesta", description: "Fiesta cyberpunk with magenta, cyan, and laser-bright accents.", chips: ["#130B1A", "#FF4FD8", "#4DDEFF"] }
};

export function isOneOf<T extends string>(value: string, list: Record<T, unknown>): value is T {
  return Object.prototype.hasOwnProperty.call(list, value);
}
