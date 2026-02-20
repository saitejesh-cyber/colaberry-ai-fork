export type DemoRequestInput = {
  name?: string;
  email: string;
  company?: string;
  role?: string;
  teamSize?: string;
  timeline?: string;
  message?: string;
  website?: string;
  sourcePage?: string;
  sourcePath?: string;
};

export type DemoRequestResponse = {
  ok: boolean;
  message: string;
};

export const DEFAULT_DEMO_REQUEST_MESSAGE =
  "Share your goals, current stack, and the workflows you want to accelerate.";

export async function submitDemoRequest(payload: DemoRequestInput): Promise<DemoRequestResponse> {
  const response = await fetch("/api/demo-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      message: payload.message || DEFAULT_DEMO_REQUEST_MESSAGE,
    }),
  });

  const json = (await response.json()) as {
    ok?: boolean;
    message?: string;
  };

  if (!response.ok || !json?.ok) {
    return {
      ok: false,
      message: json?.message || "Unable to send request right now.",
    };
  }

  return {
    ok: true,
    message: json.message || "Thanks! We will reach out shortly.",
  };
}

export function isValidWorkEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}
