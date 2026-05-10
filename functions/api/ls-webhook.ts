import type { D1Database, PagesFunction } from "@cloudflare/workers-types";

type Env = {
  DB: D1Database;
  LS_WEBHOOK_SECRET?: string;
};

type LemonSqueezyWebhookPayload = {
  meta?: {
    event_name?: string;
    webhook_id?: string;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      user_email?: string;
      customer_id?: number | string;
      order_number?: number | string;
      status?: string;
      refunded?: boolean;
      first_order_item?: {
        product_id?: number | string;
        variant_id?: number | string;
      };
      urls?: Record<string, unknown>;
    };
  };
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return email.length > 3 && email.length < 254 && email.includes("@");
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expectedSignature = toHex(digest);

  return safeEqual(expectedSignature, signature);
}

function getWebhookEventId(payload: LemonSqueezyWebhookPayload): string {
  const webhookId = payload.meta?.webhook_id?.toString().trim();
  const eventName = payload.meta?.event_name?.toString().trim();
  const dataId = payload.data?.id?.toString().trim();

  if (webhookId) return webhookId;
  if (eventName && dataId) return `${eventName}:${dataId}`;

  return crypto.randomUUID();
}

function getOrderId(payload: LemonSqueezyWebhookPayload): string | null {
  return payload.data?.id?.toString().trim() || null;
}

function getCustomerId(payload: LemonSqueezyWebhookPayload): string | null {
  return payload.data?.attributes?.customer_id?.toString().trim() || null;
}

function getProductId(payload: LemonSqueezyWebhookPayload): string | null {
  return payload.data?.attributes?.first_order_item?.product_id?.toString().trim() || null;
}

function getVariantId(payload: LemonSqueezyWebhookPayload): string | null {
  return payload.data?.attributes?.first_order_item?.variant_id?.toString().trim() || null;
}

function getCustomerEmail(payload: LemonSqueezyWebhookPayload): string | null {
  const email = payload.data?.attributes?.user_email?.toString().trim();
  return email || null;
}

function getCustomerStatus(payload: LemonSqueezyWebhookPayload): "paid" | "refunded" | "revoked" {
  const eventName = payload.meta?.event_name || "";
  const orderStatus = payload.data?.attributes?.status || "";
  const refunded = Boolean(payload.data?.attributes?.refunded);

  if (eventName.includes("refund") || refunded || orderStatus === "refunded") {
    return "refunded";
  }

  return "paid";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const secret = context.env.LS_WEBHOOK_SECRET;

    if (!secret) {
      return json({ ok: false, error: "server_not_configured" }, 500);
    }

    if (!context.env.DB) {
      return json({ ok: false, error: "database_not_configured" }, 500);
    }

    const signature = context.request.headers.get("x-signature") || "";

    if (!signature) {
      return json({ ok: false, error: "missing_signature" }, 401);
    }

    const rawBody = await context.request.text();

    const isVerified = await verifySignature(rawBody, signature, secret);

    if (!isVerified) {
      return json({ ok: false, error: "invalid_signature" }, 401);
    }

    const payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;

    const eventName = payload.meta?.event_name?.toString().trim() || "unknown";
    const eventId = getWebhookEventId(payload);

    // Idempotency: if Lemon Squeezy sends the same webhook again, we do not process it twice.
    const existingEvent = await context.env.DB.prepare(
      "SELECT id FROM webhook_events WHERE ls_event_id = ? LIMIT 1"
    )
      .bind(eventId)
      .first<{ id: number }>();

    if (existingEvent) {
      return json({ ok: true, duplicate: true }, 200);
    }

    await context.env.DB.prepare(
      `INSERT INTO webhook_events (ls_event_id, event_name, payload_json)
       VALUES (?, ?, ?)`
    )
      .bind(eventId, eventName, rawBody)
      .run();

    const customerEmail = getCustomerEmail(payload);
    const orderId = getOrderId(payload);
    const customerId = getCustomerId(payload);
    const productId = getProductId(payload);
    const variantId = getVariantId(payload);
    const status = getCustomerStatus(payload);

    // For now we only care about order webhooks that contain a customer email.
    // Other valid LS events are stored in webhook_events but ignored for access.
    if (!customerEmail || !isValidEmail(customerEmail)) {
      return json({ ok: true, ignored: true, reason: "missing_customer_email" }, 200);
    }

    const emailNormalized = normalizeEmail(customerEmail);

    await context.env.DB.prepare(
      `INSERT INTO paid_customers (
        email_normalized,
        email_original,
        ls_order_id,
        ls_customer_id,
        product_id,
        variant_id,
        status,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email_normalized) DO UPDATE SET
        email_original = excluded.email_original,
        ls_order_id = COALESCE(excluded.ls_order_id, paid_customers.ls_order_id),
        ls_customer_id = COALESCE(excluded.ls_customer_id, paid_customers.ls_customer_id),
        product_id = COALESCE(excluded.product_id, paid_customers.product_id),
        variant_id = COALESCE(excluded.variant_id, paid_customers.variant_id),
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP`
    )
      .bind(emailNormalized, customerEmail, orderId, customerId, productId, variantId, status)
      .run();

    return json({ ok: true }, 200);
  } catch (err) {
    return json(
      {
        ok: false,
        error: "webhook_error",
        message: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const onRequestGet: PagesFunction<Env> = async () => {
  return json({ ok: false, error: "method_not_allowed" }, 405);
};