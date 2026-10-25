"use client";
import React from "react";
import { clsx } from "clsx";
import { UploadCloud, X } from "lucide-react";
import PersianDatePicker from "@/components/ui/PersianDatePicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "date"
  | "select"
  | "textarea"
  | "checkbox"
  | "file";

export interface Option {
  label: string;
  value: string | number | null; // <--- کلمه null اضافه شد
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Option[];
  colSpan?: 1 | 2 | 3;
  disabled?: boolean;
  accept?: string;
  step?: number;
}

/** Radix Select مقدار رشته‌ای خالی نمی‌پذیرد؛ این مقدار جایگزین null است */
const NONE = "__none__";

function SelectControl({
  id,
  field,
  value,
  disabled,
  onChange,
  errorId,
}: {
  id: string;
  field: FieldConfig;
  value: unknown;
  disabled?: boolean;
  onChange: (value: string | number | null) => void;
  errorId?: string;
}) {
  const options = field.options ?? [];
  const match = options.find((o) => o.value !== null && String(o.value) === String(value));
  const hasNone = options.some((o) => o.value === null);
  const current = match ? String(match.value) : hasNone && (value === null || value === undefined || value === "") ? NONE : "";
  return (
    <Select
      value={current}
      disabled={disabled}
      onValueChange={(v) => {
        if (v === NONE) return onChange(null);
        // نوع اصلی گزینه (عدد یا رشته) را برمی‌گردانیم
        const opt = options.find((o) => String(o.value) === v);
        onChange(opt ? opt.value : v);
      }}
    >
      <SelectTrigger
        id={id}
        aria-required={field.required}
        aria-invalid={!!errorId}
        aria-describedby={errorId}
        className={errorId ? "border-destructive" : undefined}
      >
        <SelectValue placeholder={field.placeholder || "انتخاب کنید"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem
            key={String(opt.value)}
            value={opt.value === null ? NONE : String(opt.value)}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface AutoFormProps {
  fields: FieldConfig[];
  data: any;
  onChange: (name: string, value: any) => void;
  /** پیام خطای هر فیلد (مثلاً از formState.errors در react-hook-form) */
  errors?: Record<string, string | undefined>;
  loading?: boolean;
  className?: string;
}

export default function AutoForm({
  fields,
  data,
  onChange,
  errors,
  loading,
  className,
}: AutoFormProps) {
  const handleFileChange = (
    name: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    onChange(name, file);
    e.target.value = "";
  };

  const handleRemoveFile = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(name, null);
  };

  return (
    <div
      className={clsx(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
        className
      )}
    >
      {fields.map((field) => {
        const isFullWidth = (field.colSpan ?? 1) >= 2;
        const fieldValue = data[field.name];
        const id = `field-${field.name}`;
        const disabled = loading || field.disabled;
        const error = errors?.[field.name];
        const errorId = error ? `${id}-error` : undefined;

        return (
          <div
            key={field.name}
            className={clsx(
              "space-y-2",
              isFullWidth
                ? "md:col-span-2 lg:col-span-3 xl:col-span-4"
                : "col-span-1",
              field.type === "checkbox" && "self-end"
            )}
          >
            {/* برچسب، هم‌شکل فیلدهای مشترک components/form/fields */}
            {field.type !== "checkbox" && (
              <Label htmlFor={id}>
                {field.label}
                {field.required && (
                  <span className="ms-0.5 text-destructive" aria-hidden>
                    *
                  </span>
                )}
              </Label>
            )}

            {["text", "number", "email", "password"].includes(field.type) && (
              <Input
                id={id}
                type={field.type}
                placeholder={field.placeholder}
                value={fieldValue ?? ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={disabled}
                required={field.required}
                aria-invalid={!!error}
                aria-describedby={errorId}
                step={field.step}
                dir={field.type === "number" ? "ltr" : undefined}
                className={field.type === "number" ? "text-start" : undefined}
              />
            )}

            {field.type === "date" && (
              <PersianDatePicker
                value={fieldValue}
                onChange={(newDate) => onChange(field.name, newDate)}
                disabled={disabled}
                required={field.required}
                placeholder={field.placeholder}
                hasError={!fieldValue && field.required}
              />
            )}

            {field.type === "select" && (
              <SelectControl
                id={id}
                field={field}
                value={fieldValue}
                disabled={disabled}
                onChange={(v) => onChange(field.name, v)}
                errorId={errorId}
              />
            )}

            {field.type === "textarea" && (
              <Textarea
                id={id}
                className="min-h-[80px] resize-y"
                placeholder={field.placeholder}
                value={fieldValue ?? ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={disabled}
                required={field.required}
                aria-invalid={!!error}
                aria-describedby={errorId}
              />
            )}

            {field.type === "checkbox" && (
              <div className="flex h-10 items-center justify-between gap-3 rounded-md border bg-card px-3">
                <Label htmlFor={id} className="cursor-pointer">
                  {field.label}
                </Label>
                <Switch
                  id={id}
                  checked={!!fieldValue}
                  onCheckedChange={(checked) => onChange(field.name, checked)}
                  disabled={disabled}
                />
              </div>
            )}

            {/* File Upload - فشرده‌تر */}
            {field.type === "file" && (
              <div
                className={clsx(
                  "relative flex items-center justify-center w-full border-2 border-dashed rounded-lg p-3 transition-colors",
                  "cursor-pointer group",
                  fieldValue instanceof File
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted-foreground/25 hover:bg-muted/50"
                )}
                onClick={() =>
                  document.getElementById(`file-${field.name}`)?.click()
                }
              >
                <input
                  id={`file-${field.name}`}
                  type="file"
                  className="hidden"
                  accept={field.accept || "image/*"}
                  onChange={(e) => handleFileChange(field.name, e)}
                  disabled={loading || field.disabled}
                />

                <div className="flex flex-col items-center justify-center text-center gap-1.5 w-full">
                  {fieldValue instanceof File ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shadow-sm relative border bg-card mb-1">
                        <img
                          src={URL.createObjectURL(fieldValue)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] text-primary font-medium truncate max-w-[150px]">
                        {fieldValue.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {(fieldValue.size / 1024 / 1024).toFixed(2)} MB
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveFile(field.name, e)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground p-0.5 rounded-full shadow-md hover:bg-destructive/90 transition z-10"
                        title="حذف فایل"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground group-hover:text-primary/80 transition-colors">
                          کلیک برای انتخاب
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          JPG, PNG
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p id={errorId} className="text-[0.8rem] font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
