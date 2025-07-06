import React, { useState, useEffect } from 'react';
import { auth, db } from '../../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const FirebaseTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    try {
      // Test 1: Firebase Auth
      console.log('Testing Firebase Auth...');
      try {
        const userCredential = await signInAnonymously(auth);
        setUser(userCredential.user);
        results.auth = { success: true, message: 'Authentication working' };
        console.log('✅ Auth test passed');
      } catch (error) {
        results.auth = { success: false, message: `Auth failed: ${error.message}` };
        console.error('❌ Auth test failed:', error);
      }

      // Test 2: Firestore Write
      console.log('Testing Firestore Write...');
      try {
        const testDoc = doc(db, 'test', 'connection-test');
        await setDoc(testDoc, {
          timestamp: new Date(),
          message: 'Firebase connection test',
          user: user?.uid || 'anonymous'
        });
        results.firestoreWrite = { success: true, message: 'Firestore write working' };
        console.log('✅ Firestore write test passed');
      } catch (error) {
        results.firestoreWrite = { success: false, message: `Firestore write failed: ${error.message}` };
        console.error('❌ Firestore write test failed:', error);
      }

      // Test 3: Firestore Read
      console.log('Testing Firestore Read...');
      try {
        const testDoc = doc(db, 'test', 'connection-test');
        const docSnap = await getDoc(testDoc);
        if (docSnap.exists()) {
          results.firestoreRead = { success: true, message: 'Firestore read working' };
          console.log('✅ Firestore read test passed');
        } else {
          results.firestoreRead = { success: false, message: 'Document does not exist' };
          console.log('❌ Firestore read test failed: Document not found');
        }
      } catch (error) {
        results.firestoreRead = { success: false, message: `Firestore read failed: ${error.message}` };
        console.error('❌ Firestore read test failed:', error);
      }

      // Test 4: Collections Check
      console.log('Testing Collections...');
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const teamsRef = collection(db, 'teams');
        await getDocs(teamsRef);
        results.collections = { success: true, message: 'Collections accessible' };
        console.log('✅ Collections test passed');
      } catch (error) {
        results.collections = { success: false, message: `Collections failed: ${error.message}` };
        console.error('❌ Collections test failed:', error);
      }

    } catch (error) {
      console.error('Test suite error:', error);
      results.general = { success: false, message: `General error: ${error.message}` };
    }

    setTestResults(results);
    setLoading(false);
  };

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Firebase Connection Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing Firebase services and connection status
          </p>
        </div>

        <div className="card p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Running tests...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Test Results
              </h2>
              
              {Object.entries(testResults).map(([testName, result]) => (
                <div key={testName} className="flex items-center justify-between p-4 border border-gray-200 dark:border-dark-700 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">{getStatusIcon(result.success)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {testName.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className={`text-sm ${getStatusColor(result.success)}`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Current User
                </h3>
                <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>UID:</strong> {user?.uid || 'Not authenticated'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Email:</strong> {user?.email || 'Anonymous user'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  onClick={runTests}
                  className="btn-primary"
                >
                  Run Tests Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn-secondary"
                >
                  Back to App
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 card p-6">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
            Troubleshooting Tips
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• If Auth fails: Check Firebase config and enable Anonymous auth</p>
            <p>• If Firestore fails: Check Firestore rules and database creation</p>
            <p>• If Collections fail: Make sure Firestore is initialized</p>
            <p>• Check browser console (F12) for detailed error messages</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTest; 