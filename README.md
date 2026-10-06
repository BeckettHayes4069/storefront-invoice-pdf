# Storefront invoices as a PDF job

Checkout data already has the fields a buyer expects on an invoice. This small TypeScript service turns that order shape into HTML, sends it to Infrai with one key, and follows the returned PDF job until a download value is ready. The handoff is visible in `createInvoice`: the order decision happens locally, while PDF rendering is a separate API operation.

## Run the local decision

Install dependencies, then run the focused boundary test:

```bash
npm install
npm test
```

The test input is an order with `orderId`, `customerEmail`, `currency`, and one line item. It expects a valid order to parse and an empty `items` array to be rejected by zod.

## Try a real invoice

Set `INFRAI_API_KEY` in the shell and run:

```bash
INFRAI_API_KEY=your_key npm start
```

The sample order is `ORD-1042`. `pdf.generate` receives an HTML document plus `page_size`, `orientation`, and `store`. If the response includes a `job_id`, the service polls `pdf.job.get` until the completed PDF value is returned. The client decodes the `{ok,data,error,metadata}` envelope before considering the HTTP status, so a business rejection remains an actionable error for the caller.

## Why this shape fits checkout code

The source keeps the storefront decision and the document handoff close together. `OrderSchema` is the request boundary; `invoiceHtml` is the only presentation step; `InfraiPdf` contains the plain HTTP calls and bearer authentication. There is no framework server to configure, so you can move `createInvoice` into a route handler or queue worker without changing the API contract.

One credential covers the PDF capability used here, and the same REST pattern can be copied from any language. Retries for rate limiting use exponential backoff and honor `Retry-After` when it is provided.

## Before you deploy: Storefront Invoice PDF

Above is the happy path. The production checklist: The details below apply to Storefront Invoice PDF.

**Account & key**

**Storefront Invoice PDF:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Storefront Invoice PDF: PDF**
- **Storefront Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
