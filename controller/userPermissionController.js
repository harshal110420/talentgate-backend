// controllers/permissionController.js
const { DashMatrixDB } = require("../models");
const { Permission, Role, Menu, Module, User, UserPermission } = DashMatrixDB;
const { Op } = require("sequelize");

const getPermissionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: "role" }],
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // ROLE PERMISSIONS
    const rolePermissions = await Permission.findAll({
      where: { roleId: user.roleId },
      include: [
        {
          model: Menu,
          as: "menu",
          include: [{ model: Module, as: "module" }],
        },
      ],
    });

    // USER OVERRIDES
    const userOverrides = await UserPermission.findAll({
      where: { userId },
      include: [
        {
          model: Menu,
          as: "menu",
          include: [{ model: Module, as: "module" }],
        },
      ],
    });

    // MERGING
    const merged = {};

    for (const perm of rolePermissions) {
      merged[perm.menuId] = {
        actions: new Set(perm.actions),
        menu: perm.menu,
        module: perm.menu?.module,
      };
    }

    for (const perm of userOverrides) {
      merged[perm.menuId] = {
        actions: new Set(perm.actions),
        menu: perm.menu,
        module: perm.menu?.module,
      };
    }

    // STRUCTURE OUTPUT
    const structured = {};

    for (const p of Object.values(merged)) {
      const mod = p.module;
      const menu = p.menu;

      if (!mod || !menu) continue;

      const moduleId = mod.id;

      if (!structured[moduleId]) {
        structured[moduleId] = {
          moduleName: mod.name,
          modulePath: mod.path,
          orderBy: mod.orderBy || 99,
          menus: { Master: [], Transaction: [], Report: [] },
        };
      }

      structured[moduleId].menus[menu.type].push({
        id: menu.id,
        name: menu.name,
        menuId: menu.menuId,
        actions: [...p.actions],
      });
    }

    const response = Object.values(structured).sort(
      (a, b) => a.orderBy - b.orderBy
    );

    return res.json(response);
  } catch (err) {
    console.error("❌ Error (getPermissionsByUser):", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ============================================================
   🆕 Create or Update User Permission (Override)
============================================================ */
const createOrUpdateUserPermission = async (req, res) => {
  try {
    const { userId, menuId, actions, actionType = "replace" } = req.body;
    const adminUserId = req.user?.id || null;

    /* ------------------------------------------------------------
       Validate Input
    ------------------------------------------------------------ */
    if (!userId || !menuId || !Array.isArray(actions)) {
      return res.status(400).json({
        error: "Fields 'userId', 'menuId', and 'actions[]' are required.",
      });
    }

    const VALID_ACTIONS = [
      "new",
      "edit",
      "view",
      "print",
      "delete",
      "export",
      "upload",
      "details",
    ];

    const invalid = actions.filter((a) => !VALID_ACTIONS.includes(a));
    if (invalid.length > 0) {
      return res.status(400).json({
        error: `Invalid actions: ${invalid.join(", ")}`,
      });
    }

    /* ------------------------------------------------------------
       Validate User + Menu
    ------------------------------------------------------------ */
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const menu = await Menu.findByPk(menuId);
    if (!menu) return res.status(404).json({ error: "Menu not found" });

    /* ------------------------------------------------------------
       Fetch Existing Permission
    ------------------------------------------------------------ */
    let permission = await UserPermission.findOne({
      where: { userId, menuId },
    });

    /* ============================================================
       CASE 1: IF RECORD ALREADY EXISTS
    ============================================================ */
    if (permission) {
      let updatedActions = [];

      // ➕ Add actions
      if (actionType === "add") {
        updatedActions = [...new Set([...permission.actions, ...actions])];
      }

      // ➖ Remove actions
      else if (actionType === "remove") {
        updatedActions = permission.actions.filter((a) => !actions.includes(a));
      }

      // 🔁 Replace (full override)
      else if (actionType === "replace") {
        updatedActions = actions; // <-- Blank array allowed!
      }

      await permission.update({
        actions: updatedActions,
        updated_by: adminUserId,
      });

      return res.json({
        message: "User permission updated",
        permission,
      });
    }

    /* ============================================================
       CASE 2: NO RECORD EXISTS — CREATE NEW
    ============================================================ */

    if (actionType === "remove") {
      return res.status(400).json({
        error: "Cannot remove from non-existing permission.",
      });
    }

    // Blank array is also allowed → store as actions: []
    permission = await UserPermission.create({
      userId,
      menuId,
      actions, // <-- blank allowed
      created_by: adminUserId,
    });

    return res.status(201).json({
      message: "User permission created",
      permission,
    });
  } catch (err) {
    console.error("❌ Error (createOrUpdateUserPermission):", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getPermissionsByUser, // 🆕 Added here
  createOrUpdateUserPermission,
};
