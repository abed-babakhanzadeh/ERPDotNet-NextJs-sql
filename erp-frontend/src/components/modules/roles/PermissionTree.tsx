"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import IndeterminateCheckbox from "@/components/ui/IndeterminateCheckbox";

interface PermissionNode {
  id: number;
  title: string;
  children: PermissionNode[];
}

interface TreeProps {
  nodes: PermissionNode[];
  selectedIds: number[];
  roleIds?: number[]; // اگر این نال باشد یعنی حالت ساده
  onToggle: (id: number, checked: boolean, childrenIds: number[]) => void;
}

const getAllChildIds = (node: PermissionNode): number[] => {
  let ids: number[] = [];
  if (node.children) {
    node.children.forEach(child => {
      ids.push(child.id);
      ids = [...ids, ...getAllChildIds(child)];
    });
  }
  return ids;
};

const TreeNode = ({ node, selectedIds, roleIds, onToggle }: { node: PermissionNode } & Omit<TreeProps, 'nodes'>) => {
  const [isOpen, setIsOpen] = useState(true);
  const allChildIds = getAllChildIds(node);
  const hasChildren = allChildIds.length > 0;

  // 1. محاسبه وضعیت تیک
  const selectedChildrenCount = allChildIds.filter(id => selectedIds.includes(id)).length;
  const areAllChildrenSelected = hasChildren && selectedChildrenCount === allChildIds.length;
  const areSomeChildrenSelected = hasChildren && selectedChildrenCount > 0 && !areAllChildrenSelected;

  const isChecked = hasChildren ? areAllChildrenSelected : selectedIds.includes(node.id);
  const isIndeterminate = areSomeChildrenSelected;

  // 2. لاجیک رنگ‌بندی (اصلاح شده)
  // آیا در حالت مقایسه هستیم؟ (یعنی آیا roleIds پاس داده شده؟)
  const isCompareMode = roleIds !== undefined && roleIds.length > 0;

  let colorClass = "text-foreground";
  let checkboxClass = "text-primary border-border focus:ring-ring";
  let statusLabel = null;

  if (isCompareMode) {
    const isInRole = roleIds!.includes(node.id);
    const isSelectedInFinal = selectedIds.includes(node.id);

    if (isInRole && !isSelectedInFinal) {
      // محرومیت (Deny)
      colorClass = "text-destructive line-through decoration-destructive";
      checkboxClass = "border-destructive bg-destructive/10 focus:ring-destructive";
      statusLabel = <span className="text-[10px] bg-destructive/15 text-destructive px-1 rounded mr-2">لغو شده</span>;
    } 
    else if (!isInRole && isSelectedInFinal) {
      // ویژه (Grant)
      colorClass = "text-success font-medium";
      checkboxClass = "text-success border-success focus:ring-success";
      statusLabel = <span className="text-[10px] bg-success/15 text-success px-1 rounded mr-2">ویژه</span>;
    }
    else if (isInRole && isSelectedInFinal) {
      // ارث‌بری عادی
      colorClass = "text-muted-foreground";
      checkboxClass = "text-muted-foreground border-border focus:ring-ring";
    }
  }

  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(node.id, e.target.checked, allChildIds);
  };

  return (
    <div className="mr-4 border-r border-border pr-4">
      <div className="flex items-center gap-2 py-1">
        {hasChildren ? (
          <button onClick={() => setIsOpen(!isOpen)} className="text-muted-foreground hover:text-primary">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none hover:bg-muted rounded px-1 flex-1">
          <IndeterminateCheckbox 
            checked={isChecked}
            indeterminate={isIndeterminate}
            onChange={handleCheck}
            className={checkboxClass}
          />
          <span className={clsx("text-sm transition-colors", colorClass)}>
            {node.title}
          </span>
          {!hasChildren && statusLabel}
        </label>
      </div>

      {isOpen && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode 
              key={child.id} 
              node={child} 
              selectedIds={selectedIds} 
              roleIds={roleIds} 
              onToggle={onToggle} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function PermissionTree({ nodes, selectedIds, roleIds, onToggle }: TreeProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
      {nodes.map((node) => (
        <TreeNode 
            key={node.id} 
            node={node} 
            selectedIds={selectedIds} 
            roleIds={roleIds} 
            onToggle={onToggle} 
        />
      ))}
    </div>
  );
}