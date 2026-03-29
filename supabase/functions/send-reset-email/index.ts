import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, resetUrl } = await req.json();

    if (!email || !resetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and resetUrl." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:50%;margin-bottom:12px;">
                <span style="color:#fff;font-size:20px;font-weight:600;">M</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.3px;">MJW Design CRM</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:18px;font-weight:600;">Reset your password</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                We received a request to reset the password for your account. Click the button below to choose a new password. This link will expire in <strong style="color:#374151;">1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:6px;">
                    <a href="${resetUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;line-height:1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;">
                <a href="${resetUrl}" style="color:#1d4ed8;word-break:break-all;">${resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">MJW Design CRM &bull; Sent to ${email}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MJW Design CRM <onboarding@resend.dev>",
        to: [email],
        subject: "Reset your MJW Design CRM password",
        html,
        text: `Reset your MJW Design CRM password\n\nClick the link below to reset your password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
      }),
    });

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({ error: result?.message || "Failed to send email.", details: result }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
