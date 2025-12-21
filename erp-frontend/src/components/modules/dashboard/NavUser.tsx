"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  Laptop,
  Loader2,
  Type,
  Check,
  Hash,
  Minus,
  Plus,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/apiClient";
import { LockKeyhole, UserCog } from "lucide-react";
import ChangeOwnPasswordDialog from "./ChangeOwnPasswordDialog";
import { useFont } from "@/providers/FontProvider";

interface UserProfileDto {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles?: string[];
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const { setTheme } = useTheme();
  const { font, setFont, digit, setDigit, scale, setScale } = useFont(); 
  const router = useRouter();

  const [user, setUser] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get<UserProfileDto>("/Auth/profile");
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="animate-spin size-4 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src="" alt={user.username} />
                  <AvatarFallback className="rounded-lg">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-right text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.username}
                  </span>
                </div>
                {/* آیکون بازشدن منوی اصلی: سمت چپ قرار می‌گیرد */}
                <ChevronsUpDown className="mr-auto ml-0 size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg text-right"
              side={isMobile ? "bottom" : "left"}
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-right text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-right">
                    <span className="truncate font-semibold">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2 cursor-pointer flex flex-row items-center justify-start text-right">
                  <UserCog className="size-4" />
                  <span className="flex-1 text-right">پروفایل کاربری</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="gap-2 cursor-pointer flex flex-row items-center justify-start text-right"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  <LockKeyhole className="size-4" />
                  <span className="flex-1 text-right">تغییر رمز عبور</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                
                {/* --- کنترل سایز فونت --- */}
                <div className="px-2 py-1.5">
                   {/* تیتر راست چین */}
                   <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground px-1 justify-end text-right">
                      <Monitor className="size-4 monitor-icon-custom" />
                      <span>اندازه نمایشی</span>
                   </div>
                   
                   {/* کنترلر زوم: دکمه منفی چپ، دکمه مثبت راست */}
                   <div className="flex flex-row-reverse items-center justify-between rounded-md border bg-background p-1 shadow-sm">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setScale(scale - 5);
                        }}
                        disabled={scale <= 70}
                      >
                        <Minus className="size-4" />
                      </Button>
                      
                      <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums" dir="ltr">
                        {scale}%
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setScale(scale + 5);
                        }}
                        disabled={scale >= 130}
                      >
                        <Plus className="size-4" />
                      </Button>
                   </div>
                </div>
                {/* ----------------------- */}

                <DropdownMenuSeparator />

                {/* منوی انتخاب فونت */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer flex flex-row items-center justify-between text-right">
                    <span className="flex-1 text-right">تغییر فونت</span>
                    <Type className="size-4" />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent 
                      className="text-right" 
                      {...({ side: "left", align: "start" } as any)}
                    >
                      <DropdownMenuItem
                        onClick={() => setFont("iransans")}
                        className="gap-2 cursor-pointer justify-between text-right"
                      >
                        <span className="font-[family-name:--font-iransans]">ایران‌سنس</span>
                        {font === "iransans" && <Check className="size-3" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFont("kharazmi")}
                        className="gap-2 cursor-pointer justify-between text-right"
                      >
                        <span className="font-[family-name:--font-kharazmi] text-base">خوارزمی</span>
                        {font === "kharazmi" && <Check className="size-3" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* منوی نمایش اعداد */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer flex flex-row items-center justify-between text-right">
                    <span className="flex-1 text-right">نمایش اعداد</span>
                    <Hash className="size-4" />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent 
                      className="text-right" 
                      {...({ side: "left", align: "start" } as any)}
                    >
                      <DropdownMenuItem
                        onClick={() => setDigit("farsi")}
                        className="gap-2 cursor-pointer justify-between"
                      >
                        <span>۱۲۳ (فارسی)</span>
                        {digit === "farsi" && <Check className="size-3" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDigit("english")}
                        className="gap-2 cursor-pointer justify-between"
                      >
                        <span>123 (انگلیسی)</span>
                        {digit === "english" && <Check className="size-3" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* منوی تم (Theme) */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer flex flex-row items-center justify-between text-right">
                    <span className="flex-1 text-right">تغییر پوسته</span>
                    <div className="relative size-4">
                      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute inset-0 size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent 
                      className="text-right" 
                      {...({ side: "left", align: "start" } as any)}
                    >
                      <DropdownMenuItem
                        onClick={() => setTheme("light")}
                        className="gap-2 cursor-pointer flex-row-reverse justify-end text-right"
                      >
                        <Sun className="size-4" /> روشن
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setTheme("dark")}
                        className="gap-2 cursor-pointer flex-row-reverse justify-end text-right"
                      >
                        <Moon className="size-4" /> تیره
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setTheme("system")}
                        className="gap-2 cursor-pointer flex-row-reverse justify-end text-right"
                      >
                        <Laptop className="size-4" /> سیستم
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 text-destructive focus:text-destructive cursor-pointer bg-red-50 dark:bg-red-950/30 flex flex-row items-center justify-start"
              >
                <LogOut className="size-4" />
                <span>خروج از حساب</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ChangeOwnPasswordDialog
        open={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}