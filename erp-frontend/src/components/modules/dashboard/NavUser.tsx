"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  Laptop,
  User,
  Loader2,
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
import apiClient from "@/services/apiClient";

// این اینترفیس باید دقیقاً با UserDto بک‌اند (فایل GetUserByIdQuery) یکی باشد
interface UserProfileDto {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles?: string[]; // لیست نقش‌ها
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const { setTheme } = useTheme();
  const router = useRouter();

  const [user, setUser] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  // دریافت اطلاعات کاربر لاگین شده
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // آدرس صحیح بر اساس AuthController: api/Auth/profile
        const response = await apiClient.get<UserProfileDto>("/Auth/profile");
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        // اگر خطای 401 باشد، خود apiClient کاربر را بیرون می‌اندازد
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    // پاک کردن توکن (دقت کنید نام کلید با صفحه لاگین یکی باشد)
    localStorage.removeItem("accessToken");

    // هدایت به لاگین
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="animate-spin size-4 text-muted-foreground" />
      </div>
    );
  }

  // اگر دیتا لود نشد، چیزی نشان نده (یا دکمه ورود نشان بده)
  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {/* چون در بک‌اند فیلد عکس نداریم، فعلا خالی می‌گذاریم */}
                <AvatarImage src="" alt={user.username} />
                <AvatarFallback className="rounded-lg">
                  {/* نمایش حروف اول نام و نام خانوادگی */}
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
              <ChevronsUpDown className="mr-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "left"}
            align="end"
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
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <User className="size-4" />
                حساب کاربری
              </DropdownMenuItem>

              {/* منوی تم (Theme) */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                  <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span>تغییر پوسته</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => setTheme("light")}
                      className="gap-2 cursor-pointer"
                    >
                      <Sun className="size-4" /> روشن
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme("dark")}
                      className="gap-2 cursor-pointer"
                    >
                      <Moon className="size-4" /> تیره
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme("system")}
                      className="gap-2 cursor-pointer"
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
              className="gap-2 text-destructive focus:text-destructive cursor-pointer bg-red-50 dark:bg-red-950/30"
            >
              <LogOut className="size-4" />
              خروج از حساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
