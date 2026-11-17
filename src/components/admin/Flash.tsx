import { Notice } from "@/components/Notice";

/** Shows ?success= / ?error= messages set by admin Server Actions (replaces PHP set_flash/get_flash). */
export function Flash({ success, error }: { success?: string; error?: string }) {
  return (
    <>
      {success ? <Notice tone="success">{success}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </>
  );
}
