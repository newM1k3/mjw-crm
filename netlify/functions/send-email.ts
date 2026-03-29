import type { Handler } from "@netlify/functions";

interface SendEmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html_content?: string;
  content?: string;
  fromName?: string;
  fromEmail?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return {
        statusCode: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email service is not configured. RESEND_API_KEY is missing." }),
      };
    }

    const payload: SendEmailPayload = JSON.parse(event.body || "{}");
    const { to, cc, bcc, subject, html_content, content, fromName, fromEmail } = payload;

    if (!to || !subject || (!html_content && !content)) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required fields: to, subject, and content or html_content." }),
      };
    }

    const parseAddresses = (addr: string): string[] =>
      addr.split(",").map((a) => a.trim()).filter(Boolean);

    const senderEmail = fromEmail || "onboarding@resend.dev";
    const senderName = fromName || "CRM";
    const from = `${senderName} <${senderEmail}>`;

    const body: Record<string, unknown> = {
      from,
      to: parseAddresses(to),
      subject,
      html: html_content || `<p>${content}</p>`,
      text: content || "",
    };

    if (cc) body.cc = parseAddresses(cc);
    if (bcc) body.bcc = parseAddresses(bcc);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
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

      return {
        statusCode: resendResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: userMessage, details: resendResult }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, id: resendResult.id }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error", details: String(err) }),
    };
  }
};
