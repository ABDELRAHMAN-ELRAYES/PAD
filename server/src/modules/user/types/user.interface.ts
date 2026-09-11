export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string;
  phone: string | null;
  password?: string;
  role: string;
  active: boolean;
  emailVerified: boolean;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  emailVerified: boolean;
  createdAt: Date;
}
