"use client";

import { Menu, Bell, Settings, User, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
}

export default function Header({ onMenuClick, isCollapsed }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between border-b bg-card/98 backdrop-blur-md supports-[backdrop-filter]:bg-card/95 px-3 h-12 shadow-sm">
      {/* Right Side - Logo & Menu */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-8 w-8 md:hidden hover:bg-accent/80 rounded transition-colors"
        >
          <Menu size={14} />
        </Button>

        <div className="flex items-center gap-1.5">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">
              E
            </span>
          </div>
          <span className="text-[0px] font-bold hidden sm:inline">
            ERP System
          </span>
        </div>
      </div>

      {/* Left Side - Actions */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8 rounded hover:bg-accent/80 transition-colors"
        >
          {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded relative hover:bg-accent/80 transition-colors"
            >
              <Bell size={22} />
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -left-0.5 h-3.5 w-3.5 p-0 flex items-center justify-center text-[12px]"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs">اعلان‌ها</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto">
              <DropdownMenuItem className="text-[11px] py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">سفارش جدید ثبت شد</span>
                  <span className="text-muted-foreground text-[10px]">
                    5 دقیقه پیش
                  </span>
                </div>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded hover:bg-accent/80 transition-colors"
        >
          <Settings size={22} />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-6 px-1.5 gap-1 rounded hover:bg-accent/80 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" />
                <AvatarFallback className="text-[10px] bg-primary/10">
                  ع
                </AvatarFallback>
              </Avatar>
              <span className="text-[14px] hidden sm:inline max-w-20 truncate">
                عابد
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">
              حساب کاربری
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[11px]">
              <User className="ml-2 h-3 w-3" />
              پروفایل
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[11px]">
              <Settings className="ml-2 h-3 w-3" />
              تنظیمات
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[11px] text-destructive"
            >
              <LogOut className="ml-2 h-3 w-3" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
