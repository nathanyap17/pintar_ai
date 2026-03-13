"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import {
    UploadCloud, Mic, Image as ImageIcon, Video,
    Download, Share2, Play, Loader2, CheckCircle2,
    Sparkles, Layers, Volume2, Type
} from 'lucide-react';
import { GlitchText } from "@/components/GlitchText";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const AGENT_STEPS = [
    { id: 1, name: 'Vision Agent', desc: 'Analyzing product features & context', icon: ImageIcon },
    { id: 2, name: 'Audio Agent', desc: 'Transcribing & enhancing voiceover', icon: Volume2 },
    { id: 3, name: 'Copywriter Agent', desc: 'Generating dynamic subtitles', icon: Type },
    { id: 4, name: 'Director Agent', desc: 'Compositing video & effects', icon: Layers },
];

export default function SnapSellPage() {
    const { user } = useUser();
    const clerkId = user?.id ?? "";

    // Photo state
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Audio state
    const [isRecording, setIsRecording] = useState(false);
    const [hasAudio, setHasAudio] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const barsRef = useRef<HTMLDivElement>(null);

    // Result/Video state
    const [videoJobId, setVideoJobId] = useState<string | null>(null);
    const [videoStatus, setVideoStatus] = useState<string>("idle");
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoScript, setVideoScript] = useState<string | null>(null);
    const [videoCaption, setVideoCaption] = useState<string | null>(null);
    const [videoHashtags, setVideoHashtags] = useState<string[]>([]);
    const [currentAgentStep, setCurrentAgentStep] = useState(0);
    const [error, setError] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (audioContextRef.current) audioContextRef.current.close().catch(() => { });
        };
    }, [audioUrl]);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onload = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const animateWaveform = useCallback(() => {
        if (!analyserRef.current || !barsRef.current) return;

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const bars = barsRef.current.children;
        const barCount = bars.length;
        const step = Math.floor(dataArray.length / barCount);

        for (let i = 0; i < barCount; i++) {
            const value = dataArray[i * step] || 0;
            const height = Math.max(4, (value / 255) * 40);
            (bars[i] as HTMLElement).style.height = `${height}px`;
        }
        animFrameRef.current = requestAnimationFrame(animateWaveform);
    }, []);

    const startRecording = async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";

            const recorder = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                setAudioUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(blob);
                });

                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;

                if (animFrameRef.current) {
                    cancelAnimationFrame(animFrameRef.current);
                    animFrameRef.current = null;
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(() => { });
                    audioContextRef.current = null;
                }

                setIsRecording(false);
                setHasAudio(true);
                if (timerRef.current) clearInterval(timerRef.current);
            };

            mediaRecorderRef.current = recorder;
            recorder.start(250);
            setIsRecording(true);
            setHasAudio(false);
            setRecordingTime(0);
            setError("");

            animateWaveform();
            timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
        } catch {
            setError("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (isRecording && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };

    const resetAudio = () => {
        setHasAudio(false);
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const handleGenerateVideo = async () => {
        if (!photoFile || !clerkId) return;
        setVideoStatus("processing");
        setVideoScript(null);
        setVideoCaption(null);
        setVideoUrl(null);
        setError("");

        // Mock multi-agent pipeline UI progression
        setCurrentAgentStep(0);
        let mockStep = 0;
        const mockInterval = setInterval(() => {
            if (mockStep < 3) {
                mockStep += 1;
                setCurrentAgentStep(mockStep);
            }
        }, 3000);

        try {
            const formData = new FormData();
            formData.append("image", photoFile);
            if (audioBlob) formData.append("voice", audioBlob, "voice.webm");
            formData.append("clerk_id", clerkId);
            formData.append("platform", "tiktok");
            formData.append("language", "ms");

            const res = await axios.post(`${API_URL}/api/video/generate`, formData);
            const jobId = res.data.job_id;
            setVideoJobId(jobId);

            const poll = setInterval(async () => {
                try {
                    const status = await axios.get(`${API_URL}/api/video/status/${jobId}`);
                    if (status.data.status === "complete") {
                        clearInterval(poll);
                        clearInterval(mockInterval);
                        setCurrentAgentStep(4);
                        setTimeout(() => {
                            setVideoStatus("complete");
                            setVideoScript(status.data.script);
                            setVideoCaption(status.data.caption);
                            setVideoHashtags(status.data.hashtags || []);
                            setVideoUrl(`${API_URL}/api/video/download/${jobId}`);
                        }, 1000);
                    } else if (status.data.status === "failed") {
                        clearInterval(poll);
                        clearInterval(mockInterval);
                        setVideoStatus("failed");
                        setError(status.data.error || "Video generation failed.");
                    }
                } catch {
                    clearInterval(poll);
                    clearInterval(mockInterval);
                    setVideoStatus("failed");
                    setError("Failed to fetch polling status.");
                }
            }, 3000);
        } catch (err: any) {
            clearInterval(mockInterval);
            setVideoStatus("failed");
            setError(err?.response?.data?.detail || "Video generation failed.");
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-10 lg:px-16 bg-[#05030a]">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-5xl flex flex-col gap-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative py-4">
                    <div className="scanlines-overlay"></div>
                    <div className="relative z-10">
                        <h1 className="font-heading text-5xl md:text-6xl text-white glitch-text tracking-[0.4em] opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            VERNSTUDIO
                        </h1>
                        <p className="text-[10px] tracking-[0.3em] text-primary font-bold uppercase">AI-Powered Multilingual Video Ads Generator</p>
                    </div>
                </div>

                {error && (
                    <div className="w-full p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-sm text-center font-mono uppercase">
                        ⚠️ {error}
                    </div>
                )}

                {(videoStatus === 'idle' || videoStatus === 'failed') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Image Upload Canvas */}
                        <div className="cyber-panel p-6 flex flex-col items-center justify-center text-center min-h-[300px] border-2 border-dashed border-violet-500/30 hover:border-violet-500 transition-all relative overflow-hidden group">
                            {photoPreview ? (
                                <>
                                    <img src={photoPreview} alt="Product" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    <div className="absolute inset-0 bg-background-dark/50 group-hover:bg-background-dark/30 transition-all"></div>
                                    <div className="z-10 flex flex-col items-center">
                                        <CheckCircle2 className="h-12 w-12 text-violet-400 mb-2" />
                                        <p className="text-sm font-bold text-white uppercase tracking-widest">Image Loaded</p>
                                        <button
                                            onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                                            className="mt-4 px-4 py-2 cyber-button-secondary text-xs"
                                        >
                                            Replace Image
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div onClick={() => photoInputRef.current?.click()} className="cursor-pointer flex flex-col items-center">
                                    <div className="w-16 h-16 bg-violet-500/10 flex items-center justify-center mb-4 border border-violet-500" style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}>
                                        <UploadCloud className="h-8 w-8 text-violet-400" />
                                    </div>
                                    <h3 className="font-bold text-white text-sm mb-2 uppercase tracking-widest">Upload Product Photo</h3>
                                    <p className="text-xs text-violet-400/60 mb-6 max-w-[200px] leading-relaxed font-mono">
                                        Tap to browse files. JPG, PNG, WebP.
                                    </p>
                                    <button className="px-6 py-2.5 cyber-button text-xs font-mono">
                                        <ImageIcon className="h-4 w-4 inline-block mr-2" /> Browse Files
                                    </button>
                                </div>
                            )}
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                style={{ display: "none" }}
                            />
                        </div>

                        {/* Voice Record Canvas */}
                        <div className="cyber-panel p-6 flex flex-col items-center justify-center text-center min-h-[300px] relative border-accent/30 hover:border-accent">
                            <div className="mb-6">
                                <h3 className="font-bold text-white text-sm mb-2 uppercase tracking-widest">Record Voiceover</h3>
                                <p className="text-xs text-accent/60 max-w-[250px] leading-relaxed font-mono">
                                    Speak in your local dialect. Our AI will translate, enhance, and subtitle it automatically.
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <button
                                    onMouseDown={startRecording}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={stopRecording}
                                    onTouchStart={startRecording}
                                    onTouchEnd={stopRecording}
                                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording
                                        ? 'bg-secondary scale-110 shadow-[0_0_30px_rgba(255,0,255,0.6)] animate-pulse'
                                        : hasAudio
                                            ? 'bg-accent/20 border-2 border-accent text-accent'
                                            : 'bg-accent/10 border-2 border-accent/50 text-accent hover:bg-accent/20 hover:scale-105'
                                        }`}
                                >
                                    {hasAudio && !isRecording ? (
                                        <CheckCircle2 className="h-10 w-10" />
                                    ) : (
                                        <Mic className={`h-10 w-10 ${isRecording ? 'text-white' : ''}`} />
                                    )}
                                </button>

                                <div className="h-6">
                                    {isRecording ? (
                                        <span className="text-secondary font-mono font-bold animate-pulse">
                                            Recording... {formatTime(recordingTime)}
                                        </span>
                                    ) : hasAudio ? (
                                        <div className="flex flex-col items-center">
                                            <span className="text-accent font-bold text-sm font-mono mt-1">Audio Recorded ({formatTime(recordingTime)})</span>
                                            {audioUrl && (
                                                <audio src={audioUrl} controls className="mt-2 h-8 w-full max-w-[200px]" />
                                            )}
                                            <button
                                                onClick={resetAudio}
                                                className="text-xs text-accent/60 hover:text-accent mt-2 underline font-mono cursor-pointer"
                                            >
                                                Record Again
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-accent/50 text-xs font-medium uppercase tracking-widest font-mono">
                                            Hold to Record
                                        </span>
                                    )}
                                </div>
                                {isRecording && (
                                    <div ref={barsRef} className="flex items-center justify-center gap-1 mt-4 h-[40px]">
                                        {[...Array(20)].map((_, i) => (
                                            <div key={i} style={{ width: 4, height: 4, background: "var(--color-secondary)", borderRadius: 2, transition: "height 0.1s" }} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {(videoStatus === 'idle' || videoStatus === 'failed') && (
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={handleGenerateVideo}
                            disabled={!photoFile || !hasAudio}
                            className={`px-8 py-4 font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${photoFile && hasAudio
                                ? 'cyber-button cursor-pointer'
                                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/10'
                                }`}
                        >
                            <Video className="h-5 w-5" />
                            Generate Video Ad
                        </button>
                    </div>
                )}

                {/* Generation Progress State */}
                {videoStatus === 'processing' && (
                    <div className="cyber-panel p-12 flex flex-col items-center justify-center min-h-[400px] w-full max-w-2xl mx-auto relative overflow-hidden">
                        <div className="absolute inset-0 bg-linear-to-b from-primary/10 to-transparent opacity-50"></div>

                        <Loader2 className="h-16 w-16 text-primary animate-spin mb-8" />

                        <h2 className="text-2xl font-black text-white mb-8 tracking-wider uppercase text-center neon-text-cyan">
                            Multi-Agent Assembly
                        </h2>

                        <div className="w-full max-w-md space-y-4 relative z-10">
                            {AGENT_STEPS.map((step, index) => {
                                const isActive = index === currentAgentStep;
                                const isCompleted = index < currentAgentStep;

                                return (
                                    <div
                                        key={step.id}
                                        className={`flex items-center gap-4 p-4 border transition-all duration-500 ${isActive ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(0,243,255,0.3)] scale-105' :
                                            isCompleted ? 'bg-primary/5 border-primary/30 opacity-70' :
                                                'bg-white/5 border-white/10 opacity-40'
                                            }`}
                                        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                                    >
                                        <div className={`w-10 h-10 flex items-center justify-center ${isActive ? 'bg-primary text-black animate-pulse' :
                                            isCompleted ? 'bg-primary/20 text-primary' :
                                                'bg-white/10 text-white/50'
                                            }`} style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}>
                                            {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold text-sm uppercase tracking-wider ${isActive ? 'text-white' : isCompleted ? 'text-primary' : 'text-white/50'}`}>
                                                {step.name}
                                            </h4>
                                            <p className="text-xs text-primary/70 font-mono">{step.desc}</p>
                                        </div>
                                        {isActive && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Completed State */}
                {videoStatus === 'complete' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                        <div className="lg:col-span-7 flex flex-col gap-4">
                            <div className="cyber-panel overflow-hidden relative aspect-9/16 max-h-[600px] mx-auto w-full max-w-[340px] shadow-2xl flex items-center justify-center bg-black group">
                                {videoUrl ? (
                                    <video ref={videoRef} src={videoUrl} autoPlay loop playsInline onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    photoPreview && <img src={photoPreview} alt="Generated Ad" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                )}

                                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-black/30 pointer-events-none transition-opacity duration-300"></div>

                                <div className={`absolute bottom-6 left-0 right-0 px-4 flex flex-col items-center gap-3 w-full transition-opacity duration-300 z-20 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                                    <div className="w-full bg-black/70 backdrop-blur-md px-4 py-3 border border-primary/40 pointer-events-auto shadow-[0_0_15px_rgba(0,255,170,0.1)]" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                        <p className="text-xs font-bold text-white/90 drop-shadow-md leading-relaxed text-center">
                                            {videoCaption ? videoCaption : "Premium quality product."}
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                                            {videoHashtags && videoHashtags.length > 0 ? (
                                                videoHashtags.map((tag, i) => (
                                                    <span key={i} className="text-[10px] text-primary font-mono">{tag}</span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-primary font-mono">#premium</span>
                                            )}
                                        </div>
                                    </div>
                                    {videoUrl && (
                                        <a href={videoUrl} download="vernacular_ad.mp4" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-white text-[11px] uppercase font-bold tracking-widest transition-colors pointer-events-auto" style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                                            <Download className="h-4 w-4" /> Download Video
                                        </a>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        if (videoRef.current) {
                                            if (isPlaying) videoRef.current.pause();
                                            else videoRef.current.play();
                                        }
                                    }}
                                    className={`absolute inset-0 m-auto w-16 h-16 bg-primary/80 hover:bg-primary text-black flex items-center justify-center backdrop-blur-md transition-all z-10 ${isPlaying ? 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100' : 'opacity-100 scale-110 hover:scale-125'}`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                                >
                                    <Play className="h-8 w-8 ml-1" />
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex flex-col justify-center gap-6">
                            <div className="cyber-panel p-6 border-l-4 border-l-primary bg-primary/5">
                                <div className="flex items-center gap-3 mb-2">
                                    <CheckCircle2 className="h-6 w-6 text-primary" />
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Ready to Publish</h3>
                                </div>
                                <p className="text-sm text-primary/70 leading-relaxed font-mono">
                                    Your vernacular ad has been successfully generated. Audio enhanced, subtitles synced, and visual effects applied.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                {videoUrl && (
                                    <a href={videoUrl} download="vernacular_ad.mp4" className="w-full text-center py-4 cyber-button cursor-pointer">
                                        <Download className="h-5 w-5 inline-block mr-2 -mt-1" /> Download Video (MP4)
                                    </a>
                                )}
                                <button className="w-full py-4 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 font-bold text-white flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-sm cursor-pointer" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
                                    <Share2 className="h-5 w-5 text-[#25D366]" /> Share to WhatsApp
                                </button>
                                <button className="w-full py-4 cyber-button-secondary cursor-pointer">
                                    <Share2 className="h-5 w-5 inline-block mr-2" /> Share to TikTok / Reels
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setVideoStatus('idle');
                                    setPhotoPreview(null);
                                    setPhotoFile(null);
                                    resetAudio();
                                }}
                                className="mt-4 text-sm text-primary/60 hover:text-primary underline text-center font-mono cursor-pointer"
                            >
                                Create Another Ad
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
