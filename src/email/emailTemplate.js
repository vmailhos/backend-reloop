function buildEmailHtml({ headline, greetingName, bodyHtml, ctaText, ctaUrl }) {
  const greetingLine = greetingName
    ? `Hola <strong>${greetingName}</strong>,`
    : "Hola,";

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:#f6f8fa; font-family: Inter, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table width="100%" style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden;">
            
            <tr>
              <td align="center" style="padding:32px;">
                <img src="../backend-reloop/assets/logo.png" alt="Reloop" height="48" />
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 32px 32px; color:#2b2b2b;">
                <h1 style="font-size:24px; margin-bottom:16px;">
                  ${headline}
                </h1>

                <p style="font-size:16px; line-height:1.6;">
                  ${greetingLine}
                </p>

                ${bodyHtml}

                <div style="text-align:center; margin:32px 0;">
                  <a href="${ctaUrl}"
                     style="background:#1e6fd9; color:#ffffff; padding:14px 28px;
                            border-radius:10px; text-decoration:none; font-weight:600;">
                    ${ctaText}
                  </a>
                </div>

                <p style="font-size:14px; color:#6b7280;">
                  Gracias por ser parte del cambio 💙  
                  <br/>— El equipo de Reloop
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:20px; background:#f0f2f5; font-size:12px; color:#6b7280;">
                Reloop · Montevideo, Uruguay
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

module.exports = { buildEmailHtml };
