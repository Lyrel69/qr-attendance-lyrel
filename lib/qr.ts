export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export type ParsedQR =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function buildQRPayload(event: {
  eventId: string;
  title?: string;
  start?: string | null;
  end?: string | null;
}): string {
  const payload: QRPayload = { v: 1, event: event.eventId.trim().toUpperCase() };
  if (event.title?.trim()) payload.title = event.title.trim();
  if (event.start) payload.start = event.start;
  if (event.end) payload.end = event.end;
  return JSON.stringify(payload);
}

export function parseQRPayload(raw: string): ParsedQR {
  const value = raw.trim();
  if (!value) return { ok: false, message: "The QR code is empty." };

  // Keep old code-only QR stickers working during migration.
  if (!value.startsWith("{")) {
    return { ok: true, payload: { v: 1, event: value.toUpperCase() } };
  }

  try {
    const parsed = JSON.parse(value) as Partial<QRPayload>;
    if (parsed.v !== 1 || typeof parsed.event !== "string" || !parsed.event.trim()) {
      return { ok: false, message: "This QR code is not a valid QR Attendance event." };
    }
    return {
      ok: true,
      payload: {
        v: 1,
        event: parsed.event.trim().toUpperCase(),
        ...(typeof parsed.title === "string" ? { title: parsed.title } : {}),
        ...(typeof parsed.start === "string" ? { start: parsed.start } : {}),
        ...(typeof parsed.end === "string" ? { end: parsed.end } : {}),
      },
    };
  } catch {
    return { ok: false, message: "Unable to read this QR code. Try scanning the event QR again." };
  }
}
