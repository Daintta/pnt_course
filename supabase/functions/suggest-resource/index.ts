import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")
const GITHUB_REPO = "Daintta/pnt_course"

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

    const { title, url, description, userName } = await req.json()

    // Validate input
    if (!title || !url || !description) {
      throw new Error("Missing required fields")
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
