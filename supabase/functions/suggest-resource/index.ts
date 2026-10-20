import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")
const GITHUB_REPO = "Daintta/pnt_course"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

const LIMITS = { title: 200, url: 500, description: 2000, userName: 100 }

// Only a signed-in learner may suggest a resource. The token must belong to a real user session;
// the anon key on its own is not enough.
async function isSignedInUser(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") || ""
  if (!auth.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "Authorization": auth, "apikey": SUPABASE_ANON_KEY }
  })
  if (!res.ok) return false
  const user = await res.json()
  return Boolean(user && user.id && user.role === "authenticated")
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === "https:" || u.protocol === "http:"
  } catch {
    return false
  }
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }

  try {
    if (!GITHUB_TOKEN) {
      throw new Error("GitHub token not configured")
    }

    if (!(await isSignedInUser(req))) {
      return new Response(JSON.stringify({ error: "Sign in to suggest a resource" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    const { title, url, description, userName } = await req.json()

    // Validate input
    if (!title || !url || !description) {
      throw new Error("Missing required fields")
    }
    if (typeof title !== "string" || title.length > LIMITS.title ||
        typeof url !== "string" || url.length > LIMITS.url || !isHttpUrl(url) ||
        typeof description !== "string" || description.length > LIMITS.description ||
        (userName !== undefined && (typeof userName !== "string" || userName.length > LIMITS.userName))) {
      throw new Error("Invalid input")
    }

    // Create GitHub issue via REST API
    const issueBody = `**Resource:** ${title}
**URL:** ${url}
**Suggested by:** ${userName}
**Description:** ${description}`

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: `Resource suggestion: ${title}`,
        body: issueBody,
        labels: ["resource-suggestion"]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create GitHub issue")
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    })
  }
})
