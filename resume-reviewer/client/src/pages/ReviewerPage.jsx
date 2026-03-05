import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { FileSearch, Upload, FileText, Target, Zap, Shield } from "lucide-react";

import PageHeader from "../components/shared/PageHeader";
import FileUploadZone from "../components/reviewer/FileUploadZone";
import JobDescriptionInput from "../components/reviewer/JobDescriptionInput";
import LoadingOverlay from "../components/reviewer/LoadingOverlay";

export default function ReviewerPage() {
    const [file, setFile] = useState(null);
    const [jobDescription, setJobDescription] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const navigate = useNavigate();
    const { getToken, userId } = useAuth();

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Please upload a resume first.");
            return;
        }

        setIsAnalyzing(true);

        try {
            const token = await getToken();
            const headers = { "x-user-id": userId };
            if (token) headers.Authorization = `Bearer ${token}`;

            // 1. Upload File
            const formData = new FormData();
            formData.append("resume", file);

            const apiUrl = import.meta.env.VITE_BACKEND_URL;
            const uploadRes = await fetch(`${apiUrl}/api/resume/upload`, {
                method: "POST",
                headers, // Do NOT set Content-Type for FormData, browser does it automatically with boundary
                body: formData,
            });

            if (!uploadRes.ok) throw new Error("File upload failed");
            const { resumeId } = await uploadRes.json();

            // 2. Analyze File against Job Description
            const analyzeRes = await fetch(`${apiUrl}/api/resume/analyze/${resumeId}`, {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ jobDescription }),
            });

            if (!analyzeRes.ok) {
                const errorData = await analyzeRes.json().catch(() => ({}));
                throw new Error(errorData.error || "Analysis failed due to a server error. Please try again.");
            }
            const analysisData = await analyzeRes.json();

            // 3. Navigate to Results with state (use the nested analysis object)
            navigate("/review/results", {
                state: { analysis: analysisData.analysis },
                replace: true // Don't build up massive browser history if they rethink multiple times
            });

        } catch (error) {
            console.error(error);
            toast.error(error.message || "An error occurred during analysis.");
            setIsAnalyzing(false); // only toggle off if error, otherwise component unmounts
        }
    };

    return (
        <div className="mx-auto max-w-6xl animate-in fade-in duration-500 space-y-8">
            <LoadingOverlay isOpen={isAnalyzing} />

            <PageHeader
                title="Resume Reviewer"
                subtitle="Upload your resume, paste a target role, and let our AI run a full ATS-style analysis."
            />

            <div className="grid gap-8 xl:gap-12 lg:grid-cols-[1.2fr_minmax(0,1fr)] items-start">
                {/* Left Column: Form */}
                <div className="space-y-6">
                    {/* Step 1: Upload Resume */}
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-blue-50/30 p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 shadow-sm">
                                <Upload className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                    Step 1
                                </h3>
                                <h2 className="text-xl font-bold text-slate-900">Upload your resume file</h2>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            We support PDF and DOCX. Your file stays private and is used only to generate this analysis.
                        </p>
                        <FileUploadZone onFileSelect={setFile} selectedFile={file} />
                    </div>

                    {/* Step 2: Job Description */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shadow-sm">
                                <Target className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                    Step 2
                                </h3>
                                <h2 className="text-xl font-bold text-slate-900">Paste the job description</h2>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            Add the role you are targeting so we can score alignment, missing keywords, and impact.
                        </p>
                        <JobDescriptionInput value={jobDescription} onChange={setJobDescription} />
                    </div>
                </div>

                {/* Right Column: Action & Info */}
                <div className="space-y-6">
                    {/* Main Action Card */}
                    <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Run your ATS analysis</h3>
                        <p className="text-blue-100 mb-8 text-sm leading-relaxed">
                            We will parse your resume, compare it against the role, and generate a detailed scorecard
                            with strengths, gaps, and bullet-point rewrites.
                        </p>
                        <button
                            onClick={handleAnalyze}
                            disabled={!file || isAnalyzing}
                            className="w-full py-4 px-6 rounded-2xl bg-white text-blue-700 text-base font-bold shadow-lg hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isAnalyzing ? "Analyzing your resume…" : "Analyze my resume"}
                        </button>
                        <p className="mt-4 text-xs text-blue-100/90 leading-relaxed">
                            You will be taken to a results dashboard with your ATS score and improvement suggestions.
                        </p>
                    </div>

                    {/* Features Card */}
                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/20 p-6">
                        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            What we analyze
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                                <p className="text-sm text-slate-600">Keyword matching and relevance scoring</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2 flex-shrink-0"></div>
                                <p className="text-sm text-slate-600">Experience alignment with job requirements</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
                                <p className="text-sm text-slate-600">Impact and achievement quantification</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-600 mt-2 flex-shrink-0"></div>
                                <p className="text-sm text-slate-600">Format and structure optimization</p>
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
                        <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Privacy & Security
                        </h4>
                        <div className="space-y-2 text-xs text-slate-600">
                            <p className="leading-relaxed">
                                Your documents are stored securely and never sold or shared with third parties. You can delete
                                any resume and its analysis at any time from your History tab.
                            </p>
                            <p className="text-slate-500 leading-relaxed">
                                For best results, upload a clean, text-based PDF or DOCX rather than a scanned image.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
