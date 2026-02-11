const { prisma } = require("../db");

async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = {},
  emailHandler = null,
  preferenceKey = null,
}) {
  let emailAllowed = true;

  try {
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (
      preference &&
      preferenceKey &&
      Object.prototype.hasOwnProperty.call(preference, preferenceKey)
    ) {
      emailAllowed = Boolean(preference[preferenceKey]);
    }
  } catch (err) {
    console.error("[NOTIFICATIONS] Error leyendo preferencias", err);
  }

  const shouldSendEmail = Boolean(emailHandler && emailAllowed);

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
      sendEmail: shouldSendEmail,
      sendPush: true,
    },
  });

  if (shouldSendEmail) {
    try {
      await emailHandler();
    } catch (err) {
      console.error("[MAIL] Error enviando email de notificación", err);
    }
  }

  return notification;
}

module.exports = { createNotification };
