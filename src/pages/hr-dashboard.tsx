import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, get, onValue } from 'firebase/database';

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

interface HRProfile {
  name: string;
  dob: string;
  phone: string;
  company: string;
  hiringRoles: string[];
}

interface RoleplayPrompt {
  company: string;
  role: string;
  expectations: string;
}

interface Session {
  id: string;
  createdAt: string;
  studentEmails: string[];
  emailsSent: boolean;
  roleplayPrompt: RoleplayPrompt;
}

interface FeedbackData {
  feedback: string;
  interviewDate: string;
  interviewTime: string;
  name: string;
  performancePercentage: number;
  registerNumber: string;
  sessionId: string;
  stars: number;
  timestamp: string;
  totalWords: number;
  transcriptionCount: number;
  email?: string;
}

interface KeyLimits {
  validityDays: number;
  interviewLimit: number;
  studentsPerInterview: number;
  usedInterviews: number;
  createdAt: string;
}

interface FirebaseSession {
  sessionId: string;
  hrName: string;
  hrCompany: string;
  hrIdentifier: string;
  studentLimit: number;
  currentStudents: number;
  invitedEmails: string[];
  roleplayPrompt: string;
  createdAt: string;
  feedback?: string;
  interviewDate?: string;
  interviewTime?: string;
  name?: string;
  performancePercentage?: number;
  registerNumber?: string;
  stars?: number;
  timestamp?: string;
  totalWords?: number;
  transcriptionCount?: number;
  email?: string;
}

export default function HRDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<HRProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<HRProfile | null>(null);
  const [newRole, setNewRole] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [latestSession, setLatestSession] = useState<Session | null>(null);
  const [latestFeedback, setLatestFeedback] = useState<FeedbackData | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showPreviousSessions, setShowPreviousSessions] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [sessionFeedbacks, setSessionFeedbacks] = useState<{[key: string]: FeedbackData[]}>({});
  const [selectedCandidates, setSelectedCandidates] = useState<{[key: string]: Set<string>}>({});
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [processingSession, setProcessingSession] = useState<string | null>(null);
  const [tempEmails, setTempEmails] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(true);
  const [authKey, setAuthKey] = useState<string | null>(null);
  const [keyLimits, setKeyLimits] = useState<KeyLimits | null>(null);
  const [roleplayPrompt, setRoleplayPrompt] = useState({
    company: '',
    role: '',
    expectations: ''
  });

  // Move loadSessions outside the authentication useEffect
  const loadSessions = async () => {
    if (!profile) return;

    // Generate HR identifier
    const hrIdentifier = `${profile.name}_${profile.dob}_${profile.phone}`;
    
    try {
      // Load from sessions location
      const sessionsRef = ref(database, 'sessions');
      const sessionsSnapshot = await get(sessionsRef);
      
      let hrSessions: Session[] = [];
      
      if (sessionsSnapshot.exists()) {
        const allSessions = sessionsSnapshot.val();
        // Filter sessions belonging to current HR
        Object.entries(allSessions).forEach(([key, session]) => {
          const fbSession = session as FirebaseSession;
          if (fbSession.hrIdentifier === hrIdentifier) {
            hrSessions.push({
              id: fbSession.sessionId,
              createdAt: fbSession.createdAt,
              studentEmails: fbSession.invitedEmails,
              emailsSent: true,
              roleplayPrompt: {
                company: fbSession.hrCompany,
                role: fbSession.roleplayPrompt.split('\n')[1]?.replace('We are interviewing for the role of', '').trim() || '',
                expectations: fbSession.roleplayPrompt.split('\n')[2]?.replace('We want candidates who are', '').trim() || ''
              }
            });
          }
        });
      }

      // Set sessions in state
      if (hrSessions.length > 0) {
        setSessions(hrSessions);
        setLatestSession(hrSessions[hrSessions.length - 1]);
        
        // Fetch feedback for all sessions
        hrSessions.forEach(session => {
          fetchLatestFeedback(session.id);
        });
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  useEffect(() => {
    // Check if HR is authenticated
    const storedProfile = localStorage.getItem('hrProfile');
    const storedKey = localStorage.getItem('hrAuthKey');
    
    if (!storedProfile || !storedKey) {
      router.push('/hr-portal');
      return;
    }

    // Validate the auth key against Firebase
    const validateStoredKey = async () => {
      setIsValidating(true);
      try {
        if (!storedKey) {
          router.push('/hr-portal');
          return;
        }

        const keysRef = ref(database, 'hr_auth_keys');
        const snapshot = await get(keysRef);
        
        if (snapshot.exists()) {
          const keys = snapshot.val();
          let validKey = false;
          let keyData: any = null;

          // Find the matching key
          Object.entries(keys).forEach(([keyId, k]: [string, any]) => {
            if (k.value === storedKey && k.active === true) {
              validKey = true;
              keyData = k;
            }
          });

          if (!validKey || !keyData) {
            localStorage.removeItem('hrProfile');
            localStorage.removeItem('hrAuthKey');
            localStorage.removeItem('keyLimits');
            router.push('/hr-portal');
            return;
          }

          // Check key validity period
          const createdDate = new Date(keyData.createdAt);
          const validUntil = new Date(createdDate.getTime() + (keyData.validityDays * 24 * 60 * 60 * 1000));
          
          if (validUntil < new Date()) {
            console.error('Key has expired');
            localStorage.removeItem('hrProfile');
            localStorage.removeItem('hrAuthKey');
            localStorage.removeItem('keyLimits');
            router.push('/hr-portal');
            return;
          }

          // Set key limits
          const limits = {
            validityDays: keyData.validityDays,
            interviewLimit: keyData.interviewLimit || -1,
            studentsPerInterview: keyData.studentsPerInterview || 4,
            usedInterviews: keyData.usedInterviews || 0,
            createdAt: keyData.createdAt
          };
          
          setKeyLimits(limits);
          localStorage.setItem('keyLimits', JSON.stringify(limits));

          // Key is valid, set up the profile
          const parsedProfile = JSON.parse(storedProfile!);
          setProfile(parsedProfile);
          setEditedProfile(parsedProfile);
          setAuthKey(storedKey);
        } else {
          localStorage.removeItem('hrProfile');
          localStorage.removeItem('hrAuthKey');
          localStorage.removeItem('keyLimits');
          router.push('/hr-portal');
        }
      } catch (error) {
        console.error('Error validating key:', error);
        router.push('/hr-portal');
      } finally {
        setIsValidating(false);
      }
    };

    validateStoredKey();
  }, [router]);

  // Add new useEffect to handle session loading
  useEffect(() => {
    if (profile && !isValidating) {
      loadSessions();
    }
  }, [profile, isValidating]);

  useEffect(() => {
    // Save sessions to localStorage whenever they change
    localStorage.setItem('hrSessions', JSON.stringify(sessions));
  }, [sessions]);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedProfile) {
      localStorage.setItem('hrProfile', JSON.stringify(editedProfile));
      setProfile(editedProfile);
      setIsEditingProfile(false);
    }
  };

  const addHiringRole = () => {
    if (newRole.trim() && editedProfile) {
      setEditedProfile(prev => ({
        ...prev!,
        hiringRoles: [...prev!.hiringRoles, newRole.trim()]
      }));
      setNewRole('');
    }
  };

  const removeHiringRole = (index: number) => {
    if (editedProfile) {
      setEditedProfile(prev => ({
        ...prev!,
        hiringRoles: prev!.hiringRoles.filter((_, i) => i !== index)
      }));
    }
  };

  const generateSessionId = (profile: HRProfile) => {
    const now = new Date();
    const hrName = profile.name.toLowerCase().replace(/\s+/g, '');
    const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString();
    const randomNum = Math.floor(Math.random() * 90 + 10); // 2-digit random number
    const reversedDob = profile.dob.split('-').reverse().join('');
    
    return `${hrName}${time}${month}${year}${randomNum}${reversedDob}`;
  };

  const fetchLatestFeedback = async (sessionId: string) => {
    setIsLoadingFeedback(true);
    console.log('Fetching feedback for session:', sessionId);
    
    try {
      // Get reference directly to the specific session
      const sessionRef = ref(database, `sessions/${sessionId}`);
      console.log('Attempting to retrieve session data from path:', `sessions/${sessionId}`);
      
      // Set up real-time listener for the specific session
      onValue(sessionRef, (snapshot) => {
        console.log('Session data snapshot exists:', snapshot.exists());
        
        if (snapshot.exists()) {
          const sessionData = snapshot.val();
          console.log('Retrieved session data:', sessionData);
          
          // Check if this session has feedback data
          if (sessionData.feedback) {
            console.log('Found feedback in session data');
            // Create a feedback object from the session data
            const feedback: FeedbackData = {
              feedback: sessionData.feedback,
              interviewDate: sessionData.interviewDate || '',
              interviewTime: sessionData.interviewTime || '',
              name: sessionData.name || '',
              performancePercentage: sessionData.performancePercentage || 0,
              registerNumber: sessionData.registerNumber || '',
              sessionId: sessionId,
              stars: sessionData.stars || 0,
              timestamp: sessionData.timestamp || '',
              totalWords: sessionData.totalWords || 0,
              transcriptionCount: sessionData.transcriptionCount || 0,
              email: sessionData.email
            };

            console.log('Created feedback object:', feedback);

            // Update the feedbacks state for this specific session only
            setSessionFeedbacks(prev => {
              const updated = {
                ...prev,
                [sessionId]: [feedback]
              };
              console.log('Updated session feedbacks for session', sessionId, ':', updated);
              return updated;
            });
          } else {
            console.log('No feedback found for session:', sessionId);
            // Clear any existing feedback for this session
            setSessionFeedbacks(prev => {
              const { [sessionId]: _, ...rest } = prev;
              return rest;
            });
          }
        } else {
          console.log('No session data found for ID:', sessionId);
          // Clear any existing feedback for this session
          setSessionFeedbacks(prev => {
            const { [sessionId]: _, ...rest } = prev;
            return rest;
          });
        }
      });
    } catch (error) {
      console.error('Error fetching feedback for session', sessionId, ':', error);
      // Clear any existing feedback for this session on error
      setSessionFeedbacks(prev => {
        const { [sessionId]: _, ...rest } = prev;
        return rest;
      });
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const extractKeyLimits = (key: string): KeyLimits | null => {
    try {
      const parts = key.split('-');
      if (parts.length !== 3) return null;

      const validationId = parts[0];
      const limits = parts[1];
      if (limits.length !== 4) return null;

      const interviewLimit = parseInt(limits.substring(0, 2));
      const studentsPerInterview = parseInt(limits.substring(2, 4));

      return {
        validityDays: 30, // Fixed validity period
        interviewLimit: interviewLimit === 99 ? -1 : interviewLimit,
        studentsPerInterview: studentsPerInterview === 99 ? -1 : studentsPerInterview,
        usedInterviews: 0, // Will be updated from Firebase
        createdAt: new Date().toISOString() // Will be updated from Firebase
      };
    } catch (error) {
      console.error('Error extracting key limits:', error);
      return null;
    }
  };

  const validateKey = async (key: string): Promise<boolean> => {
    try {
      // Extract validation ID from key
      const validationId = key.split('-')[0];
      if (!validationId) return false;

      const keysRef = ref(database, 'hr_auth_keys');
      const snapshot = await get(keysRef);
      
      if (snapshot.exists()) {
        const keys = snapshot.val();
        let validKey = false;
        let keyData: any = null;

        // Find the matching key
        Object.entries(keys).forEach(([keyId, k]: [string, any]) => {
          if (k.value === key && k.active === true) {
            validKey = true;
            keyData = k;
          }
        });

        if (validKey && keyData) {
          // Check key validity period
          const createdDate = new Date(keyData.createdAt);
          const validUntil = new Date(createdDate.getTime() + (keyData.validityDays * 24 * 60 * 60 * 1000));
          
          if (validUntil < new Date()) {
            console.error('Key has expired');
            return false;
          }

          // Set key limits from stored data
          setKeyLimits({
            validityDays: keyData.validityDays,
            interviewLimit: keyData.interviewLimit || -1,
            studentsPerInterview: keyData.studentsPerInterview || 4,
            usedInterviews: keyData.usedInterviews || 0,
            createdAt: keyData.createdAt
          });

          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error validating key:', error);
      return false;
    }
  };

  const clearPreviousSessionData = async () => {
    try {
      // Clear from Firebase
      const sessionRef = ref(database, 'keys/variable/sessionid');
      const feedbackRef = ref(database, 'interview_feedback');
      
      await set(sessionRef, null);  // Delete all session IDs
      await set(feedbackRef, null); // Delete all feedback data
      
      // Clear from local storage
      localStorage.removeItem('hrSessions');
      
      // Clear from state
      setSessions([]);
      setSessionFeedbacks({});
      setSelectedCandidates({});
      setLatestSession(null);
    } catch (error) {
      console.error('Error clearing previous session data:', error);
      throw error;
    }
  };

  const createSession = async (emails: string[]) => {
    if (!profile || !keyLimits) return;

    // Validate roleplay prompt
    if (!roleplayPrompt.company || !roleplayPrompt.role || !roleplayPrompt.expectations) {
      alert('Please fill in all roleplay prompt fields');
      return;
    }

    setProcessingSession('creating');
    try {
      // Generate unique HR identifier using name, dob, and phone
      const hrIdentifier = `${profile.name}_${profile.dob}_${profile.phone}`;
      console.log('Clearing previous sessions for HR:', hrIdentifier);
      
      // Clear from sessions location
      const sessionsRef = ref(database, 'sessions');
      const sessionsSnapshot = await get(sessionsRef);
      if (sessionsSnapshot.exists()) {
        const allSessions = sessionsSnapshot.val();
        // Delete only sessions belonging to current HR
        for (const [key, session] of Object.entries(allSessions)) {
          const fbSession = session as FirebaseSession;
          if (fbSession.hrIdentifier === hrIdentifier) {
            await set(ref(database, `sessions/${key}`), null);
          }
        }
      }

      // Clear from keys/variable/sessionid
      const keySessionRef = ref(database, 'keys/variable/sessionid');
      const keySnapshot = await get(keySessionRef);
      if (keySnapshot.exists()) {
        const allKeySessions = keySnapshot.val();
        // Delete only sessions belonging to current HR
        for (const [key, session] of Object.entries(allKeySessions)) {
          const fbSession = session as FirebaseSession;
          if (fbSession.hrIdentifier === hrIdentifier) {
            await set(ref(database, `keys/variable/sessionid/${key}`), null);
          }
        }
      }
      
      // Clear local state
      setSessions([]);
      setLatestSession(null);
      setSessionFeedbacks({});
      
      // Generate new session
      const sessionId = generateSessionId(profile);
      
      // Format the roleplay prompt as a paragraph
      const formattedPrompt = `My company is ${roleplayPrompt.company}\nWe are interviewing for the role of ${roleplayPrompt.role}\nWe want candidates who are ${roleplayPrompt.expectations}`;
      
      const sessionData = {
        sessionId: sessionId,
        hrName: profile.name,
        hrCompany: profile.company,
        hrIdentifier: hrIdentifier,
        studentLimit: keyLimits.studentsPerInterview,
        currentStudents: 0,
        invitedEmails: emails,
        roleplayPrompt: formattedPrompt,
        createdAt: new Date().toISOString()
      };

      // Store in sessions/${sessionId}
      const newSessionRef = ref(database, `sessions/${sessionId}`);
      await set(newSessionRef, sessionData);

      // Also store in keys/variable/sessionid
      const newKeyRef = push(keySessionRef);
      await set(newKeyRef, sessionData);

      const newSession: Session = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        studentEmails: emails,
        emailsSent: false,
        roleplayPrompt
      };

      // Update local state with only the new session
      setSessions([newSession]);
      setLatestSession(newSession);
      setTempEmails([]);
      
      // Send invitations immediately after creating session
      await sendInvitations(newSession);
      
      // Update used interviews count in Firebase
      if (keyLimits.interviewLimit > 0) {
        const keysRef = ref(database, 'hr_auth_keys');
        const snapshot = await get(keysRef);
        if (snapshot.exists()) {
          const keys = snapshot.val();
          Object.entries(keys).forEach(async ([keyId, k]: [string, any]) => {
            if (k.value === authKey) {
              await set(ref(database, `hr_auth_keys/${keyId}/usedInterviews`), (k.usedInterviews || 0) + 1);
            }
          });
        }
      }

      // Close the modal after everything is done
      setShowRoleSelection(false);
      
      console.log('New session created successfully:', sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setProcessingSession(null);
    }
  };

  const sendInvitations = async (session: Session) => {
    setSendingEmails(true);
    try {
      const landingPageUrl = `${window.location.origin}/landing`;
      
      // Format the roleplay prompt as a paragraph
      const formattedPrompt = `My company is ${session.roleplayPrompt.company}\nWe are interviewing for the role of ${session.roleplayPrompt.role}\nWe want candidates who are ${session.roleplayPrompt.expectations}`;
      
      const subject = encodeURIComponent(`Interview Invitation - ${profile?.company} - AI-Based Assessment`);
      const body = encodeURIComponent(
`Dear Candidate,

Thank you for your interest in joining ${profile?.company}. We are excited to invite you to participate in our innovative AI-based interview assessment.

Interview Details:
- Platform: Mockello AI Interview System
- Session Code: ${session.id}

Interview Context:
${formattedPrompt}

Duration: 15-20 minutes
Deadline: Within 48 hours

Getting Started:
1. Visit our interview platform: ${landingPageUrl}
2. Enter the session code: ${session.id}
3. Complete your registration
4. Begin the interview process

Technical Requirements:
- Stable internet connection
- Working webcam and microphone
- Quiet environment
- Chrome/Firefox browser (latest version)

Important Guidelines:
- Ensure good lighting and clear audio
- Dress professionally
- Have your resume handy for reference
- Complete the interview in one sitting
- Answer all questions thoroughly and professionally

If you encounter any technical issues, please contact our support team immediately.

We look forward to your participation.

Best regards,
${profile?.name}
${profile?.company}
`);

      // Create a mailto link and programmatically click it
      const allEmails = session.studentEmails.join(',');
      const mailtoLink = document.createElement('a');
      mailtoLink.href = `mailto:${allEmails}?subject=${subject}&body=${body}`;
      document.body.appendChild(mailtoLink);
      mailtoLink.click();
      document.body.removeChild(mailtoLink);
      
      // Mark session as emails sent
      setSessions(prev => prev.map(s => {
        if (s.id === session.id) {
          return { ...s, emailsSent: true };
        }
        return s;
      }));

      // Show success message
      alert('Email client opened with all recipients. Please send the email to complete the process.');
      
    } catch (error) {
      console.error('Failed to send emails:', error);
      alert('Failed to send emails. Please try again.');
    } finally {
      setSendingEmails(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmailToSession = (sessionId: string) => {
    if (!newEmail.trim()) {
      setEmailError('Email cannot be empty');
      return;
    }
    if (!validateEmail(newEmail)) {
      setEmailError('Please enter a valid email');
      return;
    }

    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        if (session.studentEmails.includes(newEmail)) {
          setEmailError('Email already added');
          return session;
        }
        return {
          ...session,
          studentEmails: [...session.studentEmails, newEmail.trim()]
        };
      }
      return session;
    }));
    setNewEmail('');
    setEmailError('');
  };

  const removeEmailFromSession = (sessionId: string, email: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          studentEmails: session.studentEmails.filter(e => e !== email)
        };
      }
      return session;
    }));
  };

  const toggleCandidateSelection = (sessionId: string, item: string) => {
    setSelectedCandidates(prev => {
      const sessionSelections = prev[sessionId] || new Set();
      const newSelections = new Set(sessionSelections);
      
      if (newSelections.has(item)) {
        newSelections.delete(item);
      } else {
        newSelections.add(item);
      }
      
      return {
        ...prev,
        [sessionId]: newSelections
      };
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = e.target.value;
    setEmailError('');
    setNewEmail(value);
  };

  const sendQualificationEmails = async (session: Session) => {
    setProcessingSession(session.id);
    try {
      const selectedRegs = selectedCandidates[session.id] || new Set();
      const feedbacks = sessionFeedbacks[session.id] || [];
      
      // Separate qualified and non-qualified candidates
      const qualifiedCandidates = feedbacks.filter(f => selectedRegs.has(f.registerNumber));
      const nonQualifiedCandidates = feedbacks.filter(f => !selectedRegs.has(f.registerNumber));
      
      // Format selected candidates list
      const selectedCandidatesList = qualifiedCandidates
        .map((candidate, index) => 
          `${index + 1}. ${candidate.name} (${candidate.email || candidate.registerNumber})
           Performance: ${candidate.performancePercentage}%
           Rating: ${candidate.feedback.match(/★+½?(?=☆|$)/) || '★'}`
        )
        .join('\n\n');
      
      // Send emails to qualified candidates
      for (const candidate of qualifiedCandidates) {
        if (candidate.email) {
          const subject = encodeURIComponent(`Congratulations! Selected for Next Round - ${profile?.company}`);
          const body = encodeURIComponent(
`Dear ${candidate.name},

Congratulations! Based on your performance in the initial interview assessment, we are pleased to inform you that you have been selected to proceed to the next round of interviews with ${profile?.company}.

Your Performance Metrics:
• Overall Score: ${candidate.performancePercentage}%
• Total Responses: ${candidate.transcriptionCount}
• Communication Score: ${candidate.totalWords} words

Next Steps:
We will be conducting the next round of interviews shortly. You will receive a separate email with the venue details and timing.

Best regards,
${profile?.name}
${profile?.company}`
          );
          window.location.href = `mailto:${candidate.email}?subject=${subject}&body=${body}`;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Send emails to non-qualified candidates
      for (const candidate of nonQualifiedCandidates) {
        if (candidate.email) {
          const subject = encodeURIComponent(`Interview Results - ${profile?.company}`);
          const body = encodeURIComponent(
`Dear ${candidate.name},

Thank you for participating in the interview process with ${profile?.company}.

While we appreciate your interest and the time you invested in the interview process, we regret to inform you that we will not be moving forward with your application at this time.

We encourage you to apply for future opportunities that match your skills and experience.

Best regards,
${profile?.name}
${profile?.company}`
          );
          window.location.href = `mailto:${candidate.email}?subject=${subject}&body=${body}`;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      alert('All emails have been processed. Please check your email client.');
    } catch (error) {
      console.error('Error sending qualification emails:', error);
      alert('Failed to send some emails. Please try again.');
    } finally {
      setProcessingSession(null);
      setShowVenueModal(false);
    }
  };

  const FeedbackCard = ({ feedback, rank }: { feedback: FeedbackData; rank: number }) => {
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const isSelected = selectedCandidates[feedback.sessionId]?.has(feedback.registerNumber) || false;

    // Extract star rating from feedback text
    const getStarRating = (feedbackText: string) => {
      const starMatch = feedbackText.match(/★+½?(?=☆|$)/);
      return starMatch ? starMatch[0] : '';
    };

    // Format the feedback for display
    const formatFeedback = (feedbackText: string) => {
      // Split feedback into sections
      const sections = feedbackText.split('\n\n').filter(Boolean);
      
      const formattedSections = sections.map(section => {
        // Remove sensitive information
        if (section.toLowerCase().includes('hiring recommendation') ||
            section.toLowerCase().includes('physical presentation') ||
            section.toLowerCase().includes('appearance') ||
            section.toLowerCase().includes('attire') ||
            section.toLowerCase().includes('dress code')) {
          return null;
        }

        // Format evaluation sections
        if (section.includes('Evaluation:')) {
          const [title, ...content] = section.split('\n');
          return `**${title}**\n${content.join('\n')}`;
        }

        return section;
      }).filter(Boolean);

      return formattedSections.join('\n\n');
    };

    return (
      <>
        <div 
          className={`mt-4 p-4 bg-black/30 border ${
            isSelected ? 'border-[#BE185D]' : 'border-[#BE185D]/20'
          } rounded-xl transition-all duration-300 hover:border-[#BE185D]/40`}
        >
          <div className="grid grid-cols-8 gap-4 items-center">
            <div className="text-center">
              <div className={`text-lg font-bold ${
                rank === 1 ? 'text-yellow-500' :
                rank === 2 ? 'text-gray-400' :
                rank === 3 ? 'text-amber-700' :
                'text-gray-600'
              }`}>
                #{rank}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-white font-medium">{feedback.name}</p>
              <p className="text-gray-400 text-sm">{feedback.email || feedback.registerNumber}</p>
            </div>
            <div className="text-center">
              <p className="text-[#BE185D] font-bold text-xl">{feedback.performancePercentage}%</p>
              <p className="text-gray-400 text-xs">Performance</p>
            </div>
            <div className="text-center">
              <p className="text-white font-medium">{getStarRating(feedback.feedback) || '★'}</p>
              <p className="text-gray-400 text-xs">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-white font-medium">{feedback.transcriptionCount}</p>
              <p className="text-gray-400 text-xs">Responses</p>
            </div>
            <div className="text-center">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="px-3 py-1 bg-[#BE185D]/20 text-[#BE185D] rounded-lg hover:bg-[#BE185D]/30 transition-colors text-sm"
              >
                View Feedback
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCandidateSelection(feedback.sessionId, feedback.registerNumber);
                }}
                className={`p-2 rounded-full transition-colors ${
                  isSelected 
                    ? 'bg-[#BE185D] text-white' 
                    : 'bg-[#BE185D]/20 text-[#BE185D] hover:bg-[#BE185D]/30'
                }`}
              >
                {isSelected ? '✓' : ''}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black/90 p-8 rounded-2xl border border-[#BE185D]/20 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#BE185D] mb-1">{feedback.name}</h2>
                  <p className="text-gray-400">{feedback.email || feedback.registerNumber}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#BE185D] mb-1">
                    {feedback.performancePercentage}%
                  </div>
                  <div className="text-xl text-[#BE185D]">{getStarRating(feedback.feedback)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-black/20 p-4 rounded-lg border border-[#BE185D]/10">
                  <p className="text-gray-400 text-sm">Total Responses</p>
                  <p className="text-2xl font-bold text-white">{feedback.transcriptionCount}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-lg border border-[#BE185D]/10">
                  <p className="text-gray-400 text-sm">Words Spoken</p>
                  <p className="text-2xl font-bold text-white">{feedback.totalWords}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-lg border border-[#BE185D]/10">
                  <p className="text-gray-400 text-sm">Interview Date</p>
                  <p className="text-lg font-bold text-white">{feedback.interviewDate}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="bg-black/20 p-6 rounded-xl border border-[#BE185D]/10">
                  <h3 className="text-lg font-semibold text-[#BE185D] mb-4">Feedback Summary</h3>
                  <div className="text-white whitespace-pre-line prose prose-invert">
                    {formatFeedback(feedback.feedback)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-[#BE185D]/10">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </>
    );
  };

  const SessionCard = ({ session }: { session: Session }) => {
    const feedbacks = sessionFeedbacks[session.id] || [];
    const selectedCount = (selectedCandidates[session.id] || new Set()).size;

    return (
      <div className="flex flex-col gap-6 relative">
        {/* Session Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/30 p-4 rounded-xl border border-[#BE185D]/20">
          <div>
            <div className="font-mono text-lg text-white break-all">
              {session.id}
            </div>
            <div className="text-sm text-[#BE185D] mt-1">
              Role: {session.roleplayPrompt.role}
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(session.id)}
            className="px-4 py-2 bg-[#BE185D]/20 text-[#BE185D] rounded-lg hover:bg-[#BE185D]/30 transition-colors whitespace-nowrap"
          >
            Copy ID
          </button>
        </div>

        {/* Email Selection Section */}
        <div className="bg-black/30 p-4 rounded-xl border border-[#BE185D]/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#BE185D]">Email Recipients</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const allEmails = session.studentEmails;
                  const currentSelected = selectedCandidates[session.id] || new Set();
                  
                  if (currentSelected.size === allEmails.length) {
                    setSelectedCandidates(prev => ({
                      ...prev,
                      [session.id]: new Set()
                    }));
                  } else {
                    setSelectedCandidates(prev => ({
                      ...prev,
                      [session.id]: new Set(allEmails)
                    }));
                  }
                }}
                className="px-3 py-1.5 bg-[#BE185D]/20 text-[#BE185D] rounded-lg hover:bg-[#BE185D]/30 transition-colors text-sm"
              >
                {selectedCount === session.studentEmails.length ? 'Unselect All' : 'Select All'}
              </button>
              <div className="text-sm text-gray-400">
                {selectedCount} of {session.studentEmails.length}
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {session.studentEmails.map((email) => {
              const feedback = feedbacks.find(f => f.email === email);
              return (
                <div 
                  key={email}
                  className={`p-3 rounded-lg border ${
                    selectedCandidates[session.id]?.has(email)
                      ? 'border-[#BE185D] bg-[#BE185D]/10'
                      : 'border-[#BE185D]/20 bg-black/20'
                  } flex items-center justify-between transition-all duration-200`}
                >
                  <div className="flex items-center gap-3">
                    {feedback?.registerNumber && (
                      <span className="text-[#BE185D] text-sm font-mono">{feedback.registerNumber}</span>
                    )}
                    <span className="text-white">{email}</span>
                  </div>
                  <button
                    onClick={() => toggleCandidateSelection(session.id, email)}
                    className={`p-2 rounded-full transition-colors ${
                      selectedCandidates[session.id]?.has(email)
                        ? 'bg-[#BE185D] text-white'
                        : 'bg-[#BE185D]/20 text-[#BE185D] hover:bg-[#BE185D]/30'
                    }`}
                  >
                    {selectedCandidates[session.id]?.has(email) ? '✓' : ''}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interview Results Section */}
        <div className="bg-black/30 p-4 rounded-xl border border-[#BE185D]/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#BE185D]">Interview Results</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const allRegs = feedbacks.map(f => f.registerNumber);
                  const currentSelected = selectedCandidates[session.id] || new Set();
                  
                  if (currentSelected.size === allRegs.length) {
                    setSelectedCandidates(prev => ({
                      ...prev,
                      [session.id]: new Set()
                    }));
                  } else {
                    setSelectedCandidates(prev => ({
                      ...prev,
                      [session.id]: new Set(allRegs)
                    }));
                  }
                }}
                className="px-3 py-1.5 bg-[#BE185D]/20 text-[#BE185D] rounded-lg hover:bg-[#BE185D]/30 transition-colors text-sm"
              >
                {selectedCount === feedbacks.length ? 'Unselect All' : 'Select All'}
              </button>
              <div className="text-sm text-gray-400">
                {selectedCount} of {feedbacks.length}
              </div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {isLoadingFeedback ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#BE185D]"></div>
              </div>
            ) : feedbacks.length > 0 ? (
              feedbacks.map((feedback, index) => (
                <FeedbackCard 
                  key={feedback.registerNumber} 
                  feedback={feedback}
                  rank={index + 1}
                />
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                No feedback available
              </div>
            )}
          </div>
        </div>

        {/* Fixed Email Send Section */}
        {selectedCount > 0 && (
          <div className="mt-4 bg-black/30 p-4 rounded-xl border border-[#BE185D]/20 backdrop-blur-sm sticky bottom-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const selectedEmails = Array.from(selectedCandidates[session.id] || new Set())
                    .map(item => {
                      if (item.includes('@')) return item;
                      const feedback = feedbacks.find(f => f.registerNumber === item);
                      return feedback?.email;
                    })
                    .filter(Boolean)
                    .join(',');

                  const selectedStudents = feedbacks
                    .filter(f => selectedCandidates[session.id]?.has(f.registerNumber))
                    .map(f => `${f.name} (${f.registerNumber})`)
                    .join('\n');

                  const subject = encodeURIComponent(`Next Round Interview Details - ${profile?.company}`);
                  const body = encodeURIComponent(
`Dear Candidate,

We hope this email finds you well. We are pleased to inform you that based on your performance in the initial Candidate evaluation interview round with Mockello, you have been selected to proceed to the next stage of our interview process.

Selected Candidates:
${selectedStudents}

We will be conducting the next round of interviews shortly and we request you to report to the following venue:
-enter venue here

Important Notes:
- Please carry a copy of your resume
- Bring valid government-issued photo identification
- Arrive at least 15 minutes before your scheduled time
- Dress code: Professional attire

If you have any questions or need to reschedule, please respond to this email at your earliest convenience.

Best regards,
${profile?.name}
${profile?.company}
`);
                  window.location.href = `mailto:${selectedEmails}?subject=${subject}&body=${body}`;
                }}
                className="px-6 py-3 bg-[#BE185D] text-white rounded-lg hover:bg-[#BE185D]/80 transition-colors whitespace-nowrap"
              >
                Send Emails to Selected Recipients
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const clearAllSessions = async () => {
    if (window.confirm('Are you sure you want to delete all session data? This action cannot be undone.')) {
      try {
        // Clear from Firebase
        const sessionRef = ref(database, 'keys/variable/sessionid');
        const feedbackRef = ref(database, 'interview_feedback');
        
        await set(sessionRef, null);  // Delete all session IDs
        await set(feedbackRef, null); // Delete all feedback data
        
        // Clear from local storage
        localStorage.removeItem('hrSessions');
        
        // Clear from state
        setSessions([]);
        setSessionFeedbacks({});
        setSelectedCandidates({});
        setLatestSession(null);
        
        alert('All session data has been successfully cleared.');
      } catch (error) {
        console.error('Error clearing sessions:', error);
        alert('Failed to clear some data. Please try again.');
      }
    }
  };

  // Add loading state while validating
  if (isValidating) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BE185D] mb-4"></div>
          <p className="text-gray-400">Validating credentials...</p>
        </div>
      </div>
    );
  }

  if (!profile || !authKey) return null;

  return (
    <>
      <Head>
        <title>HR Dashboard - Mockello</title>
        <meta name="description" content="Manage your recruitment process with Mockello" />
      </Head>

      <main className="bg-black min-h-screen text-white">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#BE185D_0%,_transparent_25%)] opacity-20 animate-pulse"></div>
          <div className="absolute inset-0 bg-black bg-opacity-90"></div>
        </div>

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-[#BE185D]/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">Mockello</span>
              </Link>
              <div className="flex items-center gap-6">
                <button
                  onClick={clearAllSessions}
                  className="px-4 py-2 bg-red-600/20 text-red-500 rounded-lg hover:bg-red-600/30 transition-colors"
                >
                  Clear All Sessions
                </button>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-[#BE185D] hover:text-white transition-colors"
                >
                  {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="relative pt-32 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* Key Usage Limits Section - Moved to top */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-gray-900/50 to-[#BE185D]/5 p-8 rounded-2xl border border-[#BE185D]/20 backdrop-blur-sm mb-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
                  Key Usage Limits
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/30 p-6 rounded-xl border border-[#BE185D]/20">
                  <h3 className="text-lg font-semibold text-[#BE185D] mb-2">Interviews</h3>
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-white">
                      {(keyLimits?.interviewLimit ?? -1) === -1 ? '∞' : 
                       Math.max(0, (keyLimits?.interviewLimit ?? 0) - (keyLimits?.usedInterviews ?? 0))}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">
                      {(keyLimits?.interviewLimit ?? -1) === -1 ? 'Unlimited' : 'Remaining'}
                    </div>
                  </div>
                  {keyLimits?.interviewLimit !== -1 && (
                    <div className="mt-2 text-sm text-gray-400">
                      Used: {keyLimits?.usedInterviews || 0} / {keyLimits?.interviewLimit}
                    </div>
                  )}
                  {(keyLimits?.interviewLimit ?? -1) !== -1 && 
                   ((keyLimits?.interviewLimit ?? 0) - (keyLimits?.usedInterviews ?? 0)) <= 5 && (
                    <div className="mt-2 text-sm text-red-400">
                      Running low on interviews! Contact support to extend your limit.
                    </div>
                  )}
                </div>

                <div className="bg-black/30 p-6 rounded-xl border border-[#BE185D]/20">
                  <h3 className="text-lg font-semibold text-[#BE185D] mb-2">Students per Interview</h3>
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-white">
                      {keyLimits?.studentsPerInterview === -1 ? '∞' : keyLimits?.studentsPerInterview}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">
                      {keyLimits?.studentsPerInterview === -1 ? 'Unlimited' : 'Students'}
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 p-6 rounded-xl border border-[#BE185D]/20">
                  <h3 className="text-lg font-semibold text-[#BE185D] mb-2">Key Validity</h3>
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-white">
                      {Math.max(0, Math.ceil((new Date(keyLimits?.createdAt || '').getTime() + 
                       (keyLimits?.validityDays || 0) * 24 * 60 * 60 * 1000 - new Date().getTime()) / 
                       (24 * 60 * 60 * 1000)))}
                    </div>
                    <div className="text-gray-400 text-sm mb-1">Days Left</div>
                  </div>
                  {Math.ceil((new Date(keyLimits?.createdAt || '').getTime() + 
                    (keyLimits?.validityDays || 0) * 24 * 60 * 60 * 1000 - new Date().getTime()) / 
                    (24 * 60 * 60 * 1000)) <= 5 && (
                    <div className="mt-2 text-sm text-red-400">
                      Key expiring soon! Contact support to extend validity.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 text-center">
                <a
                  href="mailto:support@mockello.com?subject=Request%20to%20Extend%20Key%20Limits"
                  className="text-[#BE185D] hover:text-white transition-colors text-sm"
                >
                  Need more capacity? Contact our support team
                </a>
              </div>
            </motion.div>

            {/* Interview Sessions Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-gray-900/50 to-[#BE185D]/5 p-8 rounded-2xl border border-[#BE185D]/20 backdrop-blur-sm mb-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
                  Interview Sessions
                </h1>
                <button
                  onClick={() => setShowRoleSelection(true)}
                  className="px-6 py-3 bg-gradient-to-r from-[#BE185D] to-[#BE185D]/80 text-white rounded-full hover:shadow-[0_0_30px_-5px_#BE185D] transition-all duration-300"
                >
                  Create Interview Session
                </button>
              </div>

              {/* Session History */}
              <div className="space-y-4">
                {/* Newest Session */}
                {sessions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-xl bg-[#BE185D]/10 border-[#BE185D]/30 border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-[#BE185D]">Latest Session</h3>
                      <div className="text-sm text-gray-400">
                        {formatDate(sessions[sessions.length - 1].createdAt)}
                      </div>
                    </div>
                    <SessionCard session={sessions[sessions.length - 1]} />
                  </motion.div>
                )}

                {/* Previous Sessions Dropdown */}
                {sessions.length > 1 && (
                  <div className="mt-8">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-4"
                    >
                      <button
                        onClick={() => setShowPreviousSessions(!showPreviousSessions)}
                        className="flex items-center justify-between w-full px-6 py-4 bg-black/30 border border-[#BE185D]/10 rounded-xl hover:border-[#BE185D]/30 transition-all duration-300"
                      >
                        <span className="text-lg font-semibold text-gray-300">Previous Sessions</span>
                        <span className={`transform transition-transform duration-300 ${showPreviousSessions ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                    </motion.div>

                    {showPreviousSessions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        {sessions.slice(0, -1).reverse().map((session, index) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 rounded-xl bg-black/30 border border-[#BE185D]/10"
                          >
                            <SessionCard session={session} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {sessions.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No sessions created yet. Click the button above to create your first session.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Profile Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-gray-900/50 to-[#BE185D]/5 p-8 rounded-2xl border border-[#BE185D]/20 backdrop-blur-sm mb-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
                  Profile Information
                </h2>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="px-4 py-2 text-[#BE185D] hover:text-white transition-colors"
                >
                  {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>

              {isEditingProfile && editedProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev!, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="dob" className="block text-gray-300 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      id="dob"
                      value={editedProfile.dob}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev!, dob: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-gray-300 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev!, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-gray-300 mb-2">Company Name</label>
                    <input
                      type="text"
                      id="company"
                      value={editedProfile.company}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev!, company: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Hiring Roles</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="flex-1 px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors"
                        placeholder="Add a role"
                      />
                      <button
                        type="button"
                        onClick={addHiringRole}
                        className="px-4 py-2 bg-[#BE185D]/20 text-[#BE185D] rounded-lg hover:bg-[#BE185D]/30 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editedProfile.hiringRoles.map((role, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-[#BE185D]/10 text-[#BE185D] rounded-full flex items-center gap-2"
                        >
                          {role}
                          <button
                            type="button"
                            onClick={() => removeHiringRole(index)}
                            className="text-[#BE185D] hover:text-white transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full px-8 py-4 bg-gradient-to-r from-[#BE185D] to-[#BE185D]/80 text-white rounded-full hover:shadow-[0_0_30px_-5px_#BE185D] transition-all duration-300"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#BE185D] mb-2">Profile Information</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400">Full Name</p>
                        <p className="text-white">{profile.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Date of Birth</p>
                        <p className="text-white">{profile.dob}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Phone Number</p>
                        <p className="text-white">{profile.phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Company</p>
                        <p className="text-white">{profile.company}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#BE185D] mb-2">Hiring Roles</h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.hiringRoles.map((role, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-[#BE185D]/10 text-[#BE185D] rounded-full"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Role Selection Modal */}
      {showRoleSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/90 p-8 rounded-2xl border border-[#BE185D]/20 max-w-md w-full mx-4 relative"
          >
            <h2 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
              Create Interview Session
            </h2>

            {/* Roleplay Prompt Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#BE185D] mb-4">Interview Context</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Complete the interview scenario:</label>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={roleplayPrompt.company}
                      onChange={(e) => setRoleplayPrompt(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="My company is ..."
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white placeholder-gray-500"
                    />
                    <input
                      type="text"
                      value={roleplayPrompt.role}
                      onChange={(e) => setRoleplayPrompt(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="We are interviewing for the role of ..."
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white placeholder-gray-500"
                    />
                    <textarea
                      value={roleplayPrompt.expectations}
                      onChange={(e) => setRoleplayPrompt(prev => ({ ...prev, expectations: e.target.value }))}
                      placeholder="We want candidates who are ..."
                      rows={3}
                      className="w-full px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white placeholder-gray-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Email Input Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#BE185D] mb-4">Add Participant Emails</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={handleEmailChange}
                    placeholder="Enter email address"
                    className="flex-1 px-4 py-3 bg-black/50 border border-[#BE185D]/20 rounded-lg focus:outline-none focus:border-[#BE185D] transition-colors text-white placeholder-gray-500"
                  />
                  <button
                    onClick={() => {
                      if (newEmail && !emailError) {
                        setNewEmail('');
                        setEmailError('');
                        setTempEmails(prev => [...prev, newEmail]);
                      }
                    }}
                    className="px-4 py-2 bg-[#BE185D]/20 text-[#BE185D] rounded-lg hover:bg-[#BE185D]/30 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {emailError && (
                  <p className="text-red-500 text-sm">{emailError}</p>
                )}
              </div>
              
              {/* Added Emails List */}
              <div className="mt-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                {tempEmails.map((email, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg mb-2">
                    <span className="text-gray-300">{email}</span>
                    <button
                      onClick={() => setTempEmails(prev => prev.filter((_, i) => i !== index))}
                      className="text-[#BE185D] hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Create and Send Invitations Button */}
            <button
              onClick={() => {
                if (!roleplayPrompt.company || !roleplayPrompt.role || !roleplayPrompt.expectations) {
                  alert('Please complete all interview context fields');
                  return;
                }
                if (tempEmails.length > 0) {
                  createSession(tempEmails);
                  setTempEmails([]);
                  setShowRoleSelection(false);
                } else {
                  alert('Please add at least one email address');
                }
              }}
              className="w-full px-6 py-3 bg-[#BE185D] text-white rounded-lg hover:bg-[#BE185D]/80 transition-colors"
            >
              Create Session & Send Invitations
            </button>

            <button
              onClick={() => {
                setShowRoleSelection(false);
                setRoleplayPrompt({ company: '', role: '', expectations: '' });
                setTempEmails([]);
              }}
              className="w-full px-6 py-3 mt-6 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(190, 24, 93, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(190, 24, 93, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(190, 24, 93, 0.5);
        }
      `}</style>
    </>
  );
} 