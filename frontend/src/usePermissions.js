import { useAuth } from "./AuthContext";

/* ============================================================
   Central Frontend Permission Hook
   ------------------------------------------------------------
   Provides unified capability checks for admin and staff users.
   Full Admin (main_admin or admin) always returns true.
   Other staff roles check their assigned sectionAccess grants.
   ============================================================ */

export const usePermissions = () => {
  const { user } = useAuth();

  const isFullAdmin = Boolean(
    user && (user.role === "main_admin" || user.role === "admin" || user.isFullAdmin === true)
  );

  const grantFor = (section) => {
    if (!user || !Array.isArray(user.sectionAccess)) return null;
    return user.sectionAccess.find((s) => s.section === section);
  };

  const canView = (section) => {
    if (!user) return false;
    if (isFullAdmin) return true;
    const g = grantFor(section);
    return Boolean(g && g.view !== false);
  };

  const canCreate = (section) => {
    if (!user) return false;
    if (isFullAdmin) return true;
    const g = grantFor(section);
    return Boolean(g && g.create === true);
  };

  const canEdit = (section) => {
    if (!user) return false;
    if (isFullAdmin) return true;
    const g = grantFor(section);
    return Boolean(g && (g.edit === true || g.update === true));
  };

  const canDelete = (section) => {
    if (!user) return false;
    if (isFullAdmin) return true;
    const g = grantFor(section);
    return Boolean(g && (g.canDelete === true || g.delete === true));
  };

  /**
   * Check permission by string, e.g. "journeys.create", "courses.delete", "blogs.view"
   */
  const hasPermission = (permissionStr = "") => {
    if (!user) return false;
    if (isFullAdmin) return true;
    if (!permissionStr) return false;

    if (permissionStr.includes(".")) {
      const [sec, act] = permissionStr.split(".");
      if (act === "create" || act === "post") return canCreate(sec);
      if (act === "edit" || act === "update" || act === "put" || act === "patch") return canEdit(sec);
      if (act === "delete" || act === "canDelete") return canDelete(sec);
      if (act === "view" || act === "read" || act === "get") return canView(sec);
    }

    if (Array.isArray(user.permissionsList)) {
      return user.permissionsList.includes(permissionStr);
    }

    return false;
  };

  const hasAnyPermission = (...perms) => {
    if (isFullAdmin) return true;
    return perms.flat().some(hasPermission);
  };

  const hasAllPermissions = (...perms) => {
    if (isFullAdmin) return true;
    return perms.flat().every(hasPermission);
  };

  return {
    user,
    role: user?.role,
    isFullAdmin,
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};

export default usePermissions;
