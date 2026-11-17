import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Flash } from "@/components/admin/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { getSettings } from "@/lib/data";
import { PALETTES } from "@/lib/options";
import type { Palette } from "@/lib/types";
import { saveTheme } from "../actions";

export const metadata: Metadata = { title: "Theme" };

export default async function ThemePage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow mb-0">Theme manager</p>
          <h1>Control the storefront atmosphere</h1>
          <p className="muted mb-0">Each palette keeps the same cut-corner interface and only changes the event colors, for the shop and admin. Visitors still choose night or light mode.</p>
        </div>
      </div>
      <Flash success={sp.success} error={sp.error} />
      <form action={saveTheme} className="stack-form">
        <fieldset>
          <legend className="sr-only">Website theme</legend>
          <div className="grid grid-3">
            {(Object.keys(PALETTES) as Palette[]).map((key) => (
              <label key={key} className="palette-card">
                <input type="radio" name="site_palette" value={key} defaultChecked={settings.site_palette === key} />
                <span className="between">
                  <strong>{PALETTES[key].label}</strong>
                  {settings.site_palette === key ? <span className="badge badge-accent">Current</span> : null}
                </span>
                <span className="palette-chips" aria-hidden="true">
                  {PALETTES[key].chips.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
                <span className="muted">{PALETTES[key].description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <SubmitButton>
            <Icon name="save" /> Save theme
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
