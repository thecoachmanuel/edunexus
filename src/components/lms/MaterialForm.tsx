"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { materialFormSchema, type MaterialFormValues } from "./schema";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";
import Modal from "@/components/global/Modal";

interface Option {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: any | null;
  onSuccess: () => void;
}

const typeOptions = [
  { label: "Document", value: "Document" },
  { label: "Video", value: "Video" },
  { label: "Link", value: "Link" },
  { label: "Other", value: "Other" },
];

export const MaterialForm = ({ open, onOpenChange, initialData, onSuccess }: Props) => {
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoadingOptions(true);
        try {
          const [classesRes, subjectsRes] = await Promise.all([
            api.get("/classes?limit=1000"),
            api.get("/subjects?limit=1000"),
          ]);
          setClasses(classesRes.data.classes || []);
          setSubjects(subjectsRes.data.subjects || []);
        } catch (error) {
          toast.error("Failed to load options");
        } finally {
          setLoadingOptions(false);
        }
      };
      fetchData();
    }
  }, [open]);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema) as Resolver<MaterialFormValues>,
    defaultValues: {
      title: "",
      description: "",
      type: "Link",
      url: "",
      classId: "",
      subjectId: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description || "",
        type: initialData.type,
        url: initialData.url,
        classId: initialData.classId?._id || "",
        subjectId: initialData.subjectId?._id || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        type: "Link",
        url: "",
        classId: "",
        subjectId: "",
      });
    }
  }, [initialData, form, open]);

  const onSubmit = async (data: MaterialFormValues) => {
    try {
      if (initialData) {
        await api.put(`/materials/${initialData._id}`, data);
        toast.success("Material updated successfully");
      } else {
        await api.post("/materials", data);
        toast.success("Material added successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save material");
    }
  };

  const pending = form.formState.isSubmitting;

  const classOptions = classes.map((c) => ({
    label: c.name,
    value: c._id,
  }));
  const subjectOptions = subjects.map((s) => ({
    label: s.name,
    value: s._id,
  }));

  return (
    <Modal
      open={open}
      setOpen={onOpenChange}
      description={initialData ? "Edit Study Material" : "Add New Study Material"}
      title={initialData ? "Edit Study Material" : "Add New Study Material"}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="space-y-4">
          <CustomInput
            control={form.control}
            name="title"
            label="Title"
            placeholder="E.g., Chapter 1 Notes"
            disabled={pending}
          />
          <CustomInput
            control={form.control}
            name="description"
            label="Description (Optional)"
            placeholder="Brief description of the material..."
            disabled={pending}
          />
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              control={form.control}
              name="type"
              label="Resource Type"
              placeholder="Select type"
              options={typeOptions}
              disabled={pending}
            />
            <CustomInput
              control={form.control}
              name="url"
              label="URL Link"
              placeholder="https://..."
              disabled={pending}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              control={form.control}
              name="classId"
              label="Class"
              placeholder="Select Class"
              options={classOptions}
              disabled={pending}
              loading={loadingOptions}
            />
            <CustomSelect
              control={form.control}
              name="subjectId"
              label="Subject"
              placeholder="Select Subject"
              options={subjectOptions}
              disabled={pending}
              loading={loadingOptions}
            />
          </div>
        </FieldGroup>
        <Button
          className="w-full mt-4"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Material"}
        </Button>
      </form>
    </Modal>
  );
};
