"use client";
import React from "react";
import { clsx } from "clsx";
import { UploadCloud, X } from "lucide-react";
import PersianDatePicker from "@/components/ui/PersianDatePicker";

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
}

interface AutoFormProps {
  fields: FieldConfig[];
  data: any;
  onChange: (name: string, value: any) => void;
  loading?: boolean;
  className?: string;
}

export default function AutoForm({
  fields,
  data,
  onChange,
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

  const commonInputClasses =
    "flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200";

  return (
    <div
      className={clsx(
        // گرید فشرده‌تر با فاصله کمتر
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-3",
        className
      )}
    >
      {fields.map((field) => {
        const isFullWidth = field.colSpan === 2;
        const fieldValue = data[field.name];

        return (
          <div
            key={field.name}
            className={clsx(
              "space-y-1",
              isFullWidth
                ? "md:col-span-2 lg:col-span-3 xl:col-span-4"
                : "col-span-1"
            )}
          >
            {/* Label - کوچکتر */}
            {field.type !== "checkbox" && (
              <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </label>
            )}

            {/* Inputs */}
            {["text", "number", "email", "password"].includes(field.type) && (
              <input
                type={field.type}
                className={commonInputClasses}
                placeholder={field.placeholder}
                value={fieldValue || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={loading || field.disabled}
                required={field.required}
              />
            )}

            {field.type === "date" && (
              <PersianDatePicker
                value={fieldValue}
                onChange={(newDate) => onChange(field.name, newDate)}
                disabled={loading || field.disabled}
                required={field.required}
                placeholder={field.placeholder}
                hasError={!fieldValue && field.required}
                className="h-8"
              />
            )}

            {field.type === "select" && (
              <div className="relative">
                <select
                  className={clsx(commonInputClasses, "appearance-none")}
                  value={fieldValue || ""}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  disabled={loading || field.disabled}
                  required={field.required}
                >
                  <option value="" disabled>
                    {field.placeholder || "انتخاب کنید..."}
                  </option>
                  {field.options?.map((opt) => (
                    <option
                      key={String(opt.value)}
                      value={opt.value ?? ""} // اگر نال بود، رشته خالی بگذار
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            )}

            {field.type === "textarea" && (
              <textarea
                className={clsx(commonInputClasses, "min-h-[80px] resize-y")}
                placeholder={field.placeholder}
                value={fieldValue || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={loading || field.disabled}
                required={field.required}
              />
            )}

            {field.type === "checkbox" && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id={`field-${field.name}`}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={!!fieldValue}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                  disabled={loading || field.disabled}
                />
                <label
                  htmlFor={`field-${field.name}`}
                  className="text-xs font-medium leading-none cursor-pointer select-none"
                >
                  {field.label}
                </label>
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
                      <div className="w-16 h-16 rounded-lg overflow-hidden shadow-sm relative border bg-white mb-1">
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
          </div>
        );
      })}
    </div>
  );
}
