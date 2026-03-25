const { DashMatrixDB } = require("../models");
const { Permission, Menu } = DashMatrixDB;
const checkPermission = (menuCode, requiredAction) => {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.roleId;

      if (!roleId) {
        return res
          .status(403)
          .json({ message: "No role assigned to the user" });
      }

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

module.exports = checkPermission;
