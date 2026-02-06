const AWS = require("aws-sdk");
const { buildEmailHtml } = require("./emailTemplate");

const ses = new AWS.SES({
  region: process.env.AWS_REGION_SES,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY_SES || process.env.AWS_SECRET_ACCESS_KEY,
});

async function sendPurchaseEmailToBuyer({ email, name, title }) {
  const safeTitle = title || "tu producto";

  const bodyHtml = `
    <p style="font-size:16px; line-height:1.6;">
      Tu compra de <strong>${safeTitle}</strong> fue confirmada con éxito.
    </p>
    <p style="font-size:16px; line-height:1.6;">
      En breve vas a poder coordinar la entrega con el vendedor desde la app.
    </p>
  `;

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: "¡Compra confirmada en Reloop ♻️!",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: buildEmailHtml({
            headline: "¡Compra confirmada en Reloop ♻️!",
            greetingName: name,
            bodyHtml,
            ctaText: "Ver compra",
            ctaUrl: "https://reloop-uy.com",
          }),
        },
      },
    },
  };

  await ses.sendEmail(params).promise();
}

module.exports = { sendPurchaseEmailToBuyer };
