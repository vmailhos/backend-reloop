const AWS = require("aws-sdk");

const ses = new AWS.SES({
  region: process.env.AWS_REGION_SES,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_SES || process.env.AWS_SECRET_ACCESS_KEY,
});

async function sendNewListingEmail({ email, name, title }) {
  const displayName = name || "";
  const safeTitle = title || "tu producto";

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "¡Gracias por tu nueva publicación en Reloop ♻️!",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
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
                  ¡Tu publicación ya está en Reloop! ♻️
                </h1>

                <p style="font-size:16px; line-height:1.6;">
                  Hola <strong>${displayName || ""}</strong>,
                </p>

                <p style="font-size:16px; line-height:1.6;">
                  Gracias por publicar <strong>${safeTitle}</strong>. Tu producto ya está visible en Reloop y
                  puede ser descubierto por miles de personas interesadas en reutilizar.
                </p>

                <ul style="font-size:16px; line-height:1.6; padding-left:20px;">
                  <li>🧵 Agregá buenas fotos para destacar tu publicación</li>
                  <li>💬 Respondé rápido a los interesados para cerrar más ventas</li>
                  <li>🌱 Cada publicación ayuda a reducir el impacto ambiental</li>
                </ul>

                <div style="text-align:center; margin:32px 0;">
                  <a href="https://reloop-uy.com"
                     style="background:#1e6fd9; color:#ffffff; padding:14px 28px;
                            border-radius:10px; text-decoration:none; font-weight:600;">
                    Ver mi publicación
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
          `,
        },
      },
    },
  };

  await ses.sendEmail(params).promise();
}

module.exports = { sendNewListingEmail };
