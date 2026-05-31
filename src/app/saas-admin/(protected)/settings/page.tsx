"use client";

import { useState } from "react";
import { Settings, CreditCard, Mail, Globe, Save, Loader2, KeyRound, Bell } from "lucide-react";

export default function PlatformSettings() {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved successfully!");
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Platform Settings</h2>
          <p className="text-sm text-white/40 mt-1">Configure global settings, integrations, and webhooks.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Tabs sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {[
            { id: "general", label: "General", icon: Settings },
            { id: "billing", label: "Payment & Billing", icon: CreditCard },
            { id: "email", label: "Email Server (SMTP)", icon: Mail },
            { id: "webhooks", label: "Webhooks", icon: Globe },
            { id: "security", label: "Security & MFA", icon: KeyRound },
            { id: "notifications", label: "Notifications", icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          {activeTab === "general" && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg border-b border-white/10 pb-4">General Configuration</h3>
              
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">Platform Name</label>
                <input type="text" defaultValue="EduNexus" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">Support Email</label>
                <input type="email" defaultValue="support@edunexus.io" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50" />
              </div>
              
              <div className="pt-4">
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20 text-violet-500" />
                  <div>
                    <div className="font-medium">Maintenance Mode</div>
                    <div className="text-white/40 text-xs mt-0.5">Disables school portals and shows a maintenance screen.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg border-b border-white/10 pb-4">Payment Gateway Integration</h3>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#09A5DB]/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#09A5DB]" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Paystack</div>
                    <div className="text-white/40 text-xs">Active Payment Processor</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">Connected</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">Paystack Public Key</label>
                <input type="text" defaultValue="pk_live_************************" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">Paystack Secret Key</label>
                <input type="password" defaultValue="sk_live_************************" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg border-b border-white/10 pb-4">SMTP Settings (Resend / AWS SES)</h3>
              
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">SMTP Host</label>
                <input type="text" defaultValue="smtp.resend.com" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">SMTP Port</label>
                  <input type="number" defaultValue={465} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">Encryption</label>
                  <select className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50">
                    <option>TLS/SSL</option>
                    <option>STARTTLS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">SMTP Username</label>
                <input type="text" defaultValue="resend" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">SMTP Password</label>
                <input type="password" defaultValue="re_************************" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-violet-500/50" />
              </div>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors mt-2">Test Connection</button>
            </div>
          )}

          {activeTab === "webhooks" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="font-bold text-lg">Webhook Endpoints</h3>
                <button className="text-xs bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg text-white">Add Endpoint</button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-violet-400">https://edunexus.io/api/webhooks/paystack</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">Active</span>
                </div>
                <div className="text-xs text-white/40 mb-3">Listening for: invoice.create, invoice.payment_failed, charge.success</div>
                <div className="flex gap-2">
                  <button className="text-xs text-white/50 hover:text-white">Edit</button>
                  <button className="text-xs text-white/50 hover:text-red-400">Delete</button>
                </div>
              </div>
            </div>
          )}
          
          {(activeTab === "security" || activeTab === "notifications") && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                <Settings className="w-8 h-8 text-white/20" />
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Coming Soon</h4>
                <p className="text-sm text-white/40 max-w-sm">This settings pane is currently under development. Please check back later.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
