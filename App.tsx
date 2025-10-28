
import React, { useState, useCallback, useMemo } from 'react';
import { analyzeFace } from './services/geminiService';
import type { AnalysisResult } from './types';

// Helper function to convert a file to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // result is "data:mime/type;base64,the-real-base64-string"
        // We need to strip the prefix
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// --- SVG Icons (defined outside component to prevent re-creation) ---
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L13 12l-1.293-1.293a1 1 0 010-1.414L14 7m5 5l2.293 2.293a1 1 0 010 1.414L19 18l-1.293-1.293a1 1 0 010-1.414L20 13M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
);

// --- Child Components (defined outside main component to prevent re-rendering issues) ---

interface ImageUploaderProps {
    onImageSelect: (file: File) => void;
    disabled: boolean;
}
const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, disabled }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageSelect(file);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 transition-colors duration-300">
            <UploadIcon />
            <p className="mt-4 text-lg font-semibold text-gray-300">Drag & drop or click to upload</p>
            <p className="text-sm text-gray-500">PNG, JPG, or WEBP</p>
            <input
                type="file"
                className="absolute w-full h-full opacity-0 cursor-pointer"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                disabled={disabled}
            />
        </div>
    );
};

interface ResultDisplayProps {
    result: AnalysisResult;
}
const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => (
    <div className="w-full space-y-4">
        <div className="flex items-center text-xl font-bold text-gray-100">
            <SparklesIcon />
            Analysis Results
        </div>
        <div className="bg-gray-800/50 p-6 rounded-lg flex justify-around divide-x-2 divide-gray-700">
            <div className="flex flex-col items-center px-4 w-1/2">
                <UserIcon />
                <p className="mt-2 text-sm text-gray-400">Estimated Gender</p>
                <p className="text-2xl font-bold text-indigo-400">{result.estimated_gender}</p>
            </div>
            <div className="flex flex-col items-center px-4 w-1/2">
                <CalendarIcon />
                <p className="mt-2 text-sm text-gray-400">Estimated Age</p>
                <p className="text-2xl font-bold text-indigo-400">{result.estimated_age}</p>
            </div>
        </div>
    </div>
);

const Loader: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin"></div>
        <p className="text-gray-400">Analyzing, please wait...</p>
    </div>
);


const App: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const imageUrl = useMemo(() => {
        if (!imageFile) return null;
        return URL.createObjectURL(imageFile);
    }, [imageFile]);
    
    const handleImageSelect = useCallback((file: File) => {
        setImageFile(file);
        setAnalysisResult(null);
        setError(null);
    }, []);

    const handleAnalyzeClick = async () => {
        if (!imageFile) return;

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const base64Image = await fileToBase64(imageFile);
            const result = await analyzeFace(base64Image, imageFile.type);
            setAnalysisResult(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        setImageFile(null);
        setAnalysisResult(null);
        setError(null);
        setIsLoading(false);
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
                        AI Face Analyzer
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">Estimate age and gender from a photo.</p>
                </header>

                <main className="bg-gray-800 shadow-2xl shadow-indigo-900/20 rounded-xl p-6 md:p-8 min-h-[400px] flex flex-col items-center justify-center transition-all duration-300">
                    {!imageFile && <ImageUploader onImageSelect={handleImageSelect} disabled={isLoading} />}
                    
                    {imageFile && (
                        <div className="flex flex-col items-center w-full space-y-6">
                            <div className="w-full max-w-xs h-auto rounded-lg overflow-hidden shadow-lg border-4 border-gray-700">
                                <img src={imageUrl!} alt="Selected face" className="object-cover w-full h-full" />
                            </div>
                            
                            {isLoading && <Loader />}
                            
                            {analysisResult && <ResultDisplay result={analysisResult} />}

                            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</p>}
                            
                            <div className="flex items-center space-x-4 w-full justify-center pt-2">
                                <button
                                    onClick={handleAnalyzeClick}
                                    disabled={isLoading || !!analysisResult}
                                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
                                >
                                    {isLoading ? 'Analyzing...' : 'Analyze Photo'}
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all duration-300"
                                >
                                    Start Over
                                </button>
                            </div>
                        </div>
                    )}
                </main>

                <footer className="text-center mt-8 text-xs text-gray-500 max-w-lg mx-auto">
                    <p className="font-bold mb-2">Disclaimer:</p>
                    <p>
                        This tool provides an estimate and may not be accurate. AI-powered facial analysis is an experimental technology. Your photos are processed for analysis and are not stored on our servers.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default App;
