import { Elysia } from "elysia"
import Stripe from "stripe"
import { db } from "@workspace/db-{{name}}"
import { subscriptions } from "@workspace/db-{{name}}/subscription"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" })

export const billingRoutes = new Elysia({ prefix: "/billing" })
  .get("/plans", async () => {
    // TODO: return active plans from database
    return { plans: [] }
  })
  .post("/webhook", async ({ request, set }) => {
    const sig = request.headers.get("stripe-signature")
    const body = await request.text()

    if (!sig) {
      set.status = 400
      return { error: "Missing stripe-signature header" }
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      set.status = 400
      return { error: "Invalid webhook signature" }
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        await db.insert(subscriptions).values({
          entityId: sub.metadata.entityId ?? sub.customer as string,
          stripeSubscriptionId: sub.id,
          stripeCustomerId: sub.customer as string,
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        }).onConflictDoUpdate({
          target: subscriptions.stripeSubscriptionId,
          set: {
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        })
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await db.update(subscriptions)
          .set({ status: "canceled", canceledAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id))
        break
      }
    }

    return { received: true }
  })
