"use client";
import { X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog"; // فرض بر وجود Dialog از shadcn
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
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = imageUrl.split("/").pop() || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-none text-white">
        <div className="relative flex items-center justify-center h-[80vh]">
          {/* دکمه‌های کنترلی */}
          <div className="absolute top-4 right-4 flex gap-2 z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download />
            </Button>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X />
              </Button>
            </DialogClose>
          </div>

          <img
            src={imageUrl}
            alt={altText || "Full Size"}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
