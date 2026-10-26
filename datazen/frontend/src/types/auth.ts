export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  token?: string;
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  token?: string;
  accessToken: string;
}
