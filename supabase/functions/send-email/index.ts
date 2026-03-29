import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html_content?: string;
  content: string;
  fromName?: string;
  fromEmail?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service is not configured. RESEND_API_KEY is missing." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: SendEmailPayload = await req.json();
    const { to, cc, bcc, subject, html_content, content, fromName, fromEmail } = payload;

    if (!to || !subject || (!html_content && !content)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, and content or html_content." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parseAddresses = (addr: string): string[] =>
      addr.split(",").map(a => a.trim()).filter(Boolean);

    const senderEmail = fromEmail || "onboarding@resend.dev";
    const senderName = fromName || "CRM";
    const from = `${senderName} <${senderEmail}>`;

    const body: Record<string, unknown> = {
      from,
      to: parseAddresses(to),
      subject,
      html: html_content || `<p>${content}</p>`,
      text: content,
    };

    if (cc) body.cc = parseAddresses(cc);
    if (bcc) body.bcc = parseAddresses(bcc);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      const message = resendResult?.message || resendResult?.error || "Failed to send email.";

      let userMessage = message;
      if (resendResponse.status === 401 || message.toLowerCase().includes("api key")) {
        userMessage = "Invalid API key. Please check your Resend configuration.";
      } else if (resendResponse.status === 422 || message.toLowerCase().includes("invalid")) {
        userMessage = `Invalid request: ${message}`;
      } else if (resendResponse.status === 429) {
        userMessage = "Rate limit exceeded. Please wait a moment and try again.";
      }

      return new Response(
        JSON.stringify({ error: userMessage, details: resendResult }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
