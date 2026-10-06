export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  details?: any;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

const getApiBase = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  url = url.trim();
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
};

export const getFullFileUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const backendBase = API_BASE.replace(/\/api\/?$/, '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const downloadFileFromUrl = async (fileUrl: string, fileName: string): Promise<void> => {
  const fullUrl = getFullFileUrl(fileUrl);
  if (!fullUrl) throw new Error('File URL is not available');

  try {
    // 1. Fetch file as Blob to bypass browser cross-origin download restrictions and popup blockers
    const res = await fetch(fullUrl, { credentials: 'omit' });
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);
  } catch (err) {
    console.warn('Direct blob download failed, falling back to window navigation:', err);
    // Fallback: direct browser navigation if fetch is blocked
    let targetUrl = fullUrl;
    if (!targetUrl.includes('download=')) {
      targetUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}download=1`;
    }
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1500);
  }
};

export const API_BASE = getApiBase();

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('collabroom_access_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('collabroom_access_token', token);
      } else {
        localStorage.removeItem('collabroom_access_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('collabroom_access_token');
    }
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // If token expired (401), try refreshing token once
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            this.setToken(refreshData.data.accessToken);
            headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
            // Retry initial request
            const retryRes = await fetch(url, { ...options, headers, credentials: 'include' });
            return await retryRes.json();
          }
        } catch {
          this.setToken(null);
        }
      }

      const data = await response.json().catch(() => ({
        success: response.ok,
        message: response.statusText,
      }));

      if (!response.ok) {
        throw new Error(data.message || 'An unexpected error occurred');
      }

      if (data && data.data && typeof data.data === 'object') {
        if (typeof (data.data as any).downloadUrl === 'string') {
          (data.data as any).downloadUrl = getFullFileUrl((data.data as any).downloadUrl);
        }
        if (typeof (data.data as any).uploadUrl === 'string') {
          (data.data as any).uploadUrl = getFullFileUrl((data.data as any).uploadUrl);
        }
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  }

  // HTTP Method helpers
  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async uploadToSignedUrl(uploadUrl: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      const isLocalUpload = uploadUrl.includes('/api/storage/local-upload');
      const targetUrl = uploadUrl.startsWith('http')
        ? uploadUrl
        : `${API_BASE.replace(/\/api\/?$/, '')}${uploadUrl.startsWith('/') ? '' : '/'}${uploadUrl}`;
      
      if (isLocalUpload) {
        xhr.open('POST', targetUrl);
        xhr.withCredentials = true;
        const token = this.getToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      } else {
        xhr.open('PUT', uploadUrl);
      }

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed.message) errorMsg = parsed.message;
          } catch {}
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));

      if (isLocalUpload) {
        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      } else {
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      }
    });
  }
}

export const api = new ApiClient();
