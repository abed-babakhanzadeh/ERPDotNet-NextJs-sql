export interface ProcessDto {
  id: number;
  processCode: string;
  title: string;
  targetEntityName: string;
  isActive: boolean;
  activeVersionId: number;
  activeVersionNumber: number;
}

export interface StateDto {
  id: number;
  title: string;
  stateCode: string;
  type: number; // 1: Start, 2: Intermediate, 3: End
  /** مهلت انجام (ساعت) و نقش ارجاع پس از سررسید */
  slaHours?: number | null;
  escalationRoleId?: string | null;
  escalationRoleName?: string | null;
}

export interface TransitionDto {
  id: number;
  fromStateId: number;
  fromStateTitle: string;
  toStateId: number;
  toStateTitle: string;
  actionTitle: string;
  actionCode?: string;
  isActive: boolean;
  buttonVariant: string;
  /** نقش‌های مجاز؛ خالی یعنی همه کاربران */
  roles: WorkflowRoleDto[];
}

export interface WorkflowRoleDto {
  id: string;
  name: string;
}

export interface ProcessDetailsDto extends ProcessDto {
  states: StateDto[];
  transitions: TransitionDto[];
}
