import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, FileType } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useUser } from '@clerk/clerk-react';

export default function ResumeUploader({ onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const { user } = useUser();

    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors[0]?.code === 'file-invalid-type') {
                toast.error('Only PDF and DOCX files are supported.');
            } else if (rejection.errors[0]?.code === 'file-too-large') {
                toast.error('File must be less than 5MB.');
            } else {
                toast.error('Invalid file.');
            }
            return;
        }

        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            toast.success('File ready for upload');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxSize: 5 * 1024 * 1024, // 5MB
        maxFiles: 1,
    });

    const removeFile = (e) => {
        e.stopPropagation();
        setFile(null);
        setProgress(0);
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setProgress(10);

        const formData = new FormData();
        formData.append('resume', file);

        try {
            // Simulate progress updates for realism while processing happens
            const timer = setInterval(() => {
                setProgress((old) => {
                    if (old === 90) {
                        clearInterval(timer);
                        return 90;
                    }
                    return Math.min(old + 5, 90);
                });
            }, 600);

            // Use Clerk User ID (or anonymous if completely signed out)
            const userId = user?.id || 'anonymous';

            // 1. Upload Resume
            const apiUrl = import.meta.env.VITE_BACKEND_URL;
            const uploadRes = await fetch(`${apiUrl}/api/resume/upload`, {
                method: 'POST',
                headers: {
                    'x-user-id': userId
                },
                body: formData
            });

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const uploadData = await uploadRes.json();

            // 2. Analyze Resume
            const analyzeRes = await fetch(`${apiUrl}/api/resume/analyze/${uploadData.resumeId}`, {
                method: 'POST',
                headers: {
                    'x-user-id': userId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ jobDescription: "" }) // Job description can be added later
            });

            if (!analyzeRes.ok) {
                const errorData = await analyzeRes.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const analyzeData = await analyzeRes.json();

            clearInterval(timer);
            setProgress(100);
            toast.success('Resume analyzed successfully!');

            if (onUploadSuccess) {
                setTimeout(() => onUploadSuccess(analyzeData.analysis), 500);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to analyze resume.');
            setProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto mt-8 border-none shadow-xl shadow-blue-900/5 bg-white/70 backdrop-blur">
            <CardContent className="p-6">
                {!file ? (
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200 ease-in-out flex flex-col items-center justify-center min-h-[250px]
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}`}
                    >
                        <input {...getInputProps()} />
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                            <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            {isDragActive ? 'Drop it here...' : 'Upload your resume'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">
                            Drag & drop your file here, or click to browse
                        </p>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="font-normal text-xs"><FileType className="w-3 h-3 mr-1" /> PDF</Badge>
                            <Badge variant="secondary" className="font-normal text-xs"><FileType className="w-3 h-3 mr-1" /> DOCX</Badge>
                            <Badge variant="outline" className="font-normal text-xs text-muted-foreground border-muted-foreground/30">Up to 5MB</Badge>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between p-5 bg-card border rounded-xl shadow-sm">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <File className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={removeFile}
                                disabled={isUploading}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-muted-foreground">Scanning Document...</span>
                                    <span className="text-primary">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}

                        <Button
                            onClick={handleUpload}
                            disabled={isUploading}
                            size="lg"
                            className="w-full text-base font-semibold shadow-md active:scale-[0.98] transition-all"
                        >
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing with AI...
                                </>
                            ) : (
                                'Analyze Resume Now'
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
