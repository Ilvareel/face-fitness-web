import type { PagesFunction } from "@cloudflare/workers-types";

type Env = {
  MAILERLITE_TOKEN?: string;
  MAILERLITE_GROUP_ID?: string;
};

type SubscribeBody = {
  email?: unknown;
  name?: unknown;
  consent?: unknown;
  // Honeypot fields (bots)
  company?: unknown;
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

function isEmail(value: string): boolean {
  // Lightweight sanity check; MailerLite will validate further.
  return Boolean(value) && value.includes("@") && value.length < 254;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // --- Basic rate limit (per IP, short window) ---
    const ip =
      context.request.headers.get("cf-connecting-ip") ||
      context.request.headers.get("x-forwarded-for") ||
      "unknown";

    const rlKey = new Request(`https://ratelimit.local/subscribe:${ip}`);
    const cache = caches.default;
    const hit = await cache.match(rlKey);

    let count = 0;
    if (hit) {
      const v = await hit.text();
      count = Number(v || "0");
    }

    count += 1;
    if (count > 10) {
      return json({ ok: false, error: "rate_limited" }, 429);
    }

    await cache.put(rlKey, new Response(String(count), { headers: { "cache-control": "max-age=60" } }));

    // --- Parse input ---
    const contentType = context.request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ ok: false, error: "invalid_content_type" }, 400);
    }

    const body = (await context.request.json().catch(() => null)) as SubscribeBody | null;

    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const name = (body?.name ?? "").toString().trim();
    const consent = Boolean(body?.consent);

    // honeypot (bots fill hidden fields)
    const hp = (body?.company ?? "").toString().trim();
    if (hp) return json({ ok: true }, 200);

    if (!isEmail(email)) {
      return json({ ok: false, error: "invalid_email" }, 400);
    }
    if (!consent) {
      return json({ ok: false, error: "consent_required" }, 400);
    }

    const token = context.env.MAILERLITE_TOKEN;
    const groupId = context.env.MAILERLITE_GROUP_ID;

    if (!token || !groupId) {
      return json({ ok: false, error: "server_not_configured" }, 500);
    }

    // --- MailerLite: create/upsert subscriber + assign to group via `groups` array ---
    const resp = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        fields: {
          name: name || undefined,
        },
        groups: [groupId],
        status: "active",
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return json({ ok: false, error: "provider_error", details: text.slice(0, 300) }, 502);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    return json(
      {
        ok: false,
        error: "unknown_error",
        message: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};
