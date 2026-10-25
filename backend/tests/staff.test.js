import test from "node:test";
import assert from "node:assert/strict";

// Helper simulations representing staff management business logic
const ROLE_LEVEL = {
  main_admin: 100,
  admin: 80,
  manager: 60,
  editor: 40,
  viewer: 20
};

const STAFF_ROLES = ["main_admin", "admin", "manager", "editor", "viewer"];

const canManageUser = (currentUser, targetUser) => {
  if (targetUser.role === "main_admin") return false;
  if (currentUser.role === "main_admin") return true;
  return (ROLE_LEVEL[targetUser.role] ?? 0) < (ROLE_LEVEL[currentUser.role] ?? 0);
};

const canBlockUser = (currentUser, targetUser) => {
  if (targetUser.role === "main_admin") return false;
  if (String(currentUser._id) === String(targetUser._id)) return false;
  return canManageUser(currentUser, targetUser);
};

const canDeleteUser = (currentUser, targetUser) => {
  if (targetUser.role === "main_admin") return false;
  if (String(currentUser._id) === String(targetUser._id)) return false;
  return canManageUser(currentUser, targetUser);
};

const validateStaffInput = ({ name, email, password, isEdit = false }) => {
  if (!name || !name.trim()) return "Full name is required";
  if (!email || !email.trim()) return "Email is required";
  if (!isEdit && (!password || String(password).length < 6)) {
    return "Password must be at least 6 characters long";
  }
  if (isEdit && password && String(password).length < 6) {
    return "New password must be at least 6 characters long";
  }
  return null;
};

test("Main Admin Security: Cannot be managed, blocked, or deleted by anyone", () => {
  const mainAdmin = { _id: "admin-1", role: "main_admin", name: "Gopal Das" };
  const adminUser = { _id: "admin-2", role: "admin", name: "Admin 2" };

  assert.equal(canManageUser(mainAdmin, mainAdmin), false, "Main Admin cannot manage/modify self as regular staff");
  assert.equal(canManageUser(adminUser, mainAdmin), false, "Lower admin cannot manage Main Admin");
  assert.equal(canBlockUser(mainAdmin, mainAdmin), false, "Main Admin cannot be blocked by self");
  assert.equal(canBlockUser(adminUser, mainAdmin), false, "Main Admin cannot be blocked by others");
  assert.equal(canDeleteUser(mainAdmin, mainAdmin), false, "Main Admin cannot be deleted by self");
  assert.equal(canDeleteUser(adminUser, mainAdmin), false, "Main Admin cannot be deleted by others");
});

test("Staff Hierarchy: Admins can manage managers, editors, viewers but not peers or superiors", () => {
  const adminUser = { _id: "admin-2", role: "admin", name: "Admin 2" };
  const peerAdmin = { _id: "admin-3", role: "admin", name: "Admin 3" };
  const managerUser = { _id: "mgr-1", role: "manager", name: "Manager 1" };
  const editorUser = { _id: "edt-1", role: "editor", name: "Editor 1" };
  const viewerUser = { _id: "viw-1", role: "viewer", name: "Viewer 1" };

  assert.equal(canManageUser(adminUser, peerAdmin), false, "Admin cannot manage peer admin");
  assert.equal(canManageUser(adminUser, managerUser), true, "Admin can manage manager");
  assert.equal(canManageUser(adminUser, editorUser), true, "Admin can manage editor");
  assert.equal(canManageUser(adminUser, viewerUser), true, "Admin can manage viewer");

  assert.equal(canManageUser(managerUser, editorUser), true, "Manager can manage editor");
  assert.equal(canManageUser(editorUser, managerUser), false, "Editor cannot manage manager");
});

test("Password Management Validation: Create requires min 6 chars, Edit is optional but validates if provided", () => {
  // Create checks
  assert.equal(validateStaffInput({ name: "Devotee", email: "dev@test.com", password: "123" }), "Password must be at least 6 characters long");
  assert.equal(validateStaffInput({ name: "Devotee", email: "dev@test.com", password: "" }), "Password must be at least 6 characters long");
  assert.equal(validateStaffInput({ name: "Devotee", email: "dev@test.com", password: "securePass123" }), null);

  // Edit checks
  assert.equal(validateStaffInput({ name: "Devotee", email: "dev@test.com", password: "", isEdit: true }), null, "Empty password allowed when editing");
  assert.equal(validateStaffInput({ name: "Devotee", email: "dev@test.com", password: "short", isEdit: true }), "New password must be at least 6 characters long");
  assert.equal(validateStaffInput({ name: "Devotee", email: "dev@test.com", password: "newStrongPassword", isEdit: true }), null);
});
