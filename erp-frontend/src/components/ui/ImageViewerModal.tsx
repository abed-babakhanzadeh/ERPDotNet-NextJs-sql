"use client";

import React from "react";
import { X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
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
}: Props) {
  const handleDownload = async () => {
    try {
      // نکته مهم: اضافه کردن ?t=... برای دور زدن کش مرورگر
      // این کار باعث می‌شود درخواست جدید به سرور ارسال شود و هدرهای CORS دریافت شوند
      const fetchUrl = `${imageUrl}?t=${new Date().getTime()}`;

      const response = await fetch(fetchUrl, {
        // این تنظیم هم به برخی مرورگرها کمک می‌کند
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = altText ? `${altText}.jpg` : "download.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">نمایش تصویر محصول</DialogTitle>

        <div className="relative w-full h-[85vh] flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
          {/* دکمه‌های کنترلی */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            <Button
              onClick={onClose}
              variant="destructive"
              size="icon"
              className="rounded-full w-10 h-10 shadow-md"
              title="بستن"
            >
              <X className="h-5 w-5" />
            </Button>

            <Button
              onClick={handleDownload}
              variant="secondary"
              size="icon"
              className="rounded-full w-10 h-10 shadow-md bg-white hover:bg-gray-200 text-black"
              title="دانلود"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative w-full h-full p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={altText || "تصویر بزرگنمایی شده"}
              className="max-h-full max-w-full object-contain select-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
