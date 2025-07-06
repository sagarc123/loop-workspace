import React, { useState, useEffect, useRef } from 'react';
import { 
  CloudArrowUpIcon, 
  FolderIcon, 
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const FileManager = ({ teamId, userId }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'size'
  
  const fileInputRef = useRef(null);
  const { userProfile } = useAuthStore();

  useEffect(() => {
    if (teamId || userId) {
      fetchFiles();
    }
  }, [teamId, userId]);

  // Convert file to base64 with compression
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Compress image files
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Split base64 string into chunks
  const splitBase64IntoChunks = (base64String, chunkSize = 500000) => {
    const chunks = [];
    for (let i = 0; i < base64String.length; i += chunkSize) {
      chunks.push(base64String.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Store file in chunks
  const storeFileInChunks = async (file, base64Data, fileId) => {
    const chunks = splitBase64IntoChunks(base64Data);
    const chunkPromises = chunks.map((chunk, index) => {
      return addDoc(collection(db, 'fileChunks'), {
        fileId: fileId,
        chunkIndex: index,
        data: chunk,
        totalChunks: chunks.length,
        createdAt: serverTimestamp()
      });
    });

    await Promise.all(chunkPromises);
    return chunks.length;
  };

  // Retrieve file chunks and reconstruct
  const retrieveFileChunks = async (fileId) => {
    const chunksRef = collection(db, 'fileChunks');
    const q = query(chunksRef, where('fileId', '==', fileId), orderBy('chunkIndex'));
    const querySnapshot = await getDocs(q);
    
    const chunks = [];
    querySnapshot.forEach((doc) => {
      chunks[doc.data().chunkIndex] = doc.data().data;
    });
    
    return chunks.join('');
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      let filesData = [];
      if (teamId) {
        const filesRef = collection(db, 'teams', teamId, 'files');
        const q = query(filesRef, orderBy('uploadedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        filesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else if (userId) {
        // Fetch direct files shared between current user and userId
        const filesRef = collection(db, 'directFiles');
        const q = query(
          filesRef,
          where('participants', 'array-contains', userProfile.uid),
          orderBy('uploadedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        // Only show files where both users are participants
        filesData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(file => file.participants && file.participants.includes(userId));
      }
      setFiles(filesData);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log('Selected files:', selectedFiles);
    console.log('TeamId:', teamId, 'UserId:', userId);
    console.log('UserProfile:', userProfile);
    
    if (selectedFiles.length === 0) return;
    if (!userProfile?.uid) {
      toast.error('User not authenticated');
      return;
    }
    
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        console.log('Processing file:', file.name, 'Size:', file.size);

        try {
          // Compress image files if needed
          let processedFile = file;
          if (file.type.startsWith('image/')) {
            console.log('Compressing image file...');
            processedFile = await compressImage(file);
            console.log('Image compressed, new size:', processedFile.size);
          }

          // Convert file to base64
          console.log('Converting file to base64...');
          const base64Data = await fileToBase64(processedFile);
          console.log('File converted to base64 successfully');
          
          // Store file metadata first
          let fileDocRef;
          if (teamId) {
            fileDocRef = await addDoc(collection(db, 'teams', teamId, 'files'), {
              name: file.name,
              size: processedFile.size,
              type: file.type,
              uploadedBy: userProfile.uid,
              uploadedByName: userProfile.name,
              uploadedAt: serverTimestamp(),
              storageType: 'chunked', // Mark as chunked storage
              sharedWith: { type: 'team', id: teamId },
              chunks: true // Indicate this file is stored in chunks
            });
          } else if (userId) {
            fileDocRef = await addDoc(collection(db, 'directFiles'), {
              name: file.name,
              size: processedFile.size,
              type: file.type,
              uploadedBy: userProfile.uid,
              uploadedByName: userProfile.name,
              uploadedAt: serverTimestamp(),
              storageType: 'chunked',
              sharedWith: { type: 'user', id: userId },
              participants: [userProfile.uid, userId].sort(),
              chunks: true
            });
          }

          // Store file data in chunks
          console.log('Storing file in chunks...');
          const numChunks = await storeFileInChunks(processedFile, base64Data, fileDocRef.id);
          console.log(`File stored in ${numChunks} chunks`);

          // Update file metadata with chunk count
          await updateDoc(fileDocRef, {
            chunkCount: numChunks
          });

          console.log('File stored successfully:', file.name, 'Doc ID:', fileDocRef.id);
          
          // Send notification for direct files
          if (userId) {
            await addDoc(collection(db, 'notifications'), {
              recipientId: userId,
              type: 'file_shared',
              title: `New file from ${userProfile.name}`,
              message: `${userProfile.name} shared a file: ${file.name}`,
              fileId: fileDocRef.id,
              createdAt: serverTimestamp(),
              read: false
            });
          }
        } catch (uploadError) {
          console.error('Error during file upload process:', uploadError);
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }
      }
      toast.success('Files uploaded successfully!');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(`Failed to upload files: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    console.log('Deleting file:', file);
    console.log('TeamId:', teamId, 'UserId:', userId);

    try {
      // Delete file chunks first
      if (file.chunks) {
        const chunksRef = collection(db, 'fileChunks');
        const q = query(chunksRef, where('fileId', '==', file.id));
        const querySnapshot = await getDocs(q);
        
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log('File chunks deleted successfully');
      }

      // Delete from Firestore
      if (teamId) {
        console.log('Deleting from team files collection');
        await deleteDoc(doc(db, 'teams', teamId, 'files', file.id));
        console.log('File deleted from team files collection');
      } else if (userId) {
        console.log('Deleting from direct files collection');
        await deleteDoc(doc(db, 'directFiles', file.id));
        console.log('File deleted from direct files collection');
      } else {
        console.error('No teamId or userId provided for deletion');
        toast.error('Unable to determine file location for deletion');
        return;
      }

      toast.success('File deleted successfully');
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(`Failed to delete file: ${error.message}`);
    }
  };

  const handleFileDownload = async (file) => {
    try {
      if (file.chunks) {
        // For chunked files, retrieve and reconstruct
        console.log('Retrieving file chunks...');
        const base64Data = await retrieveFileChunks(file.id);
        console.log('File chunks retrieved successfully');
        
        // Convert base64 to blob
        const response = await fetch(base64Data);
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('File downloaded successfully');
      } else if (file.data) {
        // For old single-chunk files
        const response = await fetch(file.data);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('File downloaded successfully');
      } else if (file.url) {
        // Fallback for old files that might still have URLs
        const response = await fetch(file.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('File downloaded successfully');
      } else {
        toast.error('File data not found');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <PhotoIcon className="h-8 w-8 text-blue-500" />;
    } else if (fileType.startsWith('video/')) {
      return <VideoCameraIcon className="h-8 w-8 text-purple-500" />;
    } else if (fileType.startsWith('audio/')) {
      return <MusicalNoteIcon className="h-8 w-8 text-green-500" />;
    } else if (fileType.includes('zip') || fileType.includes('rar')) {
      return <ArchiveBoxIcon className="h-8 w-8 text-orange-500" />;
    } else {
      return <DocumentIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'size':
        return b.size - a.size;
      case 'date':
      default:
        return b.uploadedAt?.toDate?.() - a.uploadedAt?.toDate?.();
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Files</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage team files and documents (Unlimited Size)</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>



      {/* Search and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-gray-100"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-700 dark:text-gray-100"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="*/*"
      />

      {/* Files Grid/List */}
      {sortedFiles.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No files yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Upload files to get started</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            Upload Files
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {sortedFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-white dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600 p-4 hover:shadow-md transition-shadow ${
                viewMode === 'list' ? 'flex items-center space-x-4' : ''
              }`}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    {getFileIcon(file.type)}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleFileDownload(file)}
                        className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleFileDelete(file)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate mb-1">
                      {file.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {formatFileSize(file.size)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(file.uploadedAt)} • {file.uploadedByName}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                      {file.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)} • {formatDate(file.uploadedAt)} • {file.uploadedByName}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleFileDownload(file)}
                      className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleFileDelete(file)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileManager; 