"use client";

import { useState, useRef } from "react";
import {
  ImageIcon,
  Upload,
  Trash2,
  ImagePlus,
  Eye,
  RefreshCw,
  FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ImageViewerModal from "@/components/ui/ImageViewerModal";

interface Props {
  imagePreview: string | null;
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  isViewMode: boolean;
}

export default function ProductImageTab({
  imagePreview,
  onImageSelect,
  onImageRemove,
  isViewMode,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    // اعتبار سنجی نوع و سایز فایل (مثلاً max 5MB)
    if (!file.type.startsWith("image/")) {
      alert("لطفاً فقط فایل تصویر انتخاب کنید.");
      return;
    }
    onImageSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isViewMode) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isViewMode) return;

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="h-full flex flex-col items-center justify-start py-8 px-4"
      dir="rtl"
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp"
        onChange={handleFileChange}
        disabled={isViewMode}
      />

      {/* Main Container */}
      <div
        className={cn(
          "relative w-full max-w-2xl flex flex-col items-center p-6 rounded-xl border-2 border-dashed transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-slate-200 dark:border-slate-700 bg-card",
          isViewMode
            ? "border-solid border-slate-100 dark:border-slate-800"
            : "",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {imagePreview ? (
          // === حالت نمایش تصویر (پر شده) ===
          <div className="flex flex-col items-center w-full">
            <div className="relative group w-full max-w-sm aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden shadow-sm border">
              <img
                src={imagePreview}
                alt="Product Preview"
                className="w-full h-full object-contain p-2"
              />

              {/* Overlay برای دکمه مشاهده در همه حالات */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity gap-2 shadow-lg backdrop-blur-md bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800"
                  onClick={() => setShowModal(true)}
                >
                  <Eye size={16} /> مشاهده تصویر اصلی
                </Button>
              </div>
            </div>

            {/* نوار ابزار پایین (فقط در حالت ویرایش) */}
            {!isViewMode && (
              <div className="flex items-center gap-3 mt-6 w-full max-w-sm">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-dashed hover:border-solid hover:border-primary hover:text-primary"
                  onClick={triggerUpload}
                  type="button"
                >
                  <RefreshCw size={16} />
                  تغییر تصویر
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 shadow-none"
                  onClick={onImageRemove}
                  type="button"
                >
                  <Trash2 size={16} />
                  حذف تصویر
                </Button>
              </div>
            )}

            {/* اطلاعات فایل در حالت مشاهده */}
            {isViewMode && (
              <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm bg-slate-50 px-4 py-2 rounded-full">
                <ImageIcon size={14} />
                <span>تصویر فعلی کالا</span>
              </div>
            )}
          </div>
        ) : (
          // === حالت خالی (Empty State) ===
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors",
                isDragging
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400",
              )}
            >
              {isDragging ? <Upload size={32} /> : <FileImage size={32} />}
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isViewMode ? "تصویری موجود نیست" : "تصویر کالا را بارگذاری کنید"}
            </h3>

            {!isViewMode && (
              <>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                  فایل تصویر را به اینجا بکشید و رها کنید یا دکمه زیر را فشار
                  دهید.
                </p>
                <Button onClick={triggerUpload} className="gap-2 px-6">
                  <ImagePlus size={18} />
                  انتخاب فایل
                </Button>
                <p className="text-xs text-slate-400 mt-6 font-mono">
                  JPG, PNG, WEBP • Max 5MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* مودال نمایش تصویر بزرگ */}
      {imagePreview && (
        <ImageViewerModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          imageUrl={imagePreview}
          altText="مشاهده تصویر کالا"
        />
      )}
    </div>
  );
}
