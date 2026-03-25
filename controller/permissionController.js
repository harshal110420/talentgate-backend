const { DashMatrixDB } = require("../models");
const { Permission, Role, Menu, Module } = DashMatrixDB;
const VALID_ACTIONS = [
  "new",
  "edit",
  "view",
  "details",
  "print",
  "delete",
  "export",
  "upload",
];
const { Op } = require("sequelize");

// ✅ Get permissions for a role
const getPermissionsByRole = async (req, res) => {
  try {
    // Normalize role name for comparison (same as frontend does)
    const normalizeRoleName = (name) => {
      if (!name) return "";
      return name.toLowerCase().replace(/\s+/g, "_");
    };

    const requestedRole = req.params.role;
    const normalizedRequestedRole = normalizeRoleName(requestedRole);

    // Try to find role by normalized comparison
    // First, get all roles and compare normalized names
    const allRoles = await Role.findAll();
    let role = allRoles.find((r) => {
      const normalizedRoleName = normalizeRoleName(r.role_name);
      const normalizedDisplayName = normalizeRoleName(r.displayName);
      return (
        normalizedRoleName === normalizedRequestedRole ||
        normalizedDisplayName === normalizedRequestedRole
      );
    });

    // Fallback to original query if not found (for exact matches)
    if (!role) {
      role = await Role.findOne({
        where: {
          [Op.or]: [
            { role_name: req.params.role },
            { displayName: req.params.role },
          ],
        },
      });
    }

    if (!role) return res.status(404).json({ error: "Role not found - 1" });

    const rawPermissions = await Permission.findAll({
      where: { roleId: role.id },
      include: [
        {
          model: Menu,
          as: "menu",
          include: [{ model: Module, as: "module" }],
        },
      ],
    });

    const structured = {};

    rawPermissions.forEach((perm) => {
      const mod = perm.menu?.module;
      const menu = perm.menu;
      if (!mod || !menu) return;

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
        name: menu.name,
        menuId: menu.menuId,
        actions: perm.actions,
      });
    });

    const response = Object.values(structured).sort(
      (a, b) => a.orderBy - b.orderBy
    );
    res.json(response);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Create or update permission
const createOrUpdatePermission = async (req, res) => {
  try {
    const { role, menuId, actions, actionType = "replace" } = req.body;
    const userId = req.user?.id || null;

    // Validate required fields
    // if (!role || !menuId || !Array.isArray(actions)) {
    //   return res.status(400).json({
    //     error: "Fields 'role', 'menuId', and 'actions[]' are required.",
    //   });
    // }

    // ✅ Validate each action
    const invalidActions = actions.filter((a) => !VALID_ACTIONS.includes(a));
    if (invalidActions.length > 0) {
      return res.status(400).json({
        error: `Invalid actions: ${invalidActions.join(", ")}`,
      });
    }

    const roleObj = await Role.findOne({ where: { displayName: role } });
    if (!roleObj) return res.status(404).json({ error: "Role not found - 2" });

    const menu = await Menu.findByPk(menuId);
    if (!menu) return res.status(404).json({ error: "Menu not found" });

    let permission = await Permission.findOne({
      where: {
        roleId: roleObj.id,
        menuId: menu.id,
      },
    });

    if (permission) {
      // ✅ If replacing and nothing remains, delete it
      if (actionType === "replace" && actions.length === 0) {
        await permission.destroy();
        return res
          .status(200)
          .json({ message: "Permission removed (no actions left)" });
      }

      let newActions = [];
      if (actionType === "add") {
        newActions = [...new Set([...permission.actions, ...actions])];
      } else if (actionType === "remove") {
        newActions = permission.actions.filter((a) => !actions.includes(a));
      } else {
        newActions = actions;
      }

      await permission.update({
        actions: newActions,
        updated_by: userId,
      });
    } else {
      if (actionType === "remove") {
        return res.status(400).json({
          error: "Cannot remove actions from non-existing permission.",
        });
      }

      permission = await Permission.create({
        roleId: roleObj.id,
        menuId: menu.id,
        actions,
        created_by: userId,
      });
    }

    res.status(201).json({ message: "Permission saved", permission });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get single permission
const getPermissionById = async (req, res) => {
  try {
    const permission = await Permission.findByPk(req.params.id, {
      include: [
        {
          model: Menu,
          as: "menu",
          include: [{ model: Module, as: "module" }], // ✅ Add alias here
        },
      ],
    });

    if (!permission) return res.status(404).json({ error: "Not found" });

    res.json({
      roleId: permission.roleId,
      menu: {
        name: permission.menu.name,
        type: permission.menu.type,
        moduleName: permission.menu.module.name,
        actions: permission.actions,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get all permissions (grouped by module and role)
const getAllPermissions = async (req, res) => {
  try {
    // console.log("🔥 Fetching all permissions...");

    // All permissions with relations
    const allPermissions = await Permission.findAll({
      include: [
        {
          model: Menu,
          as: "menu",
          include: [{ model: Module, as: "module" }], // ✅ Fix alias
        },
        {
          model: Role,
          as: "role",
          attributes: ["id", "displayName"],
        },
      ],
      order: [["id", "ASC"]],
    });

    // All menus to ensure empty menus are also listed
    const allMenus = await Menu.findAll({
      include: [
        {
          model: Module,
          as: "module",
          attributes: ["id", "name", "path", "orderBy"],
        },
      ],
      order: [["id", "ASC"]],
    });

    const organized = {};

    // Step 1: Structure from permissions
    allPermissions.forEach((perm) => {
      const module = perm.menu?.module;
      const menu = perm.menu;
      const role = perm.Role || perm.role; // ✅ safe access
      
      if (!module || !menu) {
        // console.log("⚠️ Skipping permission due to missing module/menu.");
        return;
      }

      const moduleId = module.id.toString();
      const menuId = menu.id.toString();
      const roleId = role.id.toString();

      if (!organized[moduleId]) {
        organized[moduleId] = {
          moduleName: module.name,
          modulePath: module.path,
          orderBy: module.orderBy || 99,
          menus: [],
          roles: {},
        };
      }

      if (!organized[moduleId].roles[roleId]) {
        organized[moduleId].roles[roleId] = {
          roleId,
          roleName: role.displayName,
          permissions: [],
        };
      }

      organized[moduleId].roles[roleId].permissions.push({
        menuId,
        menuName: menu.name,
        menuType: menu.type,
        actions: perm.actions,
      });
    });

    // Step 2: Ensure all menus are present
    allMenus.forEach((menu) => {
      const module = menu.module;
      if (!module) return;

      const moduleId = module.id.toString();
      const menuId = menu.id.toString();

      if (!organized[moduleId]) {
        organized[moduleId] = {
          moduleName: module.name,
          modulePath: module.path,
          orderBy: module.orderBy || 99,
          menus: [],
          roles: {},
        };
      }

      const menuData = {
        id: menuId,
        name: menu.name,
        type: menu.type,
      };

      const exists = organized[moduleId].menus.find((m) => m.id === menuId);
      if (!exists) {
        organized[moduleId].menus.push(menuData);
      }

      // For each role already seen in this module, if permission missing, add empty
      Object.values(organized[moduleId].roles).forEach((role) => {
        const hasPermission = role.permissions.find((p) => p.menuId === menuId);
        if (!hasPermission) {
          role.permissions.push({
            menuId,
            menuName: menu.name,
            menuType: menu.type,
            actions: [],
          });
        }
      });
    });

    // Step 3: Convert to sorted array
    const result = Object.values(organized)
      .sort((a, b) => a.orderBy - b.orderBy)
      .map((mod) => ({
        ...mod,
        roles: Object.values(mod.roles),
      }));

    // console.log("📦 Final structured permissions ready for frontend");
    res.json(result);
  } catch (err) {
    console.error("❌ Error while fetching all permissions:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Delete permission
const deletePermission = async (req, res) => {
  try {
    await Permission.destroy({ where: { id: req.params.id } });
    res.json({ message: "Permission deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getPermissionsByRole,
  createOrUpdatePermission,
  getPermissionById,
  getAllPermissions,
  deletePermission,
};
