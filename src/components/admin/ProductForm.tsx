"use client";
import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { saveProduct } from "@/app/admin/(panel)/actions";
import { imageUrl } from "@/lib/images";
import type { ActionState, Product } from "@/lib/types";

type ColorRow = { key: number; label: string; hex: string; image: string };
type TextureRow = { key: number; label: string };

const DEFAULT_COLORS = [
  { label: "White", hex: "#F4F4F4" },
  { label: "Black", hex: "#111111" },
  { label: "Yellow", hex: "#FFC72E" }
];

export function ProductForm({ product, categories }: { product: Product | null; categories: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProduct, { ok: false, message: "" });
  let n = 0;
  const [colors, setColors] = useState<ColorRow[]>(
    (product?.colors ?? DEFAULT_COLORS.map((c) => ({ ...c, image: null }))).map((c) => ({ key: n++, label: c.label, hex: c.hex, image: c.image ?? "" }))
  );
  const [textures, setTextures] = useState<TextureRow[]>((product?.textures ?? [{ label: "Glossy" }, { label: "Matte" }]).map((t) => ({ key: n++, label: t.label })));
  const [nextKey, setNextKey] = useState(100);

  return (
    <form action={action} className="stack-form">
      {state.message ? (
        <Notice tone={state.ok ? "success" : "error"} title={state.message}>
          {state.errors?.length ? (
            <ul className="mb-0">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </Notice>
      ) : null}
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <fieldset className="stack-form">
        <legend>Basics</legend>
        <div className="field">
          <label htmlFor="p-name">
            Product name <span className="req">*</span>
          </label>
          <input id="p-name" className="input" name="name" required maxLength={200} defaultValue={product?.name} />
        </div>
        <div className="form-row form-row-2">
          <div className="field">
            <label htmlFor="p-price">
              Price (PHP) <span className="req">*</span>
            </label>
            <input id="p-price" className="input" type="number" name="price" min="0.01" step="0.01" required defaultValue={product?.price} />
          </div>
          <div className="field">
            <label htmlFor="p-category">
              Category <span className="req">*</span>
            </label>
            <input id="p-category" className="input" name="category" list="category-options" required maxLength={100} defaultValue={product?.category} />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field">
          <label htmlFor="p-desc">
            Description <span className="req">*</span>
          </label>
          <textarea id="p-desc" className="textarea" name="description" required maxLength={5000} defaultValue={product?.description} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Available sticker colors</legend>
        <p className="hint">Customer color choices, each with an optional variant image.</p>
        <div className="option-list">
          {colors.map((c, i) => (
            <div key={c.key} className="option-row option-row-color">
              <span className="swatch" style={{ ["--swatch-color" as string]: c.hex }} aria-hidden="true" />
              <input type="hidden" name="color_existing_image" value={c.image} />
              <div className="field">
                <label htmlFor={`c-label-${c.key}`}>Color name</label>
                <input id={`c-label-${c.key}`} className="input" name="color_label" required maxLength={60} value={c.label} onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              </div>
              <div className="field">
                <label htmlFor={`c-hex-${c.key}`}>Picker</label>
                <input id={`c-hex-${c.key}`} className="input" type="color" name="color_hex" value={c.hex} onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
              </div>
              <div className="field">
                <label htmlFor={`c-img-${c.key}`}>Variant image</label>
                <input id={`c-img-${c.key}`} className="input" type="file" name="color_image" accept="image/*" />
              </div>
              <div className="option-thumb">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(c.image)} alt={`${c.label} variant`} />
                ) : (
                  <span>No image</span>
                )}
              </div>
              <button type="button" className="text-button icon-only" aria-label={`Remove color ${c.label}`} disabled={colors.length <= 1} onClick={() => setColors(colors.filter((_, j) => j !== i))}>
                <Icon name="x" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="button button-secondary button-sm mt-4"
          onClick={() => {
            setColors([...colors, { key: nextKey, label: "", hex: "#D9D9D9", image: "" }]);
            setNextKey(nextKey + 1);
          }}
        >
          <Icon name="plus" /> Add color
        </button>
      </fieldset>

      <fieldset>
        <legend>Available sticker textures</legend>
        <div className="option-list">
          {textures.map((t, i) => (
            <div key={t.key} className="option-row option-row-texture">
              <div className="field">
                <label htmlFor={`t-${t.key}`}>Texture name</label>
                <input id={`t-${t.key}`} className="input" name="texture_label" required maxLength={60} value={t.label} onChange={(e) => setTextures(textures.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              </div>
              <button type="button" className="text-button icon-only" aria-label={`Remove texture ${t.label}`} disabled={textures.length <= 1} onClick={() => setTextures(textures.filter((_, j) => j !== i))}>
                <Icon name="x" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="button button-secondary button-sm mt-4"
          onClick={() => {
            setTextures([...textures, { key: nextKey, label: "" }]);
            setNextKey(nextKey + 1);
          }}
        >
          <Icon name="plus" /> Add texture
        </button>
      </fieldset>

      <fieldset className="stack-form">
        <legend>Images</legend>
        <div className="form-row form-row-2">
          <div className="field">
            <label htmlFor="p-cover">Cover image</label>
            <input id="p-cover" className="input" type="file" name="cover_image" accept="image/*" />
          </div>
          <div className="field">
            <label htmlFor="p-gallery">Gallery images</label>
            <input id="p-gallery" className="input" type="file" name="gallery_images" accept="image/*" multiple />
            <span className="hint">JPG, PNG, GIF, WEBP or SVG, up to 5 MB each. New files are added to the gallery.</span>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Visibility</legend>
        <label className="switch">
          <input type="checkbox" name="is_active" defaultChecked={product ? product.is_active : true} /> Show in the shop
        </label>
        <br />
        <label className="check">
          <input type="checkbox" name="sale_selected" defaultChecked={product?.sale_selected} /> Include in Sale Mode when scope is &quot;selected products&quot;
        </label>
      </fieldset>

      <SubmitButton>
        <Icon name="save" /> {product ? "Save changes" : "Create product"}
      </SubmitButton>
    </form>
  );
}
