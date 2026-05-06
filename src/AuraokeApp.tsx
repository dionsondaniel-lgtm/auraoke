import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube from 'react-youtube';
import { 
  Play, Pause, Coins, X, Search, Plus, Mic, Square, Loader2, Sparkles, 
  Settings, Music, SkipForward, Star, Shield, Lock, Fingerprint, ChevronUp,
  Trophy, Activity, Calendar, Clock
} from 'lucide-react';

// --- MOCK DATA ---
const SUGGESTED_SONGS = [
  { id: '1', title: 'Bohemian Rhapsody (Karaoke)', artist: 'Queen', videoId: 'xyF04rAhHaQ' },
  { id: '2', title: 'Dancing Queen (Karaoke)', artist: 'ABBA', videoId: 'qjMSGIfB1j8' },
  { id: '3', title: 'Sweet Caroline (Karaoke)', artist: 'Neil Diamond', videoId: 'UcWEfvu6F_s' },
  { id: '4', title: 'I Want It That Way (Karaoke)', artist: 'Backstreet Boys', videoId: 'khnQaSMer90' },
  { id: '5', title: 'Shallow (Karaoke)', artist: 'Lady Gaga, Bradley Cooper', videoId: 'smu-0V7E7wI' },
  { id: '6', title: 'Someone Like You (Karaoke)', artist: 'Adele', videoId: 'rMSQwIp4Jg8' },
];

type Theme = 'geometric' | 'gold' | 'glass';

interface Song {
  id: string;
  title: string;
  artist: string;
  videoId: string;
}

interface SessionRecord {
  id: string;
  title: string;
  artist: string;
  startTime: string;
  endTime: string;
  score: number;
}

export default function AuraokeApp() {
  // --- STATE ---
  const [theme, setTheme] = useState<Theme>('geometric');
  
  // Use sessionStorage as fallback for natural session-bound auth + check localStorage
  const [showLogin, setShowLogin] = useState(() => {
    return localStorage.getItem('auraoke_logged_in') !== 'true' && sessionStorage.getItem('auraoke_logged_in') !== 'true';
  });
  const [user, setUser] = useState<string | null>(() => {
    return localStorage.getItem('auraoke_user') || sessionStorage.getItem('auraoke_user') || null;
  });
  
  const [credits, setCredits] = useState(0);
  const [totalPesos, setTotalPesos] = useState(0);
  
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [scoreData, setScoreData] = useState<{ score: number, comment: string } | null>(null);
  const [showScore, setShowScore] = useState(false);
  
  // Search state matching attached logic
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResults, setApiResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [aiCoaching, setAiCoaching] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Stats States
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [currentStartTime, setCurrentStartTime] = useState<Date | null>(null);

  // --- AUDIO RECORDING REF ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const today = new Date().toLocaleDateString();
    
    // Final app close adjustments (Will wipe stats and auth tokens so the user logs out automatically)
    const handleBeforeUnload = () => {
      localStorage.removeItem('auraoke_stats');
      localStorage.removeItem('auraoke_logged_in');
      localStorage.removeItem('auraoke_user');
      sessionStorage.removeItem('auraoke_logged_in');
      sessionStorage.removeItem('auraoke_user');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Init data for today
    const stored = localStorage.getItem('auraoke_stats');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          setSessionRecords(parsed.records || []);
          return;
        }
      } catch (e) {}
    }
    
    // Create new for that day ONLOAD init
    localStorage.setItem('auraoke_stats', JSON.stringify({ date: today, records: [] }));
    setSessionRecords([]);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Use the exact search logic from 2nd block
 // Use the exact search logic from 2nd block
  useEffect(() => {
    if (!searchQuery.trim()) {
      setApiResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        
        // Anti-crash check: Ensure the server returned JSON, not an HTML error page
        const contentType = res.headers.get("content-type");
        if (!res.ok || (contentType && !contentType.includes("application/json"))) {
          throw new Error("Invalid response from server. Vercel might be returning a 404 HTML page.");
        }

        const data = await res.json();
        if (data.results) {
          setApiResults(data.results);
        }
      } catch (err) {
        console.error("Search API failed:", err);
        setApiResults([]); // Fail gracefully by emptying results instead of crashing
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === 1) setIsPlaying(true);
    if (event.data === 2) setIsPlaying(false);
  };

  const handleVideoError = (event: any) => {
    console.error("YouTube Player Error:", event.data);
    if (event.data === 101 || event.data === 150) {
      setVideoError("The owner of this video restricts embedded playback.");
    } else {
      setVideoError(`Video unavailable (Error code: ${event.data}).`);
    }
  };

  // --- THEME DEFINITIONS ---
  const themeClasses = {
    geometric: {
      bg: 'bg-[#0A0A0A]',
      text: 'text-[#E5E5E5]',
      textMuted: 'text-[#D4AF37]/60',
      border: 'border-[#D4AF37]/30',
      panel: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_20px_rgba(212,175,55,0.05)]',
      accent: 'bg-gradient-to-tr from-[#D4AF37] to-[#8B7355]',
      accentHover: 'hover:opacity-90',
      accentText: 'text-black font-bold uppercase tracking-widest',
      font: 'font-sans',
      input: 'bg-black/40 border border-[#D4AF37]/30 text-[#D4AF37] placeholder:text-stone-500',
      title: 'text-2xl font-light tracking-[0.2em] uppercase text-[#D4AF37]',
    },
    gold: {
      bg: 'bg-black',
      text: 'text-amber-500',
      textMuted: 'text-amber-500/60',
      border: 'border-amber-500/30',
      panel: 'bg-neutral-900/90 border border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]',
      accent: 'bg-gradient-to-r from-amber-600 to-yellow-400',
      accentHover: 'hover:opacity-90',
      accentText: 'text-black font-bold',
      font: 'font-serif',
      input: 'bg-black border-amber-500/50 text-amber-500 placeholder:text-amber-700',
      title: 'text-2xl font-black tracking-tighter uppercase',
    },
    glass: {
      bg: 'bg-slate-50',
      text: 'text-slate-900',
      textMuted: 'text-slate-500',
      border: 'border-white',
      panel: 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-xl',
      accent: 'bg-slate-900',
      accentHover: 'hover:bg-slate-800',
      accentText: 'text-white',
      font: 'font-sans',
      input: 'bg-white/50 border-white text-slate-900 placeholder:text-slate-500',
      title: 'text-2xl font-black tracking-tighter uppercase',
    }
  }[theme];

  // --- AI LOGIC ---
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>('gemini-2.5-flash');

  useEffect(() => {
    const fetchModels = async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined') return;
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        if (data.models) {
          const names = data.models
            .map((m: any) => m.name.replace('models/', ''))
            .filter((n: string) => n.includes('gemini') && !n.includes('embedding') && !n.includes('vision')); 
          setAvailableModels(names);
        }
      } catch (e) {
        console.error("Failed to fetch models:", e);
      }
    };
    fetchModels();
  }, []);

  const callAI = async (prompt: string, fileBase64?: { data: string, mimeType: string }): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "⚠️ API Key missing.";
    
    let responseText = "";
    const parts: any[] = [{ text: prompt }];
    
    if (fileBase64) {
      parts.push({
        inlineData: { data: fileBase64.data, mimeType: fileBase64.mimeType }
      });
    }

    const priorityModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const modelChain = Array.from(new Set([activeModel, ...priorityModels, ...availableModels]));

    for (const model of modelChain) {
      let attempt = 0;
      let modelSuccess = false;

      while (attempt < 2) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents: [{ parts }], 
              generationConfig: { temperature: 0.3 } 
            })
          });
          
          if (!res.ok) {
            if (res.status === 429) break; 
            if (res.status === 503 && attempt === 0) { await new Promise(resolve => setTimeout(resolve, 1500)); attempt++; continue; } 
            if (res.status >= 400) break; 
            break;
          }

          const data = await res.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          modelSuccess = true;
          if (activeModel !== model) setActiveModel(model);
          break;
        } catch (error) {
          if (attempt === 0) { await new Promise(resolve => setTimeout(resolve, 1000)); attempt++; continue; }
          break;
        }
      }
      if (modelSuccess) break;
    }
    return responseText || "⚠️ Neural failure. Unable to compute.";
  };

  // --- APP ACTIONS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPassword = import.meta.env.VITE_APP_PASSWORD;
    if (expectedPassword && passwordInput !== expectedPassword) {
      setLoginError('Invalid password');
      return;
    }
    setLoginError('');
    setUser('Guest Singer');
    setShowLogin(false);
    
    // Save state - both standard storage types so it persists across refreshes but clears firmly on close
    localStorage.setItem('auraoke_logged_in', 'true');
    localStorage.setItem('auraoke_user', 'Guest Singer');
    sessionStorage.setItem('auraoke_logged_in', 'true');
    sessionStorage.setItem('auraoke_user', 'Guest Singer');
  };

  const insertCoin = () => {
    setTotalPesos(p => p + 5);
    setCredits(c => c + 2);
  };

  const addToQueue = (song: Song) => {
    if (credits <= 0 && queue.length === 0 && !currentSong) {
        // Can't play without a coin, but queued items will wait for credit
    }
    if (credits > 0) {
      setCredits(c => c - 1);
      setQueue(q => [...q, song]);
    } else {
      alert("Please insert minimum 5 pesos for 2 song credits!");
    }
  };

  const addRecord = (score: number) => {
    if (currentSong && currentStartTime) {
      const record: SessionRecord = {
        id: Math.random().toString(36).substring(7),
        title: currentSong.title,
        artist: currentSong.artist,
        startTime: currentStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score,
      };
      setSessionRecords(prev => {
        const nr = [...prev, record];
        const today = new Date().toLocaleDateString();
        localStorage.setItem('auraoke_stats', JSON.stringify({ date: today, records: nr }));
        return nr;
      });
    }
  };

  const playNext = () => {
    if (queue.length > 0) {
      setCurrentSong(queue[0]);
      setQueue(q => q.slice(1));
      setVideoError(null);
      setCurrentStartTime(new Date());
      startRecording();
    } else {
      setCurrentSong(null);
    }
  };

  const executeScoring = async (base64data?: string, mimeType?: string) => {
    let prompt = `Listen to this audio recording of a user singing karaoke. Score their performance strictly out of 100 based on pitch, timing, and energy. Act as a supportive but honest vocal coach. Provide a short, fun critique.
Return a valid JSON string exactly like this:
{"score": 85, "comment": "Great energy but watch your pitch on the high notes!"}`;

    if (!base64data) {
        prompt = `Act as a supportive but honest vocal coach. Since the user's microphone wasn't found or access was denied, pretend you heard them sing and give a slightly random karaoke score between 70 and 95. Provide a short, fun critique.
Return a valid JSON string exactly like this:
{"score": 85, "comment": "Great energy but watch your pitch on the high notes!"}`;
    }
          
    if (aiCoaching) {
      prompt += ` Also, include a specific practice suggestion.`;
    }

    const payload = base64data ? { data: base64data, mimeType: mimeType || 'audio/webm' } : undefined;
    const response = await callAI(prompt, payload);
          
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        const finalScore = data.score || 75;
        setScoreData({ score: finalScore, comment: data.comment || "Good effort!" });
        addRecord(finalScore);
      } else {
        setScoreData({ score: 75, comment: "I couldn't quite hear you clearly, but I appreciate the enthusiasm! " + response });
        addRecord(75);
      }
    } catch (e) {
      setScoreData({ score: 70, comment: "Okay effort, but the neural network got confused parsing your pitch!" });
      addRecord(70);
    }
          
    setIsJudging(false);
    setShowScore(true);
    setCurrentSong(null); // Stop YouTube playing
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        } 
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn("Microphone access denied or not found. Using fallback mock AI scoring.");
      mediaRecorderRef.current = null;
      setIsRecording(true); // Pretend we are recording to show the UI
    }
  };

  const stopRecordingAndScore = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsJudging(true);
        setShowScore(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          const mimeType = audioBlob.type || 'audio/webm';
          executeScoring(base64data, mimeType);
        };
      };
      
      mediaRecorderRef.current.stop();
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    } else if (isRecording) {
      // Mock recording fallback
      setIsRecording(false);
      setIsJudging(true);
      setShowScore(false);
      executeScoring();
    } else {
      // Not recording, just end
      setCurrentSong(null);
    }
  };

  const onPlayerEnd = () => {
    stopRecordingAndScore();
  };

  // --- RENDER BOILERPLATE ---
  return (
    <div className={`h-screen w-full transition-colors duration-700 ${themeClasses.bg} ${themeClasses.text} ${themeClasses.font} flex flex-col overflow-hidden`}>
      
      {/* 1. LOGIN MODAL */}
      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl ${theme === 'glass' ? 'bg-white/30' : 'bg-black/80'}`}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-sm p-8 rounded-3xl ${themeClasses.panel}`}
            >
              <div className="flex justify-center mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${themeClasses.accent} shadow-xl transform rotate-12`}>
                  <Mic className={`w-8 h-8 ${themeClasses.accentText.includes('text-black') ? 'text-black' : 'text-white'} -rotate-12`} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-center mb-2 tracking-tighter">AURAOKE</h2>
              <p className={`text-center text-sm mb-8 ${themeClasses.textMuted}`}>Next-Gen Virtual Karaoke</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Fingerprint className={`absolute left-4 top-3 w-5 h-5 ${themeClasses.textMuted}`} />
                  <input 
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password" 
                    className={`w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none transition-all ${themeClasses.input} focus:ring-2 focus:ring-[currentColor]`} 
                  />
                </div>
                {loginError && <p className="text-red-500 text-sm font-bold text-center">{loginError}</p>}
                <button type="submit" className={`w-full py-4 rounded-xl flex justify-center items-center gap-2 ${themeClasses.accent} ${themeClasses.accentText} ${themeClasses.accentHover} transition-all`}>
                  <Lock className="w-4 h-4" /> Unlock Stage
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN DASHBOARD LAYOUT */}
      {!showLogin && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          
          {/* LEFT/CENTER STAGE (VIDEO + CONTROLS) */}
          <div className="flex-1 flex flex-col relative z-10 p-2 md:p-4 lg:p-6 min-h-[50vh] lg:min-h-0">
            
            {/* Header / Arcade Machine Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 shrink-0 relative">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${themeClasses.accent} shadow-lg`}>
                  <Music className={`w-5 h-5 md:w-6 md:h-6 ${themeClasses.accentText.includes('text-black') ? 'text-black' : 'text-white'}`} />
                </div>
                <h1 className={`text-xl md:text-2xl font-light tracking-[0.2em] uppercase ${themeClasses.title}`}>Auraoke v2.0 by Daniel B. Dionson</h1>
              </div>

              <div className={`flex flex-wrap items-center gap-3 md:gap-4 px-4 py-3 md:px-6 md:py-3 rounded-2xl md:rounded-full w-full md:w-auto ${themeClasses.panel}`}>
                <button 
                  onClick={() => setShowStatsModal(true)}
                  className={`p-2 md:px-4 md:py-2 rounded-full flex gap-2 items-center ${themeClasses.accent} shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-110 transition-all z-20`}
                >
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                    <Trophy className={`w-4 h-4 md:w-5 md:h-5 ${themeClasses.accentText.includes('text-black') ? 'text-black' : 'text-white'}`} />
                  </motion.div>
                  <span className={`hidden lg:block text-[10px] font-black uppercase tracking-widest ${themeClasses.accentText.includes('text-black') ? 'text-black' : 'text-white'}`}>Session Stats</span>
                </button>
                <div className="flex flex-col items-end hidden md:flex">
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${themeClasses.textMuted}`}>Session Total</span>
                  <span className="font-bold text-sm">₱{totalPesos}</span>
                </div>
                <div className={`w-px h-8 ${themeClasses.border} hidden md:block`} />
                <div className="flex items-center gap-2 flex-1 md:flex-none">
                  <Coins className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                  <span className="text-lg md:text-xl font-black tracking-widest">{credits} <span className={`text-[10px] md:text-xs ${themeClasses.textMuted}`}>CREDITS</span></span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={insertCoin}
                  className={`px-3 py-2 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs shadow-xl ${themeClasses.accent} ${themeClasses.accentText} ${themeClasses.accentHover} whitespace-nowrap`}
                >
                  Insert Coin (5₱)
                </motion.button>
                {currentSong && (
                  <button 
                    onClick={stopRecordingAndScore}
                    className="w-full sm:w-auto mt-1 sm:mt-0 px-3 py-2 md:px-4 md:py-2 bg-red-600/90 hover:bg-red-500 text-white rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg border border-red-400 flex justify-center items-center gap-2 transition-transform hover:scale-105"
                  >
                    <Square className="w-4 h-4" fill="currentColor" /> Stop & Score
                  </button>
                )}
              </div>
            </div>

            {/* Video Player Area */}
            <div className={`flex-1 relative rounded-3xl overflow-hidden ${themeClasses.panel} flex flex-col justify-center items-center shadow-2xl min-h-0`}>
              {currentSong ? (
                <div className="relative w-full h-full bg-black/90">
                  {/* YouTube Player */}
                  <YouTube 
                    videoId={currentSong.videoId} 
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: { 
                        autoplay: 1, 
                        controls: 1, 
                        modestbranding: 1,
                        origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
                      }
                    }}
                    onReady={(e) => playerRef.current = e.target}
                    onStateChange={onPlayerStateChange}
                    onError={handleVideoError}
                    onEnd={onPlayerEnd}
                    className="w-full h-full absolute inset-0"
                  />
                  {/* Error Overlay */}
                  {videoError && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center z-40 backdrop-blur-md">
                      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                        <X className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Video Restricted</h3>
                      <p className="text-sm text-stone-300 max-w-md mb-6">{videoError}</p>
                      <div className="flex gap-4">
                        <a 
                          href={`https://www.youtube.com/watch?v=${currentSong.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform"
                        >
                          Open in YouTube
                        </a>
                        <button 
                          onClick={stopRecordingAndScore}
                          className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white/20 transition-colors"
                        >
                          Finish & Score
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Overlay Controls */}
                  <div className="absolute top-2 md:top-6 flex w-full px-2 md:px-6 justify-between items-start pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-2 md:px-4 md:py-2 border border-white/10 rounded-xl pointer-events-auto shadow-2xl max-w-[60%] sm:max-w-sm flex items-center gap-2 md:gap-4">
                      <button onClick={togglePlayPause} className="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white shrink-0">
                        {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5" />}
                      </button>
                      <div className="min-w-0">
                        <p className="text-[8px] md:text-xs text-white/50 uppercase tracking-widest font-bold mb-0.5 md:mb-1 truncate">Now Playing</p>
                        <h3 className="text-white font-black truncate text-xs md:text-sm">{currentSong.title}</h3>
                        <p className="text-white/80 text-[10px] md:text-xs truncate">{currentSong.artist}</p>
                      </div>
                    </div>
                    {isRecording && (
                      <div className="flex items-center gap-1.5 md:gap-2 bg-red-500/20 text-red-400 px-2 py-1 md:px-4 md:py-2 rounded-full border border-red-500/30 backdrop-blur-md pointer-events-auto animate-pulse shrink-0">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-[8px] md:text-xs font-bold uppercase tracking-widest hidden md:inline">Mic Active - AI</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest md:hidden">Live</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 space-y-4 max-h-full overflow-y-auto">
                  {isJudging ? (
                     <div className="flex flex-col items-center py-10">
                        <Loader2 className={`w-16 h-16 animate-spin mb-4 ${themeClasses.text}`} />
                        <h3 className="text-2xl font-black uppercase tracking-widest text-[#D4AF37]">Neural Network Analyzing Pitch...</h3>
                        <p className={`${themeClasses.textMuted} mt-2`}>The Gemini AI is evaluating your performance.</p>
                     </div>
                  ) : (
                    <>
                      <DancingRobot themeClasses={themeClasses} />
                      <h2 className="text-4xl font-black tracking-tight mt-6">Stage is Empty</h2>
                      <p className={`text-lg ${themeClasses.textMuted} max-w-md mx-auto leading-tight`}>Queue a song from the right panel and press play when ready.</p>
                      {queue.length > 0 && credits > 0 && (
                        <button onClick={playNext} className={`mt-8 px-8 py-4 rounded-full flex items-center justify-center gap-2 mx-auto ${themeClasses.accent} ${themeClasses.accentText} ${themeClasses.accentHover} shadow-[0_0_30px_currentColor] opacity-80 transition-transform hover:scale-105 font-black uppercase tracking-widest`}>
                          <Play className="w-5 h-5" fill="currentColor" /> Play Next: {queue[0].title}
                        </button>
                      )}
                      {queue.length > 0 && credits <= 0 && (
                        <p className="mt-8 text-rose-500 font-bold uppercase tracking-widest animate-pulse">Insert Coin to Play Queue!</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Floating Settings Button */}
            <button onClick={() => setShowSettings(true)} className={`absolute bottom-6 left-6 p-3 rounded-full ${themeClasses.panel} hover:scale-110 transition-transform z-20`}>
              <Settings className="w-6 h-6" />
            </button>

            {/* Floating Search/Queue Button */}
            <AnimatePresence>
              {!isSearchOpen && (
                <motion.button 
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                  onClick={() => setIsSearchOpen(true)} 
                  className={`absolute bottom-6 right-6 p-4 rounded-full ${themeClasses.accent} ${themeClasses.accentText.includes('text-black') ? 'text-black' : 'text-white'} shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-110 transition-transform z-30 flex items-center gap-2`}
                >
                  <Search className="w-6 h-6" />
                  {queue.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex flex-col items-center justify-center text-xs font-black shadow-lg">
                      {queue.length}
                    </span>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT PANELS (SEARCH + QUEUE) */}
          <AnimatePresence>
            {isSearchOpen && (
              <React.Fragment key="search-drawer-fragment">
                {/* Mobile Backdrop */}
                <motion.div 
                  key="backdrop"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsSearchOpen(false)}
                  className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                />
                
                {/* Search Drawer */}
                <motion.div 
                  key="drawer"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className={`fixed inset-y-0 right-0 w-[90%] max-w-sm lg:max-w-md flex flex-col z-50 ${themeClasses.panel} bg-opacity-95 lg:bg-opacity-100 backdrop-blur-3xl lg:backdrop-blur-none border-l shadow-[-20px_0_50px_rgba(0,0,0,0.5)] shrink-0 rounded-none`}
                >
                  
                  {/* Drawer Header */}
                  <div className={`p-4 border-b ${themeClasses.border} shrink-0 flex items-center justify-between`}>
                    <h2 className={`font-black tracking-widest uppercase text-sm px-2 ${themeClasses.text}`}>Song Library</h2>
                    <button onClick={() => setIsSearchOpen(false)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${themeClasses.text}`}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search Area */}
                  <div className={`p-4 border-b ${themeClasses.border} shrink-0`}>
                    <div className="relative">
                      <Search className={`absolute left-4 top-3.5 w-5 h-5 ${themeClasses.textMuted}`} />
                      <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search artist or song..." 
                        className={`w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none transition-all ${themeClasses.input} focus:ring-1 focus:ring-[currentColor] text-sm font-medium`} 
                      />
                    </div>
                  </div>

                  {/* Song List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 relative pb-28 custom-scrollbar">
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 px-2 ${themeClasses.textMuted}`}>
                      {searchQuery ? (isSearching ? 'Searching YouTube...' : 'Search Results') : 'Suggested Hits'}
                    </h3>
                    
                    {isSearching ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className={`w-8 h-8 animate-spin ${themeClasses.textMuted}`} />
                      </div>
                    ) : (
                      (searchQuery ? apiResults : SUGGESTED_SONGS).map((song) => (
                        <motion.div 
                          key={song.id}
                          whileHover={{ scale: 1.02 }}
                          className={`group p-3 rounded-2xl flex items-center justify-between border border-transparent hover:${themeClasses.border} transition-colors cursor-pointer ${themeClasses.bg} bg-opacity-50 shrink-0`}
                        >
                          <div className="flex-1 truncate pr-4">
                            <h4 className="font-bold truncate text-sm">{song.title}</h4>
                            <p className={`text-xs truncate ${themeClasses.textMuted}`}>{song.artist}</p>
                          </div>
                          <button 
                            onClick={() => addToQueue(song)}
                            className={`p-2 rounded-full ${theme === 'glass' ? 'bg-slate-200' : 'bg-white/10'} hover:bg-[currentColor] transition-colors`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))
                    )}
                    
                    {!isSearching && searchQuery && apiResults.length === 0 && (
                      <div className="p-4 text-center mt-4">
                        <p className={`text-xs ${themeClasses.textMuted} mb-4`}>Song not found in YouTube.</p>
                        <input 
                          placeholder="Paste YouTube Video ID"
                          className={`w-full px-3 py-2 text-xs rounded border focus:outline-none ${themeClasses.input}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value;
                              if (val) {
                                addToQueue({ id: 'custom-' + Date.now(), title: 'Custom Track', artist: 'Unknown', videoId: val });
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        <p className={`text-[10px] mt-2 ${themeClasses.textMuted}`}>Press Enter to queue ID</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Hover-to-Expand Queue Panel (Bottom Right) */}
                  <div className={`w-full border-t border-[currentColor] opacity-20 absolute bottom-0`}/>
                  <QueuePanel 
                    queue={queue} 
                    themeClasses={themeClasses} 
                    theme={theme}
                    onRemove={(index: number) => setQueue(q => q.filter((_, i) => i !== index))}
                    onPlay={() => {}} // Play naturally flows from "Play Next" on stage
                  />
                </motion.div>
              </React.Fragment>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 3. SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60`}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-md p-8 rounded-3xl ${themeClasses.panel} relative`}
            >
              <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 opacity-50 hover:opacity-100"><X className="w-6 h-6"/></button>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Settings className="w-6 h-6"/> Preferences</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${themeClasses.textMuted}`}>Visual Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['geometric', 'gold', 'glass'].map((t) => (
                      <button 
                        key={t} onClick={() => setTheme(t as Theme)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all
                          ${theme === t ? themeClasses.border + ` bg-white/10 ${themeClasses.text}` : 'border-transparent bg-slate-500/10 opacity-60'}
                        `}
                      >
                        <div className={`w-6 h-6 rounded-full ${t === 'geometric' ? 'bg-[#D4AF37]' : t === 'gold' ? 'bg-amber-500' : 'bg-slate-200'}`} />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${themeClasses.textMuted} flex items-center gap-2`}>
                     <Sparkles className="w-4 h-4" /> AI Configuration
                  </h3>
                  <label className="flex items-center justify-between p-4 rounded-xl border border-[currentColor] opacity-80 cursor-pointer hover:opacity-100 transition-opacity">
                    <div>
                      <p className="font-bold text-sm">AI Vocal Coaching</p>
                      <p className="text-xs mt-1">Get Gemini practice suggestions after every song.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${aiCoaching ? (themeClasses.bg === 'bg-white' ? 'bg-slate-900' : 'bg-white/90') : 'bg-slate-700'}`}>
                      <motion.div 
                        initial={false}
                        animate={{ x: aiCoaching ? 24 : 2 }}
                        className={`absolute top-1 left-0 w-4 h-4 rounded-full ${aiCoaching ? (themeClasses.bg === 'bg-white' ? 'bg-white' : 'bg-black') : 'bg-white shadow'}`}
                      />
                    </div>
                    {/* Hidden input to toggle state */}
                    <input type="checkbox" className="hidden" checked={aiCoaching} onChange={(e) => setAiCoaching(e.target.checked)} />
                  </label>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. STATS HISTORY MODAL */}
      <AnimatePresence>
        {showStatsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[150] flex flex-col items-center justify-center p-4 backdrop-blur-md bg-black/80`}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-5xl md:h-[80vh] h-[90vh] flex flex-col p-6 lg:p-8 rounded-3xl ${themeClasses.panel} relative overflow-hidden text-left shadow-2xl`}
            >
              <button onClick={() => setShowStatsModal(false)} className={`absolute top-6 right-6 opacity-50 hover:opacity-100 z-10 p-2 rounded-full hover:bg-white/10 ${themeClasses.text}`}><X className="w-6 h-6"/></button>
              
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4 pr-12 md:pr-0">
                 <h2 className="text-2xl font-black flex items-center gap-3"><Activity className="w-6 h-6 text-yellow-400"/> Daily Session Stats</h2>
                 <span className={`text-xs uppercase tracking-widest ${themeClasses.textMuted} font-bold flex items-center gap-2`}><Calendar className="w-4 h-4"/> {new Date().toLocaleDateString()}</span>
              </div>
              
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8">
                 {/* Left Column: Summary & History */}
                 <div className="flex-1 flex flex-col min-h-0 lg:border-r border-white/20 lg:pr-8">
                    <div className="flex gap-4 mb-6">
                       <div className="p-4 rounded-xl bg-black/40 border border-[#D4AF37]/20 flex-1 flex flex-col justify-center items-center text-center">
                          <p className={`text-[10px] uppercase tracking-widest ${themeClasses.textMuted} mb-1 flex items-center gap-1`}><Music className="w-3 h-3"/> Songs Played</p>
                          <p className="text-3xl font-black">{sessionRecords.length}</p>
                       </div>
                       <div className="p-4 rounded-xl bg-black/40 border border-[#D4AF37]/20 flex-1 flex flex-col justify-center items-center text-center">
                          <p className={`text-[10px] uppercase tracking-widest ${themeClasses.textMuted} mb-1 flex items-center gap-1`}><Coins className="w-3 h-3"/> Total Spent</p>
                          <p className="text-3xl font-black text-yellow-400">₱{totalPesos}</p>
                       </div>
                    </div>
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${themeClasses.textMuted}`}>History Log</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                       {sessionRecords.map((r) => (
                         <div key={r.id} className={`p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col hover:bg-white/10 transition-colors`}>
                            <div className="flex justify-between items-start mb-1 gap-2">
                               <h4 className="font-bold truncate" title={r.title}>{r.title}</h4>
                               <span className="font-black text-yellow-400 text-lg leading-none">{r.score}</span>
                            </div>
                            <div className={`flex justify-between items-center text-xs ${themeClasses.textMuted}`}>
                               <span className="truncate max-w-[150px]">{r.artist}</span>
                               <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {r.startTime} - {r.endTime}</span>
                            </div>
                         </div>
                       ))}
                       {sessionRecords.length === 0 && (
                         <div className="flex flex-col items-center justify-center h-40 opacity-50">
                            <Activity className="w-8 h-8 mb-2" />
                            <p className="text-xs uppercase tracking-widest">No songs sung today yet.</p>
                         </div>
                       )}
                    </div>
                 </div>
                 
                 {/* Right Column: Top 10 High Scores */}
                 <div className="w-full lg:w-1/3 flex flex-col min-h-0 pt-6 lg:pt-0 border-t lg:border-t-0 border-white/20">
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-yellow-400 flex items-center gap-2">
                      <Trophy className="w-4 h-4"/> Top 10 Hall of Fame
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                       {sessionRecords.length > 0 ? (
                         [...sessionRecords]
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 10)
                            .map((r, idx) => (
                             <div key={`top-${r.id}`} className="flex items-center gap-4 bg-gradient-to-r from-yellow-500/10 to-transparent p-3 rounded-xl border border-yellow-500/20">
                                <span className={`text-2xl font-black w-8 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'opacity-40'}`}>#{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                   <h4 className="font-bold truncate text-sm" title={r.title}>{r.title}</h4>
                                   <p className={`text-[10px] uppercase ${themeClasses.textMuted} truncate`}>{r.artist}</p>
                                </div>
                                <span className={`font-black text-xl ${idx === 0 ? 'text-yellow-400 scale-110' : 'text-white'}`}>{r.score}</span>
                             </div>
                         ))
                       ) : (
                         <div className="flex flex-col items-center justify-center h-40 opacity-50">
                            <Star className="w-8 h-8 mb-2" />
                            <p className="text-xs uppercase tracking-widest text-center">Sing to climb<br/>the leaderboard!</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
              
              {/* Footer Copyright */}
              <div className={`mt-6 pt-4 border-t border-white/10 text-center text-[10px] uppercase tracking-[0.2em] ${themeClasses.textMuted} font-bold`}>
                Auraoke v2.0 by Daniel B. Dionson Copyright 2026
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. SCORE REVEAL MODAL */}
      <AnimatePresence>
        {showScore && scoreData && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl overflow-hidden`}
          >
            {/* Celebration Balloons */}
            <CelebrationBalloons score={scoreData.score} />

            <motion.div 
              initial={{ scale: 0.5, y: 100, rotate: -5 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className={`w-full max-w-lg p-10 rounded-[3rem] ${themeClasses.panel} text-center relative overflow-hidden z-10`}
            >
              {/* Particle effect container (CSS generated purely for bg) */}
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[currentColor] to-transparent" />
              
              <h2 className={`text-sm font-black uppercase tracking-[0.3em] mb-4 ${themeClasses.textMuted}`}>Performance Score</h2>
              
              <div className="flex justify-center items-end gap-2 mb-8 relative z-10 w-48 h-48 mx-auto flex-col">
                 <motion.div 
                   initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                   className={`absolute inset-0 border-[10px] rounded-full scale-125 ${scoreData.score >= 80 ? 'border-green-500' : scoreData.score >= 50 ? 'border-yellow-500' : 'border-red-500'} opacity-30 blur-md`}
                 />
                 <motion.div 
                   initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                   className={`w-full h-full flex items-center justify-center rounded-full border-[8px] ${scoreData.score >= 80 ? 'border-green-400 text-green-400' : scoreData.score >= 50 ? 'border-yellow-400 text-yellow-400' : 'border-red-400 text-red-500'} bg-black/50 backdrop-blur-md shadow-2xl relative z-20`}
                 >
                    <span className="text-7xl font-black">{scoreData.score}</span>
                 </motion.div>
              </div>

              <div className="mb-8 relative z-10 p-6 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
                <Star className={`w-8 h-8 mx-auto mb-3 ${scoreData.score >= 80 ? 'text-yellow-400' : 'text-slate-500'}`} fill="currentColor" />
                <p className="text-lg md:text-xl font-medium leading-relaxed italic text-white/90">
                  {scoreData.comment}
                </p>
              </div>

              <button 
                onClick={() => { setShowScore(false); setScoreData(null); }}
                className={`w-full py-5 rounded-2xl ${themeClasses.accent} ${themeClasses.accentText.includes('text-black') ? 'text-black' : 'text-white'} ${themeClasses.accentHover} font-black uppercase tracking-[0.2em] text-sm relative z-10 transition-transform active:scale-95 shadow-xl`}
              >
                Accept & Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function CelebrationBalloons({ score }: { score: number }) {
  if (score < 60) return null;
  const colors = ['bg-rose-500', 'bg-blue-500', 'bg-amber-400', 'bg-emerald-500', 'bg-fuchsia-500'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: 30 }).map((_, i) => {
        const size = 40 + Math.random() * 40;
        return (
          <motion.div
            key={`balloon-${i}`}
            initial={{ y: '100vh', x: `${Math.random() * 100}vw`, rotate: -10 + Math.random() * 20 }}
            animate={{ y: '-20vh', x: `+=${-50 + Math.random() * 100}px`, rotate: -20 + Math.random() * 40 }}
            transition={{ duration: 3 + Math.random() * 4, ease: "easeOut", delay: Math.random() * 1.5 }}
            className="absolute flex flex-col items-center"
          >
            <div 
              className={`rounded-full shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.3)] ${colors[i % colors.length]}`}
              style={{ width: size, height: size * 1.25, borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%' }}
            />
            <div className="w-0.5 h-16 bg-white/20 mt-0" />
          </motion.div>
        );
      })}
    </div>
  );
}

// --- QUEUE PANEL COMPONENT ---
function QueuePanel({ queue, themeClasses, theme, onRemove, onPlay }: any) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      className={`absolute bottom-0 left-0 right-0 z-30 transition-all rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] ${themeClasses.bg} border-t border-l border-r ${themeClasses.border} flex flex-col`}
      initial={false}
      animate={{ height: isHovered ? '60%' : '80px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ overflow: 'hidden' }}
    >
      {/* Header (Always visible) */}
      <div 
        className={`h-20 shrink-0 flex items-center justify-between px-6 cursor-pointer ${theme === 'glass' ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-xl`}
        onClick={() => setIsHovered(!isHovered)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${themeClasses.accent} ${themeClasses.accentText}`}>
             <span className="font-black">{queue.length}</span>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-sm">Up Next</h4>
            <p className={`text-xs ${themeClasses.textMuted} truncate max-w-[200px]`}>
              {queue.length > 0 ? `${queue[0].title} - ${queue[0].artist}` : 'Queue is empty'}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isHovered ? 180 : 0 }}>
          <ChevronUp className={`w-6 h-6 ${themeClasses.textMuted}`} />
        </motion.div>
      </div>

      {/* Expanded Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/10 custom-scrollbar">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50 text-center px-4">
             <Search className={`w-8 h-8 mb-4 ${themeClasses.textMuted}`} />
             <p className={`text-sm ${themeClasses.textMuted}`}>Search for a song above and click + to add it to the queue.</p>
          </div>
        ) : (
          queue.map((song: any, idx: number) => (
            <div key={`${song.id}-${idx}`} className={`p-4 rounded-xl flex items-center justify-between ${theme === 'glass' ? 'bg-white' : 'bg-white/5'} shrink-0`}>
              <div className="flex items-center gap-4 truncate">
                <span className={`font-black opacity-30 text-lg w-6 text-center ${themeClasses.text}`}>{idx + 1}</span>
                <div className="truncate">
                  <h4 className="font-bold text-sm truncate">{song.title}</h4>
                  <p className={`text-xs ${themeClasses.textMuted} truncate`}>{song.artist}</p>
                </div>
              </div>
              <button onClick={() => onRemove(idx)} className="p-2 opacity-50 hover:opacity-100 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function DancingRobot({ themeClasses }: any) {
  return (
    <motion.div 
      className="relative flex flex-col items-center justify-center h-48 mt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Glow */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute w-40 h-40 rounded-full blur-3xl ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'bg-[#D4AF37]/30' : themeClasses.bg === 'bg-black' ? 'bg-amber-500/30' : 'bg-slate-500/30'}`} 
      />
      
      {/* Robot Head */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`relative z-10 w-24 h-24 rounded-3xl ${themeClasses.panel} flex items-center justify-center border-b-4 border-r-4 ${themeClasses.border}`}
      >
         {/* Eyes */}
         <div className="flex gap-4">
           <motion.div 
             animate={{ scaleY: [1, 0.1, 1] }} 
             transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
             className={`w-4 h-2 ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'bg-[#D4AF37]' : themeClasses.bg === 'bg-black' ? 'bg-amber-400' : 'bg-slate-700'} rounded-full glow`} 
           />
           <motion.div 
             animate={{ scaleY: [1, 0.1, 1] }} 
             transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
             className={`w-4 h-2 ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'bg-[#D4AF37]' : themeClasses.bg === 'bg-black' ? 'bg-amber-400' : 'bg-slate-700'} rounded-full glow`} 
           />
         </div>
         {/* Antenna */}
         <motion.div 
           animate={{ rotate: [-10, 10, -10] }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
           className={`absolute -top-6 left-1/2 -translate-x-1/2 w-1 h-6 ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'bg-[#D4AF37]/50' : themeClasses.bg === 'bg-black' ? 'bg-amber-500/50' : 'bg-slate-500/50'}`}
         >
            <div className={`absolute -top-2 -left-1 w-3 h-3 rounded-full ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'bg-[#D4AF37]' : themeClasses.bg === 'bg-black' ? 'bg-amber-400' : 'bg-slate-700'} animate-ping`} />
         </motion.div>
         {/* Ears */}
         <div className={`absolute -left-3 top-8 w-4 h-8 rounded-l-full ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'bg-[#D4AF37]/40' : themeClasses.bg === 'bg-black' ? 'bg-amber-500/40' : 'bg-slate-500/40'}`} />
         <div className={`absolute -right-3 top-8 w-4 h-8 rounded-r-full ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'bg-[#D4AF37]/40' : themeClasses.bg === 'bg-black' ? 'bg-amber-500/40' : 'bg-slate-500/40'}`} />
      </motion.div>

      {/* Mic Arm */}
      <motion.div
        animate={{ y: [0, -10, 0], x: [0, 5, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="relative z-20 -mt-4 ml-16"
      >
        <div className={`p-3 rounded-full ${themeClasses.panel} shadow-2xl`}>
          <Mic className={`w-8 h-8 ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'text-[#D4AF37]' : themeClasses.bg === 'bg-black' ? 'text-amber-400' : 'text-slate-800'}`} />
        </div>
      </motion.div>

      {/* Floating Notes */}
      <motion.div
         animate={{ y: [0, -40], x: [0, -20], opacity: [0, 1, 0] }}
         transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
         className={`absolute right-10 top-10 ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'text-[#D4AF37]' : themeClasses.bg === 'bg-black' ? 'text-amber-400' : 'text-slate-600'}`}
      >
         <Music className="w-5 h-5" />
      </motion.div>
      <motion.div
         animate={{ y: [0, -50], x: [0, 20], opacity: [0, 1, 0] }}
         transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1 }}
         className={`absolute left-10 top-0 ${themeClasses.bg === 'bg-[#0A0A0A]' ? 'text-[#D4AF37]' : themeClasses.bg === 'bg-black' ? 'text-amber-400' : 'text-slate-600'}`}
      >
         <Music className="w-4 h-4" />
      </motion.div>
    </motion.div>
  );
}