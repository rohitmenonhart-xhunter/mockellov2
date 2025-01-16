import { useState, useEffect } from 'react';
import { getDatabase, ref, set, push, remove, onValue } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCuWTdQuHs_l6rvfzaxvY4y-Uzn0EARRwM",
  authDomain: "athentication-3c73e.firebaseapp.com",
  databaseURL: "https://athentication-3c73e-default-rtdb.firebaseio.com",
  projectId: "athentication-3c73e",
  storageBucket: "athentication-3c73e.firebasestorage.app",
  messagingSenderId: "218346867452",
  appId: "1:218346867452:web:58a57b37f6b6a42ec72579",
  measurementId: "G-3GBM5TSMLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

interface AuthKey {
  id: string;
  value: string;
  active: boolean;
  createdAt: string;
  description: string;
  validityDays: number;
  interviewLimit: number;  // -1 for no limit
  studentsPerInterview: number;  // -1 for no limit
  usedInterviews: number;
}

export default function AdminDashboard() {
  const [keys, setKeys] = useState<AuthKey[]>([]);
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [interviewLimit, setInterviewLimit] = useState(-1);
  const [studentsPerInterview, setStudentsPerInterview] = useState(4);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      // Listen for changes in auth keys
      const keysRef = ref(database, 'hr_auth_keys');
      const unsubscribe = onValue(keysRef, (snapshot) => {
        if (snapshot.exists()) {
          const keyData = snapshot.val();
          const keyList = Object.entries(keyData).map(([id, data]: [string, any]) => ({
            id,
            value: data.value, // Use the stored full key
            active: data.active,
            createdAt: data.createdAt,
            description: data.description,
            validityDays: data.validityDays,
            interviewLimit: data.interviewLimit || -1,
            studentsPerInterview: data.studentsPerInterview || 4,
            usedInterviews: data.usedInterviews || 0
          }));
          setKeys(keyList);
        } else {
          setKeys([]);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [isAuthenticated]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === 'Iamunique7$') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid admin key');
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Admin Authentication - Mockello</title>
          <meta name="description" content="Admin authentication" />
        </Head>

        <main className="bg-black min-h-screen text-white">
          <div className="fixed inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#BE185D_0%,_transparent_25%)] opacity-20 animate-pulse"></div>
            <div className="absolute inset-0 bg-black bg-opacity-90"></div>
          </div>

          <div className="relative container mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              <h1 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
                Admin Authentication
              </h1>

              <form onSubmit={handleAdminAuth} className="space-y-6">
                <div className="bg-black/30 p-6 rounded-xl border border-[#BE185D]/20">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="adminKey" className="block text-gray-300 mb-2">Admin Key</label>
                      <input
                        type="password"
                        id="adminKey"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-gradient-to-r from-[#BE185D] to-[#BE185D]/80 text-white rounded-full hover:shadow-[0_0_30px_-5px_#BE185D] transition-all duration-300"
                >
                  Access Admin Dashboard
                </button>
              </form>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    // Generate validation ID (first 8 chars)
    let validationId = '';
    for (let i = 0; i < 8; i++) {
      validationId += chars[Math.floor(Math.random() * chars.length)];
    }

    // Encode interview limit (2 chars)
    // -1 = unlimited (99), 0-98 = actual limit
    const encodedInterviewLimit = (interviewLimit === -1 ? 99 : Math.min(interviewLimit, 98))
      .toString()
      .padStart(2, '0');

    // Encode students per interview limit (2 chars)
    // -1 = unlimited (99), 0-98 = actual limit
    const encodedStudentLimit = (studentsPerInterview === -1 ? 99 : Math.min(studentsPerInterview, 98))
      .toString()
      .padStart(2, '0');

    // Generate random chars for the rest (4 chars)
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }

    // Combine all parts with dashes for readability
    return `${validationId}-${encodedInterviewLimit}${encodedStudentLimit}-${randomPart}`;
  };

  const createNewKey = async () => {
    if (!newKeyDescription.trim()) {
      alert('Please enter a description for the key');
      return;
    }

    try {
      const keysRef = ref(database, 'hr_auth_keys');
      const newKeyRef = push(keysRef);
      const generatedKey = generateKey();
      const validationId = generatedKey.split('-')[0];
      
      // Store validation info and the full key in Firebase
      await set(newKeyRef, {
        validationId: validationId,
        value: generatedKey, // Store the full key
        active: true,
        createdAt: new Date().toISOString(),
        description: newKeyDescription.trim(),
        validityDays: validityDays,
        interviewLimit: interviewLimit,
        studentsPerInterview: studentsPerInterview,
        usedInterviews: 0
      });

      // Don't update local state, let the Firebase listener handle it
      setNewKeyDescription('');
      setValidityDays(30);
      setInterviewLimit(-1);
      setStudentsPerInterview(4);
    } catch (error) {
      console.error('Error creating key:', error);
      alert('Failed to create key. Please try again.');
    }
  };

  const toggleKeyStatus = async (key: AuthKey) => {
    try {
      const keyRef = ref(database, `hr_auth_keys/${key.id}`);
      await set(keyRef, {
        validationId: key.value.split('-')[0],
        value: key.value, // Keep the full key
        active: !key.active,
        createdAt: key.createdAt,
        description: key.description,
        validityDays: key.validityDays,
        interviewLimit: key.interviewLimit,
        studentsPerInterview: key.studentsPerInterview,
        usedInterviews: key.usedInterviews || 0
      });
    } catch (error) {
      console.error('Error toggling key status:', error);
      alert('Failed to update key status. Please try again.');
    }
  };

  const deleteKey = async (keyId: string) => {
    if (window.confirm('Are you sure you want to delete this key? This action cannot be undone.')) {
      try {
        const keyRef = ref(database, `hr_auth_keys/${keyId}`);
        await remove(keyRef);
      } catch (error) {
        console.error('Error deleting key:', error);
        alert('Failed to delete key. Please try again.');
      }
    }
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard - Mockello</title>
        <meta name="description" content="Manage HR authentication keys" />
      </Head>

      <main className="bg-black min-h-screen text-white">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#BE185D_0%,_transparent_25%)] opacity-20 animate-pulse"></div>
          <div className="absolute inset-0 bg-black bg-opacity-90"></div>
        </div>

        <div className="relative container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
              HR Authentication Keys
            </h1>

            {/* Create New Key Section */}
            <div className="bg-black/30 p-6 rounded-xl border border-[#BE185D]/20 mb-8">
              <h2 className="text-xl font-semibold text-[#BE185D] mb-4">Create New Key</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  placeholder="Enter key description"
                  className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white placeholder-gray-500"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Validity (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={validityDays}
                      onChange={(e) => setValidityDays(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Interview Limit</label>
                    <input
                      type="number"
                      min="-1"
                      value={interviewLimit}
                      onChange={(e) => setInterviewLimit(parseInt(e.target.value))}
                      placeholder="-1 for no limit"
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Students per Interview</label>
                    <input
                      type="number"
                      min="1"
                      value={studentsPerInterview}
                      onChange={(e) => setStudentsPerInterview(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={createNewKey}
                  className="w-full px-6 py-3 bg-[#BE185D] text-white rounded-lg hover:bg-[#BE185D]/80 transition-colors"
                >
                  Generate Key
                </button>
              </div>
            </div>

            {/* Keys List */}
            <div className="bg-black/30 p-6 rounded-xl border border-[#BE185D]/20">
              <h2 className="text-xl font-semibold text-[#BE185D] mb-4">Active Keys</h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#BE185D]"></div>
                </div>
              ) : keys.length > 0 ? (
                <div className="space-y-4">
                  {keys.map((key) => (
                    <motion.div
                      key={key.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border ${
                        key.active 
                          ? 'border-[#BE185D]/20 bg-[#BE185D]/5' 
                          : 'border-gray-700 bg-black/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-lg text-white mb-1">{key.value}</p>
                          <p className="text-gray-400 text-sm">{key.description}</p>
                          <div className="text-gray-500 text-xs mt-2 space-y-1">
                            <p>Created: {new Date(key.createdAt).toLocaleString()}</p>
                            <p>Validity: {key.validityDays} days</p>
                            <p>Interview Limit: {key.interviewLimit === -1 ? 'Unlimited' : key.interviewLimit}</p>
                            <p>Students per Interview: {key.studentsPerInterview}</p>
                            <p>Used Interviews: {key.usedInterviews || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleKeyStatus(key)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              key.active
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                            }`}
                          >
                            {key.active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => deleteKey(key.id)}
                            className="p-2 text-red-500 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No keys found. Create one to get started.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
} 