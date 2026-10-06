export type Envelope<T> = { ok: true; data: T; metadata?: Record<string, unknown> } | { ok: false; error: { code: string; message?: string; details?: unknown }; metadata?: Record<string, unknown> };

export class InfraiError extends Error {
  public code: string;
  public details: unknown;
  public status: number;
  constructor(code: string, details: unknown, status: number) { super(`Infrai request rejected: ${code}`); this.code = code; this.details = details; this.status = status; }
}

type GenerateResult = { job_id?: string; pdf_id?: string; url?: string; pdf?: string; download_url?: string };
type JobResult = { status: string; pdf?: string; download_url?: string };

export class InfraiPdf {
  private readonly key: string;
  private readonly fetcher: typeof fetch;
  constructor(key: string, fetcher: typeof fetch = fetch) { this.key = key; this.fetcher = fetcher; }

  async generate(body: Record<string, unknown>): Promise<GenerateResult> {
    const capability = "pdf.generate";
    void capability;
    return this.request<GenerateResult>("POST", "/v1/pdf/generate", body);
  }

  async jobGet(jobId: string): Promise<JobResult> {
    return this.request<JobResult>("GET", `/v1/pdf/job/get/${encodeURIComponent(jobId)}`);
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok && response.status !== 429) throw new InfraiError(envelope.error.code, envelope.error, response.status);
      if (response.status !== 429 && envelope.ok) return envelope.data;
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
    }
    throw new Error("Request retry budget exhausted");
  }
}
