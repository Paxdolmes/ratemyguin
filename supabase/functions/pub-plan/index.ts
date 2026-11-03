// Starts a Stripe Checkout for ratemyGuin for Pubs (monthly) or a week in "Our featured pubs",
// or opens the billing portal. Only a pub's owners and managers can call it.
import { cors, json, SITE, sql, stripe } from "../_shared/db.ts"

const PLAN_PENCE = Number(Deno.env.get("PLAN_PENCE") ?? 2500)
const FEATURED_PENCE = Number(Deno.env.get("FEATURED_PENCE") ?? 4900)
// The publishable key is public (it ships in the apps); used only to ask Supabase who is signed in.
const PUBLISHABLE = Deno.env.get("SUPABASE_ANON_KEY") ?? "sb_publishable_8aeFY-i4xdQPbQ7kA_BRjA_WfoJR18a"

async function signedInUser(req: Request) {
  const auth = req.headers.get("authorization") ?? ""
  if (!auth.startsWith("Bearer ")) return null
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { authorization: auth, apikey: PUBLISHABLE } })
  if (!res.ok) return null
  return (await res.json()) as { id: string; email?: string }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) })
  try {
    const user = await signedInUser(req)
    if (!user) return json(req, { error: "Sign in first" }, 401)
    const { pub_id, action } = await req.json()
    if (typeof pub_id !== "string" || !["plan", "featured", "portal"].includes(action)) return json(req, { error: "Bad request" }, 400)

    const [staff] = await sql`select p.name from pub_staff s join pubs p on p.id = s.pub_id
      where s.pub_id = ${pub_id} and s.user_id = ${user.id} and s.role in ('owner', 'manager')`
    if (!staff) return json(req, { error: "Only this pub's owners and managers can do that" }, 403)
    if (!Deno.env.get("STRIPE_SECRET_KEY")) return json(req, { error: "payments_off" }, 503)

    const back = `${SITE}/owners/?pub=${pub_id}`
    if (action === "portal") {
      const [plan] = await sql`select stripe_customer from pub_plans where pub_id = ${pub_id}`
      if (!plan?.stripe_customer) return json(req, { error: "No billing account yet" }, 404)
      const portal = await stripe("billing_portal/sessions", { customer: plan.stripe_customer, return_url: back })
      return json(req, { url: portal.url })
    }

    const common: Record<string, string> = {
      client_reference_id: pub_id,
      "metadata[pub_id]": pub_id,
      "metadata[kind]": action,
      success_url: `${back}&paid=${action}`,
      cancel_url: back,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "gbp",
      allow_promotion_codes: "true",
    }
    if (user.email) common.customer_email = user.email
    const session = action === "plan"
      ? await stripe("checkout/sessions", {
          ...common,
          mode: "subscription",
          "subscription_data[metadata][pub_id]": pub_id,
          "line_items[0][price_data][unit_amount]": String(PLAN_PENCE),
          "line_items[0][price_data][recurring][interval]": "month",
          "line_items[0][price_data][product_data][name]": `ratemyGuin for Pubs: ${staff.name}`,
        })
      : await stripe("checkout/sessions", {
          ...common,
          mode: "payment",
          "line_items[0][price_data][unit_amount]": String(FEATURED_PENCE),
          "line_items[0][price_data][product_data][name]": `Our featured pubs, 7 days: ${staff.name}`,
        })
    return json(req, { url: session.url })
  } catch (err) {
    console.error(err)
    return json(req, { error: (err as Error).message === "payments_off" ? "payments_off" : "Something went wrong" }, 500)
  }
})
