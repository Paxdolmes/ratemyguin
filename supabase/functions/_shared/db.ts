// Shared helpers for the payment functions. Runs on Supabase Edge Functions (Deno).
import postgres from "npm:postgres@3.4.5"

// SUPABASE_DB_URL is provided by Supabase inside Edge Functions; nothing is stored in the repo.
export const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 })

export const SITE = "https://ratemyguin.com"
const ALLOWED = [SITE, "https://www.ratemyguin.com", "https://ratemyguin.pages.dev", "http://localhost:3000"]

export function cors(req: Request) {
  const origin = req.headers.get("origin") ?? ""
  return {
    "access-control-allow-origin": ALLOWED.includes(origin) || origin.endsWith(".ratemyguin.pages.dev") ? origin : SITE,
    "access-control-allow-headers": "authorization, content-type, apikey, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  }
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "content-type": "application/json" } })
}

export async function stripe(path: string, params?: Record<string, string>, method = params ? "POST" : "GET") {
  const key = Deno.env.get("STRIPE_SECRET_KEY")
  if (!key) throw new Error("payments_off")
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: params ? new URLSearchParams(params) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`)
  return data
}
