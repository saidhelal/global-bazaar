interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  subjectAr?: string;
  body: string;
  bodyAr?: string;
  link?: string;
}

const SMTP_HOST = process.env["SMTP_HOST"];
const SMTP_PORT = parseInt(process.env["SMTP_PORT"] || "587");
const SMTP_USER = process.env["SMTP_USER"];
const SMTP_PASS = process.env["SMTP_PASS"];
const FROM_EMAIL = process.env["FROM_EMAIL"] || "noreply@orbit.market";
const FROM_NAME = process.env["FROM_NAME"] || "Orbit Market";

function buildHtml(opts: EmailOptions): string {
  const ctaButton = opts.link
    ? `<div style="text-align:center;margin:24px 0">
        <a href="${opts.link}" style="background:#D4AF37;color:#0A1628;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
          View Details
        </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#071020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#0A1628;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
    <!-- Header -->
    <div style="background:#0A1628;padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center">
      <div style="display:inline-flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:#D4AF37;display:inline-flex;align-items:center;justify-content:center">
          <div style="width:14px;height:14px;border-radius:50%;border:2.5px solid #0A1628"></div>
        </div>
        <div style="text-align:left">
          <div style="color:#fff;font-weight:800;font-size:14px;line-height:1">orbit</div>
          <div style="color:#D4AF37;font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase">market</div>
        </div>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:32px">
      <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 12px">${opts.subject}</h2>
      <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.6;margin:0 0 8px">${opts.body}</p>
      ${opts.bodyAr ? `<p dir="rtl" style="color:rgba(255,255,255,0.45);font-size:14px;line-height:1.6;margin:0;text-align:right">${opts.bodyAr}</p>` : ""}
      ${ctaButton}
    </div>
    <!-- Footer -->
    <div style="background:rgba(255,255,255,0.03);padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06)">
      <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0;text-align:center">
        © ${new Date().getFullYear()} Orbit Market · You received this because you have an account with us.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[email] SMTP not configured — would send to ${opts.to}: "${opts.subject}"`);
    return;
  }

  try {
    // nodemailer is an optional runtime dependency: it is externalised by the
    // bundler (see build.mjs) and only loaded when SMTP is configured, so it
    // need not be installed. The specifier is kept non-literal so the type
    // checker does not require the package to be present.
    const nodemailerModule = "nodemailer";
    const nodemailer = await import(nodemailerModule);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
      subject: opts.subject,
      html: buildHtml(opts),
      text: `${opts.body}${opts.bodyAr ? "\n\n" + opts.bodyAr : ""}${opts.link ? "\n\n" + opts.link : ""}`,
    });
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}
