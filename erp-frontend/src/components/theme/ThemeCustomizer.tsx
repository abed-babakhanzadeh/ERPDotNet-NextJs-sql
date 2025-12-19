"use client";

import { useState } from "react";
import { useCustomTheme } from "@/providers/CustomThemeProvider";
import { themeVariables } from "@/lib/theme-utils";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paintbrush, Download, Upload, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ThemeCustomizer() {
  const { updateVariable, loadTheme, resetTheme, isActive } = useCustomTheme();
  const [isOpen, setIsOpen] = useState(false);

  if (!isActive) return null;

  const handleExport = () => {
    const currentTheme = localStorage.getItem("erp-custom-theme") || "{}";
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(currentTheme);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "erp-theme-config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = (e) => {
            if(e.target?.result) {
                try {
                    const parsed = JSON.parse(e.target.result as string);
                    loadTheme(parsed);
                } catch(err) {
                    alert("Invalid JSON file");
                }
            }
        };
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* modal={false} اجازه میدهد با صفحه زیرین تعامل داشته باشید */}
      <Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DialogTrigger asChild>
          <Button size="icon" className="rounded-full shadow-2xl w-14 h-14 bg-primary text-primary-foreground hover:scale-105 transition-transform border-2 border-background">
            <Paintbrush className="w-6 h-6" />
          </Button>
        </DialogTrigger>
        
        <DialogContent 
            className="sm:max-w-[400px] flex flex-col shadow-2xl border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            onInteractOutside={(e) => e.preventDefault()} 
            onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>شخصی‌سازی تم</DialogTitle>
            <DialogDescription>
              تغییر رنگ‌ها به صورت زنده.
            </DialogDescription>
          </DialogHeader>

          {/* ارتفاع ثابت ۶۰ درصد ارتفاع صفحه برای اسکرول خوردن */}
          <ScrollArea className="h-[60vh] pr-4 -mr-4 border-t border-b border-border my-2">
            <div className="space-y-4 py-4 px-1">
              {themeVariables.map((variable) => (
                <div key={variable.name} className="flex items-center justify-between pb-2 last:pb-0">
                  <Label htmlFor={variable.name} className="text-sm font-medium text-foreground text-right w-full ml-4">
                    {variable.label}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div 
                        className="w-8 h-8 shrink-0 rounded-full border-2 border-border cursor-pointer shadow-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: `hsl(var(${variable.name}))` }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3 border-none shadow-xl bg-popover" side="left" align="center">
                      <HexColorPicker 
                        onChange={(color) => updateVariable(variable.name, color)} 
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
                <Button onClick={handleExport} variant="outline" size="sm" className="flex-1 text-xs">
                    <Download className="w-3 h-3 mr-2" /> خروجی (Export)
                </Button>
                <div className="relative flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs pointer-events-none">
                        <Upload className="w-3 h-3 mr-2" /> ورودی (Import)
                    </Button>
                    <input 
                        type="file" 
                        onChange={handleImport} 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept=".json"
                    />
                </div>
            </div>
            <Button onClick={resetTheme} variant="destructive" size="sm" className="w-full text-xs">
                <RotateCcw className="w-3 h-3 mr-2" /> بازگشت به پیش‌فرض
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}