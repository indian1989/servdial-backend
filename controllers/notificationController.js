import asyncHandler from "express-async-handler";

import Notification from "../models/Notification.js";
import User from "../models/User.js";

/* ======================================================
   GET MY NOTIFICATIONS
   USER / PROVIDER / ADMIN / SUPERADMIN
====================================================== */

export const getMyNotifications = asyncHandler(
  async (req, res) => {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const query = {
      user: req.user._id,
    };

    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const skip =
      (Number(page) - 1) * Number(limit);

    const [notifications, total, unread] =
      await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),

        Notification.countDocuments(query),

        Notification.countDocuments({
          user: req.user._id,
          isRead: false,
        }),
      ]);

    res.json({
      success: true,
      data: notifications,
      meta: {
        total,
        unread,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(
          total / Number(limit)
        ),
      },
    });
  }
);


/* ======================================================
   GET ALL NOTIFICATIONS
   ADMIN / SUPERADMIN
====================================================== */

export const getAllNotifications = asyncHandler(
  async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      userId,
    } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    if (userId) {
      query.user = userId;
    }

    const skip =
      (Number(page) - 1) * Number(limit);

    const [notifications, total] =
      await Promise.all([
        Notification.find(query)
          .populate(
            "user",
            "name email role phone"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),

        Notification.countDocuments(query),
      ]);

    res.json({
      success: true,
      data: notifications,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(
          total / Number(limit)
        ),
      },
    });
  }
);


/* ======================================================
   CREATE SINGLE NOTIFICATION
   ADMIN / SUPERADMIN
====================================================== */

export const createNotification =
  asyncHandler(async (req, res) => {
    const {
      user,
      title,
      message,
      type = "system",
    } = req.body;

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "User is required.",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Notification title is required.",
      });
    }

    const targetUser =
      await User.findById(user);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message:
          "Target user not found.",
      });
    }

    const notification =
      await Notification.create({
        user,
        title: title.trim(),
        message: message || "",
        type,
      });

    res.status(201).json({
      success: true,
      message:
        "Notification created successfully.",
      data: notification,
    });
  });


/* ======================================================
   BULK CREATE NOTIFICATIONS
   ADMIN / SUPERADMIN

   userIds = specific users

   Example:
   {
     "userIds": [
       "id1",
       "id2",
       "id3"
     ],
     "title": "System Update",
     "message": "Important update...",
     "type": "system"
   }
====================================================== */

export const createBulkNotifications =
  asyncHandler(async (req, res) => {
    const {
      userIds,
      title,
      message,
      type = "system",
    } = req.body;

    if (
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one user is required.",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Notification title is required.",
      });
    }

    /* ================================================
       REMOVE DUPLICATE USER IDS
    ================================================= */

    const uniqueUserIds = [
      ...new Set(
        userIds.map((id) =>
          String(id)
        )
      ),
    ];

    /* ================================================
       VERIFY USERS
    ================================================= */

    const users = await User.find({
      _id: {
        $in: uniqueUserIds,
      },
    }).select("_id");

    const validUserIds =
      users.map((user) =>
        user._id
      );

    if (validUserIds.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No valid users found.",
      });
    }

    /* ================================================
       BUILD NOTIFICATIONS
    ================================================= */

    const notifications =
      validUserIds.map((userId) => ({
        user: userId,
        title: title.trim(),
        message: message || "",
        type,
        isRead: false,
      }));

    const created =
      await Notification.insertMany(
        notifications
      );

    res.status(201).json({
      success: true,

      message:
        `${created.length} notification(s) created successfully.`,

      data: created,

      meta: {
        requested:
          uniqueUserIds.length,

        created:
          created.length,

        skipped:
          uniqueUserIds.length -
          created.length,
      },
    });
  });


/* ======================================================
   BULK NOTIFICATION BY ROLE
   ADMIN / SUPERADMIN

   Example:

   {
     "roles": ["provider", "user"],
     "title": "Important Update",
     "message": "Please check..."
   }

   Available roles:
   user
   provider
   admin
   superadmin
====================================================== */

export const createBulkNotificationsByRole =
  asyncHandler(async (req, res) => {
    const {
      roles,
      title,
      message,
      type = "system",
    } = req.body;

    if (
      !Array.isArray(roles) ||
      roles.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one role is required.",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Notification title is required.",
      });
    }

    const allowedRoles = [
      "user",
      "provider",
      "admin",
      "superadmin",
    ];

    const invalidRoles =
      roles.filter(
        (role) =>
          !allowedRoles.includes(role)
      );

    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid role provided.",
        invalidRoles,
      });
    }

    const users = await User.find({
      role: {
        $in: roles,
      },
    }).select("_id");

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No users found for selected roles.",
      });
    }

    const notifications =
      users.map((user) => ({
        user: user._id,
        title: title.trim(),
        message: message || "",
        type,
        isRead: false,
      }));

    const created =
      await Notification.insertMany(
        notifications
      );

    res.status(201).json({
      success: true,

      message:
        `${created.length} notification(s) created successfully.`,

      data: created,

      meta: {
        roles,
        recipients:
          created.length,
      },
    });
  });


/* ======================================================
   MARK SINGLE NOTIFICATION AS READ
====================================================== */

export const markNotificationAsRead =
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification =
      await Notification.findOne({
        _id: id,
        user: req.user._id,
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found.",
      });
    }

    notification.isRead = true;

    await notification.save();

    res.json({
      success: true,
      message:
        "Notification marked as read.",
      data: notification,
    });
  });


/* ======================================================
   MARK ALL MY NOTIFICATIONS AS READ
====================================================== */

export const markAllNotificationsAsRead =
  asyncHandler(async (req, res) => {
    const result =
      await Notification.updateMany(
        {
          user: req.user._id,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        }
      );

    res.json({
      success: true,
      message:
        "All notifications marked as read.",
      modifiedCount:
        result.modifiedCount,
    });
  });


/* ======================================================
   DELETE SINGLE MY NOTIFICATION
====================================================== */

export const deleteMyNotification =
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification =
      await Notification.findOneAndDelete({
        _id: id,
        user: req.user._id,
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found.",
      });
    }

    res.json({
      success: true,
      message:
        "Notification deleted successfully.",
    });
  });


/* ======================================================
   BULK DELETE MY NOTIFICATIONS
====================================================== */

export const deleteBulkMyNotifications =
  asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (
      !Array.isArray(ids) ||
      ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notification IDs are required.",
      });
    }

    const result =
      await Notification.deleteMany({
        _id: {
          $in: ids,
        },
        user: req.user._id,
      });

    res.json({
      success: true,
      message:
        `${result.deletedCount} notification(s) deleted successfully.`,
      deletedCount:
        result.deletedCount,
    });
  });


/* ======================================================
   ADMIN BULK DELETE
   ADMIN / SUPERADMIN
====================================================== */

export const deleteBulkNotifications =
  asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (
      !Array.isArray(ids) ||
      ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notification IDs are required.",
      });
    }

    const result =
      await Notification.deleteMany({
        _id: {
          $in: ids,
        },
      });

    res.json({
      success: true,
      message:
        `${result.deletedCount} notification(s) deleted successfully.`,
      deletedCount:
        result.deletedCount,
    });
  });