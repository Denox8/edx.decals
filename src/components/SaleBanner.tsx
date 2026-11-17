import { Icon } from "@/components/Icon";
import { saleBannerMessage } from "@/lib/pricing";
import type { Settings } from "@/lib/types";

export function SaleBanner({ settings }: { settings: Settings }) {
  const message = saleBannerMessage(settings);
  if (!message) return null;
  return (
    <div className="sale-banner" role="status">
      <div className="container sale-banner-row">
        <span className="pill">
          <Icon name="percent" size="sm" /> Sale Mode
        </span>
        <p>{message}</p>
      </div>
    </div>
  );
}
