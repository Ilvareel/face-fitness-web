export const onRequestPost: PagesFunction = async (context) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });

  try {
    // ---- Basic rate limit (per IP, short window) ----
    const ip =
      context.request.headers.get("cf-connecting-ip") ||
      context.request.headers.get("x-forwarded-for") ||
      "unknown";

    const rlKey = new Request(`https://rate.limit/subscribe/${ip}`);
    const cache = caches.default;
    const hit = await cache.match(rlKey);
    let count = 0;

    if (hit) {
      const v = await hit.text();
      count = Number(v || "0");
    }

    count += 1;

    // allow up to 10 requests per ~10 minutes
    if (count > 10) {
      return json({ ok: false, error: "rate_limited" }, 429);
    }

    await cache.put(
      rlKey,
      new Response(String(count), {
        headers: {
          "cache-control": "public, max-age=600", // 10 minutes
        },
      })
    );

    // ---- Parse input ----
    const contentType = context.request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ ok: false, error: "invalid_content_type" }, 400);
    }

    const body = await context.request.json().catch(() => null);
    const email = (body?.email || "").toString().trim().toLowerCase();
    const name = (body?.name || "").toString().trim();
    const consent = Boolean(body?.consent);

    // honeypot (bots fill hidden fields)
    const hp = (body?.company || "").toString().trim();
    if (hp) return json({ ok: true }, 200);

    if (!email || !email.includes("@")) {
      return json({ ok: false, error: "invalid_email" }, 400);
    }
    if (!consent) {
      return json({ ok: false, error: "consent_required" }, 400);
    }

    const token = context.env.MAILERLITE_TOKEN as string | undefined;
    const groupId = context.env.MAILERLITE_GROUP_ID as string | undefined;

    if (!token || !groupId) {
      return json({ ok: false, error: "server_not_configured" }, 500);
    }

    // ---- MailerLite: create/upsert subscriber + assign to group via `groups` array ----
    const resp = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        fields: {
          ...(name ? { name } : {}),
        },
        groups: [groupId],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return json(
        { ok: false, error: "mailerlite_error", status: resp.status, details: text.slice(0, 500) },
        502
      );
    }

    return json({ ok: true });
  } catch {
    return new Response("Internal Error", { status: 500 });
  }
};
