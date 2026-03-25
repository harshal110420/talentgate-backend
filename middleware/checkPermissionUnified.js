const { DashMatrixDB } = require("../models");
const { Permission, UserPermission, Menu } = DashMatrixDB;

/**
 * Unified permission middleware
 * @param {string} menuCode - Menu code to validate
 * @param {string} requiredAction - Action to validate: view/new/edit/delete/etc
 * @param {boolean} allowOwnRoleBypass - true if user can bypass for own role/userId
 */
const checkPermissionUnified = (
  menuCode,
  requiredAction,
  allowOwnRoleBypass = false
) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user)
        return res.status(403).json({ message: "User not authenticated" });

      const roleId = user.roleId;
      if (!roleId)
        return res.status(403).json({ message: "User has no role assigned" });

      // -------------------------------
      // STEP 1: Self-bypass check
      // -------------------------------
      if (allowOwnRoleBypass) {
        const requestedParam = req.params.role || req.params.userId || null;
        if (requestedParam) {
          const userRoleName = (user.role?.role_name || "").toLowerCase();
          const userDisplayName = (user.role?.displayName || "").toLowerCase();
          const normalizedRequested = requestedParam.toString().toLowerCase();

          if (
            normalizedRequested === userRoleName ||
            normalizedRequested === userDisplayName ||
            normalizedRequested === user.id.toString()
          ) {
            return next();
          }
        }
      }

      // -------------------------------
      // STEP 2: Fetch menu
      // -------------------------------
      const menu = await Menu.findOne({ where: { menuId: menuCode } });
      if (!menu) return res.status(404).json({ message: "Menu not found" });

      const menuId = menu.id;

      // -------------------------------
      // STEP 3: Check UserPermission first
      // -------------------------------
      const userPerm = await UserPermission.findOne({
        where: { userId: user.id, menuId },
      });

      if (userPerm) {
        if (
          Array.isArray(userPerm.actions) &&
          userPerm.actions.includes(requiredAction)
        ) {
          return next(); // ✅ Allowed via user-specific permission
        } else {
          return res.status(403).json({
            message:
              "You don't have the permission to perform this action (user-specific)",
          });
        }
      }

      // -------------------------------
      // STEP 4: Check Role-based Permission fallback
      // -------------------------------
      const rolePerm = await Permission.findOne({
        where: { roleId, menuId },
      });

      if (
        rolePerm &&
        Array.isArray(rolePerm.actions) &&
        rolePerm.actions.includes(requiredAction)
      ) {
        return next(); // ✅ Allowed via role-based permission
      }

      return res.status(403).json({
        message:
          "You don't have the permission to perform this action (role-based)",
      });
    } catch (err) {
      console.error("Permission check error:", err);
      return res
        .status(500)
        .json({ message: "Server error during permission check" });
    }
  };
};

module.exports = checkPermissionUnified;
