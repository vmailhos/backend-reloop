const AWS = require("aws-sdk");
const { buildEmailHtml } = require("./emailTemplate");

const ses = new AWS.SES({
  region: process.env.AWS_REGION_SES,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY_SES || process.env.AWS_SECRET_ACCESS_KEY,
});

function formatAmount(amount) {
  if (typeof amount !== "number") return amount;
  return amount.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function sendOfferEmailToSeller({ email, name, title, amount }) {
  const safeTitle = title || "tu producto";
  const formattedAmount = formatAmount(amount);

  const bodyHtml = `
    <p style="font-size:16px; line-height:1.6;">
      Recibiste una nueva oferta por <strong>${safeTitle}</strong>.
    </p>
    <p style="font-size:16px; line-height:1.6;">
      Monto ofrecido: <strong>${formattedAmount}</strong>
    </p>
  `;

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: "Tenés una nueva oferta en Reloop ♻️",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: buildEmailHtml({
            headline: "Tenés una nueva oferta en Reloop ♻️",
            greetingName: name,
            bodyHtml,
            ctaText: "Ver oferta",
            ctaUrl: "https://reloop-uy.com",
          }),
        },
      },
    },
  };

  await ses.sendEmail(params).promise();
}

module.exports = { sendOfferEmailToSeller };
