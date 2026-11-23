import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Download, Eye, Trash2, Search, Filter, RefreshCw, File, FolderOpen, Plus } from 'lucide-react';
import { filesService, type FileInfo, type FileStats, type FileListParams } from '../services/files.service';
import { useToast } from '../contexts/ToastContext';

interface KnowledgeBaseProps {
  systemSlug: string;
  systemName: string;
}

export default function KnowledgeBase({ systemSlug, systemName }: KnowledgeBaseProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'lastModified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { showToast } = useToast();

  // Load files and stats
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📁 [KNOWLEDGE-BASE] Loading files for system:', systemSlug);

      const params: FileListParams = {
        page: 1,
        limit: 50,
        sortBy,
        sortOrder,
      };

      if (searchTerm) params.search = searchTerm;
      if (fileTypeFilter) params.type = fileTypeFilter;

      const [filesResponse, statsResponse] = await Promise.all([
        filesService.listFiles(systemSlug, params),
        filesService.getStats(systemSlug)
      ]);

      setFiles(filesResponse.files || []);
      setStats(statsResponse);
      
      console.log('📁 [KNOWLEDGE-BASE] Files loaded:', filesResponse.files?.length || 0);
    } catch (error: any) {
      console.error('📁 [KNOWLEDGE-BASE] Failed to load files:', error);
      showToast(`Error loading files: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [systemSlug, searchTerm, fileTypeFilter, sortBy, sortOrder, showToast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      console.log('📁 [KNOWLEDGE-BASE] Uploading files:', files.length);

      if (files.length === 1) {
        await filesService.uploadFile(systemSlug, files[0]);
        showToast(`File "${files[0].name}" uploaded successfully!`, 'success');
      } else {
        await filesService.uploadMultipleFiles(systemSlug, files);
        showToast(`${files.length} files uploaded successfully!`, 'success');
      }

      // Reset input and reload files
      event.target.value = '';
      await loadFiles();
    } catch (error: any) {
      console.error('📁 [KNOWLEDGE-BASE] Upload failed:', error);
      showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Handle file download
  const handleDownload = async (fileName: string) => {
    try {
      console.log('📁 [KNOWLEDGE-BASE] Downloading file:', fileName);
      await filesService.triggerDownload(systemSlug, fileName);
      showToast(`Downloading ${fileName}...`, 'success');
    } catch (error: any) {
      console.error('📁 [KNOWLEDGE-BASE] Download failed:', error);
      showToast(`Download failed: ${error.message}`, 'error');
    }
  };

  // Handle file view
  const handleView = (fileName: string) => {
    const viewUrl = filesService.getFileViewUrl(systemSlug, fileName);
    window.open(viewUrl, '_blank');
  };

  // Handle file deletion
  const handleDelete = async (fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      console.log('📁 [KNOWLEDGE-BASE] Deleting file:', fileName);
      await filesService.deleteFile(systemSlug, fileName);
      showToast(`File "${fileName}" deleted successfully!`, 'success');
      await loadFiles();
    } catch (error: any) {
      console.error('📁 [KNOWLEDGE-BASE] Delete failed:', error);
      showToast(`Delete failed: ${error.message}`, 'error');
    }
  };

  // Handle batch deletion
  const handleBatchDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.length} files?`)) return;

    try {
      console.log('📁 [KNOWLEDGE-BASE] Batch deleting files:', selectedFiles);
      await filesService.batchDeleteFiles(systemSlug, selectedFiles);
      showToast(`${selectedFiles.length} files deleted successfully!`, 'success');
      setSelectedFiles([]);
      await loadFiles();
    } catch (error: any) {
      console.error('📁 [KNOWLEDGE-BASE] Batch delete failed:', error);
      showToast(`Batch delete failed: ${error.message}`, 'error');
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(name => name !== fileName)
        : [...prev, fileName]
    );
  };

  // Select all files
  const toggleSelectAll = () => {
    setSelectedFiles(
      selectedFiles.length === files.length 
        ? [] 
        : files.map(file => file.name)
    );
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Get file type icon
  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'mp3':
      case 'wav':
        return '🎵';
      case 'zip':
      case 'rar':
        return '📦';
      case 'txt':
        return '📄';
      default:
        return '📁';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">
            Knowledge Base - {systemName}
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Upload Button */}
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Files'}
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {/* Refresh Button */}
          <button
            onClick={loadFiles}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.totalFiles}</div>
            <div className="text-sm text-gray-400">Total Files</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{formatFileSize(stats.totalSize)}</div>
            <div className="text-sm text-gray-400">Total Size</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {Object.keys(stats.fileTypes).length}
            </div>
            <div className="text-sm text-gray-400">File Types</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={fileTypeFilter}
          onChange={(e) => setFileTypeFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {stats && Object.keys(stats.fileTypes).map(type => (
            <option key={type} value={type}>{type.toUpperCase()}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'lastModified')}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">Sort by Name</option>
          <option value="size">Sort by Size</option>
          <option value="lastModified">Sort by Date</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {/* Batch Actions */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
          <span className="text-blue-400">{selectedFiles.length} files selected</span>
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedFiles([])}
            className="px-3 py-1 text-gray-400 hover:text-white transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-700 rounded-lg text-sm font-medium text-gray-300">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedFiles.length === files.length && files.length > 0}
              onChange={toggleSelectAll}
              className="rounded"
            />
          </div>
          <div className="col-span-1">Type</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Modified</div>
          <div className="col-span-2">Actions</div>
        </div>

        {/* Files */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-gray-400">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <File className="w-12 h-12 mx-auto mb-2 text-gray-500" />
            <p className="text-gray-400 mb-2">No files found</p>
            <p className="text-sm text-gray-500">Upload your first file to get started</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.name}
              className="grid grid-cols-12 gap-4 p-3 bg-gray-750 hover:bg-gray-700 rounded-lg transition-colors items-center"
            >
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.name)}
                  onChange={() => toggleFileSelection(file.name)}
                  className="rounded"
                />
              </div>
              
              <div className="col-span-1 text-2xl">
                {getFileTypeIcon(file.name)}
              </div>
              
              <div className="col-span-4">
                <div className="text-white font-medium truncate" title={file.name}>
                  {file.name}
                </div>
                <div className="text-xs text-gray-400">{file.type}</div>
              </div>
              
              <div className="col-span-2 text-gray-300">
                {formatFileSize(file.size)}
              </div>
              
              <div className="col-span-2 text-gray-300 text-sm">
                {formatDate(file.lastModified)}
              </div>
              
              <div className="col-span-2 flex items-center gap-2">
                <button
                  onClick={() => handleView(file.name)}
                  className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                  title="View file"
                >
                  <Eye className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleDownload(file.name)}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleDelete(file.name)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}