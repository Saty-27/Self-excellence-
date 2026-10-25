import { useEffect, useMemo, useState } from "react";
import {
  Ban, Check, Clock, Edit2, Eye, EyeOff, Loader2, Lock, Monitor, Plus, RotateCcw, Search,
  Shield, Smartphone, Trash2, UserPlus, X
} from "lucide-react";
import { apiFetch } from "./api";
import { SEO } from "./components";
import { useAuth } from "./AuthContext";

/* ============================================================
   Admin — staff access, activity trail and sessions
   ------------------------------------------------------------
   Three views over one idea: who may do what, what they did,
   and where they did it from. Permission checks here are for
   the interface only; the server enforces them independently.
   ============================================================ */

const input = "w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-primary";
const label = "block text-[10px] font-black uppercase tracking-wide text-muted";

const ROLE_BLURB = {
  main_admin: "Owner. Full access to everything, including restores.",
  admin: "Can run the site and manage staff below them.",
  manager: "Runs the sections you assign, including deletions.",
  editor: "Creates and edits in assigned sections, cannot delete.",
  viewer: "Read-only access to assigned sections."
};

const ROLE_STYLE = {
  main_admin: "bg-primary/10 text-primary",
  admin: "bg-amber-100 text-amber-800",
  manager: "bg-blue-100 text-blue-800",
  editor: "bg-emerald-100 text-emerald-800",
  viewer: "bg-gray-100 text-gray-700"
};

const ACTION_STYLE = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-rose-100 text-rose-800",
  restore: "bg-amber-100 text-amber-800",
  login: "bg-gray-100 text-gray-700",
  logout: "bg-gray-100 text-gray-700"
};

const prettySection = (s = "") => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

/* ------------------------------------------------------------------ */

const PermissionMatrix = ({ sections, value, onChange }) => {
  const grantFor = (section) => value.find((g) => g.section === section);

  const toggle = (section, key) => {
    const existing = grantFor(section);
    if (!existing) {
      /* First tick on a row implies view access. */
      onChange([...value, { section, view: true, create: false, edit: false, canDelete: false, [key]: true }]);
      return;
    }
    const next = { ...existing, [key]: !existing[key] };
    /* Turning off view removes the section entirely. */
    if (key === "view" && !next.view) {
      onChange(value.filter((g) => g.section !== section));
      return;
    }
    onChange(value.map((g) => (g.section === section ? next : g)));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-soft/60">
          <tr>
            <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-muted">Section</th>
            {["view", "create", "edit", "canDelete"].map((k) => (
              <th key={k} className="w-20 px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-muted">
                {k === "canDelete" ? "Delete" : k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-h-80">
          {sections.map((section) => {
            const g = grantFor(section);
            return (
              <tr key={section} className="border-t border-black/5">
                <td className="px-4 py-2 font-semibold text-ink">{prettySection(section)}</td>
                {["view", "create", "edit", "canDelete"].map((k) => (
                  <td key={k} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(g?.[k])}
                      onChange={() => toggle(section, k)}
                      aria-label={`${k} ${section}`}
                      className="h-4 w-4 cursor-pointer accent-[#C1121F]"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const StaffTab = ({ meta, notify }) => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [permissionsStaff, setPermissionsStaff] = useState(null);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "manager",
    status: "active",
    sectionAccess: []
  });
  const [showCreatePass, setShowCreatePass] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "manager",
    status: "active",
    sectionAccess: []
  });
  const [showEditPass, setShowEditPass] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/admin/staff");
      setStaff(d.items || []);
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* You can only ever grant a role strictly below your own. */
  const assignableRoles = (meta.roles || []).filter(
    (r) => user?.role === "main_admin" || r.level < (meta.myLevel ?? 0)
  );

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      notify("Full name and email are required.");
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      notify("Password must be at least 6 characters long.");
      return;
    }
    setBusy(true);
    try {
      const d = await apiFetch("/admin/staff", { method: "POST", body: createForm });
      notify(d.message);
      setCreating(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "manager",
        status: "active",
        sectionAccess: []
      });
      setShowCreatePass(false);
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (u) => {
    setEditingStaff(u);
    setEditForm({
      name: u.name || "",
      email: u.email || "",
      password: "",
      phone: u.phone || "",
      role: u.role || "manager",
      status: u.status || "active",
      sectionAccess: Array.isArray(u.sectionAccess) ? [...u.sectionAccess] : []
    });
    setShowEditPass(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      notify("Full name and email are required.");
      return;
    }
    if (editForm.password && editForm.password.trim().length < 6) {
      notify("New password must be at least 6 characters long.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone,
        role: editForm.role,
        status: editForm.status,
        sectionAccess: editForm.sectionAccess
      };
      if (editForm.password && editForm.password.trim()) {
        body.password = editForm.password.trim();
      }
      const d = await apiFetch(`/admin/staff/${editingStaff._id}`, {
        method: "PUT",
        body
      });
      notify(d.message);
      setEditingStaff(null);
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBlock = async (u) => {
    const isBlocked = u.status === "blocked";
    const actionText = isBlocked ? "unblock" : "block";
    const confirmPrompt = isBlocked
      ? `Restore admin panel access for ${u.name}?`
      : `Are you sure you want to block ${u.name}? They will immediately lose access to the admin panel.`;

    if (!window.confirm(confirmPrompt)) return;

    setBusy(true);
    try {
      const nextStatus = isBlocked ? "active" : "blocked";
      const d = await apiFetch(`/admin/staff/${u._id}/status`, {
        method: "PATCH",
        body: { status: nextStatus }
      });
      notify(d.message);
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (u) => {
    const confirmPrompt = `Permanently delete staff member "${u.name}" (${u.email})?\n\nThis action cannot be undone and will immediately revoke all access.`;
    if (!window.confirm(confirmPrompt)) return;

    setBusy(true);
    try {
      const d = await apiFetch(`/admin/staff/${u._id}`, { method: "DELETE" });
      notify(d.message);
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openPermissions = (u) => {
    setPermissionsStaff({
      ...u,
      sectionAccess: Array.isArray(u.sectionAccess) ? [...u.sectionAccess] : []
    });
  };

  const handleSavePermissions = async () => {
    setBusy(true);
    try {
      const d = await apiFetch(`/admin/staff/${permissionsStaff._id}/access`, {
        method: "PUT",
        body: {
          role: permissionsStaff.role,
          sectionAccess: permissionsStaff.sectionAccess,
          status: permissionsStaff.status
        }
      });
      notify(d.message);
      setPermissionsStaff(null);
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const grantAllSections = (currentRole, setter) => {
    const all = (meta.sections || []).map((section) => ({
      section,
      view: true,
      create: true,
      edit: true,
      canDelete: currentRole === "admin" || currentRole === "manager"
    }));
    setter((prev) => ({ ...prev, sectionAccess: all }));
  };

  const clearAllSections = (setter) => {
    setter((prev) => ({ ...prev, sectionAccess: [] }));
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">Staff accounts</h2>
          <p className="mt-0.5 text-xs text-muted">
            {staff.length} account{staff.length === 1 ? "" : "s"} with admin panel access
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm({
              name: "",
              email: "",
              password: "",
              phone: "",
              role: "manager",
              status: "active",
              sectionAccess: []
            });
            setShowCreatePass(false);
            setCreating(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-black text-white shadow-md shadow-primary/20 transition hover:bg-primary/90"
        >
          <UserPlus size={15} /> Add staff member
        </button>
      </div>

      {/* Role ladder */}
      <div className="mb-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {(meta.roles || []).map((r) => (
          <div key={r.role} className="rounded-xl border border-black/5 bg-white p-3.5 shadow-sm">
            <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ROLE_STYLE[r.role]}`}>
              {r.role.replace("_", " ")}
            </span>
            <p className="mt-2 text-[11px] leading-[1.5] text-muted">{ROLE_BLURB[r.role]}</p>
          </div>
        ))}
      </div>

      {/* Staff Accounts Table */}
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Sections</th>
              <th className="px-4 py-3">Account Status</th>
              <th className="px-4 py-3">Added by</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center text-muted">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" /> Loading staff accounts...
                  </div>
                </td>
              </tr>
            )}
            {!loading && staff.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-10 text-center text-muted">No staff accounts found.</td>
              </tr>
            )}
            {!loading && staff.map((u) => {
              const isLocked = !u.manageable || u.role === "main_admin";
              const isBlocked = u.status === "blocked";

              return (
                <tr key={u._id} className="border-t border-black/5 transition hover:bg-soft/30">
                  <td className="px-4 py-3">
                    <span className="block font-black text-ink">{u.name}</span>
                    <span className="block text-xs text-muted font-medium">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ROLE_STYLE[u.role]}`}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {u.role === "main_admin"
                      ? "Everything"
                      : (u.sectionAccess || []).length
                        ? `${u.sectionAccess.length} section${u.sectionAccess.length === 1 ? "" : "s"}`
                        : "None assigned"}
                  </td>
                  <td className="px-4 py-3">
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-rose-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{u.managedBy?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-soft/60 px-3 py-1.5 text-xs font-black text-muted" title="Main Admin account is permanently locked from modification">
                        <Lock size={12} /> Locked
                      </span>
                    ) : (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* Edit Staff button */}
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit staff details and reset password"
                          className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:border-primary hover:text-primary"
                        >
                          <Edit2 size={12} /> Edit
                        </button>

                        {/* Permissions button */}
                        <button
                          onClick={() => openPermissions(u)}
                          title="Manage section-level permissions"
                          className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:border-primary hover:text-primary"
                        >
                          <Shield size={12} /> Permissions
                        </button>

                        {/* Block / Unblock action */}
                        {isBlocked ? (
                          <button
                            onClick={() => handleToggleBlock(u)}
                            title="Unblock staff account"
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Check size={12} /> Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleBlock(u)}
                            title="Block staff account"
                            className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                          >
                            <Ban size={12} /> Block
                          </button>
                        )}

                        {/* Delete action */}
                        <button
                          onClick={() => handleDelete(u)}
                          title={`Permanently delete ${u.name}`}
                          className="inline-flex items-center justify-center rounded-full border border-black/10 p-1.5 text-muted transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${u.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE STAFF MODAL */}
      {creating && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-ink">Add staff member</h3>
                <p className="text-xs text-muted">Create a new staff account with assigned role and permissions.</p>
              </div>
              <button onClick={() => setCreating(false)} className="rounded-full p-2 text-muted hover:bg-soft" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className={label}>Full Name *</span>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={input}
                  placeholder="e.g. Radhika Devi"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Email / User ID *</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className={input}
                  placeholder="e.g. radhika@iskconselfexcellence.online"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Password *</span>
                <div className="relative">
                  <input
                    type={showCreatePass ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className={`${input} pr-10`}
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    tabIndex={-1}
                  >
                    {showCreatePass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Phone (Optional)</span>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className={input}
                  placeholder="e.g. +91 9876543210"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Role *</span>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className={input}
                >
                  {assignableRoles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted">{ROLE_BLURB[createForm.role]}</span>
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Account Status *</span>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className={input}
                >
                  <option value="active">Active (Full access)</option>
                  <option value="blocked">Blocked (Login prohibited)</option>
                </select>
                <span className="text-[11px] text-muted">
                  {createForm.status === "blocked" ? "Account will be created in blocked state." : "Staff member can log in immediately."}
                </span>
              </label>
            </div>

            <div className="mt-5 mb-2 flex items-center justify-between">
              <div>
                <p className={label}>Assigned Sections & Permissions</p>
                <p className="text-[11px] text-muted">Choose what this staff member can view, create, edit, or delete.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => grantAllSections(createForm.role, setCreateForm)}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-soft"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => clearAllSections(setCreateForm)}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-bold text-muted hover:text-ink hover:bg-soft"
                >
                  Clear All
                </button>
              </div>
            </div>

            <PermissionMatrix
              sections={meta.sections || []}
              value={createForm.sectionAccess}
              onChange={(v) => setCreateForm({ ...createForm, sectionAccess: v })}
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreate}
                disabled={busy || !createForm.name || !createForm.email || !createForm.password}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create account
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink hover:bg-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setEditingStaff(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-ink">Edit Staff: {editingStaff.name}</h3>
                <p className="text-xs text-muted">Update profile, account status, permissions, or reset password.</p>
              </div>
              <button onClick={() => setEditingStaff(null)} className="rounded-full p-2 text-muted hover:bg-soft" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className={label}>Full Name *</span>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={input}
                />
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Email / User ID *</span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={input}
                />
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Reset Password (Optional)</span>
                <div className="relative">
                  <input
                    type={showEditPass ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className={`${input} pr-10`}
                    placeholder="Leave blank to keep unchanged"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPass(!showEditPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    tabIndex={-1}
                  >
                    {showEditPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="text-[10px] text-muted font-medium">
                  🔒 Leave blank to keep current password. Enter 6+ characters only to reset.
                </span>
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Phone</span>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className={input}
                  placeholder="e.g. +91 9876543210"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Role *</span>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className={input}
                >
                  {assignableRoles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted">{ROLE_BLURB[editForm.role]}</span>
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Account Status *</span>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className={input}
                >
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="inactive">Inactive</option>
                </select>
                <span className="text-[11px] text-muted">
                  {editForm.status === "blocked" ? "⚠️ Blocked staff cannot log in or access admin routes." : "Staff member has regular access."}
                </span>
              </label>
            </div>

            <div className="mt-5 mb-2 flex items-center justify-between">
              <div>
                <p className={label}>Assigned Sections & Permissions</p>
                <p className="text-[11px] text-muted">Configure granular permissions for this account.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => grantAllSections(editForm.role, setEditForm)}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-soft"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => clearAllSections(setEditForm)}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-bold text-muted hover:text-ink hover:bg-soft"
                >
                  Clear All
                </button>
              </div>
            </div>

            <PermissionMatrix
              sections={meta.sections || []}
              value={editForm.sectionAccess}
              onChange={(v) => setEditForm({ ...editForm, sectionAccess: v })}
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={busy || !editForm.name || !editForm.email}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save changes
              </button>
              <button
                onClick={() => setEditingStaff(null)}
                className="rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink hover:bg-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK PERMISSIONS MODAL */}
      {permissionsStaff && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setPermissionsStaff(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-ink">Permissions: {permissionsStaff.name}</h3>
                <p className="text-xs text-muted">{permissionsStaff.email}</p>
              </div>
              <button onClick={() => setPermissionsStaff(null)} className="rounded-full p-2 text-muted hover:bg-soft" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className={label}>Role</span>
                <select
                  value={permissionsStaff.role}
                  onChange={(e) => setPermissionsStaff({ ...permissionsStaff, role: e.target.value })}
                  className={input}
                >
                  {assignableRoles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className={label}>Status</span>
                <select
                  value={permissionsStaff.status || "active"}
                  onChange={(e) => setPermissionsStaff({ ...permissionsStaff, status: e.target.value })}
                  className={input}
                >
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="mt-5 mb-2 flex items-center justify-between">
              <p className={label}>Sections</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => grantAllSections(permissionsStaff.role, setPermissionsStaff)}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-soft"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => clearAllSections(setPermissionsStaff)}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-bold text-muted hover:text-ink hover:bg-soft"
                >
                  Clear All
                </button>
              </div>
            </div>

            <PermissionMatrix
              sections={meta.sections || []}
              value={permissionsStaff.sectionAccess || []}
              onChange={(v) => setPermissionsStaff({ ...permissionsStaff, sectionAccess: v })}
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSavePermissions}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save permissions
              </button>
              <button
                onClick={() => setPermissionsStaff(null)}
                className="rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink hover:bg-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */

const ActivityTab = ({ meta, notify }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: "all", section: "all", source: "all", search: "" });
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.action !== "all") q.set("action", filters.action);
      if (filters.section !== "all") q.set("section", filters.section);
      if (filters.source !== "all") q.set("source", filters.source);
      if (filters.search) q.set("search", filters.search);
      const d = await apiFetch(`/admin/activity-log${q.toString() ? `?${q}` : ""}`);
      setItems(d.items || []);
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const restore = async (entry) => {
    if (!confirm(`Restore "${entry.label || entry.resource}"?`)) return;
    setBusy(true);
    try {
      const d = await apiFetch(`/admin/activity-log/${entry._id}/restore`, { method: "PUT" });
      notify(d.message);
      setDetail(null);
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">Activity trail</h2>
          <p className="mt-0.5 text-xs text-muted">Every create, edit and delete — from the admin panel and from the website.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold">
            <option value="all">All actions</option>
            {["create", "update", "delete", "restore", "login"].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold">
            <option value="all">Everywhere</option>
            <option value="admin">Admin panel</option>
            <option value="public">Website</option>
          </select>
          <select value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold">
            <option value="all">All sections</option>
            {(meta.sections || []).map((sct) => <option key={sct} value={sct}>{prettySection(sct)}</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search" className="rounded-xl border border-black/10 py-2 pl-8 pr-3 text-xs" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">What</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="px-4 py-10 text-center text-muted">Loading activity...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="5" className="px-4 py-10 text-center text-muted">Nothing recorded yet.</td></tr>}
            {!loading && items.map((a) => (
              <tr key={a._id} className="border-t border-black/5 transition hover:bg-soft/20">
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${ACTION_STYLE[a.action] || ""}`}>{a.action}</span>
                    <span className="font-bold text-ink">{a.label || a.resource}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    {a.source === "public" && (
                      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-indigo-700">Website</span>
                    )}
                    <span>
                      {prettySection(a.section || a.resource || "")}
                      {a.changedFields?.length ? ` · ${a.changedFields.join(", ")}` : ""}
                      {a.restored ? " · restored" : ""}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="block text-xs font-bold text-ink">{a.userName || "—"}</span>
                  <span className="block text-[11px] text-muted">
                    {a.userRole === "visitor" ? "not signed in" : a.userRole}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5">
                    {a.device === "Mobile" ? <Smartphone size={12} /> : <Monitor size={12} />}
                    {a.device}{a.os && a.os !== "Unknown" ? ` · ${a.os}` : ""}
                  </span>
                  <span className="block">{a.ip}</span>
                </td>
                <td className="px-4 py-3 text-[11px] text-muted">{when(a.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => setDetail(a)} className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink transition hover:border-primary hover:text-primary">
                      <Eye size={12} className="mr-1 inline" />View
                    </button>
                    {a.action === "delete" && !a.restored && user?.role === "main_admin" && (
                      <button onClick={() => restore(a)} disabled={busy} className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-amber-600 disabled:opacity-50">
                        <RotateCcw size={12} /> Restore
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ACTION_STYLE[detail.action] || ""}`}>{detail.action}</span>
                <h3 className="mt-2 text-xl font-black text-ink">{detail.label || detail.resource}</h3>
                <p className="text-xs text-muted">
                  {detail.userName} ({detail.userRole}) · {when(detail.createdAt)}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-full p-2 text-muted hover:bg-soft" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[["IP address", detail.ip], ["Device", `${detail.device || "—"}${detail.os && detail.os !== "Unknown" ? ` · ${detail.os}` : ""}`], ["Browser", detail.browser]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-soft/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-muted">{k}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{v || "—"}</p>
                </div>
              ))}
            </div>

            {detail.changedFields?.length > 0 && (
              <div className="mt-5">
                <p className={label}>Fields changed</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.changedFields.map((f) => (
                    <span key={f} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800">{f}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {detail.before && (
                <div>
                  <p className={label}>Before</p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-rose-50/60 p-3 text-[11px] leading-[1.5] text-ink">{JSON.stringify(detail.before, null, 2)}</pre>
                </div>
              )}
              {detail.after && (
                <div>
                  <p className={label}>After</p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-emerald-50/60 p-3 text-[11px] leading-[1.5] text-ink">{JSON.stringify(detail.after, null, 2)}</pre>
                </div>
              )}
            </div>

            {detail.action === "delete" && !detail.restored && user?.role === "main_admin" && (
              <button onClick={() => restore(detail)} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-black text-white disabled:opacity-50">
                <RotateCcw size={15} /> Restore this item
              </button>
            )}
            {detail.restored && (
              <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Already restored on {when(detail.restoredAt)}.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */

const SessionsTab = ({ notify }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/admin/sessions?limit=80");
      setItems(d.items || []);
    } catch (err) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const end = async (id) => {
    if (!confirm("Mark this session as ended?")) return;
    try {
      const d = await apiFetch(`/admin/sessions/${id}`, { method: "DELETE" });
      notify(d.message);
      load();
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-black text-ink">Login sessions</h2>
        <p className="mt-0.5 text-xs text-muted">Where each sign-in came from — device, browser and IP address.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">IP address</th>
              <th className="px-4 py-3">Signed in</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="px-4 py-10 text-center text-muted">Loading sessions...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="5" className="px-4 py-10 text-center text-muted">No sessions recorded yet.</td></tr>}
            {!loading && items.map((sn) => (
              <tr key={sn._id} className="border-t border-black/5 transition hover:bg-soft/20">
                <td className="px-4 py-3">
                  <span className="block font-bold text-ink">{sn.userName}</span>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${ROLE_STYLE[sn.userRole] || ""}`}>{sn.userRole?.replace("_", " ")}</span>
                </td>
                <td className="px-4 py-3 text-xs text-body">
                  <span className="flex items-center gap-1.5 font-bold text-ink">
                    {sn.device === "Mobile" ? <Smartphone size={13} /> : <Monitor size={13} />} {sn.device}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {sn.os !== "Unknown" ? sn.os : ""}{sn.browser !== "Unknown" ? ` · ${sn.browser}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-body">{sn.ip || "—"}</td>
                <td className="px-4 py-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5"><Clock size={12} /> {when(sn.loginAt)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {sn.active ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">Active</span>
                      {user?.role === "main_admin" && (
                        <button onClick={() => end(sn._id)} className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50" aria-label="End session"><Trash2 size={13} /></button>
                      )}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted">Ended</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */

export const AdminAccessPage = ({ tab: initialTab = "staff" }) => {
  const [tab, setTab] = useState(initialTab);
  const [meta, setMeta] = useState({ sections: [], roles: [], myLevel: 0 });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    apiFetch("/admin/access-meta").then(setMeta).catch(() => {});
  }, []);

  const notify = (msg) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 6000);
  };

  const tabs = useMemo(
    () => [
      ["staff", "Staff & roles", Shield],
      ["activity", "Activity trail", Clock],
      ["sessions", "Sessions", Monitor]
    ],
    []
  );

  return (
    <div>
      <SEO title="Access control - Admin" />
      <h1 className="mb-1 text-3xl font-black">Access & accountability</h1>
      <p className="mb-6 text-sm text-muted">Who can do what, what they did, and where they signed in from.</p>

      <div className="mb-6 flex flex-wrap gap-2 rounded-full bg-soft p-1">
        {tabs.map(([key, text, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black transition ${
              tab === key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={14} /> {text}
          </button>
        ))}
      </div>

      {notice && <p className="mb-5 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">{notice}</p>}

      {tab === "staff" && <StaffTab meta={meta} notify={notify} />}
      {tab === "activity" && <ActivityTab meta={meta} notify={notify} />}
      {tab === "sessions" && <SessionsTab notify={notify} />}
    </div>
  );
};

export default AdminAccessPage;
