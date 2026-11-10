import React, { useState, useEffect, useRef } from 'react';
import EmergencyServicesMap from './EmergencyServicesMap';
import {
  AlertOctagon, MapPin, Camera, Upload, X, CheckCircle2,
  AlertTriangle, Users, Phone, FileText, Flame, Info,
  RefreshCw, Eye, Sparkles, BrainCircuit, ShieldAlert,
  HelpCircle, ChevronRight, Check, Mic, MicOff, Languages, Square,
  Radio, Volume2, Play, Send, Loader2
} from 'lucide-react';
import { INCIDENT_CATEGORIES } from '../data/mockSeedData';
import { calculateTriageScore, calculateSeverity, SEVERITY_CONFIG, getBaseCategoryPoints, getCasualtyPoints } from '../utils/severityCalculator';
import { generateDynamicMCQs, analyzeIncidentWithGemini, CATEGORY_STATIC_MCQS, processVoiceReportWithGemini } from '../utils/geminiTriage';

// ── Canvas compression: resize to max 800px + JPEG 0.75 to keep base64 under ~150 KB ──
function compressImageToBase64(file, maxDim = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height / width) * maxDim);
          width  = maxDim;
        } else {
          width  = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image load failed'));
    };

    img.src = objectUrl;
  });
}

export default function PublicIncidentReporter({ onAddIncident, onViewDashboard, isOnline, queuedCount, onSOSPanic, autoDispatchToast }) {
  // Form input state
  const [title, setTitle]                       = useState('');
  const [description, setDescription]           = useState('');
  const [category, setCategory]                 = useState(INCIDENT_CATEGORIES[0]);
  const [peopleAffected, setPeopleAffected]     = useState(1);
  const [contactInfo, setContactInfo]           = useState('');
  const [photoBase64, setPhotoBase64]           = useState(null);
  const [photoName, setPhotoName]               = useState('');
  const [compressing, setCompressing]           = useState(false);

  // GPS state
  const [latitude, setLatitude]   = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('fetching');
  const [accuracy, setAccuracy]   = useState(null);

  // Dynamic MCQ State
  const [mcqList, setMcqList]                   = useState(() => CATEGORY_STATIC_MCQS[INCIDENT_CATEGORIES[0]] || []);
  const [selectedAnswers, setSelectedAnswers]   = useState({}); // { [qId]: optionIndex }
  const [isGeneratingMCQs, setIsGeneratingMCQs] = useState(false);
  const [mcqSource, setMcqSource]               = useState('initial'); // 'gemini' | 'local' | 'initial'

  // Speech-to-Text State
  const [isListening, setIsListening]           = useState(false);
  const [voiceLang, setVoiceLang]               = useState('en-US'); // 'en-US' | 'ta-IN'
  const [speechError, setSpeechError]           = useState('');
  const recognitionRef                          = useRef(null);

  // Submission state
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState(null);

  // ── Full Voice Reporting Module State (MediaRecorder + Gemini 2.5 Flash) ──
  const [isVoiceRecording, setIsVoiceRecording]         = useState(false);
  const [voiceRecordTime, setVoiceRecordTime]           = useState(0);
  const [voiceLangChoice, setVoiceLangChoice]           = useState('en-US'); // 'en-US' | 'ta-IN'
  const [isProcessingVoice, setIsProcessingVoice]       = useState(false);
  const [voiceExtractedResult, setVoiceExtractedResult] = useState(null);
  const [voiceAudioUrl, setVoiceAudioUrl]               = useState(null);
  const [voiceAudioBase64, setVoiceAudioBase64]         = useState(null);
  const [voiceLiveTranscript, setVoiceLiveTranscript]   = useState('');
  const [voiceModuleError, setVoiceModuleError]         = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const voiceTimerRef    = useRef(null);
  const audioStreamRef   = useRef(null);
  const voiceSpeechRef   = useRef(null);

  const fileInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Acquire GPS on mount
  const acquireGps = () => {
    setGpsStatus('fetching');
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setLatitude(12.89); setLongitude(80.08);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(4)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(4)));
        setAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus('locked');
      },
      () => {
        setGpsStatus('error');
        setLatitude(12.89); setLongitude(80.08);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => { acquireGps(); }, []);

  // Cleanup Speech Recognition and Voice Recorder on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
      if (voiceSpeechRef.current) {
        try { voiceSpeechRef.current.abort(); } catch (_) {}
      }
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
      }
      if (audioStreamRef.current) {
        try {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (_) {}
      }
    };
  }, []);

  // ── Web Speech API Voice Input Handler (Multilingual: en-US & ta-IN) ──
  const toggleListening = () => {
    setSpeechError('');
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = voiceLang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      recognition.onresult = (event) => {
        let finalSegment = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalSegment += event.results[i][0].transcript + ' ';
          }
        }

        if (finalSegment.trim()) {
          setDescription(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalSegment.trim()}` : finalSegment.trim();
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice/error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please grant microphone access in your browser address bar.');
        } else if (event.error === 'no-speech') {
          // Soft timeout when idle, keep ready
        } else {
          setSpeechError(`Voice notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Unable to start speech recognition: ' + err.message);
      setIsListening(false);
    }
  };

  const handleLangChange = (newLang) => {
    setVoiceLang(newLang);
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      setIsListening(false);
    }
  };

  // ── Full Voice Reporting: MediaRecorder + Live Web Speech + Gemini 2.5 Flash ──
  const startFullVoiceRecording = async () => {
    setVoiceModuleError('');
    setVoiceExtractedResult(null);
    setVoiceLiveTranscript('');
    setVoiceRecordTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
          else mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      setIsVoiceRecording(true);

      // Start elapsed timer
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordTime((prev) => prev + 1);
      }, 1000);

      // Live transcript companion via Web Speech API
      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechClass) {
        try {
          const companion = new SpeechClass();
          companion.lang = voiceLangChoice;
          companion.continuous = true;
          companion.interimResults = true;

          companion.onresult = (e) => {
            let text = '';
            for (let i = 0; i < e.results.length; i++) {
              text += e.results[i][0].transcript + ' ';
            }
            setVoiceLiveTranscript(text.trim());
          };

          companion.onerror = () => {};
          companion.start();
          voiceSpeechRef.current = companion;
        } catch (_) {}
      }
    } catch (err) {
      console.error('Full voice mic error:', err);
      setVoiceModuleError('Microphone access denied or unavailable. Please allow microphone permissions in your browser.');
    }
  };

  const stopFullVoiceRecording = () => {
    if (!mediaRecorderRef.current) return;

    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    setIsVoiceRecording(false);

    if (voiceSpeechRef.current) {
      try { voiceSpeechRef.current.stop(); } catch (_) {}
    }

    mediaRecorderRef.current.onstop = () => {
      // Release audio tracks
      if (audioStreamRef.current) {
        try {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (_) {}
      }

      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        setVoiceAudioUrl(base64Audio);
        setVoiceAudioBase64(base64Audio);

        // Send directly to Gemini 2.5 Flash for extraction
        setIsProcessingVoice(true);
        try {
          const extracted = await processVoiceReportWithGemini({
            audioBase64: base64Audio,
            mimeType,
            transcript: voiceLiveTranscript,
            language: voiceLangChoice
          });

          setVoiceExtractedResult(extracted);

          // Auto-fill all main form fields!
          if (extracted.title) setTitle(extracted.title);
          if (extracted.category) setCategory(extracted.category);
          if (extracted.description) setDescription(extracted.description);
          if (extracted.casualties) setPeopleAffected(Number(extracted.casualties) || 1);

          // Auto-answer MCQs to match extracted severity
          const questions = CATEGORY_STATIC_MCQS[extracted.category] || mcqList;
          const optTarget = extracted.severity === 'Critical' ? 2 : extracted.severity === 'High' ? 1 : 0;
          const autoMap = {};
          questions.forEach((q) => {
            autoMap[q.id] = Math.min(optTarget, (q.options?.length || 1) - 1);
          });
          setSelectedAnswers(autoMap);

        } catch (err) {
          console.error('Gemini voice processing failed:', err);
          setVoiceModuleError('Gemini audio processing encountered an issue. Using fallback extraction.');
        } finally {
          setIsProcessingVoice(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    try {
      mediaRecorderRef.current.stop();
    } catch (_) {}
  };

  const handleTransmitExtractedVoiceIncident = () => {
    if (!voiceExtractedResult) return;
    setIsSubmitting(true);

    const payload = {
      title: voiceExtractedResult.title || title || 'Spoken Emergency Report',
      description: voiceExtractedResult.description || description || 'Voice emergency report.',
      category: voiceExtractedResult.category || category,
      people_affected: Number(voiceExtractedResult.casualties) || Number(peopleAffected) || 1,
      contact_info: contactInfo.trim() || 'Voice Caller',
      severity: voiceExtractedResult.severity || liveSeverity,
      ai_summary: voiceExtractedResult.ai_summary || 'Gemini 2.5 Flash acoustic and speech triage completed.',
      recommended_units: voiceExtractedResult.recommended_units || [],
      triage_score: liveScore || 12,
      latitude: latitude ?? 12.89,
      longitude: longitude ?? 80.08,
      photo_url: photoBase64 || null,
      voiceAudioUrl: voiceAudioBase64 || null,
      audio_url: voiceAudioBase64 || null,
      voice_reported: true
    };

    const saved = onAddIncident(payload);
    setSubmittedIncident(saved);
    setIsSubmitting(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch or update Dynamic MCQs when category, title, or description changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsGeneratingMCQs(true);
      try {
        const questions = await generateDynamicMCQs(title, category, description);
        setMcqList(questions);
        setMcqSource('gemini');
        // Reset selections to defaults (option 0)
        const defaults = {};
        questions.forEach((q) => {
          defaults[q.id] = 0;
        });
        setSelectedAnswers(defaults);
      } catch (err) {
        console.warn('MCQ load error:', err);
        setMcqList(CATEGORY_STATIC_MCQS[category] || CATEGORY_STATIC_MCQS['Other Emergencies']);
        setMcqSource('local');
      } finally {
        setIsGeneratingMCQs(false);
      }
    }, 700); // 700ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [category, title, description]);

  // Compute points and live score
  const selectedPointsArray = mcqList.map((q) => {
    const selectedIdx = selectedAnswers[q.id] ?? 0;
    const opt = q.options?.[selectedIdx];
    return opt?.points ?? 0;
  });

  const liveScore = calculateTriageScore(category, peopleAffected, selectedPointsArray);
  const liveSeverity = calculateSeverity(category, peopleAffected, selectedPointsArray);

  // Handle MCQ Option Selection
  const handleSelectOption = (qId, optionIdx) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  // Photo upload with canvas compression
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Photo exceeds 10MB limit. Please choose a smaller image.');
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImageToBase64(file, 800, 0.75);
      setPhotoBase64(compressed);
      setPhotoName(file.name);
    } catch {
      alert('Could not compress photo. Please try a different file.');
    } finally {
      setCompressing(false);
    }
  };

  const removePhoto = () => {
    setPhotoBase64(null);
    setPhotoName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form submission with Gemini AI Analysis
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { alert('Please enter an incident title.'); return; }
    if (!contactInfo.trim()) { alert('Please enter reporter contact phone number.'); return; }

    setIsSubmitting(true);

    // Format selected answers for AI context
    const mcqAnswersSummary = mcqList.map((q) => {
      const selectedIdx = selectedAnswers[q.id] ?? 0;
      const opt = q.options?.[selectedIdx] || q.options?.[0];
      return {
        question: q.question,
        selectedLabel: opt?.label || 'Not specified',
        points: opt?.points ?? 0
      };
    });

    // Run Gemini final triage & situational dispatch analysis
    let aiTriageResult;
    try {
      aiTriageResult = await analyzeIncidentWithGemini({
        title: title.trim(),
        category,
        peopleAffected: Number(peopleAffected) || 1,
        mcqAnswers: mcqAnswersSummary,
        description: description.trim(),
        score: liveScore
      });
    } catch (err) {
      console.warn("Gemini submit analysis fallback:", err);
      aiTriageResult = {
        severity: liveSeverity,
        ai_summary: `Live triage score ${liveScore}/16. Priority tier ${liveSeverity} assigned for ${category}.`,
        recommended_units: ["Local Rapid Response Unit", "Police Patrol"]
      };
    }

    const newIncident = {
      title: title.trim(),
      description: description.trim() || 'No additional text provided by reporter.',
      category,
      people_affected: Number(peopleAffected) || 1,
      contact_info: contactInfo.trim(),
      severity: aiTriageResult.severity || liveSeverity,
      ai_summary: aiTriageResult.ai_summary,
      recommended_units: aiTriageResult.recommended_units || [],
      triage_score: liveScore,
      latitude: latitude ?? 12.89,
      longitude: longitude ?? 80.08,
      photo_url: photoBase64 || null,
      voiceAudioUrl: voiceAudioBase64 || null,
      audio_url: voiceAudioBase64 || null,
      voice_reported: Boolean(voiceAudioBase64)
    };

    const saved = onAddIncident(newIncident);
    setSubmittedIncident(saved);
    setIsSubmitting(false);

    // Reset fields
    setTitle('');
    setDescription('');
    setCategory(INCIDENT_CATEGORIES[0]);
    setPeopleAffected(1);
    setContactInfo('');
    removePhoto();
  };

  // Quick preset locations
  const setPresetLocation = (name, lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setGpsStatus('locked');
  };

  /* Light Theme Severity visual config */
  const LIGHT_SEVERITY = {
    Critical: { wrap: 'bg-red-50 border-red-200', dot: 'bg-red-500 animate-ping', badge: 'bg-red-100 text-red-700 border border-red-200', text: 'text-red-700' },
    High:     { wrap: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border border-amber-200', text: 'text-amber-700' },
    Medium:   { wrap: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200', text: 'text-yellow-700' },
    Low:      { wrap: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', text: 'text-emerald-700' }
  };
  const sv = LIGHT_SEVERITY[liveSeverity] ?? LIGHT_SEVERITY.Low;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* ── Offline Mesh Relay Warning (Citizen-side) ── */}
      {isOnline === false && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 shadow-sm flex items-center gap-3 animate-pulse">
          <span className="text-2xl">📡</span>
          <div className="flex-1">
            <div className="text-sm font-black text-amber-900">Network Offline — Disaster Mesh Relay Active</div>
            <p className="text-xs text-amber-700 mt-0.5">
              Emergency alerts will be stored on your local device and auto-transmitted to the Admin Command Hub upon reconnection.
              {queuedCount > 0 && (
                <span className="ml-1 font-bold"> ({queuedCount} report{queuedCount > 1 ? 's' : ''} queued)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Auto-Dispatch Toast (Citizen-side echo) ── */}
      {autoDispatchToast && (
        <div className="mb-4 p-4 rounded-2xl bg-blue-50 border-2 border-blue-400 shadow-sm flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <div className="text-xs font-black text-blue-900">{autoDispatchToast}</div>
          </div>
        </div>
      )}

      {/* Page Header Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 via-white to-red-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 border border-red-200 rounded-xl text-red-600 shrink-0">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                Citizen Emergency Alert Portal
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Gemini 2.5 Flash Dynamic Triage
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Mic className="w-3 h-3 text-emerald-600" />
                Speech-to-Text Enabled (EN / தமிழ்)
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ⚡ Auto-Dispatch for High/Critical
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
              Report an Emergency Incident
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Real-time incident reporting with voice input, AI-driven site hazard questions, automated casualty scoring, and instant dispatch routing. High &amp; Critical severity incidents are auto-dispatched immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Success Confirmation Banner */}
      {submittedIncident && (
        <div className={`mb-6 p-5 rounded-2xl border-2 shadow-md animate-in fade-in duration-200 ${
          submittedIncident.offline_queued
            ? 'bg-amber-50 border-amber-300'
            : submittedIncident.auto_dispatched
            ? 'bg-blue-50 border-blue-300'
            : 'bg-emerald-50 border-emerald-300'
        }`}>
          <div className="flex items-start gap-4">
            <CheckCircle2 className={`w-8 h-8 shrink-0 mt-0.5 ${
              submittedIncident.offline_queued ? 'text-amber-600' :
              submittedIncident.auto_dispatched ? 'text-blue-600' : 'text-emerald-600'
            }`} />
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  submittedIncident.offline_queued ? 'text-amber-700' :
                  submittedIncident.auto_dispatched ? 'text-blue-700' : 'text-emerald-700'
                }`}>
                  {submittedIncident.offline_queued
                    ? '📡 Queued for Offline Mesh Relay'
                    : submittedIncident.auto_dispatched
                    ? '⚡ Auto-Dispatched — High Priority'
                    : 'Incident Submitted Successfully'
                  }
                </span>
                <span className="text-xs font-mono text-slate-600 font-bold">
                  ID: {submittedIncident.id}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">{submittedIncident.title}</h3>

              {/* Auto-Dispatch Team Assignment Banner */}
              {submittedIncident.auto_dispatched && submittedIncident.auto_dispatch_team && (
                <div className="mt-2 p-3 rounded-xl bg-blue-100/70 border border-blue-200 text-xs space-y-1">
                  <div className="font-black text-blue-900 flex items-center gap-1.5">
                    <span>⚡</span> Automated Dispatch Activated
                  </div>
                  <div className="text-blue-800">
                    <strong>{submittedIncident.auto_dispatch_team}</strong> deployed automatically —
                    Distance: <strong>{submittedIncident.auto_dispatch_distance} km</strong>,
                    ETA: ~<strong>{submittedIncident.auto_dispatch_eta} mins</strong>
                  </div>
                  {submittedIncident.assigned_route_url && (
                    <a
                      href={submittedIncident.assigned_route_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold underline text-[11px]"
                    >
                      🗺️ Track Live Route in Google Maps
                    </a>
                  )}
                </div>
              )}

              {/* Offline Queue Notice */}
              {submittedIncident.offline_queued && (
                <div className="mt-2 p-3 rounded-xl bg-amber-100 border border-amber-200 text-xs text-amber-800 font-semibold">
                  📡 Report stored on local device mesh. It will auto-transmit to the Admin Command Hub when network connectivity is restored.
                </div>
              )}
              
              {/* AI Dispatch Summary */}
              {submittedIncident.ai_summary && (
                <div className="mt-2.5 p-3 rounded-xl bg-white border border-emerald-200 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    AI Situational Analysis:
                  </div>
                  <p className="text-slate-600 leading-relaxed">{submittedIncident.ai_summary}</p>
                  
                  {submittedIncident.recommended_units?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">Dispatched Units:</span>
                      {submittedIncident.recommended_units.map((unit, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          {unit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">
                  Severity: {submittedIncident.severity}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                  Triage Score: {submittedIncident.triage_score || liveScore}/16
                </span>
                <span className="px-2.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                  Casualties: {submittedIncident.people_affected}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {onViewDashboard && (
                  <button
                    type="button"
                    onClick={onViewDashboard}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View in Admin Dashboard
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSubmittedIncident(null)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs border border-slate-200 transition-colors"
                >
                  Report Another Incident
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Incident Reporting Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

        {/* Automatic Device GPS Status */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          gpsStatus === 'locked' ? 'bg-emerald-50 border-emerald-200' :
          gpsStatus === 'fetching' ? 'bg-blue-50 border-blue-200' :
          'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              gpsStatus === 'locked' ? 'bg-emerald-100 text-emerald-600' :
              gpsStatus === 'fetching' ? 'bg-blue-100 text-blue-600' :
              'bg-amber-100 text-amber-600'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Automatic Device GPS Status
              </div>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2 mt-0.5">
                {gpsStatus === 'fetching' && (
                  <span className="text-blue-600 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Locking Satellite Coordinates...
                  </span>
                )}
                {gpsStatus === 'locked' && (
                  <span className="text-emerald-700 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    📍 GPS Locked ({latitude?.toFixed(4)}, {longitude?.toFixed(4)})
                    {accuracy && <span className="text-[10px] text-slate-500 font-normal">±{accuracy}m</span>}
                  </span>
                )}
                {gpsStatus === 'error' && (
                  <span className="text-amber-700 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> ⚠️ Location permission denied — default coordinates set
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={acquireGps}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <div className="relative group">
              <button
                type="button"
                className="text-xs px-2 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm transition-colors"
              >
                Presets ▾
              </button>
              <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 hidden group-hover:block">
                {[
                  ['Tambaram Central', 12.89, 80.08],
                  ['Kilambakkam GST', 12.901, 80.075],
                  ['Hindu Mission Hospital', 12.9249, 80.1],
                ].map(([name, lat, lng]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPresetLocation(name, lat, lng)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    📍 {name} ({lat}, {lng})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 1. Incident Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" /> Incident Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Gas Cylinder Explosion at Tea Shop / 3-Car Pileup on Flyover"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Gemini AI uses your title and description to tailor situational questions in real time.
          </p>
        </div>

        {/* 2. Category & People Affected */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" /> Emergency Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
            >
              {INCIDENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" /> People Affected / Casualties <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              required
              value={peopleAffected}
              onChange={(e) => setPeopleAffected(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono font-medium"
            />
          </div>
        </div>

        {/* 3. Dynamic MCQ Triage Section */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  AI Dynamic Triage Questionnaire
                  {isGeneratingMCQs && (
                    <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Tailoring Questions...
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Site-specific hazard & accessibility assessment generated by Gemini 2.5 Flash
                </p>
              </div>
            </div>

            {/* Source Pill */}
            <span className="self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
              {mcqSource === 'gemini' ? '✨ Gemini Generated' : '📋 Standard Matrix'}
            </span>
          </div>

          {/* 4 MCQ Cards */}
          <div className="space-y-4">
            {mcqList.map((mcq, qIdx) => {
              const selectedIdx = selectedAnswers[mcq.id] ?? 0;

              return (
                <div key={mcq.id || qIdx} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black shrink-0">
                      Q{qIdx + 1}
                    </span>
                    <span>{mcq.question}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {mcq.options?.map((opt, optIdx) => {
                      const isSelected = selectedIdx === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(mcq.id, optIdx)}
                          className={`text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold ring-1 ring-blue-500 shadow-sm'
                              : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span>{opt.label}</span>
                          </div>
                          
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 font-bold ${
                            opt.points >= 4 ? 'bg-red-100 text-red-700 border border-red-200' :
                            opt.points >= 2 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-slate-200/80 text-slate-600'
                          }`}>
                            +{opt.points} pts
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Triage Score Bar */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-600" />
                Live Triage Score Indicator:
              </span>
              <span className="font-mono text-sm font-black text-slate-900">
                {liveScore} / 16 Points
              </span>
            </div>

            {/* Visual Progress Meter */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  liveSeverity === 'Critical' ? 'bg-red-600' :
                  liveSeverity === 'High' ? 'bg-amber-500' :
                  liveSeverity === 'Medium' ? 'bg-yellow-400' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((liveScore / 16) * 100))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>0-3: Low</span>
              <span>4-6: Medium</span>
              <span>7-10: High</span>
              <span>11+: Critical Alert</span>
            </div>
          </div>
        </div>

        {/* 4. Contact Phone Number */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-blue-600" /> Reporter Contact Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            placeholder="+91 98765 43210 or 044-22262244"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-mono font-medium"
          />
        </div>

        {/* 5. Additional Description with Multilingual Speech-to-Text (EN / தமிழ்) */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Additional Incident Observations & Landmarks
            </label>

            {/* Voice Input Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 text-xs">
                <Languages className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={voiceLang}
                  onChange={(e) => handleLangChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  title="Select Voice Recognition Language"
                >
                  <option value="en-US">English (en-US)</option>
                  <option value="ta-IN">தமிழ் (ta-IN)</option>
                </select>
              </div>

              {/* Microphone Toggle Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-red-200'
                    : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-600'
                }`}
                title={isListening ? 'Stop voice recording' : 'Start voice transcription'}
              >
                {isListening ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Voice</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-blue-600" />
                    <span>Voice Input</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Listening Indicator Banner */}
          {isListening && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                <span>🔴 Listening in {voiceLang === 'ta-IN' ? 'Tamil (தமிழ்)' : 'English'}... Speak now</span>
              </div>
              <span className="text-[11px] font-normal text-red-600">Transcribing live into field</span>
            </div>
          )}

          {/* Speech Error Feedback */}
          {speechError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="flex-1">{speechError}</span>
              <button
                type="button"
                onClick={() => setSpeechError('')}
                className="text-amber-800 hover:text-amber-950 font-bold ml-1"
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            rows="3"
            placeholder={
              voiceLang === 'ta-IN'
                ? "விபத்து அல்லது ஆபத்து பற்றிய விவரங்களை கூறவும் அல்லது தட்டச்சு செய்யவும்... (Speech-to-Text active)"
                : "Describe specific structural hazards, access hurdles, or immediate trauma care required... (Use mic to speak)"
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>🎤 Live voice transcription automatically updates Gemini AI Triage</span>
            <span>{description.length} characters</span>
          </div>
        </div>

        {/* 6. Geo-Tagged Photo Upload with Canvas Compression */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-purple-600" /> Incident Scene Photo
            <span className="normal-case text-slate-400 font-normal">(Compressed to 800px / under 150KB)</span>
          </label>

          {!photoBase64 ? (
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 text-center bg-slate-50 hover:bg-blue-50/50 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                id="emergency-photo-input"
                disabled={compressing}
              />
              <label htmlFor="emergency-photo-input" className={`cursor-pointer flex flex-col items-center justify-center space-y-2 ${compressing ? 'pointer-events-none' : ''}`}>
                <div className="p-3 rounded-full bg-white border border-slate-200 shadow-sm text-purple-600">
                  {compressing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  {compressing
                    ? 'Compressing image with HTML5 canvas...'
                    : <><span className="text-blue-600 font-bold underline">Click to take photo / upload</span> (Camera supported)</>
                  }
                </div>
                <p className="text-[11px] text-slate-400">
                  Scaled to 800px max dimension & JPEG 0.75 quality to prevent storage overflow
                </p>
              </label>
            </div>
          ) : (
            <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2.5 flex items-center gap-4 shadow-sm">
              <div className="w-24 h-20 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                <img src={photoBase64} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{photoName || 'Captured Scene Photo'}</div>
                <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Canvas Compressed & Geo-Tagged
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Location: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                </div>
              </div>
              <button
                type="button"
                onClick={removePhoto}
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors mr-2"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Live Severity Triage Result Badge */}
        <div className={`p-4 rounded-xl border ${sv.wrap} transition-all duration-200`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${sv.dot}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Calculated Severity Rating:
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${sv.badge}`}>
              {liveSeverity}
            </span>
          </div>
          <div className={`mt-2 text-xs flex items-center gap-1.5 ${sv.text}`}>
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Category Base ({getBaseCategoryPoints(category)} pts) + Casualties ({getCasualtyPoints(peopleAffected)} pts) + Site MCQs ({selectedPointsArray.reduce((a,b)=>a+b,0)} pts) = {liveScore} total points.
            </span>
          </div>
        </div>

        {/* Submit Incident Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || compressing}
            className="w-full py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black text-sm uppercase tracking-wider transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-md shadow-red-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI ANALYZING & TRANSMITTING DISPATCH...</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-5 h-5" />
                <span>TRANSMIT EMERGENCY REPORT NOW</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-2">
            Automated Gemini triage analysis & dispatch routing • Stored securely in LocalStorage
          </p>
        </div>

      </form>

      {/* ── (OR) Full Hands-Free Voice Reporting Card ── */}
      <div className="mt-8 bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-100/60 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                OR OPTION
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-blue-700">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini 2.5 Flash Audio Engine
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
              <Mic className="w-5 h-5 text-indigo-600" />
              Full Hands-Free Voice Reporting
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Speak naturally in Tamil or English. Gemini AI extracts the incident title, category, casualties, severity score, and dispatches responders hands-free.
            </p>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <button
              type="button"
              onClick={() => setVoiceLangChoice('en-US')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                voiceLangChoice === 'en-US'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setVoiceLangChoice('ta-IN')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                voiceLangChoice === 'ta-IN'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              தமிழ் (Tamil)
            </button>
          </div>
        </div>

        {/* Recording Controls Area */}
        <div className="mt-5 space-y-4">
          {voiceModuleError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
              <span>{voiceModuleError}</span>
              <button
                type="button"
                onClick={() => setVoiceModuleError('')}
                className="font-bold text-red-900 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Active Recording State with Waveform */}
          {isVoiceRecording ? (
            <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-300 text-center space-y-4 animate-in fade-in">
              <div className="flex items-center justify-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                <span>🔴 Recording... Speak location, incident type, and situation</span>
                <span className="font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[11px] font-black">
                  {Math.floor(voiceRecordTime / 60).toString().padStart(2, '0')}:{(voiceRecordTime % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Animated Audio Waveform Bars */}
              <div className="flex items-center justify-center gap-1.5 h-10 py-1">
                {[40, 65, 30, 85, 95, 60, 100, 75, 45, 90, 50, 70].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-red-600 rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(12, (h * 0.35))}px`,
                      animationDelay: `${i * 80}ms`,
                      animationDuration: '700ms'
                    }}
                  />
                ))}
              </div>

              {/* Live Transcript Stream */}
              {voiceLiveTranscript && (
                <div className="bg-white/80 p-3 rounded-xl border border-red-200 text-xs text-slate-700 font-medium italic text-left max-h-24 overflow-y-auto">
                  <span className="text-[10px] font-bold uppercase text-red-600 not-italic block mb-0.5">
                    Live Spoken Stream:
                  </span>
                  "{voiceLiveTranscript}"
                </div>
              )}

              {/* Stop Button */}
              <button
                type="button"
                onClick={stopFullVoiceRecording}
                className="w-full py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Recording &amp; Analyze with Gemini 2.5 Flash</span>
              </button>
            </div>
          ) : isProcessingVoice ? (
            /* AI Processing Loading State */
            <div className="p-8 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-white shadow-md text-indigo-600 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="text-sm font-black text-indigo-950">
                Gemini 2.5 Flash Processing Audio &amp; Acoustic Features...
              </div>
              <p className="text-xs text-indigo-700 max-w-md mx-auto">
                Transcribing multi-dialect speech, extracting incident title, severity, casualty estimation, and populating emergency response parameters.
              </p>
            </div>
          ) : (
            /* Idle Ready State */
            <div className="space-y-3">
              <button
                type="button"
                onClick={startFullVoiceRecording}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Mic className="w-5 h-5 animate-pulse" />
                <span>🎤 Tap to Speak Full Report ({voiceLangChoice === 'ta-IN' ? 'தமிழ்' : 'English'})</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Microphone audio is processed directly through Google Gemini 2.5 Flash without manual text typing required.
              </p>
            </div>
          )}

          {/* Extracted Voice Result Preview & 1-Click Transmit */}
          {voiceExtractedResult && !isVoiceRecording && !isProcessingVoice && (
            <div className={`p-4 rounded-xl border space-y-3 animate-in fade-in ${
              voiceExtractedResult.is_fallback
                ? 'bg-amber-50 border-amber-300'
                : 'bg-emerald-50 border-emerald-300'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-black ${
                  voiceExtractedResult.is_fallback ? 'text-amber-800' : 'text-emerald-800'
                }`}>
                  <CheckCircle2 className={`w-4 h-4 ${voiceExtractedResult.is_fallback ? 'text-amber-600' : 'text-emerald-600'}`} />
                  {voiceExtractedResult.is_fallback ? (
                    <span>🎙️ Raw Voice Recording Attached (Pending Manual Admin Review)</span>
                  ) : (
                    <span>🤖 AI Extracted from Voice Audio: {voiceExtractedResult.title} | {voiceExtractedResult.severity}</span>
                  )}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  voiceExtractedResult.is_fallback ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200/70 text-emerald-900'
                }`}>
                  {voiceExtractedResult.category}
                </span>
              </div>

              {/* Spoken Audio Player */}
              {voiceAudioUrl && (
                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-emerald-600" /> Spoken Voice Recording:
                  </div>
                  <audio controls src={voiceAudioUrl} className="w-full h-8" />
                </div>
              )}

              {/* Synthesized Summary */}
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900">Synthesized Situation:</div>
                <p className="text-slate-600">{voiceExtractedResult.description}</p>
                <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-2">
                  <span>Casualties: <strong>{voiceExtractedResult.casualties}</strong></span>
                  <span>•</span>
                  <span>Severity: <strong className="text-emerald-700">{voiceExtractedResult.severity}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTransmitExtractedVoiceIncident}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Extracted Incident to Command Hub</span>
                </button>
                <button
                  type="button"
                  onClick={startFullVoiceRecording}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Re-Record
                </button>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium text-center">
                ✓ All form fields and MCQ answers above have been synchronized with this extraction.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Services Map */}
      <div className="mt-8">
        <EmergencyServicesMap />
      </div>

    </div>
  );
}
