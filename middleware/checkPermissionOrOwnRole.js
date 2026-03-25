const { DashMatrixDB } = require("../models");
const { Permission, Menu } = DashMatrixDB;

/**
 * Middleware that allows users to view their own role's permissions
 * without requiring permission_management permission.
 * For viewing other roles' permissions, it still requires permission_management permission.
 */
const checkPermissionOrOwnRole = (menuCode, requiredAction) => {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.roleId;
      const requestedRole = req.params.role; // The role name from URL parameter

      if (!roleId) {
        return res
          .status(403)
          .json({ message: "No role assigned to the user" });
      }

      // Get the user's role information (it's already loaded in req.user.role from authMiddleware)
      const userRole = req.user.role;
      if (!userRole) {
        return res.status(403).json({ message: "User role not found" });
      }

      // Normalize role names for comparison (same as frontend does)
      // Also handle the case where role_name might be like "system_admin" and displayName might be "System"
      const normalizeRoleName = (name) => {
        if (!name) return "";
        return name.toLowerCase().replace(/\s+/g, "_");
      };

      // Check if the requested role matches the user's role
      // The frontend sends normalized role name, so we need to compare against both role_name and displayName
      const userRoleName = normalizeRoleName(userRole.role_name);
      const userDisplayName = normalizeRoleName(userRole.displayName);
      const requestedRoleName = normalizeRoleName(requestedRole);

      // If user is requesting their own role's permissions, allow it
      if (userRoleName === requestedRoleName || userDisplayName === requestedRoleName) {
        return next();
      }

      // Otherwise, check if they have permission_management permission
      const menu = await Menu.findOne({ where: { menuId: menuCode } });

      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }

      const permission = await Permission.findOne({
        where: {
          roleId,
          menuId: menu.id,
        },
      });

      const hasAccess =
        Array.isArray(permission?.actions) &&
        permission.actions.includes(requiredAction);

      if (!hasAccess) {
        return res.status(403).json({
          message: "You don't have the permission to perform this action",
        });
      }

      next();
    } catch (err) {
      console.error("Permission check error:", err);
      return res
        .status(500)
        .json({ message: "Server error during permission check" });
    }
  };
};

module.exports = checkPermissionOrOwnRole;

