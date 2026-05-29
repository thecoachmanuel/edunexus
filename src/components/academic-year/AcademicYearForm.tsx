"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/AuthProvider";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { CustomInput } from "@/components/global/CustomInput";
import { api } from "@/lib/api";
import { formSchema, type FormValues } from "./schema";
import type { academicYear } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: academicYear | null;
  onSuccess: () => void;
}

const AcademicYearForm = ({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: Props) => {
  const { fetchYear } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      activeTerm: "Term 1",
      isCurrent: false,
      terms: [
        { term: "Term 1", startDate: undefined as unknown as Date, endDate: undefined as unknown as Date },
        { term: "Term 2", startDate: undefined as unknown as Date, endDate: undefined as unknown as Date },
        { term: "Term 3", startDate: undefined as unknown as Date, endDate: undefined as unknown as Date },
      ],
    },
  });
  // Reset form when dialog opens or data changes
  useEffect(() => {
    if (initialData) {
      const initTerms = initialData.terms?.length === 3 ? initialData.terms : [
        { term: "Term 1", startDate: new Date(initialData.fromYear || Date.now()), endDate: new Date(initialData.toYear || Date.now()) },
        { term: "Term 2", startDate: new Date(initialData.fromYear || Date.now()), endDate: new Date(initialData.toYear || Date.now()) },
        { term: "Term 3", startDate: new Date(initialData.fromYear || Date.now()), endDate: new Date(initialData.toYear || Date.now()) },
      ];
      
      form.reset({
        name: initialData.name,
        activeTerm: initialData.activeTerm || initialData.term || "Term 1",
        isCurrent: initialData.isCurrent,
        terms: initTerms.map(t => ({
          term: t.term,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
        })) as any,
      });
    } else {
      form.reset({
        name: "",
        activeTerm: "Term 1",
        isCurrent: false,
        terms: [
          { term: "Term 1", startDate: undefined as unknown as Date, endDate: undefined as unknown as Date },
          { term: "Term 2", startDate: undefined as unknown as Date, endDate: undefined as unknown as Date },
          { term: "Term 3", startDate: undefined as unknown as Date, endDate: undefined as unknown as Date },
        ],
      });
    }
  }, [initialData, form, open]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (initialData) {
        await api.put(`/academic-years/${initialData._id}`, data);
        toast.success("Academic year updated");
      } else {
        await api.post("/academic-years", data);
        toast.success("Academic year created");
      }
      await fetchYear();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to save academic year");
    }
  };
  const pending = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Year" : "New Academic Year"}
          </DialogTitle>
          <DialogDescription>
            Set the duration for this session.
          </DialogDescription>
        </DialogHeader>
        {/* form */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="space-y-2">
            {/* Name Field */}
            <CustomInput
              control={form.control}
              name="name"
              label="Year Name"
              placeholder="2026"
              disabled={pending}
            />
            {/* Term Field */}
            <Controller
              name="activeTerm"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Active Term</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="pt-2 pb-1 border-b">
              <h4 className="text-sm font-semibold">Term Dates</h4>
              <p className="text-xs text-muted-foreground">Specify the start and end date for each term.</p>
            </div>

            {/* Term Dates */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-md border">
                  <div className="col-span-1 md:col-span-2">
                    <h5 className="text-sm font-medium">Term {index + 1}</h5>
                  </div>
                  {/* Start Date */}
                  <Controller
                    name={`terms.${index}.startDate`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Start Date</FieldLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              autoFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  {/* End Date */}
                  <Controller
                    name={`terms.${index}.endDate`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>End Date</FieldLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const startDate = form.getValues(`terms.${index}.startDate`);
                                return startDate ? date < startDate : false;
                              }}
                              autoFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </div>
              ))}
            </div>
            {/* Checkbox */}
            <Controller
              name="isCurrent"
              control={form.control}
              render={({ field: { value, onChange, ...field } }) => (
                <Field>
                  <div className="flex gap-2 rounded-md border p-4">
                    <Checkbox
                      id="isCurrent"
                      checked={value}
                      onCheckedChange={onChange}
                      {...field}
                    />
                    <div className="space-y-1 leading-none">
                      <FieldLabel
                        htmlFor="isCurrent"
                        className="cursor-pointer"
                      >
                        Set as Active
                      </FieldLabel>
                      <p className="text-[0.8rem] text-muted-foreground mt-1">
                        Automatically deactivates others.
                      </p>
                    </div>
                  </div>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AcademicYearForm;
