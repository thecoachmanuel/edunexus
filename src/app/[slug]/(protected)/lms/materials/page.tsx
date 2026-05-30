"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/global/CustomInput";
import { useForm } from "react-hook-form";
import CustomAlert from "@/components/global/CustomAlert";
import { MaterialTable } from "@/components/lms/MaterialTable";
import { MaterialForm } from "@/components/lms/MaterialForm";

export default function MaterialsPage() {
  const { user } = useAuth();
  const isAdminOrTeacher = user?.role === "admin" || user?.role === "teacher";

  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchForm = useForm({
    defaultValues: {
      search: "",
    },
  });

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const search = searchForm.getValues("search");
      
      // If student, pass their classId. Wait, the backend currently doesn't force filtering by student's class
      // unless we pass it. But we can just rely on the API. 
      // Actually, if we're a student, we should pass classId=user.studentClass._id if it's available.
      // But for now let's just fetch all materials and the backend handles permissions or we pass classId here.
      let queryUrl = `/materials?page=${page}&limit=10`;
      if (search) queryUrl += `&search=${search}`;
      if (user?.role === "student" && user?.studentClass) {
        queryUrl += `&classId=${typeof user.studentClass === 'string' ? user.studentClass : user.studentClass._id}`;
      }

      const { data } = await api.get(queryUrl);
      setMaterials(data.materials);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      toast.error("Failed to fetch study materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [page]);

  const handleSearch = searchForm.handleSubmit(() => {
    setPage(1);
    fetchMaterials();
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/materials/${deleteId}`);
      toast.success("Material deleted successfully");
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchMaterials();
    } catch (error) {
      toast.error("Failed to delete material");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-muted-foreground">
            Manage and access course materials, documents, and resources.
          </p>
        </div>
        {isAdminOrTeacher && (
          <Button
            onClick={() => {
              setEditingMaterial(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Material
          </Button>
        )}
      </div>

      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-md border">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 w-full max-w-sm"
        >
          <CustomInput
            control={searchForm.control}
            name="search"
            label=""
            placeholder="Search materials..."
          />
          <Button type="submit" variant="secondary" className="mt-2">
            Search
          </Button>
        </form>
      </div>

      <MaterialTable
        data={materials}
        loading={loading}
        onEdit={(material) => {
          setEditingMaterial(material);
          setIsFormOpen(true);
        }}
        onDelete={(id) => {
          setDeleteId(id);
          setIsDeleteOpen(true);
        }}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
      />

      <MaterialForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingMaterial}
        onSuccess={fetchMaterials}
      />

      <CustomAlert
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Material"
        description="Are you sure you want to delete this study material? This action cannot be undone."
        handleDelete={handleDelete}
      />
    </div>
  );
}
