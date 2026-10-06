import assert from "node:assert/strict";
import { OrderSchema, createInvoice } from "./invoice_service.js";
import { InfraiPdf } from "./infrai_pdf.js";

const valid = { orderId: "ORD-1", customerEmail: "buyer@example.com", currency: "USD", items: [{ name: "Theme", quantity: 2, unitPrice: 12.5 }] };
assert.equal(OrderSchema.parse(valid).items[0].quantity, 2);
assert.throws(() => OrderSchema.parse({ ...valid, items: [] }));
const previousKey = process.env.INFRAI_API_KEY;
process.env.INFRAI_API_KEY = "test-key";
try {
  const client = new InfraiPdf("test-key", (async () => new Response(JSON.stringify({ ok: true, data: { pdf_id: "pdf-test", url: "https://example.com/invoice.pdf" } }), { status: 200 })) as typeof fetch);
  assert.deepEqual(await createInvoice(valid, client), { orderId: "ORD-1", pdf: "https://example.com/invoice.pdf" });
} finally {
  if (previousKey === undefined) delete process.env.INFRAI_API_KEY;
  else process.env.INFRAI_API_KEY = previousKey;
}
console.log("invoice request boundary: valid orders pass and empty carts are rejected");
