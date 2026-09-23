import { ConfigManager } from './config';

export class ApiClient {
  static getBaseUrl(): string {
    const config = ConfigManager.getConfig();
    return config.apiUrl.replace(/\/+$/, '');
  }

  static getHeaders(): Record<string, string> {
    const config = ConfigManager.getConfig();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }
    return headers;
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data as T;
  }

  static async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async listRooms(filter?: string) {
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return this.request(`/rooms${query}`);
  }

  static async getRoomDetails(roomId: string) {
    return this.request(`/rooms/${roomId}`);
  }

  static async listFiles(roomId: string) {
    return this.request(`/rooms/${roomId}/files`);
  }

  static async getFileContent(fileId: string) {
    return this.request(`/files/${fileId}/content`);
  }

  static async saveFileContent(fileId: string, content: string) {
    return this.request(`/files/${fileId}/content`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }
}
