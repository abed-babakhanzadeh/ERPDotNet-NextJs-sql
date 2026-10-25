"use client";

import { useEffect, useState } from "react";
import PermissionTree from "@/components/modules/roles/PermissionTree";
import { toast } from "sonner";
import { Save, Shield, Plus, Trash2, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ProtectedPage from "@/components/ui/ProtectedPage";
import { handleApiError } from "@/lib/error-handling";
import { roleService, permissionService } from "@/services/userAccessService";
import { useConfirm } from "@/providers/ConfirmProvider";

// DTO
interface Role {
  id: string;
  name: string;
}

// تابع کمکی برای پیدا کردن تمام فرزندان یک نود خاص از داخل کل درخت
const findNodeAndGetChildrenIds = (nodes: any[], targetId: number): number[] => {
  for (const node of nodes) {
    if (node.id === targetId) {
      // اگر نود را پیدا کردیم، تمام فرزندانش را جمع کن
      return getAllChildren(node);
    }
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

// تابع کمکی جدید: پیدا کردن پدر یک نود
  const findParentId = (nodes: any[], childId: number, parentId: number | null = null): number | null => {
    for (const node of nodes) {
      if (node.id === childId) return parentId;
      if (node.children) {
        const found = findParentId(node.children, childId, node.id);
        if (found) return found;
      }
    }
    return null;
  };

  // تابع کمکی جدید: گرفتن نود با آیدی
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




export default function RolesPage() {
  const confirm = useConfirm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false); // لودینگ کلی
  const [saveLoading, setSaveLoading] = useState(false); // لودینگ ذخیره دسترسی
  // برای مودال ساخت نقش
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // دریافت اولیه دیتا
  const fetchRoles = async () => {
    try {
      setRoles(await roleService.getAll());
    } catch (err) {
      handleApiError(err, "خطا در دریافت لیست نقش‌ها");
    }
  };

  // دریافت اولیه دیتا
  useEffect(() => {
      const init = async () => {
        setLoading(true);
        await fetchRoles();
        try {
          setTreeData(await permissionService.getTree());
        } catch (error) {
          handleApiError(error, "خطا در دریافت درخت دسترسی‌ها");
        }
        setLoading(false);
      };
      init();
    }, []);

// انتخاب نقش
  const handleRoleSelect = async (roleId: string) => {
    setSelectedRole(roleId);
    try {
      setSelectedPermIds(await permissionService.getRolePermissionIds(roleId));
    } catch (error) {
      handleApiError(error, "خطا در دریافت دسترسی‌ها");
    }
  };




  // === لاجیک اصلی و اصلاح شده ===
  const handleToggle = (targetId: number, checked: boolean) => {
    const childrenIds = findNodeAndGetChildrenIds(treeData, targetId);
    const idsToUpdate = [targetId, ...childrenIds];

    setSelectedPermIds(prev => {
      const newSet = new Set(prev);

      // 1. اعمال تغییر روی خود نود و فرزندانش (Downstream)
      if (checked) {
        idsToUpdate.forEach(id => newSet.add(id));
      } else {
        idsToUpdate.forEach(id => newSet.delete(id));
      }

      // 2. بررسی وضعیت پدر (Upstream Check)
      // آیا این نود پدری دارد؟
      const parentId = findParentId(treeData, targetId);
      
      if (parentId) {
        // پدر را پیدا کن
        const parentNode = findNodeById(treeData, parentId);
        if (parentNode) {
          // تمام فرزندان پدر را پیدا کن
          const allSiblingIds = parentNode.children.map((c: any) => c.id);
          
          // چک کن آیا الان تمام فرزندان در لیست انتخاب شده‌ها هستند؟
          // (نکته: newSet وضعیت جدید را دارد)
          const areAllSiblingsSelected = allSiblingIds.every((id: number) => newSet.has(id));

          if (areAllSiblingsSelected) {
            // اگر همه فرزندان تیک دارند، پدر را هم اضافه کن
            newSet.add(parentId);
          } else {
            // اگر حتی یکی کم است، پدر را حذف کن
            newSet.delete(parentId);
          }
        }
      }

      return Array.from(newSet);
    });
  };

// ذخیره دسترسی‌ها
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaveLoading(true);
    try {
      await permissionService.assignToRole({
        roleId: selectedRole,
        permissionIds: selectedPermIds,
      });
      toast.success("دسترسی‌ها ذخیره شد");
    } catch (err) {
      handleApiError(err, "خطا در ذخیره");
    } finally {
      setSaveLoading(false);
    }
  };

  // ایجاد نقش جدید
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      await roleService.create(newRoleName);
      toast.success("نقش جدید ایجاد شد");
      setNewRoleName("");
      setIsModalOpen(false);
      fetchRoles(); // رفرش لیست
    } catch (error: any) {
      handleApiError(error, "خطا در ایجاد نقش");
    }
  };

  // حذف نقش
  const handleDeleteRole = async (e: React.MouseEvent, role: Role) => {
    e.stopPropagation(); // جلوگیری از انتخاب شدن نقش موقع کلیک روی حذف
    if (!(await confirm({ title: `آیا از حذف نقش "${role.name}" اطمینان دارید؟`, tone: "danger", confirmText: "حذف" }))) return;

    try {
      await roleService.remove(role.id);
      toast.success("نقش حذف شد");
      if (selectedRole === role.id) {
        setSelectedRole(null);
        setSelectedPermIds([]);
      }
      fetchRoles();
    } catch (error: any) {
      handleApiError(error, "خطا در حذف نقش");
    }
  };


return (
  <ProtectedPage permission="UserAccess.Roles">
    <div className="page-content space-y-6">
      <div className="page-header flex items-center justify-between rounded-xl p-4">
        <h1 className="text-2xl font-bold text-foreground">مدیریت دسترسی نقش‌ها</h1>
        {selectedRole && (
          <button 
            onClick={handleSavePermissions} 
            disabled={saveLoading}
            className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-success-foreground hover:bg-success/90 disabled:opacity-50 transition-all duration-200"
          >
            <Save size={18} />
            {saveLoading ? "در حال ذخیره..." : "ذخیره تغییرات دسترسی"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        
        {/* ستون لیست نقش‌ها */}
          <div className="md:col-span-1 flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 h-fit shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Shield size={18} />
                نقش‌ها
              </h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors" 
                title="افزودن نقش جدید"
              >
                <Plus size={20} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-4 text-muted-foreground"><Loader2 className="animate-spin mx-auto"/></div>
            ) : (
              <ul className="space-y-1 max-h-[400px] overflow-y-auto">
                {roles.map(role => (
                  <li key={role.id} className="relative group">
                    <button
                      onClick={() => handleRoleSelect(role.id)}
                      className={`w-full rounded-lg px-3 py-2 text-right text-sm transition-all flex justify-between items-center ${
                        selectedRole === role.id ? "bg-primary/10 text-primary font-semibold shadow-sm" : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{role.name}</span>
                    </button>
                    
                    {/* دکمه حذف (فقط برای نقش‌های غیر سیستمی نمایش داده شود بهتر است، ولی بک‌‌اند هم جلویش را می‌گیرد) */}
                    {role.name !== 'Admin' && role.name !== 'User' && (
                      <button
                        onClick={(e) => handleDeleteRole(e, role)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all"
                        title="حذف نقش"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ستون درخت */}
        <div className="md:col-span-3">
          {selectedRole ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <PermissionTree 
              nodes={treeData} 
              selectedIds={selectedPermIds} 
              onToggle={handleToggle} 
              // roleIds را اینجا ننویسید!
            />
          </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-muted-foreground">
              یک نقش را انتخاب کنید تا دسترسی‌های آن نمایش داده شود
            </div>
          )}
        </div>
      </div>

      {/* مودال ساخت نقش */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تعریف نقش جدید">
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">عنوان نقش</label>
            <input 
              required
              autoFocus
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="مثال: مدیر فروش"
              className="w-full rounded-lg border border-border bg-card text-foreground p-2 outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">انصراف</button>
            <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">ذخیره</button>
          </div>
        </form>
      </Modal>
    </div>
  </ProtectedPage>
  );
}