import React, { useState } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const FileStorageTest = () => {
  const [testFile, setTestFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuthStore();

  // Convert file to base64
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTestFile(file);
    }
  };

  const uploadTestFile = async () => {
    if (!testFile || !userProfile?.uid) {
      toast.error('Please select a file and ensure you are logged in');
      return;
    }

    setUploading(true);
    try {
      // Compress image files if needed
      let processedFile = testFile;
      if (testFile.type.startsWith('image/')) {
        console.log('Compressing image file for test...');
        processedFile = await compressImage(testFile);
        console.log('Image compressed for test, new size:', processedFile.size);
      }

      // Convert file to base64
      const base64Data = await fileToBase64(processedFile);
      
      // Store file metadata first
      const fileDocRef = await addDoc(collection(db, 'testFiles'), {
        name: testFile.name,
        size: processedFile.size,
        type: testFile.type,
        uploadedBy: userProfile.uid,
        uploadedByName: userProfile.name,
        uploadedAt: serverTimestamp(),
        storageType: 'chunked',
        chunks: true
      });

      // Store file data in chunks
      console.log('Storing test file in chunks...');
      const numChunks = await storeFileInChunks(processedFile, base64Data, fileDocRef.id);
      console.log(`Test file stored in ${numChunks} chunks`);

      // Update file metadata with chunk count
      await updateDoc(fileDocRef, {
        chunkCount: numChunks
      });

      toast.success(`File uploaded successfully! Document ID: ${fileDocRef.id} (${numChunks} chunks)`);
      setTestFile(null);
      fetchTestFiles();
    } catch (error) {
      console.error('Error uploading test file:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const fetchTestFiles = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'testFiles'));
      const filesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFiles(filesData);
    } catch (error) {
      console.error('Error fetching test files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const deleteTestFile = async (fileId) => {
    try {
      // Delete file chunks first
      const chunksRef = collection(db, 'fileChunks');
      const q = query(chunksRef, where('fileId', '==', fileId));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log('File chunks deleted successfully');

      // Delete file metadata
      await deleteDoc(doc(db, 'testFiles', fileId));
      toast.success('File deleted successfully');
      fetchTestFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const downloadTestFile = async (file) => {
    try {
      if (file.chunks) {
        // For chunked files, retrieve and reconstruct
        console.log('Retrieving test file chunks...');
        const base64Data = await retrieveFileChunks(file.id);
        console.log('Test file chunks retrieved successfully');
        
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
      } else {
        toast.error('File data not found');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Firestore File Storage Test (Unlimited Size)
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This test verifies that files of any size can be stored and retrieved using chunked storage in Firestore.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Upload Test File
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File (Any Size)
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                dark:file:bg-primary-900 dark:file:text-primary-300"
            />
          </div>
          
          {testFile && (
            <div className="p-3 bg-gray-50 dark:bg-dark-600 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Selected:</strong> {testFile.name} ({formatFileSize(testFile.size)})
              </p>
            </div>
          )}
          
          <button
            onClick={uploadTestFile}
            disabled={!testFile || uploading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Test File'}
          </button>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Test Files
          </h2>
          <button
            onClick={fetchTestFiles}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {files.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No test files uploaded yet. Upload a file above to test the storage.
          </p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-600 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)} • {file.type} • {file.uploadedByName}
                    {file.chunkCount && ` • ${file.chunkCount} chunks`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadTestFile(file)}
                    className="btn-secondary text-sm"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => deleteTestFile(file.id)}
                    className="btn-danger text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How chunked storage works:
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Files are converted to base64 strings using FileReader API</li>
          <li>• Large base64 strings are split into 500KB chunks</li>
          <li>• Each chunk is stored as a separate Firestore document</li>
          <li>• File metadata is stored separately with chunk information</li>
          <li>• Downloads reconstruct the file by combining all chunks</li>
          <li>• No file size limits - files of any size can be stored</li>
          <li>• Images are automatically compressed to reduce size</li>
        </ul>
      </div>
    </div>
  );
};

export default FileStorageTest; 