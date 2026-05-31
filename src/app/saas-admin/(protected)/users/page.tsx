"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Users, Plus, Shield, ShieldAlert, Bot, Edit2, Trash2, Loader2, UserPlus } from "lucide-react";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UsersManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    _id: "",
    name: "",
    email: "",
    password: "",
    role: "support_agent",
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/superadmin/users");
      setUsers(res.data.users);
    } catch (err: any) {
      if (err.response?.status === 401) {
        if (err.response?.data?.message?.includes("super_admin")) {
          alert("Only Super Admins can view this page");
          router.push("/saas-admin/dashboard");
        } else {
          router.push("/saas-admin/login");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: AdminUser) => {
    setFormData({
      _id: user._id,
      name: user.name,
      email: user.email,
      password: "", // Don't populate password
      role: user.role,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`/api/superadmin/users/${id}`);
      setUsers(users.filter((u) => u._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData._id) {
        await axios.put(`/api/superadmin/users/${formData._id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
        });
      } else {
        await axios.post("/api/superadmin/users", formData);
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-medium"><ShieldAlert className="w-3.5 h-3.5" /> Super Admin</span>;
    if (role === "finance_manager") return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium"><Shield className="w-3.5 h-3.5" /> Finance</span>;
    return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium"><Bot className="w-3.5 h-3.5" /> Support Agent</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Staff Management</h2>
          <p className="text-sm text-white/40 mt-1">Manage super admins, support agents, and finance managers.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ _id: "", name: "", email: "", password: "", role: "support_agent", isActive: true });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{user.name}</div>
                        <div className="text-white/40 text-xs mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="text-emerald-400 text-sm">Active</span>
                    ) : (
                      <span className="text-red-400 text-sm">Suspended</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-white/40">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(user)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user._id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0a0a18] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="border-b border-white/5 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">{formData._id ? "Edit User" : "Add User"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">Email Address</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm" />
              </div>
              {!formData._id && (
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Password</label>
                  <input required minLength={6} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white">
                  <option value="support_agent">Support Agent</option>
                  <option value="finance_manager">Finance Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              
              {formData._id && (
                <label className="flex items-center gap-2 text-sm pt-2">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded bg-white/10 border-white/20 text-violet-500" />
                  User is Active
                </label>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-lg font-medium hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
