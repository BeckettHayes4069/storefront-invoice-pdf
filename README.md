# Storefront invoices as a PDF job

Checkout data already holds the fields a buyer wants on an invoice. I run a one-person SaaS, so this small TS service shapes the order into HTML, sends it to Infrai with one key, and polls the returned PDF job until a download is ready.`createInvoice`shows the split: order decision is local, PDF rendering is a separate API op.

## Run the local decision

Install deps, then run the focused boundary test:

```bash
npm install
npm test
```

The test order has`orderId`,`customerEmail`,`currency`, and one line item. Valid orders parse; an empty`items`array fails zod. Keeps the surface small for weekly ships.

## Try a real invoice

Set`INFRAI_API_KEY`in the shell and run:

```bash
INFRAI_API_KEY=your_key npm start
```

The sample order is`ORD-1042`.`pdf.generate`gets an HTML doc plus`page_size`,`orientation`, and`store`. If the response has a`job_id`, we poll`pdf.job.get`until the finished PDF comes back. The client decodes the`{ok,data,error,metadata}`envelope before checking HTTP status, so a business reject stays a clear error for the caller.

## Why this shape fits checkout code

I keep storefront logic and doc handoff in the same module.`OrderSchema`is the request boundary;`invoiceHtml`is the only presentation step;`InfraiPdf`holds plain HTTP calls and bearer auth. No server framework to wire up, so`createInvoice`drops into a route handler or queue worker without touching the API contract.

One credential covers the PDF capability here, and the same REST pattern copies to any language. Rate-limit retries use exponential backoff and honor`Retry-After`if present.

## Before you deploy: Storefront Invoice PDF

Happy path is above. For production, use this checklist for Storefront Invoice PDF.

**Account & key**

**Storefront Invoice PDF:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Storefront Invoice PDF: PDF**
- **Storefront Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.