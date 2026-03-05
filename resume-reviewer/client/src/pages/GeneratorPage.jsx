import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Sparkles, Download, Mail, Loader2, ChevronRight, ChevronLeft, FileText, LayoutTemplate, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import TemplatePicker from '../components/generator/TemplatePicker';
import ResumePreview from '../components/generator/ResumePreview';
import CoverLetterPanel from '../components/generator/CoverLetterPanel';

const METRICS_KEY = 'resume_ai_metrics';

const incrementMetric = (field) => {
    try {
        const raw = localStorage.getItem(METRICS_KEY);
        const base = raw ? JSON.parse(raw) : { resumesGenerated: 0, coverLettersDrafted: 0 };
        const next = {
            resumesGenerated: base.resumesGenerated || 0,
            coverLettersDrafted: base.coverLettersDrafted || 0,
        };
        if (field in next) {
            next[field] = (next[field] || 0) + 1;
            localStorage.setItem(METRICS_KEY, JSON.stringify(next));
        }
    } catch {
        // Ignore localStorage errors; metrics are best-effort only
    }
};

const apiUrl = import.meta.env.VITE_BACKEND_URL;
const API = `${apiUrl}/api/resume`;

const EMPTY_FORM = {
    name: '', email: '', phone: '', location: '', linkedin: '',
    jobDescription: '', experience: '', education: '', skills: '', projects: '',
};

const steps = [
    { id: 1, label: 'Your Info', icon: FileText },
    { id: 2, label: 'Template', icon: LayoutTemplate },
    { id: 3, label: 'Export', icon: Send },
];

export default function GeneratorPage() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(EMPTY_FORM);
    const [templateId, setTemplateId] = useState('modern');
    const [resumeData, setResumeData] = useState(null);
    const [coverLetter, setCoverLetter] = useState('');
    const [loading, setLoading] = useState(false);
    const [coverLoading, setCoverLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [sendEmail, setSendEmail] = useState('');
    const [activeTab, setActiveTab] = useState('resume'); // 'resume' | 'cover'
    const previewRef = useRef(null);

    const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    // Step 1 → 2: Generate resume via AI
    const handleGenerate = async () => {
        if (!form.name || !form.email || !form.jobDescription || !form.experience) {
            toast.error('Please fill in: Name, Email, Job Description, and Experience.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResumeData(data.resumeData);
            incrementMetric('resumesGenerated');
            setStep(2);
            toast.success('Resume generated! Pick a template below.');
        } catch (err) {
            toast.error(err.message || 'Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 → 3
    const handleNext = () => setStep(3);

    // Generate cover letter
    const handleCoverLetter = async () => {
        setCoverLoading(true);
        try {
            const res = await fetch(`${API}/cover-letter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeData, jobDescription: form.jobDescription }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCoverLetter(data.coverLetter);
            incrementMetric('coverLettersDrafted');
            setActiveTab('cover');
            toast.success('Cover letter generated!');
        } catch (err) {
            toast.error(err.message || 'Cover letter generation failed.');
        } finally {
            setCoverLoading(false);
        }
    };

    // PDF Export
    const handleDownloadPDF = async () => {
        const el = document.getElementById('resume-preview-root');
        if (!el) return toast.error('Preview not found.');
        toast.info('Generating PDF…');
        try {
            const canvas = await html2canvas(el, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`${(resumeData?.name || 'resume').replace(/\s+/g, '_')}_Resume.pdf`);
            toast.success('PDF downloaded!');
        } catch {
            toast.error('PDF export failed.');
        }
    };

    // Email
    const handleEmailSend = async () => {
        if (!sendEmail) return toast.error('Enter a valid email.');
        const el = document.getElementById('resume-preview-root');
        if (!el) return toast.error('Preview not found.');
        setEmailLoading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            const pdfBase64 = pdf.output('datauristring').split(',')[1];

            const res = await fetch(`${API}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toEmail: sendEmail, name: resumeData?.name || form.name, pdfBase64 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Resume sent to ${sendEmail}!`);
            setSendEmail('');
        } catch (err) {
            toast.error(err.message || 'Email failed.');
        } finally {
            setEmailLoading(false);
        }
    };

    const labelCls = "block text-sm font-medium text-gray-700 mb-1";
    const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
    const textareaCls = inputCls + " resize-none";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
            <main className="max-w-7xl mx-auto px-4 py-10">
                {/* Page title */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        AI Resume <span className="text-blue-600">Generator</span>
                    </h1>
                    <p className="text-gray-500 mt-2 text-base">Fill in your details, and let Gemini craft an ATS-optimized resume for you.</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-0 mb-10 select-none">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        const done = step > s.id;
                        const active = step === s.id;
                        return (
                            <div key={s.id} className="flex items-center">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : done ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Icon className="w-4 h-4" />
                                    {s.label}
                                </div>
                                {i < steps.length - 1 && (
                                    <ChevronRight className={`w-4 h-4 mx-1 ${step > s.id ? 'text-blue-400' : 'text-gray-300'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── STEP 1: Input Form ── */}
                {step === 1 && (
                    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Tell us about yourself</h2>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelCls}>Full Name *</label>
                                <input className={inputCls} placeholder="Jane Doe" value={form.name} onChange={update('name')} />
                            </div>
                            <div>
                                <label className={labelCls}>Email *</label>
                                <input className={inputCls} placeholder="jane@example.com" value={form.email} onChange={update('email')} />
                            </div>
                            <div>
                                <label className={labelCls}>Phone</label>
                                <input className={inputCls} placeholder="+1 555 000 0000" value={form.phone} onChange={update('phone')} />
                            </div>
                            <div>
                                <label className={labelCls}>Location</label>
                                <input className={inputCls} placeholder="San Francisco, CA" value={form.location} onChange={update('location')} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>LinkedIn URL</label>
                                <input className={inputCls} placeholder="linkedin.com/in/janedoe" value={form.linkedin} onChange={update('linkedin')} />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className={labelCls}>Job Description / Target Role *</label>
                            <p className="text-xs text-gray-400 mb-1">Paste the job posting or describe the role you're applying for</p>
                            <textarea className={textareaCls} rows={5} value={form.jobDescription} onChange={update('jobDescription')}
                                placeholder="We're looking for a Senior React Developer with 4+ years of experience..." />
                        </div>

                        <div className="mb-4">
                            <label className={labelCls}>Work Experience *</label>
                            <p className="text-xs text-gray-400 mb-1">List each role with company, years, and what you did (raw notes are fine)</p>
                            <textarea className={textareaCls} rows={6} value={form.experience} onChange={update('experience')}
                                placeholder={"Software Engineer @ Acme Corp (2021–2023)\n- Built a recommendation system\n- Led team of 4\n\nJunior Dev @ Startup (2019–2021)\n- Maintained React dashboards"} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelCls}>Education</label>
                                <textarea className={textareaCls} rows={3} value={form.education} onChange={update('education')}
                                    placeholder="B.Sc. Computer Science, MIT, 2019" />
                            </div>
                            <div>
                                <label className={labelCls}>Skills</label>
                                <textarea className={textareaCls} rows={3} value={form.skills} onChange={update('skills')}
                                    placeholder="React, Node.js, Python, AWS, TypeScript" />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className={labelCls}>Projects <span className="text-gray-400 font-normal">(optional)</span></label>
                            <textarea className={textareaCls} rows={3} value={form.projects} onChange={update('projects')}
                                placeholder={"E-commerce app built with Next.js + Stripe\nAI chatbot using LangChain + OpenAI"} />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-blue-200 transition-all text-base"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {loading ? 'Generating your resume…' : 'Generate My Resume'}
                        </button>
                    </div>
                )}

                {/* ── STEP 2: Template + Preview ── */}
                {step === 2 && (
                    <div className="grid grid-cols-[380px_1fr] gap-8 items-start">
                        {/* Left panel */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-28">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Choose a Template</h2>
                            <p className="text-xs text-gray-400 mb-4">Your content is AI-generated. Switch templates anytime.</p>
                            <TemplatePicker selected={templateId} onSelect={setTemplateId} />
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setStep(1)} className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm transition-colors">
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <button onClick={handleNext} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm">
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {/* Preview */}
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Live Preview</p>
                            <ResumePreview ref={previewRef} data={resumeData} templateId={templateId} />
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Export & Send ── */}
                {step === 3 && (
                    <div className="grid grid-cols-[380px_1fr] gap-8 items-start">
                        {/* Left panel */}
                        <div className="space-y-4 sticky top-28">
                            {/* Tabs */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Export & Deliver</h2>

                                {/* Tab switcher */}
                                <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                                    {['resume', 'cover'].map((t) => (
                                        <button key={t} onClick={() => setActiveTab(t)}
                                            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                            {t === 'resume' ? 'Resume' : 'Cover Letter'}
                                        </button>
                                    ))}
                                </div>

                                {activeTab === 'resume' ? (
                                    <div className="space-y-3">
                                        <button onClick={handleDownloadPDF}
                                            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                                            <Download className="w-4 h-4" /> Download PDF
                                        </button>

                                        <div className="border-t border-gray-100 pt-4">
                                            <label className={labelCls}>Email Resume to</label>
                                            <div className="flex gap-2">
                                                <input className={inputCls} placeholder="you@email.com" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} />
                                                <button onClick={handleEmailSend} disabled={emailLoading}
                                                    className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
                                                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                                    Send
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-1.5">Requires EMAIL_USER & EMAIL_PASS in server .env</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {!coverLetter ? (
                                            <button onClick={handleCoverLetter} disabled={coverLoading}
                                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                                                {coverLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                {coverLoading ? 'Writing…' : 'Generate Cover Letter'}
                                            </button>
                                        ) : (
                                            <p className="text-xs text-gray-500 text-center">Cover letter shown on the right →</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setStep(2)} className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm transition-colors">
                                <ChevronLeft className="w-4 h-4" /> Change Template
                            </button>
                        </div>

                        {/* Right: Resume or Cover Letter preview */}
                        <div>
                            {activeTab === 'resume' ? (
                                <>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Preview ({templateId})</p>
                                    <ResumePreview ref={previewRef} data={resumeData} templateId={templateId} />
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Cover Letter</p>
                                    {coverLetter
                                        ? <CoverLetterPanel text={coverLetter} />
                                        : <div className="bg-white rounded-xl border border-dashed border-gray-300 min-h-[300px] flex items-center justify-center text-gray-300 text-sm">Click "Generate Cover Letter" on the left</div>
                                    }
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
