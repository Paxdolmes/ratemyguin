// Receives Stripe events and keeps pub_plans and featured_pubs up to date.
import { sql, stripe } from "../_shared/db.ts"

const enc = new TextEncoder()

async function verified(body: string, header: string | null) {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
  if (!secret || !header) return false
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=", 2)))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`)))
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("")
  const sigs = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3))
  return sigs.some((s) => s.length === hex.length && [...s].every((c, i) => c === hex[i]))
}

function planStatus(s: string) {
  return ["active", "trialing", "past_due"].includes(s) ? s : "cancelled"
}

// deno-lint-ignore no-explicit-any
async function syncSubscription(sub: any) {
  const pub = sub.metadata?.pub_id
  if (!pub) return
  const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end
  await sql`select public.sync_pub_plan(${pub}::uuid, ${planStatus(sub.status)}, ${end ? new Date(end * 1000) : null},
    ${typeof sub.customer === "string" ? sub.customer : sub.customer?.id}, ${sub.id})`
}

Deno.serve(async (req) => {
  const body = await req.text()
  if (!(await verified(body, req.headers.get("stripe-signature")))) return new Response("Bad signature", { status: 400 })
  const event = JSON.parse(body)
  const obj = event.data.object
  try {
    if (event.type === "checkout.session.completed") {
      if (obj.mode === "subscription" && obj.subscription) {
        await syncSubscription(await stripe(`subscriptions/${obj.subscription}`))
      } else if (obj.metadata?.kind === "featured" && obj.payment_status === "paid" && obj.metadata?.pub_id) {
        await sql`select public.feature_pub(${obj.metadata.pub_id}::uuid, 7, null, ${obj.id})`
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      await syncSubscription(obj)
    }
    return new Response("ok")
  } catch (err) {
    console.error(err)
    return new Response("Error", { status: 500 })
  }
})
