import type { OtpEmailMessage } from "./types";

export function renderOtpEmail({ code, expiresInMinutes }: OtpEmailMessage) {
  const subject = "Your @Ride sign-in code";
  const text = [
    "Your @Ride sign-in code",
    "",
    code,
    "",
    `This code expires in ${expiresInMinutes} minutes and can be used only once.`,
    "If you did not request this code, you can safely ignore this email.",
    "",
    "@Ride · Ride together",
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif">
    <div style="padding:32px 16px">
      <div style="max-width:520px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f">
        <div style="height:6px;background:#ff5a18"></div>
        <div style="padding:34px">
          <div style="font-size:25px;font-weight:900;color:#ffffff"><span style="color:#ff5a18">@</span>Ride</div>
          <h1 style="margin:30px 0 10px;font-size:25px;line-height:1.2;color:#ffffff">Your sign-in code</h1>
          <p style="margin:0;color:#a1a1aa;font-size:15px;line-height:1.7">Enter this code to continue to your AtRide account.</p>
          <div style="margin:28px 0;padding:20px;border:1px solid #3c4149;border-radius:16px;background:#0b0e12;text-align:center;color:#ffffff;font-size:34px;font-weight:900;letter-spacing:10px">${code}</div>
          <p style="margin:0;color:#a1a1aa;font-size:14px;line-height:1.7">This code expires in <strong style="color:#ffffff">${expiresInMinutes} minutes</strong> and can be used only once.</p>
          <p style="margin:18px 0 0;color:#71717a;font-size:13px;line-height:1.6">If you did not request this code, you can safely ignore this email. Never share this code with anyone.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
