import { z } from "zod";
import { InfraiPdf } from "./infrai_pdf.js";

export const OrderSchema = z.object({
  orderId: z.string().min(1),
  customerEmail: z.string().email(),
  currency: z.string().length(3),
  items: z.array(z.object({ name: z.string().min(1), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative() })).min(1)
});
export type Order = z.infer<typeof OrderSchema>;

function invoiceHtml(order: Order): string {
  const rows = order.items.map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.unitPrice.toFixed(2)} ${order.currency}</td></tr>`).join("");
  return `<html><body><h1>Invoice ${order.orderId}</h1><p>Bill to ${order.customerEmail}</p><table><tr><th>Item</th><th>Qty</th><th>Unit</th></tr>${rows}</table></body></html>`;
}

export async function createInvoice(orderInput: unknown, client = new InfraiPdf(process.env.INFRAI_API_KEY ?? "")): Promise<{ orderId: string; pdf: string }> {
  const order = OrderSchema.parse(orderInput);
  if (!process.env.INFRAI_API_KEY) throw new Error("INFRAI_API_KEY is required");
  const generated = await client.generate({ html: invoiceHtml(order), page_size: "A4", orientation: "portrait", store: true });
  if (generated.url || generated.pdf || generated.download_url) return { orderId: order.orderId, pdf: generated.url ?? generated.pdf ?? generated.download_url! };
  if (!generated.job_id) throw new Error("PDF generation returned no result");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = await client.jobGet(generated.job_id);
    if (job.status === "completed" && (job.pdf || job.download_url)) return { orderId: order.orderId, pdf: job.pdf ?? job.download_url! };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("PDF job did not complete within the polling window");
}

if (process.argv[1]?.endsWith("invoice_service.ts")) {
  const sample: Order = { orderId: "ORD-1042", customerEmail: "buyer@example.com", currency: "USD", items: [{ name: "Developer toolkit", quantity: 1, unitPrice: 49 }] };
  createInvoice(sample).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
