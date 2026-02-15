"use client";

import { useEffect, useState } from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // DialogHeader و DialogTitle اضافه شدند

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
}

export default function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  altText,
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);

  // ریست کردن زوم هنگام باز شدن مجدد
  useEffect(() => {
    if (isOpen) setScale(1);
  }, [isOpen]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = altText || "downloaded-image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex flex-col items-center justify-center outline-none">
        {/* === بخش اضافه شده برای رفع خطای کنسول === */}
        <DialogHeader className="sr-only">
          <DialogTitle>{altText || "پیش‌نمایش تصویر"}</DialogTitle>
        </DialogHeader>
        {/* ========================================= */}

        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={() => setScale((s) => Math.min(s + 0.5, 3))}
            title="بزرگنمایی"
          >
            <ZoomIn size={20} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={() => setScale((s) => Math.max(s - 0.5, 1))}
            title="کوچک‌نمایی"
          >
            <ZoomOut size={20} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
            onClick={handleDownload}
            title="دانلود تصویر"
          >
            <Download size={20} />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="rounded-full"
            onClick={onClose}
            title="بستن"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Image Container */}
        <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
          <img
            src={imageUrl}
            alt={altText || "Image Preview"}
            className="max-w-full max-h-[85vh] object-contain transition-transform duration-200 ease-out rounded-lg shadow-2xl"
            style={{ transform: `scale(${scale})` }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
