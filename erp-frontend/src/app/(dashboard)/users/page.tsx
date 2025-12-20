"use client";

import { useEffect, useState } from "react";
import apiClient from "@/services/apiClient";
import { User } from "@/types/user";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Key } from "lucide-react";
import Modal from "@/components/ui/Modal"; // <--- اضافه شد
import CreateUserForm from "./CreateUserForm"; // <--- اضافه شد
import PermissionGuard from "@/components/ui/PermissionGuard";
import ProtectedPage from "@/components/ui/ProtectedPage";
import PermissionTree from "@/components/modules/roles/PermissionTree";

// توابع کمکی برای پیدا کردن فرزندان در درخت
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

// تابع پیدا کردن پدر (برای لاجیک هوشمند تیک زدن)
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // <--- State مدال
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null); // <--- یوزری که قراره ادیت بشه

  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permUser, setPermUser] = useState<User | null>(null); // کاربری که داریم دسترسی‌اش را میدیم
  const [userPermIds, setUserPermIds] = useState<number[]>([]); // تیک‌های زده شده
  const [treeData, setTreeData] = useState<any[]>([]); // کل درخت (باید لود بشه)

  const [rolePermIds, setRolePermIds] = useState<number[]>([]); // دسترسی‌های نقش (خاکستری)
  const [finalSelectedIds, setFinalSelectedIds] = useState<number[]>([]); // وضعیت نهایی (تیک‌خورده‌ها)

  const [copySourceId, setCopySourceId] = useState("");

  // تابع باز کردن مدال برای ایجاد
  const handleCreate = () => {
    setEditingUser(null); // خالی می‌کنیم
    setIsModalOpen(true);
  };

  // تابع باز کردن مدال برای ویرایش
  const handleEdit = (user: User) => {
    setEditingUser(user); // یوزر انتخاب شده را ست می‌کنیم
    setIsModalOpen(true);
  };

  // تابع حذف
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
      fetchUsers(); // رفرش لیست
    } catch (error: any) {
      toast.error(error.response?.data || "خطا در حذف کاربر");
    }
  };

  const fetchUsers = async () => {
    try {
      // اصلاح شد: تغییر از GET به POST و آدرس search
      const { data } = await apiClient.post("/Users/search", {
        pageNumber: 1,
        pageSize: 1000, // فعلاً یک عدد بزرگ می‌گذاریم چون صفحه‌بندی در UI ندارید
        keyword: "",
      });

      // اصلاح شد: داده‌های اصلی داخل آرایه items قرار دارند
      setUsers(data.items);
    } catch (error) {
      console.error(error);
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  // تابع باز کردن مودال دسترسی ویژه
  // 1. باز کردن مودال
  const handleSpecialPermissions = async (user: User) => {
    setPermUser(user);
    setLoading(true);
    try {
      // لود درخت اگر خالی بود
      let currentTree = treeData;
      if (currentTree.length === 0) {
        const { data } = await apiClient.get("/Permissions/tree");
        setTreeData(data);
        currentTree = data;
      }

      // دریافت جزئیات یوزر
      const { data } = await apiClient.get<any>(
        `/Permissions/user-detail/${user.id}`
      );

      const rIds: number[] = data.rolePermissionIds;
      const overrides: { permissionId: number; isGranted: boolean }[] =
        data.userOverrides;

      setRolePermIds(rIds);

      // محاسبه وضعیت اولیه تیک‌ها (نقش + ویژه‌ها - محرومیت‌ها)
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
      setLoading(false);
    }
  };

  // 2. لاجیک تیک زدن (حیاتی - این باعث می‌شود کلیک کار کند)
  const handleTogglePermission = (targetId: number, checked: boolean) => {
    // استفاده از treeData که در state داریم
    const childrenIds = findNodeAndGetChildrenIds(treeData, targetId);
    const idsToUpdate = [targetId, ...childrenIds];

    setFinalSelectedIds((prev) => {
      let newSet = new Set(prev);

      // اعمال تغییر (تیک زدن یا برداشتن)
      if (checked) {
        idsToUpdate.forEach((id) => newSet.add(id));
      } else {
        idsToUpdate.forEach((id) => newSet.delete(id));
      }

      // لاجیک پدر (اگر همه فرزندان تیک خوردند، پدر هم تیک بخورد)
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

  // تابع ذخیره نهایی (شاهکار ماجرا)
  const saveUserPermissions = async () => {
    if (!permUser) return;
    setLoading(true);

    try {
      // محاسبه تفاوت‌ها (The Diff Logic)
      const permissionsToSend: { permissionId: number; isGranted: boolean }[] =
        [];

      // لیست تمام آیدی‌هایی که درگیر هستند (اجتماع نقش و انتخاب شده‌ها)
      // (تبدیل به Set برای حذف تکراری‌ها)
      const allInvolvedIds = new Set([...rolePermIds, ...finalSelectedIds]);

      allInvolvedIds.forEach((id) => {
        const hasInRole = rolePermIds.includes(id);
        const hasInFinal = finalSelectedIds.includes(id);

        if (hasInRole && !hasInFinal) {
          // 🔴 در نقش هست ولی کاربر تیک را برداشته -> یعنی محرومیت (Deny)
          permissionsToSend.push({ permissionId: id, isGranted: false });
        } else if (!hasInRole && hasInFinal) {
          // 🟢 در نقش نیست ولی کاربر تیک زده -> یعنی دسترسی ویژه (Grant)
          permissionsToSend.push({ permissionId: id, isGranted: true });
        }
        // اگر (hasInRole && hasInFinal) -> یعنی وضعیت عادی (ارث‌بری)، نیازی به ارسال نیست.
        // اگر (!hasInRole && !hasInFinal) -> یعنی کلا دسترسی ندارد، نیازی به ارسال نیست.
      });

      // ارسال به API جدید
      await apiClient.post("/Permissions/assign-user", {
        userId: permUser.id,
        permissions: permissionsToSend, // <--- لیست جدید
      });

      toast.success("دسترسی‌های ویژه با موفقیت ذخیره شد");
      setIsPermModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("خطا در ذخیره دسترسی‌ها");
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      await apiClient.post("/Permissions/copy", {
        sourceUserId: copySourceId,
        targetUserId: permUser.id,
      });
      toast.success("دسترسی‌ها کپی شد");

      // رفرش کردن وضعیت مودال (لود مجدد درخت این کاربر)
      // ما متد handleSpecialPermissions را دوباره صدا می‌زنیم یا فقط بخش لود دیتا را تکرار می‌کنیم
      // برای سادگی: مودال را ببندید
      setIsPermModalOpen(false);
    } catch (err) {
      toast.error("خطا در کپی دسترسی");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    // 👇 کل صفحه داخل این گارد قرار گرفت
    <ProtectedPage permission="UserAccess.View">
      <div className="page-content space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold text-foreground">مدیریت کاربران</h1>
          <PermissionGuard permission="UserAccess.Create">
            <button
              onClick={handleCreate} // <--- باز کردن مدال
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              افزودن کاربر جدید
            </button>
          </PermissionGuard>
        </div>

        {/* ... بخش جستجو و جدول (بدون تغییر) ... */}
        {/* ... کدهای قبلی جدول ... */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* کد جدول مثل قبل */}
          <table className="w-full text-right text-sm text-foreground">
            <thead className="bg-card text-xs uppercase text-card-foreground">
              <tr>
                <th className="px-6 py-3">نام و نام خانوادگی</th>
                <th className="px-6 py-3">نام کاربری</th>
                <th className="px-6 py-3">کد پرسنلی</th>
                <th className="px-6 py-3">نقش</th>
                <th className="px-6 py-3">وضعیت</th>
                <th className="px-6 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4">{user.username}</td>
                  <td className="px-6 py-4">{user.personnelCode || "-"}</td>

                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {user.roles &&
                        user.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 border border-blue-100"
                          >
                            {role}
                          </span>
                        ))}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        فعال
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        غیرفعال
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <PermissionGuard permission="UserAccess.Edit">
                      <button
                        onClick={() => handleEdit(user)} // <--- اتصال ویرایش
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                    </PermissionGuard>

                    <PermissionGuard permission="UserAccess.SpecialPermissions">
                      <button
                        onClick={() => handleSpecialPermissions(user)}
                        className="text-amber-600 hover:text-amber-800 p-1 hover:bg-amber-50 rounded"
                        title="دسترسی‌های ویژه"
                      >
                        <Key size={18} />{" "}
                        {/* آیکون کلید را از lucide ایمپورت کنید */}
                      </button>
                    </PermissionGuard>

                    <PermissionGuard permission="UserAccess.Delete">
                      <button
                        onClick={() => handleDelete(user.id)} // <--- اتصال حذف
                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* مودال هوشمند */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? "ویرایش مشخصات کاربر" : "افزودن کاربر جدید"} // تایتل پویا
        >
          <CreateUserForm
            userToEdit={editingUser} // <--- ارسال یوزر برای ویرایش
            onCancel={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              fetchUsers();
            }}
          />
        </Modal>

        {/* مودال دسترسی ویژه */}
        <Modal
          isOpen={isPermModalOpen}
          onClose={() => setIsPermModalOpen(false)}
          title={`دسترسی‌های ویژه: ${permUser?.username}`}
        >
          {/* بخش کپی دسترسی */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              کپی دسترسی از کاربر دیگر:
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 text-sm border border-gray-300 rounded p-1.5 bg-white"
                onChange={(e) => setCopySourceId(e.target.value)}
              >
                <option value="">انتخاب کاربر...</option>
                {users
                  .filter((u) => u.id !== permUser?.id) // خود کاربر را نشان نده
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.username})
                    </option>
                  ))}
              </select>
              <button
                onClick={handleCopyPermissions}
                disabled={!copySourceId}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                کپی و اعمال
              </button>
            </div>
          </div>
          <hr className="my-4" />

          <div className="space-y-4">
            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800">
              نکته: تیک‌های{" "}
              <span className="font-bold text-green-700">سبز</span> دسترسی
              اضافه، و موارد{" "}
              <span className="font-bold text-red-600 line-through">قرمز</span>{" "}
              محرومیت هستند.
            </div>

            {/* فراخوانی صحیح درخت */}
            <PermissionTree
              nodes={treeData}
              selectedIds={finalSelectedIds} // وضعیت تیک‌ها
              roleIds={rolePermIds} // وضعیت نقش (برای رنگ‌بندی)
              onToggle={handleTogglePermission} // تابع کلیک
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                انصراف
              </button>
              <button
                onClick={saveUserPermissions}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ذخیره
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedPage>
  );
}
