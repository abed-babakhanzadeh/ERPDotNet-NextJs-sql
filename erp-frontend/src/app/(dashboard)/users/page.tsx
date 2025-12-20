"use client";

import { useState } from "react";
import apiClient from "@/services/apiClient";
import { User } from "@/types/user";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Key, UserCheck, UserX, Users } from "lucide-react";
import Modal from "@/components/ui/Modal";
import CreateUserForm from "./CreateUserForm";
import PermissionGuard from "@/components/ui/PermissionGuard";
import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionTree from "@/components/modules/roles/PermissionTree";

// Components
import BaseListLayout from "@/components/layout/BaseListLayout";
import { DataTable } from "@/components/data-table";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColumnConfig } from "@/types";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"; // <--- ایمپورت‌های جدید

import { ShieldCheck } from "lucide-react"; // آیکون جدید
import ResetPasswordDialog from "./ResetPasswordDialog"; // ایمپورت کامپوننت جدید

// --- توابع کمکی لاجیک دسترسی (بدون تغییر) ---
const findNodeAndGetChildrenIds = (
  nodes: any[],
  targetId: number
): number[] => {
  for (const node of nodes) {
    if (node.id === targetId) return getAllChildren(node);
    if (node.children) {
      const found = findNodeAndGetChildrenIds(node.children, targetId);
      if (found.length > 0) return found;
    }
  }
  return [];
};

const getAllChildren = (node: any): number[] => {
  let ids: number[] = [];
  if (node.children) {
    node.children.forEach((child: any) => {
      ids.push(child.id);
      ids = [...ids, ...getAllChildren(child)];
    });
  }
  return ids;
};

const findParentId = (
  nodes: any[],
  childId: number,
  parentId: number | null = null
): number | null => {
  for (const node of nodes) {
    if (node.id === childId) return parentId;
    if (node.children) {
      const found = findParentId(node.children, childId, node.id);
      if (found) return found;
    }
  }
  return null;
};

const findNodeById = (nodes: any[], id: number): any | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export default function UsersPage() {
  const { tableProps, refresh, totalCount } = useServerDataTable<User>({
    endpoint: "/Users/search",
    initialPageSize: 10,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // --- استیت‌های دسترسی ویژه ---
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [rolePermIds, setRolePermIds] = useState<number[]>([]);
  const [finalSelectedIds, setFinalSelectedIds] = useState<number[]>([]);
  const [copySourceId, setCopySourceId] = useState("");
  const [allUsersForCopy, setAllUsersForCopy] = useState<User[]>([]);
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);

  // تعریف ستون‌ها
  const columns: ColumnConfig[] = [
    {
      key: "fullName",
      label: "نام و نام خانوادگی",
      type: "string",
      render: (_: any, row: any) => (
        <span className="font-medium">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: "username",
      label: "نام کاربری",
      type: "string",
    },
    {
      key: "personnelCode",
      label: "کد پرسنلی",
      type: "string",
      render: (value: any) => value || "-",
    },
    {
      key: "roles",
      label: "نقش‌ها",
      type: "string",
      render: (roles: string[]) => (
        <div className="flex flex-wrap gap-1">
          {roles && roles.length > 0 ? (
            roles.map((role: string) => (
              <Badge
                key={role}
                variant="secondary"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                {role}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </div>
      ),
    },
    {
      key: "isActive",
      label: "وضعیت",
      type: "boolean",
      render: (isActive: boolean) =>
        isActive ? (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"
          >
            <UserCheck size={12} /> فعال
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 gap-1"
          >
            <UserX size={12} /> غیرفعال
          </Badge>
        ),
    },
  ];

  // --- هندلرها ---
  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "آیا از حذف این کاربر اطمینان دارید؟ این عملیات غیرقابل بازگشت است."
      )
    )
      return;

    try {
      await apiClient.delete(`/Users/${id}`);
      toast.success("کاربر با موفقیت حذف شد");
      refresh();
    } catch (error: any) {
      toast.error(error.response?.data || "خطا در حذف کاربر");
    }
  };

  const handleSpecialPermissions = async (user: User) => {
    setPermUser(user);
    setLoadingPerms(true);
    try {
      if (allUsersForCopy.length === 0) {
        const { data } = await apiClient.post("/Users/search", {
          pageNumber: 1,
          pageSize: 1000,
        });
        setAllUsersForCopy(data.items || []);
      }

      let currentTree = treeData;
      if (currentTree.length === 0) {
        const { data } = await apiClient.get("/Permissions/tree");
        setTreeData(data);
        currentTree = data;
      }

      const { data } = await apiClient.get<any>(
        `/Permissions/user-detail/${user.id}`
      );

      const rIds: number[] = data.rolePermissionIds;
      const overrides: { permissionId: number; isGranted: boolean }[] =
        data.userOverrides;

      setRolePermIds(rIds);

      let initialSelected = new Set(rIds);
      overrides.forEach((ov) => {
        if (ov.isGranted) initialSelected.add(ov.permissionId);
        else initialSelected.delete(ov.permissionId);
      });

      setFinalSelectedIds(Array.from(initialSelected));
      setIsPermModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("خطا در بارگذاری");
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleTogglePermission = (targetId: number, checked: boolean) => {
    const childrenIds = findNodeAndGetChildrenIds(treeData, targetId);
    const idsToUpdate = [targetId, ...childrenIds];

    setFinalSelectedIds((prev) => {
      let newSet = new Set(prev);
      if (checked) {
        idsToUpdate.forEach((id) => newSet.add(id));
      } else {
        idsToUpdate.forEach((id) => newSet.delete(id));
      }

      const parentId = findParentId(treeData, targetId);
      if (parentId) {
        const parentNode = findNodeById(treeData, parentId);
        if (parentNode) {
          const allSiblingIds = parentNode.children.map((c: any) => c.id);
          const areAllSiblingsSelected = allSiblingIds.every((id: number) =>
            newSet.has(id)
          );
          if (areAllSiblingsSelected) newSet.add(parentId);
          else newSet.delete(parentId);
        }
      }
      return Array.from(newSet);
    });
  };

  const saveUserPermissions = async () => {
    if (!permUser) return;
    setLoadingPerms(true);

    try {
      const permissionsToSend: { permissionId: number; isGranted: boolean }[] =
        [];
      const allInvolvedIds = new Set([...rolePermIds, ...finalSelectedIds]);

      allInvolvedIds.forEach((id) => {
        const hasInRole = rolePermIds.includes(id);
        const hasInFinal = finalSelectedIds.includes(id);

        if (hasInRole && !hasInFinal) {
          permissionsToSend.push({ permissionId: id, isGranted: false });
        } else if (!hasInRole && hasInFinal) {
          permissionsToSend.push({ permissionId: id, isGranted: true });
        }
      });

      await apiClient.post("/Permissions/assign-user", {
        userId: permUser.id,
        permissions: permissionsToSend,
      });

      toast.success("دسترسی‌های ویژه با موفقیت ذخیره شد");
      setIsPermModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("خطا در ذخیره دسترسی‌ها");
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleCopyPermissions = async () => {
    if (!permUser || !copySourceId) return;
    if (
      !confirm(
        "آیا مطمئن هستید؟ تمام دسترسی‌های فعلی این کاربر حذف و با دسترسی‌های کاربر انتخابی جایگزین می‌شود."
      )
    )
      return;

    setLoadingPerms(true);
    try {
      await apiClient.post("/Permissions/copy", {
        sourceUserId: copySourceId,
        targetUserId: permUser.id,
      });
      toast.success("دسترسی‌ها کپی شد");
      setIsPermModalOpen(false);
    } catch (err) {
      toast.error("خطا در کپی دسترسی");
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleResetPassword = (user: User) => {
    setResetPassUser(user);
    setIsResetPassOpen(true);
  };

  // --- رندر عملیات هر سطر (ستون جدول) ---
  const renderRowActions = (user: User) => (
    <div className="flex items-center gap-1 justify-center">
      <TooltipProvider>
        <PermissionGuard permission="UserAccess.Edit">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                onClick={() => handleEdit(user)}
              >
                <Edit size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>ویرایش اطلاعات</TooltipContent>
          </Tooltip>
        </PermissionGuard>

        <PermissionGuard permission="UserAccess.SpecialPermissions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                onClick={() => handleSpecialPermissions(user)}
              >
                <Key size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>دسترسی‌های ویژه</TooltipContent>
          </Tooltip>
        </PermissionGuard>

        <PermissionGuard permission="UserAccess.ResetPassword">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                onClick={() => handleResetPassword(user)}
              >
                <ShieldCheck size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تغییر رمز عبور</TooltipContent>
          </Tooltip>
        </PermissionGuard>

        <PermissionGuard permission="UserAccess.Delete">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleDelete(user.id)}
              >
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>حذف کاربر</TooltipContent>
          </Tooltip>
        </PermissionGuard>
      </TooltipProvider>
    </div>
  );

  // --- رندر منوی راست کلیک (Context Menu) ---
  // این تابع دقیقاً همان عملیات بالا را در قالب منوی دراپ‌داون ارائه می‌دهد
  const renderContextMenu = (row: any, closeMenu: () => void) => {
    // cast row to User if needed, or use 'any' if types are loose
    const user = row as User;

    return (
      <>
        <PermissionGuard permission="UserAccess.Edit">
          <DropdownMenuItem
            onClick={() => {
              handleEdit(user);
              closeMenu();
            }}
            className="flex items-center gap-2 cursor-pointer text-right"
          >
            <Edit className="w-4 h-4 text-blue-600" />
            <span>ویرایش اطلاعات</span>
          </DropdownMenuItem>
        </PermissionGuard>

        <PermissionGuard permission="UserAccess.SpecialPermissions">
          <DropdownMenuItem
            onClick={() => {
              handleSpecialPermissions(user);
              closeMenu();
            }}
            className="flex items-center gap-2 cursor-pointer text-right"
          >
            <Key className="w-4 h-4 text-amber-600" />
            <span>دسترسی‌های ویژه</span>
          </DropdownMenuItem>
        </PermissionGuard>

        <PermissionGuard permission="UserAccess.ResetPassword">
          <DropdownMenuItem
            onClick={() => {
              handleResetPassword(user);
              closeMenu();
            }}
            className="flex items-center gap-2 cursor-pointer text-right"
          >
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            <span>تغییر رمز عبور</span>
          </DropdownMenuItem>
        </PermissionGuard>

        {/* خط جداکننده قبل از حذف */}
        <PermissionGuard permission="UserAccess.Delete">
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              handleDelete(user.id);
              closeMenu();
            }}
            className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-right"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف کاربر</span>
          </DropdownMenuItem>
        </PermissionGuard>
      </>
    );
  };

  return (
    <ProtectedPage permission="UserAccess.View">
      <BaseListLayout
        title="مدیریت کاربران"
        icon={Users}
        count={totalCount}
        actions={
          <PermissionGuard permission="UserAccess.Create">
            <Button
              onClick={handleCreate}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white h-9"
            >
              <Plus size={16} />
              افزودن کاربر جدید
            </Button>
          </PermissionGuard>
        }
      >
        <DataTable
          columns={columns}
          {...tableProps}
          renderRowActions={renderRowActions as any}
          renderContextMenu={renderContextMenu} // <--- اتصال منوی راست کلیک
        />

        {/* --- مودال ویرایش/ایجاد --- */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? "ویرایش مشخصات کاربر" : "افزودن کاربر جدید"}
        >
          <CreateUserForm
            userToEdit={editingUser}
            onCancel={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              refresh();
            }}
          />
        </Modal>

        {/* --- مودال دسترسی ویژه --- */}
        <Modal
          isOpen={isPermModalOpen}
          onClose={() => setIsPermModalOpen(false)}
          title={`دسترسی‌های ویژه: ${permUser?.username}`}
        >
          {/* محتویات مودال دسترسی (بدون تغییر) */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              کپی دسترسی از کاربر دیگر:
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 text-sm border border-gray-300 rounded p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                onChange={(e) => setCopySourceId(e.target.value)}
              >
                <option value="">انتخاب کاربر...</option>
                {allUsersForCopy
                  .filter((u) => u.id !== permUser?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.username})
                    </option>
                  ))}
              </select>
              <Button
                onClick={handleCopyPermissions}
                disabled={!copySourceId || loadingPerms}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                کپی و اعمال
              </Button>
            </div>
          </div>
          <hr className="my-4" />

          <div className="space-y-4">
            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-100">
              نکته: تیک‌های{" "}
              <span className="font-bold text-green-700">سبز</span> دسترسی
              اضافه، و موارد{" "}
              <span className="font-bold text-red-600 line-through">قرمز</span>{" "}
              محرومیت هستند.
            </div>

            <div className="max-h-[400px] overflow-y-auto border rounded-md p-2 custom-scrollbar">
              <PermissionTree
                nodes={treeData}
                selectedIds={finalSelectedIds}
                roleIds={rolePermIds}
                onToggle={handleTogglePermission}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsPermModalOpen(false)}
                disabled={loadingPerms}
              >
                انصراف
              </Button>
              <Button
                onClick={saveUserPermissions}
                disabled={loadingPerms}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loadingPerms ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </div>
          </div>
        </Modal>
        {resetPassUser && (
          <ResetPasswordDialog
            open={isResetPassOpen}
            onClose={() => setIsResetPassOpen(false)}
            userId={resetPassUser.id}
            username={resetPassUser.username}
          />
        )}
      </BaseListLayout>
    </ProtectedPage>
  );
}
