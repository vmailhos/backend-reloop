// Helper function to create a notification
const createNotification = (tx, userId, type, title, message, metadata = null) => {
  return tx.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
      sendEmail: type === "sale" || type === "purchase",
      sendPush: true,
    },
  });
};

module.exports = {
  createNotification,
};
