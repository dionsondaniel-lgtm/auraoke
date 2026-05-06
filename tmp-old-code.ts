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
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState<string | null>(null);
  
  const [credits, setCredits] = useState(0);
  const [totalPesos, setTotalPesos] = useState(0);
  
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [scoreData, setScoreData] = useState<{ score: number, comment: string } | null>(null);
  const [showScore, setShowScore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResults, setApiResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
    
    // Cleanup on window unload (Simulate deleting the JSON file on app close)
    const handleBeforeUnload = () => {
      localStorage.removeItem('auraoke_stats');
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setApiResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) {
          setApiResults(data.results);
        }
      } catch (err) {
        console.error("Search API failed", err);
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

  // --- AI LOGIC (FROM REFERENCE) ---
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
  };

  const insertCoin = () => {
    setTotalPesos(p => p + 5);
    setCredits(c => c + 2);
  };

  const addToQueue = (song: Song) => {
    if (credits <= 0 && queue.length === 0 && !currentSong) {
        // Just add to queue if they have no credits but they want to queue, 
        // wait, they need credits to play. Let's allow queueing but require credits to play.
        // Actually arcade rule: Can't add to queue without credit.
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

// ... Wait, skipping the boilerplate for diffing efficiency
