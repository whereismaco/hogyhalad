import Stripe from "stripe";
import { first, statement, uid } from "./db";
import { AppError, plans, type Plan } from "./domain";
import { requireRole, type Access } from "./access";
import { required, type Env } from "./env";
import { taskStatement } from "./tasks";

export function stripe(env: Env) {
  return new Stripe(required(env.STRIPE_SECRET_KEY, "Stripe"), {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
}
export async function checkout(ctx: Access, plan: Plan) {
  requireRole(ctx, ["OWNER"]);
  if (["active", "trialing", "past_due"].includes(ctx.tenant.state))
    throw new AppError(
      409,
      "Már van előfizetésed. Használd a számlázási felületet.",
    );
  const client = stripe(ctx.env),
    db = ctx.env.DB;
  const priceId = required(
    plan === "BUSINESS"
      ? ctx.env.STRIPE_PRICE_BUSINESS
      : ctx.env.STRIPE_PRICE_STARTER,
    "Stripe csomagár",
  );
  const price = await client.prices.retrieve(priceId);
  if (
    price.currency !== "huf" ||
    price.unit_amount !== plans[plan].price * 100 ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1
  )
    throw new AppError(
      503,
      "A Stripe csomagár beállítása nem egyezik a meghirdetett havidíjjal.",
    );
  let customerId = ctx.tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await client.customers.create(
      {
        email: ctx.user.email,
        name: ctx.tenant.name,
        metadata: { tenantId: ctx.tenant.id },
      },
      { idempotencyKey: "customer:" + ctx.tenant.id },
    );
    customerId = customer.id;
    await statement(
      db,
      "UPDATE tenants SET stripeCustomerId=? WHERE id=?",
      customerId,
      ctx.tenant.id,
    ).run();
  }
  const existing = await client.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  if (
    existing.data.some(
      (s) => !["canceled", "incomplete_expired"].includes(s.status),
    )
  )
    throw new AppError(
      409,
      "A céghez már tartozik előfizetés. Frissítsd a számlázási adatokat.",
    );
  const now = Date.now(),
    claim = await first<{ tenantId: string }>(
      db,
      "SELECT tenantId FROM trialClaims WHERE userId=?",
      ctx.user.id,
    );
  if (!claim)
    await statement(
      db,
      "INSERT INTO trialClaims(userId,tenantId,claimedAt) VALUES(?,?,?) ON CONFLICT(userId) DO NOTHING",
      ctx.user.id,
      ctx.tenant.id,
      now,
    ).run();
  const actualClaim = await first<{ tenantId: string }>(
    db,
    "SELECT tenantId FROM trialClaims WHERE userId=?",
    ctx.user.id,
  );
  const trial = actualClaim?.tenantId === ctx.tenant.id && !ctx.tenant.trialEnd;
  const lock = await first<{ sessionId: string | null; expiresAt: number }>(
    db,
    "SELECT sessionId,expiresAt FROM checkoutSessions WHERE tenantId=?",
    ctx.tenant.id,
  );
  if (lock && lock.expiresAt > now) {
    if (!lock.sessionId)
      throw new AppError(
        409,
        "A fizetési oldal előkészítése folyamatban van. Próbáld újra néhány másodperc múlva.",
      );
    const session = await client.checkout.sessions.retrieve(lock.sessionId);
    if (session.status === "open" && session.url) return { url: session.url };
    throw new AppError(409, "A fizetési állapot frissítése folyamatban van.");
  }
  const attempt = uid();
  const acquired = await statement(
    db,
    "INSERT INTO checkoutSessions(tenantId,attempt,expiresAt) VALUES(?,?,?) ON CONFLICT(tenantId) DO UPDATE SET attempt=excluded.attempt,sessionId=NULL,expiresAt=excluded.expiresAt WHERE checkoutSessions.expiresAt<? RETURNING attempt",
    ctx.tenant.id,
    attempt,
    now + 60000,
    now,
  ).first<{ attempt: string }>();
  if (acquired?.attempt !== attempt)
    throw new AppError(409, "Már folyamatban van egy fizetési kérés.");
  try {
    const session = await client.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allowed_payment_method_types: ["card"],
        payment_method_collection: "always",
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        subscription_data: {
          metadata: { tenantId: ctx.tenant.id, plan },
          ...(trial
            ? {
                trial_period_days: 7,
                trial_settings: {
                  end_behavior: { missing_payment_method: "cancel" as const },
                },
              }
            : {}),
        },
        metadata: { tenantId: ctx.tenant.id, kind: "subscription", plan },
        custom_text: {
          submit: {
            message: trial
              ? "7 napos próba kártyamegadással. A próba végén " +
                plans[plan].price.toLocaleString("hu-HU") +
                " Ft/hó kerül terhelésre, ha előtte nem mondod le."
              : "A díjmentes próbát már felhasználtad. A választott csomag díja " +
                plans[plan].price.toLocaleString("hu-HU") +
                " Ft, amely most, majd havonta kerül terhelésre a lemondásig.",
          },
        },
        success_url: ctx.env.APP_URL + "/dashboard/billing?checkout=success",
        cancel_url: ctx.env.APP_URL + "/dashboard/billing?checkout=cancelled",
      },
      { idempotencyKey: "checkout:" + attempt },
    );
    await statement(
      db,
      "UPDATE checkoutSessions SET sessionId=?,expiresAt=? WHERE tenantId=? AND attempt=?",
      session.id,
      (session.expires_at || 0) * 1000,
      ctx.tenant.id,
      attempt,
    ).run();
    return { url: session.url };
  } catch (error) {
    await statement(
      db,
      "DELETE FROM checkoutSessions WHERE tenantId=? AND attempt=?",
      ctx.tenant.id,
      attempt,
    ).run();
    throw error;
  }
}
export async function portal(ctx: Access) {
  requireRole(ctx, ["OWNER"]);
  if (!ctx.tenant.stripeCustomerId)
    throw new AppError(409, "Először indíts előfizetést.");
  return {
    url: (
      await stripe(ctx.env).billingPortal.sessions.create({
        customer: ctx.tenant.stripeCustomerId,
        return_url: ctx.env.APP_URL + "/dashboard/billing",
      })
    ).url,
  };
}
export async function schedulePlan(ctx: Access, plan: Plan) {
  requireRole(ctx, ["OWNER"]);
  if (!ctx.tenant.stripeSubscriptionId)
    throw new AppError(409, "Nincs aktív előfizetés.");
  if (plan === "STARTER") {
    const seats = await first<{ n: number }>(
      ctx.env.DB,
      "SELECT (SELECT count(*) FROM members WHERE tenantId=? AND active=1)+(SELECT count(*) FROM invitations WHERE tenantId=? AND state='pending' AND expiresAt>?) AS n",
      ctx.tenant.id,
      ctx.tenant.id,
      Date.now(),
    );
    if ((seats?.n ?? 99) > 1)
      throw new AppError(
        409,
        "Visszaváltás előtt csökkentsd az aktív és meghívott felhasználók számát egyre.",
      );
  }
  const client = stripe(ctx.env),
    sub = await client.subscriptions.retrieve(ctx.tenant.stripeSubscriptionId);
  if (sub.status !== "active")
    throw new AppError(
      409,
      "Csomagváltás a fizetett előfizetés első időszakától lehetséges.",
    );
  const item = sub.items.data[0],
    price = required(
      plan === "BUSINESS"
        ? ctx.env.STRIPE_PRICE_BUSINESS
        : ctx.env.STRIPE_PRICE_STARTER,
      "Csomagár",
    );
  const schedule = sub.schedule
    ? await client.subscriptionSchedules.retrieve(
        typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id,
      )
    : await client.subscriptionSchedules.create(
        { from_subscription: sub.id },
        { idempotencyKey: "schedule:" + sub.id },
      );
  await client.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        start_date: schedule.current_phase!.start_date,
        end_date: schedule.current_phase!.end_date,
        items: [{ price: item.price.id, quantity: 1 }],
      },
      {
        start_date: schedule.current_phase!.end_date,
        items: [{ price, quantity: 1 }],
        metadata: { tenantId: ctx.tenant.id, plan },
      },
    ],
  });
  await statement(
    ctx.env.DB,
    "UPDATE tenants SET pendingPlan=? WHERE id=?",
    plan,
    ctx.tenant.id,
  ).run();
  return { ok: true };
}
export async function processStripe(env: Env, event: Stripe.Event) {
  const db = env.DB,
    client = stripe(env);
  if (event.type.startsWith("customer.subscription.")) {
    const raw = event.data.object as Stripe.Subscription;
    const sub = await client.subscriptions.retrieve(raw.id);
    const tenant = await first<{
      id: string;
      stripeSubscriptionId: string | null;
      monthlyCredits: number;
      trialEnd: number | null;
    }>(
      db,
      "SELECT id,stripeSubscriptionId,monthlyCredits,trialEnd FROM tenants WHERE stripeCustomerId=?",
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    );
    if (!tenant) return;
    if (tenant.stripeSubscriptionId && tenant.stripeSubscriptionId !== sub.id) {
      // An old subscription event must never replace a newer subscription.
      const current = await client.subscriptions.retrieve(
        tenant.stripeSubscriptionId,
      );
      if (!["canceled", "incomplete_expired"].includes(current.status)) return;
      if (["canceled", "incomplete_expired"].includes(sub.status)) return;
    }
    const price = sub.items.data[0]?.price.id;
    const plan: Plan =
      price === env.STRIPE_PRICE_BUSINESS ? "BUSINESS" : "STARTER";
    if (
      price !== env.STRIPE_PRICE_BUSINESS &&
      price !== env.STRIPE_PRICE_STARTER
    )
      throw new Error("Unknown subscription price");
    const now = Date.now(),
      item = sub.items.data[0];
    await statement(
      db,
      "UPDATE tenants SET stripeSubscriptionId=?,plan=?,state=?,trialEnd=COALESCE(?,trialEnd),periodStart=?,periodEnd=?,pastDueAt=CASE WHEN ?='past_due' THEN COALESCE(pastDueAt,?) ELSE NULL END,cancelAtPeriodEnd=?,pendingPlan=CASE WHEN pendingPlan=? THEN NULL ELSE pendingPlan END,updatedAt=? WHERE id=?",
      sub.id,
      plan,
      sub.status,
      sub.trial_end ? sub.trial_end * 1000 : null,
      (item.current_period_start || sub.start_date) * 1000,
      item.current_period_end * 1000,
      sub.status,
      now,
      Number(sub.cancel_at_period_end),
      plan,
      now,
      tenant.id,
    ).run();
    if (sub.status === "trialing") {
      await db.batch([
        statement(
          db,
          "INSERT INTO creditLedger(id,tenantId,monthlyDelta,description,requestKey,createdAt) VALUES(?,?,?,'Próbaidős AI-keret',?,?) ON CONFLICT(requestKey) DO NOTHING",
          uid(),
          tenant.id,
          plans[plan].credits,
          "trial:" + tenant.id,
          now,
        ),
        statement(
          db,
          "UPDATE tenants SET monthlyCredits=? WHERE id=? AND changes()=1",
          plans[plan].credits,
          tenant.id,
        ),
      ]);
    }
    if (event.type === "customer.subscription.trial_will_end")
      await taskStatement(
        db,
        tenant.id,
        "EMAIL",
        {
          to: null,
          platform: true,
          subject: "Hamarosan véget ér a HogyHalad próbaidőd",
          text:
            "A próbaidő hamarosan lejár. A következő havidíj " +
            plans[plan].price +
            " Ft. A számlázási oldalon lemondhatod: " +
            env.APP_URL +
            "/dashboard/billing",
        },
        "trial-reminder:" + sub.id,
      ).run();
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (
      session.metadata?.kind !== "credits" ||
      session.payment_status !== "paid"
    )
      return;
    const tenantId = session.metadata.tenantId,
      credits = Number(session.metadata.credits);
    if (!tenantId || ![250, 550, 1200].includes(credits))
      throw new Error("Invalid credit checkout");
    const lines = await client.checkout.sessions.listLineItems(session.id, {
      limit: 10,
    });
    const allowed = [
      env.STRIPE_PRICE_CREDITS_SMALL,
      env.STRIPE_PRICE_CREDITS_MEDIUM,
      env.STRIPE_PRICE_CREDITS_LARGE,
    ];
    if (
      lines.data.length !== 1 ||
      !allowed.includes(lines.data[0].price?.id) ||
      session.currency !== "huf"
    )
      throw new Error("Invalid credit price");
    const priceIndex = allowed.indexOf(lines.data[0].price!.id),
      expectedCredits = [250, 550, 1200][priceIndex],
      expectedAmount = [5000, 10000, 20000][priceIndex] * 100;
    const tenant = await first<{ stripeCustomerId: string }>(
      db,
      "SELECT stripeCustomerId FROM tenants WHERE id=?",
      tenantId,
    );
    if (
      expectedCredits !== credits ||
      session.amount_total !== expectedAmount ||
      tenant?.stripeCustomerId !== session.customer
    )
      throw new Error("Invalid checkout ownership");
    await db.batch([
      statement(
        db,
        "INSERT INTO creditLedger(id,tenantId,purchasedDelta,description,requestKey,createdAt) VALUES(?,?,?,'AI-kredit vásárlás',?,?) ON CONFLICT(requestKey) DO NOTHING",
        uid(),
        tenantId,
        credits,
        "topup:" + session.id,
        Date.now(),
      ),
      statement(
        db,
        "UPDATE tenants SET purchasedCredits=MAX(0,purchasedCredits+?-creditDebt),creditDebt=MAX(0,creditDebt-?) WHERE id=? AND changes()=1",
        credits,
        credits,
        tenantId,
      ),
      taskStatement(
        db,
        tenantId,
        "INVOICE",
        {
          sourceId: session.id,
          amount: expectedAmount / 100,
          description: "HogyHalad AI-kredit feltöltés",
          platform: true,
        },
        "invoice:" + session.id,
      ),
    ]);
  }
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    if (!invoice.customer || invoice.amount_paid <= 0) return;
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer.id;
    const tenant = await first<{
      id: string;
      plan: Plan;
      stripeSubscriptionId: string | null;
    }>(
      db,
      "SELECT id,plan,stripeSubscriptionId FROM tenants WHERE stripeCustomerId=?",
      customerId,
    );
    if (!tenant) return;
    const subRef = invoice.parent?.subscription_details?.subscription;
    if (!subRef) return;
    const sub = await client.subscriptions.retrieve(
      typeof subRef === "string" ? subRef : subRef.id,
    );
    const item = sub.items.data[0],
      plan: Plan =
        item.price.id === env.STRIPE_PRICE_BUSINESS ? "BUSINESS" : "STARTER";
    if (
      item.price.id !== env.STRIPE_PRICE_BUSINESS &&
      item.price.id !== env.STRIPE_PRICE_STARTER
    )
      throw new Error("UNKNOWN_SUBSCRIPTION_PRICE");
    const renewal =
      (!tenant.stripeSubscriptionId ||
        tenant.stripeSubscriptionId === sub.id) &&
      invoice.lines.data.some(
        (line) => line.period.start === item.current_period_start,
      ) &&
      ["subscription_create", "subscription_cycle"].includes(
        invoice.billing_reason || "",
      );
    await db.batch([
      ...(renewal
        ? [
            statement(
              db,
              "INSERT INTO creditLedger(id,tenantId,monthlyDelta,description,requestKey,createdAt) SELECT ?,id,?-monthlyCredits,'Havi AI-keret',?,? FROM tenants WHERE id=? ON CONFLICT(requestKey) DO NOTHING",
              uid(),
              plans[plan].credits,
              "cycle:" + tenant.id + ":" + item.current_period_start,
              Date.now(),
              tenant.id,
            ),
            statement(
              db,
              "UPDATE tenants SET monthlyCredits=?,periodStart=?,periodEnd=?,plan=?,state=?,pastDueAt=NULL WHERE id=? AND changes()=1",
              plans[plan].credits,
              item.current_period_start * 1000,
              item.current_period_end * 1000,
              plan,
              sub.status,
              tenant.id,
            ),
          ]
        : []),
      taskStatement(
        db,
        tenant.id,
        "INVOICE",
        {
          sourceId: invoice.id,
          amount: invoice.amount_paid / 100,
          description: "HogyHalad " + plans[plan].name + " havidíj",
          platform: true,
        },
        "invoice:" + invoice.id,
      ),
    ]);
  }
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice,
      ref = invoice.parent?.subscription_details?.subscription;
    if (ref) {
      const sub = await client.subscriptions.retrieve(
        typeof ref === "string" ? ref : ref.id,
      );
      await processStripe(env, {
        ...event,
        type: "customer.subscription.updated",
        data: { ...event.data, object: sub },
      } as Stripe.Event);
    }
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;
    const tenant = customerId
      ? await first<{ id: string }>(
          db,
          "SELECT id FROM tenants WHERE stripeCustomerId=?",
          customerId,
        )
      : null;
    if (tenant)
      await taskStatement(
        db,
        tenant.id,
        "EMAIL",
        {
          platform: true,
          subject: "A HogyHalad havidíj terhelése nem sikerült",
          text:
            "Ellenőrizd a bankkártyádat a számlázási felületen: " +
            env.APP_URL +
            "/dashboard/billing\nA módosítási hozzáférés háromnapos türelmi idő után szünetel, az adatok olvashatók maradnak.",
        },
        "payment-failed:" + invoice.id,
      ).run();
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge,
      ref = charge.payment_intent;
    if (ref) {
      const sessions = await client.checkout.sessions.list({
        payment_intent: typeof ref === "string" ? ref : ref.id,
        limit: 10,
      });
      const session = sessions.data.find((s) => s.metadata?.kind === "credits");
      if (session?.metadata?.tenantId) {
        const tenantId = session.metadata.tenantId,
          original = await first<{ purchasedDelta: number }>(
            db,
            "SELECT purchasedDelta FROM creditLedger WHERE tenantId=? AND requestKey=?",
            tenantId,
            "topup:" + session.id,
          );
        if (!original) throw new Error("PAYMENT_NOT_FULFILLED");
        for (const refund of charge.refunds?.data || []) {
          if (refund.status !== "succeeded") continue;
          const reversed = Math.min(
            original.purchasedDelta,
            Math.ceil(
              (original.purchasedDelta * refund.amount) / charge.amount,
            ),
          );
          await db.batch([
            statement(
              db,
              "INSERT INTO creditLedger(id,tenantId,purchasedDelta,description,requestKey,createdAt) VALUES(?,?,?,'Visszatérített kreditvásárlás',?,?) ON CONFLICT(requestKey) DO NOTHING",
              uid(),
              tenantId,
              -reversed,
              "refund-payment:" + refund.id,
              Date.now(),
            ),
            statement(
              db,
              "UPDATE tenants SET creditDebt=creditDebt+MAX(0,?-purchasedCredits),purchasedCredits=MAX(0,purchasedCredits-?) WHERE id=? AND changes()=1",
              reversed,
              reversed,
              tenantId,
            ),
          ]);
        }
      }
    }
  }
  await statement(
    db,
    "UPDATE webhookEvents SET processedAt=? WHERE id=?",
    Date.now(),
    event.id,
  ).run();
}
