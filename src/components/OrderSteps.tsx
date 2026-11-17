import { ORDER_FLOW, ORDER_STATUS } from "@/lib/options";
import type { OrderStatus } from "@/lib/types";

const HINT: Record<string, string> = {
  received: "Order placed",
  processing: "Files checked",
  printing: "On the cutter",
  ready: "Packed and ready",
  shipped: "On the way",
  completed: "Delivered"
};

export function OrderSteps({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return <p className="badge badge-danger">This order was cancelled.</p>;
  }
  const current = ORDER_FLOW.indexOf(status);
  return (
    <ol className="order-steps">
      {ORDER_FLOW.map((s, i) => (
        <li key={s} className={i < current || status === "completed" ? "is-done" : i === current ? "is-current" : ""} aria-current={i === current ? "step" : undefined}>
          <div>
            <strong>{ORDER_STATUS[s]}</strong>
            <span className="caption">{HINT[s]}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
