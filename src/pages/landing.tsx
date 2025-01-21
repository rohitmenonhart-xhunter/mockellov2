import { motion } from 'framer-motion';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, query, orderByChild, equalTo, set } from 'firebase/database';
import Image from 'next/image';

const inter = Inter({ subsets: ['latin'] });

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

const fadeInUp = {
  initial: { 
    opacity: 0, 
    y: 20 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6
    }
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

interface SessionInfo {
  sessionId: string;
  role: string;
  createdAt?: string;
  hrName?: string;
  company?: string;
  studentLimit: number;
  currentStudents?: number;
  invitedEmails?: string[];
}

const getRoomNumber = (role: string): string => {
  const roleRoomMap: { [key: string]: string } = {
    'Fullstack developer': '001',
    'DevOps': '002',
    'Frontend developer': '003',
    'Backend developer': '004',
    'Software Engineer': '005',
    'Data Engineer': '006',
    'Machine Learning Engineer': '007',
    'Cloud Engineer': '008',
    'System Administrator': '009',
    'QA Engineer': '010',
    'Electronics Engineer': '011',
    'Electrical Engineer': '012',
    'Mechanical Engineer': '013',
    'Civil Engineer': '014',
    'Product Manager': '015',
    'Project Manager': '016',
    'UI/UX Designer': '017',
    'Database Administrator': '018',
    'Security Engineer': '019',
    'Network Engineer': '020'
  };

  return roleRoomMap[role] || '999'; // Default room if role not found
};

export default function LandingPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [sessionData, setSessionData] = useState<SessionInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [showStartButton, setShowStartButton] = useState(false);
  
  // Media check states
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState(false);
  const [isTestingMedia, setIsTestingMedia] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState('');
  const [volume, setVolume] = useState(0);
  const [isCheckingAudio, setIsCheckingAudio] = useState(false);

  // Effect for countdown timer
  useEffect(() => {
    if (isValidated && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowStartButton(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isValidated, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to check camera
  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraAvailable(true);
      return stream;
    } catch (error) {
      console.error('Camera error:', error);
      setMediaError('Camera access denied. Please enable camera access and try again.');
      setIsCameraAvailable(false);
      return null;
    }
  };

  // Function to check microphone
  const checkMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsMicAvailable(true);
      
      // Create audio context with user interaction to comply with browser policies
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      // Configure analyzer
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      setIsCheckingAudio(true);
      
      // Monitor audio levels with better sensitivity
      const checkAudioLevel = () => {
        if (!isCheckingAudio) {
          audioContext.close();
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS value for better volume representation
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += (dataArray[i] * dataArray[i]);
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        // Scale the volume for better visualization
        const scaledVolume = Math.min(255, rms * 4);
        setVolume(scaledVolume);
        
        requestAnimationFrame(checkAudioLevel);
      };
      
      checkAudioLevel();
      return stream;
    } catch (error) {
      console.error('Microphone error:', error);
      setMediaError('Microphone access denied. Please enable microphone access and try again.');
      setIsMicAvailable(false);
      return null;
    }
  };

  // Function to test media devices
  const testMediaDevices = async () => {
    setIsTestingMedia(true);
    setMediaError('');
    setIsCheckingAudio(false); // Reset audio checking state
    
    // Stop any existing streams
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    const cameraStream = await checkCamera();
    const micStream = await checkMicrophone();
    
    setIsTestingMedia(false);
    
    // Return cleanup function
    return () => {
      setIsCheckingAudio(false);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
    };
  };

  // Clean up media streams when component unmounts
  useEffect(() => {
    return () => {
      setIsCheckingAudio(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const validateSessionId = async () => {
    if (!sessionId.trim()) {
      setError('Please enter your session ID');
      return;
    }

    if (!studentEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Checking session ID:', sessionId);
      
      // First check in sessions
      const sessionRef = ref(database, `sessions/${sessionId}`);
      let snapshot = await get(sessionRef);
      
      // If not found in sessions, check in keys/variable/sessionid
      if (!snapshot.exists()) {
        console.log('Not found in sessions, checking keys/variable/sessionid');
        const keySessionRef = ref(database, 'keys/variable/sessionid');
        const keySnapshot = await get(keySessionRef);
        
        if (keySnapshot.exists()) {
          // Search through all sessions in the key location
          let found = false;
          keySnapshot.forEach((childSnapshot) => {
            const sessionData = childSnapshot.val();
            if (sessionData.sessionId === sessionId) {
              snapshot = childSnapshot;
              found = true;
            }
          });
          
          if (!found) {
            console.log('Session not found in either location');
            setError('Invalid session ID. Please check and try again.');
            setLoading(false);
            return;
          }
        } else {
          console.log('Session not found in either location');
          setError('Invalid session ID. Please check and try again.');
          setLoading(false);
          return;
        }
      }

      const data = snapshot.val();
      console.log('Session data:', data);
      console.log('InvitedEmails:', data.invitedEmails);
      console.log('Student email:', studentEmail);
      
      // Check if invitedEmails exists and is an array
      if (!data.invitedEmails || !Array.isArray(data.invitedEmails)) {
        console.log('No invitedEmails array found');
        setError('Session configuration error. Please contact support.');
        setLoading(false);
        return;
      }

      // Check if email is in invited list
      const isEmailInvited = data.invitedEmails.some(
        (email: string) => email.toLowerCase() === studentEmail.toLowerCase()
      );
      console.log('Is email invited:', isEmailInvited);

      if (!isEmailInvited) {
        setError('Your email is not authorized for this session. Please use the email where you received the invitation.');
        setLoading(false);
        return;
      }

      // Check if session is full
      const currentStudents = data.currentStudents || 0;
      console.log('Current students:', currentStudents, 'Limit:', data.studentLimit);
      if (data.studentLimit !== -1 && currentStudents >= data.studentLimit) {
        setError('This session is full. Please contact the HR representative for assistance.');
        setLoading(false);
        return;
      }

      // Update current students count and remove the validated email
      const updatedEmails = data.invitedEmails.filter(
        (email: string) => email.toLowerCase() !== studentEmail.toLowerCase()
      );
      
      // Always update in both locations to ensure consistency
      const sessionData = {
        ...data,
        currentStudents: currentStudents + 1,
        invitedEmails: updatedEmails
      };

      // Update in sessions location
      await set(ref(database, `sessions/${sessionId}`), sessionData);
      
      // If found in keys location, update there too
      if (snapshot.ref.toString().includes('keys/variable/sessionid')) {
        await set(snapshot.ref, sessionData);
      }

      // Store session info in localStorage
      localStorage.setItem('validatedFromLanding', 'true');
      localStorage.setItem('validationTimestamp', Date.now().toString());
      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('userInfo', JSON.stringify({
        registerNumber: studentEmail.split('@')[0],
        name: studentEmail.split('@')[0],
        email: studentEmail
      }));

      // Extract role from roleplayPrompt
      let role = '';
      if (data.roleplayPrompt) {
        const promptText = data.roleplayPrompt;
        const roleMatch = promptText.match(/interviewing for the role of ([^We]*)/);
        if (roleMatch && roleMatch[1]) {
          role = roleMatch[1].trim();
        }
      } else if (data.role) {
        // Fallback to role field if roleplayPrompt doesn't exist
        role = data.role;
      }
      console.log('Extracted role:', role);

      const sessionInfo: SessionInfo = {
        sessionId: sessionId,
        role: role,
        createdAt: data.createdAt,
        hrName: data.hrName,
        company: data.hrCompany || data.company,
        studentLimit: data.studentLimit,
        currentStudents: currentStudents + 1,
        invitedEmails: updatedEmails
      };

      setSessionData(sessionInfo);
      const room = getRoomNumber(role);
      setIsValidated(true);
    } catch (error) {
      console.error('Error validating session:', error);
      setError('An error occurred while validating the session ID.');
    } finally {
      setLoading(false);
    }
  };

  // Always show the session ID input form unless currently validated
  if (!isValidated) {
    return (
      <div className={`min-h-screen bg-black ${inter.className}`}>
        <Head>
          <title>Session Validation - Mockello</title>
          <meta name="description" content="Enter your session ID to begin the interview" />
        </Head>

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#BE185D]/20 blur-[120px] rounded-full"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-[#BE185D]/10 blur-[120px] rounded-full"></div>
        </div>

        <main className="container mx-auto px-4 min-h-screen flex items-center justify-center">
          <motion.div
            initial="initial"
            animate="animate"
            variants={fadeInUp}
            className="w-full max-w-md"
          >
            <div className="bg-black/40 backdrop-blur-lg p-8 rounded-2xl border border-[#BE185D]/20">
              <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
                Enter Session Details
              </h1>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter your session ID"
                  className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white"
                />

                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white"
                />
                
                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  onClick={validateSessionId}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#BE185D] to-[#BE185D]/80 text-white rounded-lg hover:shadow-[0_0_30px_-5px_#BE185D] transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? 'Validating...' : 'Continue to Interview'}
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black ${inter.className}`}>
      <Head>
        <title>Waiting Room - Mockello</title>
        <meta name="description" content="Prepare for your HR interview assessment" />
      </Head>

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#BE185D]/20 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-[#BE185D]/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-white"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">Mockello</span>
          </motion.div>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-32 pb-16 relative z-10">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="text-center"
        >
          {/* Waiting Room Section */}
          <motion.div variants={fadeInUp} className="relative mb-16">
            <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-[#BE185D] to-white">
              Waiting Room
            </h1>
            <motion.p variants={fadeInUp} className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Please check your camera and microphone before starting the interview.
            </motion.p>

            {/* Media Check Section */}
            <motion.div
              variants={fadeInUp}
              className="mb-8 p-6 bg-[#BE185D]/10 rounded-xl border border-[#BE185D]/30"
            >
              <h2 className="text-2xl font-bold text-[#BE185D] mb-4">Device Check</h2>
              
              {/* Camera Preview */}
              <div className="mb-6">
                <h3 className="text-lg text-white mb-2">Camera</h3>
                <div className="relative w-full max-w-[320px] mx-auto aspect-video bg-black/50 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isCameraAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <p className="text-gray-400">Camera not available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Microphone Level */}
              <div className="mb-6">
                <h3 className="text-lg text-white mb-2">Microphone</h3>
                <div className="w-full max-w-[320px] mx-auto h-8 bg-black/50 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-[#BE185D] transition-all duration-100"
                    style={{ width: `${(volume / 255) * 100}%` }}
                  />
                </div>
                {!isMicAvailable && (
                  <p className="text-gray-400 mt-2">Microphone not available</p>
                )}
              </div>

              {mediaError && (
                <p className="text-red-500 text-sm mb-4">{mediaError}</p>
              )}

              <button
                onClick={testMediaDevices}
                className="px-6 py-3 bg-[#BE185D]/20 text-[#BE185D] rounded-lg hover:bg-[#BE185D]/30 transition-colors"
              >
                {isTestingMedia ? 'Testing Devices...' : 'Test Camera & Microphone'}
              </button>
            </motion.div>

            {/* Timer */}
            <motion.div
              variants={fadeInUp}
              className="mb-12"
            >
              <div className="text-8xl font-bold text-[#BE185D] mb-4 font-mono">
                {formatTime(timeLeft)}
              </div>
              <p className="text-gray-400">
                {showStartButton ? "You can now start your interview" : "Time remaining until interview starts"}
              </p>
            </motion.div>

            {/* Important Instructions Box */}
            <motion.div variants={fadeInUp} className="mb-12 max-w-2xl mx-auto bg-black/40 border border-[#BE185D]/20 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-[#BE185D] font-semibold mb-3">Before You Begin:</h3>
              <ul className="text-left text-gray-300 space-y-2">
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Ensure you're in a quiet environment
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Test your camera and microphone
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Have your resume ready for reference
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> Use Chrome or Firefox browser
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span> The interview will take approximately 15 minutes
                </li>
              </ul>
            </motion.div>

            {/* Start Interview Button */}
            {showStartButton && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <button
                  onClick={() => router.push('/test')}
                  disabled={!isCameraAvailable || !isMicAvailable}
                  className="px-8 py-4 bg-gradient-to-r from-[#BE185D] to-[#BE185D]/80 text-white rounded-full text-lg font-semibold shadow-lg hover:shadow-[0_0_30px_-5px_#BE185D] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isCameraAvailable || !isMicAvailable ? 
                    'Please check your camera and microphone' : 
                    'Start Your Interview'}
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Tips Section */}
          <motion.div
            variants={fadeInUp}
            className="mt-12 max-w-4xl mx-auto text-center bg-black/30 rounded-2xl backdrop-blur-sm border border-[#BE185D]/10 p-8"
          >
            <h3 className="text-2xl font-bold text-[#BE185D] mb-6">Interview Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <p className="text-gray-300 mb-2">• Speak clearly and naturally</p>
                <p className="text-gray-300 mb-2">• Take your time to think before answering</p>
                <p className="text-gray-300 mb-2">• Maintain good eye contact with the camera</p>
              </div>
              <div>
                <p className="text-gray-300 mb-2">• Be honest in your responses</p>
                <p className="text-gray-300 mb-2">• Stay focused throughout the session</p>
                <p className="text-gray-300 mb-2">• Ensure good lighting on your face</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600 relative z-10">
        <p>© 2025 Mockello. All rights reserved.</p>
      </footer>
    </div>
  );
} 