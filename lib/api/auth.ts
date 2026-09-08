import { apiClient, setStoredToken, removeStoredToken } from "./client";
import type {
  AppUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/types";

export const authApi = {
  /**
   * Login user and store the token
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>("/api/auth/login", data);
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  /**
   * Register a new user
   */
  register(data: RegisterRequest): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>("/api/auth/register", data);
  },

  /**
   * Get current authenticated user profile
   */
  getMe(): Promise<AppUser> {
    return apiClient.get<AppUser>("/api/auth/me");
  },

  /**
   * Logout user by clearing local token
   */
  logout(): void {
    removeStoredToken();
  },
};
