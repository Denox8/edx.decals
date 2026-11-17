"use client";
import { useFormStatus } from "react-dom";

/** Submit button that shows the loading state while a Server Action runs. */
export function SubmitButton({ children, className = "button button-primary", confirmText, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      className={`${className}${pending ? " is-loading" : ""}`}
      disabled={pending || rest.disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
