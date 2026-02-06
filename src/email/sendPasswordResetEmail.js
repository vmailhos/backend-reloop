const AWS = require("aws-sdk");
const { buildEmailHtml } = require("./emailTemplate");

const ses = new AWS.SES({
  region: process.env.AWS_REGION_SES,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY_SES || process.env.AWS_SECRET_ACCESS_KEY,
});

async function sendPasswordResetEmail({ email, name, token }) {
  const resetUrl = `https://reloop-uy.com/reset-password?token=${token}`;

  const bodyHtml = `
    <p style="font-size:16px; line-height:1.6;">
      Recibimos una solicitud para restablecer tu contraseña. Si fuiste vos, podés crear una nueva
      contraseña usando el siguiente enlace.
    </p>
    <p style="font-size:16px; line-height:1.6;">
      Este enlace expira en 1 hora por seguridad.
    </p>
  `;

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: "Recuperá tu contraseña en Reloop ♻️",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: buildEmailHtml({
            headline: "Recuperá tu contraseña en Reloop ♻️",
            greetingName: name,
            bodyHtml,
            ctaText: "Restablecer contraseña",
            ctaUrl: resetUrl,
          }),
        },
      },
    },
  };

  await ses.sendEmail(params).promise();
}

module.exports = { sendPasswordResetEmail };
