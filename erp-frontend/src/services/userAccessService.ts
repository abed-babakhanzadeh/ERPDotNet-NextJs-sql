import apiClient, { TOKEN_STORAGE_KEY } from "@/lib/api/client";
import type {
  ChangeOwnPasswordDto,
  ChangePasswordDto,
  CopyUserPermissionsCommand,
  CreateUserCommand,
  LoginCommand,
  PagedQuery,
  Paged,
  PermissionNode,
  RoleDto,
  UpdateRolePermissionsCommand,
  UpdateUserCommand,
  UpdateUserPermissionsCommand,
  UserDto,
  UserPermissionDetailDto,
  UserProfileDto,
} from "@/types/api";

export const authService = {
  /** ورود و ذخیره توکن */
  login: async (command: LoginCommand) => {
    const { data } = await apiClient.post<{ token: string }>("/Auth/login", command);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    return data.token;
  },

  logout: () => localStorage.removeItem(TOKEN_STORAGE_KEY),

  getProfile: async () => (await apiClient.get<UserProfileDto>("/Auth/profile")).data,

  changeOwnPassword: async (dto: ChangeOwnPasswordDto) => {
    await apiClient.post("/Auth/change-password", dto);
  },
};

export const userService = {
  search: async (query: PagedQuery, signal?: AbortSignal) =>
    (await apiClient.post<Paged<UserDto>>("/Users/search", query, { signal })).data,

  getById: async (id: string) => (await apiClient.get<UserDto>(`/Users/${id}`)).data,

  /** شناسه کاربر جدید */
  create: async (command: CreateUserCommand) =>
    (await apiClient.post<{ id: string }>("/Users", command)).data.id,

  update: async (id: string, command: UpdateUserCommand) => {
    await apiClient.put(`/Users/${id}`, command);
  },

  remove: async (id: string) => {
    await apiClient.delete(`/Users/${id}`);
  },

  changePassword: async (id: string, dto: ChangePasswordDto) => {
    await apiClient.post(`/Users/${id}/change-password`, dto);
  },
};

export const roleService = {
  getAll: async () => (await apiClient.get<RoleDto[]>("/Roles")).data,

  create: async (name: string) => {
    await apiClient.post("/Roles", { name });
  },

  remove: async (id: string) => {
    await apiClient.delete(`/Roles/${id}`);
  },
};

export const permissionService = {
  /** نام مجوزهای کاربر جاری */
  getMine: async () => (await apiClient.get<string[]>("/Permissions/mine")).data,

  getTree: async () => (await apiClient.get<PermissionNode[]>("/Permissions/tree")).data,

  getRolePermissionIds: async (roleId: string) =>
    (await apiClient.get<number[]>(`/Permissions/role/${roleId}`)).data,

  getUserDetail: async (userId: string) =>
    (await apiClient.get<UserPermissionDetailDto>(`/Permissions/user-detail/${userId}`)).data,

  assignToRole: async (command: UpdateRolePermissionsCommand) => {
    await apiClient.post("/Permissions/assign-role", command);
  },

  assignToUser: async (command: UpdateUserPermissionsCommand) => {
    await apiClient.post("/Permissions/assign-user", command);
  },

  copy: async (command: CopyUserPermissionsCommand) => {
    await apiClient.post("/Permissions/copy", command);
  },
};
