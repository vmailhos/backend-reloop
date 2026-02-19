const AWS = require("aws-sdk");
const { buildEmailHtml } = require("./emailTemplate");

const ses = new AWS.SES({
  region: process.env.AWS_REGION_SES,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY_SES || process.env.AWS_SECRET_ACCESS_KEY,
});

async function sendEmailVerificationEmail({ email, name, token }) {
  const baseUrl = process.env.FRONTEND_URL || "https://reloop-uy.com";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const bodyHtml = `
    <p style="font-size:16px; line-height:1.6;">
      Para activar tu cuenta, por favor confirma tu email usando el siguiente enlace.
    </p>
    <p style="font-size:16px; line-height:1.6;">
      Este enlace expira en 15 minutos por seguridad.
    </p>
  `;

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: "Confirma tu email en Reloop",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: buildEmailHtml({
            headline: "Confirma tu email en Reloop",
            greetingName: name,
            bodyHtml,
            ctaText: "Confirmar email",
            ctaUrl: verifyUrl,
          }),
        },
      },
    },
  };

  await ses.sendEmail(params).promise();
}

module.exports = { sendEmailVerificationEmail };
