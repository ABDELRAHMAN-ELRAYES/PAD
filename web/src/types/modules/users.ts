export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  avatar?: string;
  privileges?: string[];
  allowedTabs?: string[];
  createdAt: string;
}
