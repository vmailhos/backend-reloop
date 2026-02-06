const AWS = require("aws-sdk");
const { buildEmailHtml } = require("./emailTemplate");

const ses = new AWS.SES({
  region: process.env.AWS_REGION_SES,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY_SES || process.env.AWS_SECRET_ACCESS_KEY,
});

function buildPreview(text) {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

async function sendCommentEmailToSeller({ email, name, title, commentPreview }) {
  const safeTitle = title || "tu producto";
  const preview = buildPreview(commentPreview);

  const bodyHtml = `
    <p style="font-size:16px; line-height:1.6;">
      Recibiste un nuevo comentario en <strong>${safeTitle}</strong>.
    </p>
    <p style="font-size:16px; line-height:1.6; color:#4b5563;">
      “${preview}”
    </p>
  `;

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: "Nuevo comentario en tu publicación ♻️",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: buildEmailHtml({
            headline: "Nuevo comentario en tu publicación ♻️",
            greetingName: name,
            bodyHtml,
            ctaText: "Ver comentario",
            ctaUrl: "https://reloop-uy.com",
          }),
        },
      },
    },
  };

  await ses.sendEmail(params).promise();
}

module.exports = { sendCommentEmailToSeller };
