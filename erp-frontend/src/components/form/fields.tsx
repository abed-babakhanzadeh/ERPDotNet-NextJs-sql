"use client";

import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * فیلدهای مشترک فرم روی react-hook-form.
 * هر فیلد برچسب، ستاره الزامی، راهنما و پیام خطای zod را یکسان نشان می‌دهد،
 * پس صفحه‌ها فقط نام و برچسب را می‌دهند.
 */
interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  required?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <FormLabel>
      {label}
      {required && (
        <span className="ms-0.5 text-destructive" aria-hidden>
          *
        </span>
      )}
    </FormLabel>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  disabled,
  className,
  placeholder,
  dir,
  autoFocus,
}: BaseFieldProps<T> & { placeholder?: string; dir?: "ltr" | "rtl"; autoFocus?: boolean }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder={placeholder}
              disabled={disabled}
              dir={dir}
              autoFocus={autoFocus}
              aria-required={required}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  disabled,
  className,
  step,
  min,
}: BaseFieldProps<T> & { step?: number; min?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Input
              type="number"
              inputMode="decimal"
              dir="ltr"
              className="text-start"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ""}
              // رشته خالی را خالی نگه می‌داریم تا zod پیام «الزامی» بدهد، نه صفر
              onChange={(e) =>
                field.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)
              }
              step={step}
              min={min}
              disabled={disabled}
              aria-required={required}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  disabled,
  className,
  placeholder,
  rows = 3,
}: BaseFieldProps<T> & { placeholder?: string; rows?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ""}
              placeholder={placeholder}
              rows={rows}
              disabled={disabled}
              className="resize-y"
              aria-required={required}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export interface SelectOption {
  value: string | number;
  label: string;
}

/** «بدون انتخاب» در Radix Select مقدار رشته‌ای خالی نمی‌پذیرد؛ این مقدار جایگزین null است */
const NONE = "__none__";

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  disabled,
  className,
  options,
  placeholder = "انتخاب کنید",
  noneLabel,
}: BaseFieldProps<T> & {
  options: SelectOption[];
  placeholder?: string;
  /** اگر داده شود، گزینه «بدون انتخاب» با مقدار null اضافه می‌شود */
  noneLabel?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const numeric = options.some((o) => typeof o.value === "number");
        // مقداری که در گزینه‌ها نیست (مثلاً ۰ پیش‌فرض enum) مثل «بدون انتخاب» نمایش داده می‌شود
        const selected = options.some((o) => String(o.value) === String(field.value));
        const current = selected ? String(field.value) : noneLabel ? NONE : "";
        return (
          <FormItem className={className}>
            <FieldLabel label={label} required={required} />
            <Select
              disabled={disabled}
              value={current}
              onValueChange={(v) =>
                field.onChange(v === NONE ? null : numeric ? Number(v) : v)
              }
            >
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required={required}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {noneLabel && (
                  <SelectItem value={NONE} className="text-muted-foreground">
                    {noneLabel}
                  </SelectItem>
                )}
                {options.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/** کلید روشن/خاموش در یک ردیف کادردار؛ برای «فعال است» و گزینه‌های بله/خیر */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: Omit<BaseFieldProps<T>, "required">) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "flex flex-row items-center justify-between gap-4 space-y-0 rounded-lg border bg-card px-3 py-2.5",
            className,
          )}
        >
          <div className="space-y-0.5">
            <FormLabel className="cursor-pointer">{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
