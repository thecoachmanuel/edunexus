"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader2, Save } from "lucide-react";

export default function SchoolSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    whatsappNumber: "",
  });

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings/school");
        if (data.settings) {
          setFormData({
            schoolName: data.settings.schoolName || "",
            bankName: data.settings.bankName || "",
            accountName: data.settings.accountName || "",
            accountNumber: data.settings.accountNumber || "",
            whatsappNumber: data.settings.whatsappNumber || "",
          });
        }
      } catch (error) {
        toast.error("Failed to load school settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/settings/school", formData);
      toast.success("School settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">School Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your school's global configuration and payment details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Basic details about the institution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input 
                value={formData.schoolName} 
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })} 
                placeholder="e.g. EduNexus High School" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment & Financial Details</CardTitle>
            <CardDescription>
              Configure the bank account where parents should transfer fees, and the WhatsApp number to receive receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input 
                  value={formData.bankName} 
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} 
                  placeholder="e.g. Guarantee Trust Bank (GTB)" 
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input 
                  value={formData.accountName} 
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} 
                  placeholder="e.g. EduNexus Official" 
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input 
                  value={formData.accountNumber} 
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} 
                  placeholder="e.g. 0123456789" 
                />
              </div>
              <div className="space-y-2">
                <Label>Admin WhatsApp Number</Label>
                <Input 
                  value={formData.whatsappNumber} 
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} 
                  placeholder="e.g. +2349012345678" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include the country code (e.g. +234). This is where parents will send payment receipts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="min-w-[120px]">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Save Settings</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
