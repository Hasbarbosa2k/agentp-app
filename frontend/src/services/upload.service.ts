import { api } from './api';
import axios from 'axios';

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: string;
    description?: string;
  };
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  description?: string;
  slug: string;
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  lastUpload: string;
}

export interface FileListResponse {
  success: boolean;
  data: {
    files: FileInfo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export class UploadService {
  private baseUrl = '/files';

  /**
   * Upload de ficheiro único
   */
  async uploadFile(file: File, slug: string, description?: string): Promise<UploadResponse> {
    try {
      console.log('📤 [UPLOAD] Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        slug: slug
      });

      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      // Debug: verificar o que está sendo enviado
      console.log('📋 [UPLOAD] FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      const uploadUrl = `${this.baseUrl}/${slug}/upload`;
      console.log('🌐 [UPLOAD] Making request to:', uploadUrl);
      console.log('🌐 [UPLOAD] Full URL will be:', `${api.defaults.baseURL}${uploadUrl}`);
      
      // Para uploads, usar axios diretamente para evitar problemas com FormData
      const token = localStorage.getItem('auth_token');
      const headers: any = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Usar axios diretamente para evitar interceptors que podem interferir com FormData
      const response = await axios.post(`${api.defaults.baseURL}${uploadUrl}`, formData, {
        headers,
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('📤 [UPLOAD] Progress:', progress + '%');
          }
        },
      } as any);

      console.log('✅ [UPLOAD] File uploaded successfully:', response.data);
      return (response.data as any) as UploadResponse;
    } catch (error: any) {
      console.error('❌ [UPLOAD] File upload failed:', error);
      
      // Log detalhado do erro
      if (error.response) {
        console.error('📋 [UPLOAD] Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('📋 [UPLOAD] No response received:', error.request);
      } else {
        console.error('📋 [UPLOAD] Error setting up request:', error.message);
      }
      
      throw error;
    }
  }

  /**
   * Upload múltiplo de ficheiros
   */
  async uploadMultipleFiles(files: File[], slug: string): Promise<UploadResponse[]> {
    try {
      console.log('📤 [UPLOAD-MULTIPLE] Starting multiple file upload:', {
        fileCount: files.length,
        slug: slug
      });

      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });

      const response = await api.post(`${this.baseUrl}/${slug}/upload-multiple`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ [UPLOAD-MULTIPLE] Files uploaded successfully:', response.data);
      return (response.data as any).data as UploadResponse[];
    } catch (error) {
      console.error('❌ [UPLOAD-MULTIPLE] Multiple file upload failed:', error);
      throw error;
    }
  }

  /**
   * Listar ficheiros com filtros
   */
  async listFiles(slug: string, options?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FileListResponse> {
    try {
      console.log('📋 [FILES] Listing files for slug:', slug, 'with options:', options);

      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.type) params.append('type', options.type);
      if (options?.search) params.append('search', options.search);
      if (options?.sortBy) params.append('sortBy', options.sortBy);
      if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await api.get(`${this.baseUrl}/${slug}?${params.toString()}`);
      console.log('✅ [FILES] Files listed successfully:', response.data);
      return (response.data as any) as FileListResponse;
    } catch (error) {
      console.error('❌ [FILES] Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas do diretório
   */
  async getFileStats(slug: string): Promise<FileStats> {
    try {
      console.log('📊 [FILES-STATS] Getting file stats for slug:', slug);

      const response = await api.get(`${this.baseUrl}/${slug}/stats`);
      console.log('✅ [FILES-STATS] File stats retrieved:', response.data);
      return (response.data as any).data as FileStats;
    } catch (error) {
      console.error('❌ [FILES-STATS] Failed to get file stats:', error);
      throw error;
    }
  }

  /**
   * Obter informações de um ficheiro específico
   */
  async getFileInfo(slug: string, fileName: string): Promise<FileInfo> {
    try {
      console.log('📄 [FILE-INFO] Getting file info:', { slug, fileName });

      const response = await api.get(`${this.baseUrl}/${slug}/${fileName}`);
      console.log('✅ [FILE-INFO] File info retrieved:', response.data);
      return (response.data as any).data as FileInfo;
    } catch (error) {
      console.error('❌ [FILE-INFO] Failed to get file info:', error);
      throw error;
    }
  }

  /**
   * Download de ficheiro
   */
  async downloadFile(slug: string, fileName: string): Promise<Blob> {
    try {
      console.log('⬇️ [FILE-DOWNLOAD] Downloading file:', { slug, fileName });

      const response = await api.get(`${this.baseUrl}/${slug}/${fileName}/download`, {
        responseType: 'blob',
      });

      console.log('✅ [FILE-DOWNLOAD] File downloaded successfully');
      return response.data as Blob;
    } catch (error) {
      console.error('❌ [FILE-DOWNLOAD] Failed to download file:', error);
      throw error;
    }
  }

  /**
   * Visualizar ficheiro (para texto e imagens)
   */
  async viewFile(slug: string, fileName: string): Promise<string> {
    try {
      console.log('👁️ [FILE-VIEW] Viewing file:', { slug, fileName });

      const response = await api.get(`${this.baseUrl}/${slug}/${fileName}/view`);
      console.log('✅ [FILE-VIEW] File content retrieved');
      return (response.data as any).data.content;
    } catch (error) {
      console.error('❌ [FILE-VIEW] Failed to view file:', error);
      throw error;
    }
  }

  /**
   * Remover ficheiro
   */
  async deleteFile(slug: string, fileName: string): Promise<void> {
    try {
      console.log('🗑️ [FILE-DELETE] Deleting file:', { slug, fileName });

      await api.delete(`${this.baseUrl}/${slug}/${fileName}`);
      console.log('✅ [FILE-DELETE] File deleted successfully');
    } catch (error) {
      console.error('❌ [FILE-DELETE] Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Remoção em lote
   */
  async batchDeleteFiles(slug: string, fileNames: string[]): Promise<void> {
    try {
      console.log('🗑️ [FILE-BATCH-DELETE] Batch deleting files:', { slug, fileNames });

      await api.post(`${this.baseUrl}/${slug}/batch-delete`, {
        files: fileNames
      });
      console.log('✅ [FILE-BATCH-DELETE] Files deleted successfully');
    } catch (error) {
      console.error('❌ [FILE-BATCH-DELETE] Failed to batch delete files:', error);
      throw error;
    }
  }
}

export const uploadService = new UploadService(); 