const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../models");
const { Notification } = DashMatrixDB;

// ➤ Create single notification
const createNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.create(req.body);

  // socket emit (user specific room)
  req.io
    ?.to(`user_${notification.userId}`)
    .emit("notification:new", notification);

  res.status(201).json({
    message: "Notification created",
    notification,
  });
});

// ➤ Create multiple notifications
const createBulkNotifications = asyncHandler(async (req, res) => {
  const list = await Notification.bulkCreate(req.body);

  list.forEach((n) =>
    req.io?.to(`user_${n.userId}`).emit("notification:new", n)
  );

  res.status(201).json({
    message: "Bulk notifications created",
    notifications: list,
  });
});

// ➤ Get notifications by userId
const getUserNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const list = await Notification.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });

  res.status(200).json(list);
});

// ➤ Mark single notification read
const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await Notification.update(
    { isRead: true },
    { where: { id } }
  );

  res.status(200).json({
    message: "Marked as read",
    updated,
  });
});

// ➤ Mark all notifications for user read
const markAllRead = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updated = await Notification.update(
    { isRead: true },
    { where: { userId } }
  );

  res.status(200).json({
    message: "All marked as read",
    updated,
  });
});

// ➤ Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Notification.destroy({ where: { id } });

  res.status(200).json({ message: "Notification deleted" });
});

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markRead,
  markAllRead,
  deleteNotification,
};
