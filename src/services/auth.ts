import { apiClient } from './api';
import type { LoginRequest, LoginResponse, RegisterRequest, User, UserUpdate } from '../types/api';

const AUTH_TOKEN_KEY = 'access_token';

export const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);

    // Store token in localStorage
    if (response.access_token) {
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
    }

    return response;
  },

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<User> {
    return apiClient.post<User>('/auth/register', data);
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },

  /**
   * Update current user profile
   */
  async updateUser(data: UserUpdate): Promise<User> {
    return apiClient.patch<User>('/auth/me', data);
  },

  /**
   * Logout - clear token and redirect
   */
  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = '/login';
  },

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  /**
   * Set token manually (useful for testing)
   */
  setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },
};
