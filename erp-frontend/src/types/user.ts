export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  personnelCode: string;
  isActive: boolean;
  createdAt: string;
  concurrencyStamp?: string;
}
