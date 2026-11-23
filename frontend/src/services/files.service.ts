import { api } from './api';

// Types for file operations
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: string;
  url?: string;
  downloadUrl?: string;
  viewUrl?: string;
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  lastUpload?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  file?: FileInfo;
  files?: FileInfo[];
}

export interface FileListResponse {
  success: boolean;
  files: FileInfo[];
  stats: FileStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface FileListParams {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
  sortBy?: 'name' | 'size' | 'lastModified';
  sortOrder?: 'asc' | 'desc';
}

class FilesService {
  private baseUrl = '/files';

  /**
   * Upload single file for a system
   */
  async uploadFile(systemSlug: string, file: File): Promise<UploadResponse> {
    try {
      console.log('📁 [FILES] Uploading file for system:', systemSlug, file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`${this.baseUrl}/${systemSlug}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('📁 [FILES] File uploaded successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files for a system
   */
  async uploadMultipleFiles(systemSlug: string, files: FileList | File[]): Promise<UploadResponse> {
    try {
      console.log('📁 [FILES] Uploading multiple files for system:', systemSlug, files.length);
      
      const formData = new FormData();
      Array.from(files).forEach((file, index) => {
        formData.append(`files`, file);
      });
      
      const response = await api.post(`${this.baseUrl}/${systemSlug}/upload-multiple`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('📁 [FILES] Multiple files uploaded successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to upload multiple files:', error);
      throw error;
    }
  }

  /**
   * List files for a system with filters
   */
  async listFiles(systemSlug: string, params?: FileListParams): Promise<FileListResponse> {
    try {
      console.log('📁 [FILES] Listing files for system:', systemSlug, params);
      
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const url = queryParams.toString() 
        ? `${this.baseUrl}/${systemSlug}?${queryParams}`
        : `${this.baseUrl}/${systemSlug}`;
      
      const response = await api.get(url);
      console.log('📁 [FILES] Files listed successfully:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Get directory statistics for a system
   */
  async getStats(systemSlug: string): Promise<FileStats> {
    try {
      console.log('📁 [FILES] Getting stats for system:', systemSlug);
      
      const response = await api.get(`${this.baseUrl}/${systemSlug}/stats`);
      console.log('📁 [FILES] Stats retrieved successfully:', response.data);
      
      return response.data.stats || response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(systemSlug: string, fileName: string): Promise<FileInfo> {
    try {
      console.log('📁 [FILES] Getting file info:', systemSlug, fileName);
      
      const response = await api.get(`${this.baseUrl}/${systemSlug}/${encodeURIComponent(fileName)}`);
      console.log('📁 [FILES] File info retrieved successfully:', response.data);
      
      return response.data.file || response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to get file info:', error);
      throw error;
    }
  }

  /**
   * Download file
   */
  async downloadFile(systemSlug: string, fileName: string): Promise<Blob> {
    try {
      console.log('📁 [FILES] Downloading file:', systemSlug, fileName);
      
      const response = await api.get(`${this.baseUrl}/${systemSlug}/${encodeURIComponent(fileName)}/download`, {
        responseType: 'blob',
      });
      
      console.log('📁 [FILES] File downloaded successfully');
      return response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to download file:', error);
      throw error;
    }
  }

  /**
   * Get file view URL for preview
   */
  getFileViewUrl(systemSlug: string, fileName: string): string {
    return `${api.defaults.baseURL}${this.baseUrl}/${systemSlug}/${encodeURIComponent(fileName)}/view`;
  }

  /**
   * Get file download URL
   */
  getFileDownloadUrl(systemSlug: string, fileName: string): string {
    return `${api.defaults.baseURL}${this.baseUrl}/${systemSlug}/${encodeURIComponent(fileName)}/download`;
  }

  /**
   * Delete single file
   */
  async deleteFile(systemSlug: string, fileName: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📁 [FILES] Deleting file:', systemSlug, fileName);
      
      const response = await api.delete(`${this.baseUrl}/${systemSlug}/${encodeURIComponent(fileName)}`);
      console.log('📁 [FILES] File deleted successfully:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files in batch
   */
  async batchDeleteFiles(systemSlug: string, fileNames: string[]): Promise<{ success: boolean; message: string; deleted: string[] }> {
    try {
      console.log('📁 [FILES] Batch deleting files:', systemSlug, fileNames);
      
      const response = await api.post(`${this.baseUrl}/${systemSlug}/batch-delete`, {
        files: fileNames
      });
      
      console.log('📁 [FILES] Files batch deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('📁 [FILES] Failed to batch delete files:', error);
      throw error;
    }
  }

  /**
   * Helper method to trigger file download in browser
   */
  async triggerDownload(systemSlug: string, fileName: string): Promise<void> {
    try {
      const blob = await this.downloadFile(systemSlug, fileName);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('📁 [FILES] File download triggered:', fileName);
    } catch (error) {
      console.error('📁 [FILES] Failed to trigger download:', error);
      throw error;
    }
  }
}

export const filesService = new FilesService();