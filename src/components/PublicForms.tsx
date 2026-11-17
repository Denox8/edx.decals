"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { submitContact, submitCustomOrder } from "@/app/(store)/actions";
import { CONTACT_OPTIONS } from "@/lib/options";
import type { ActionState } from "@/lib/types";

const INITIAL: ActionState = { ok: false, message: "" };

function Result({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <Notice tone={state.ok ? "success" : "error"} title={state.message}>
      {state.errors?.length ? (
        <ul className="mb-0">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </Notice>
  );
}

export function ContactForm() {
  const [state, action] = useActionState(submitContact, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="stack-form">
      <Result state={state} />
      <div className="form-row form-row-2">
        <div className="field">
          <label htmlFor="c-name">
            Name <span className="req">*</span>
          </label>
          <input id="c-name" className="input" name="name" required maxLength={150} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="c-email">
            Email <span className="req">*</span>
          </label>
          <input id="c-email" className="input" type="email" name="email" required maxLength={200} autoComplete="email" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-message">
          Message <span className="req">*</span>
        </label>
        <textarea id="c-message" className="textarea" name="message" required maxLength={3000} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
      <SubmitButton>
        <Icon name="mail" /> Send message
      </SubmitButton>
    </form>
  );
}

export function CustomOrderForm() {
  const [state, action] = useActionState(submitCustomOrder, INITIAL);
  const [preview, setPreview] = useState<string>("/images/sticker-default.svg");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPreview("/images/sticker-default.svg");
    }
  }, [state]);
  return (
    <form ref={formRef} action={action} className="stack-form">
      <Result state={state} />
      <div className="form-row form-row-2">
        <div className="field">
          <label htmlFor="cu-name">
            Your name <span className="req">*</span>
          </label>
          <input id="cu-name" className="input" name="customer_name" required maxLength={255} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="cu-email">Email address</label>
          <input id="cu-email" className="input" type="email" name="email" maxLength={200} autoComplete="email" />
        </div>
      </div>
      <div className="form-row form-row-3">
        <div className="field">
          <label htmlFor="cu-phone">Phone number</label>
          <input id="cu-phone" className="input" name="phone" maxLength={100} autoComplete="tel" />
        </div>
        <div className="field">
          <label htmlFor="cu-social">Facebook or Instagram</label>
          <input id="cu-social" className="input" name="social_handle" maxLength={255} />
        </div>
        <div className="field">
          <label htmlFor="cu-contact">Best way to reach you</label>
          <select id="cu-contact" className="select" name="preferred_contact" defaultValue="email">
            {Object.entries(CONTACT_OPTIONS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="cu-desc">
          Sticker description <span className="req">*</span>
        </label>
        <textarea id="cu-desc" className="textarea" name="description" required maxLength={2000} />
      </div>
      <div className="field">
        <label htmlFor="cu-size">
          Preferred size <span className="req">*</span>
        </label>
        <input id="cu-size" className="input" name="size" required maxLength={120} placeholder="e.g. 10 x 6 cm" />
      </div>
      <div className="field">
        <label htmlFor="cu-image">
          Upload reference image <span className="req">*</span>
        </label>
        <input
          id="cu-image"
          className="input"
          type="file"
          name="image"
          required
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : "/images/sticker-default.svg");
          }}
        />
        <span className="hint">JPG, PNG, GIF or WEBP, up to 5 MB.</span>
      </div>
      <div className="upload-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Upload preview" />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
      <SubmitButton>
        <Icon name="upload" /> Submit custom request
      </SubmitButton>
    </form>
  );
}
