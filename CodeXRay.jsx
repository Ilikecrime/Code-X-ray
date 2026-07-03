import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileCode2, Cpu, AlertCircle, Copy, CheckCircle2, Activity, ArrowRight, ListOrdered, AlertTriangle, BookOpen } from 'lucide-react';

// --- API Helper with Retry Logic ---
const fetchWithRetry = async (url, options, maxRetries = 5) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}`, { cause: errorData });
      }
      return await response.json();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      const delay = Math.pow(2, retries - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default function App() {
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults(null);
    setError(null);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve({ mimeType: file.type, data: base64String });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const analyzeCodeImage = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const inlineData = await fileToBase64(imageFile);
      const apiKey = ""; // API key is injected by the environment

      const prompt = `
        Analyze the provided image containing programming code. Act as an expert, beginner-friendly code blueprint analyzer and tutor.
        1. Extract the exact code text visible in the image.
        2. Identify the programming language.
        3. Break down the code into structural and syntactic elements (like whitespace rules, operators, string delimiters, capitalization conventions, variable definitions, etc.) with brief explanations.
        4. Create a "schema conversion key" that maps informal concepts (like "quotes" or "space") to their formal programming definitions, and include a beginner-friendly definition for the formal term.
        5. Provide a brief, accurate, and factual description of what the code is doing overall.
        6. Provide a line-by-line beginner-friendly breakdown of what the computer is doing.
        7. Identify 1 or 2 common pitfalls/mistakes beginners make when writing this specific type of code (e.g., forgetting quotes, spelling variables wrong) and how to fix them.
      `;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              extractedCode: { type: "STRING" },
              language: { type: "STRING" },
              codeDescription: { type: "STRING", description: "Overall code purpose" },
              annotations: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    category: { type: "STRING" },
                    description: { type: "STRING" },
                    targetText: { type: "STRING" }
                  }
                }
              },
              schemaConversionKey: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    original: { type: "STRING" },
                    formal: { type: "STRING" },
                    definition: { type: "STRING", description: "Simple explanation of the formal term" },
                    idRef: { type: "STRING" }
                  }
                }
              },
              lineByLine: {
                type: "ARRAY",
                description: "Step-by-step execution breakdown",
                items: {
                  type: "OBJECT",
                  properties: {
                    lineNumber: { type: "INTEGER" },
                    codeText: { type: "STRING" },
                    explanation: { type: "STRING" }
                  }
                }
              },
              commonPitfalls: {
                type: "ARRAY",
                description: "Common beginner mistakes related to this code",
                items: {
                  type: "OBJECT",
                  properties: {
                    mistake: { type: "STRING" },
                    consequence: { type: "STRING" },
                    fix: { type: "STRING" }
                  }
                }
              }
            },
            required: ["extractedCode", "language", "codeDescription", "annotations", "schemaConversionKey", "lineByLine", "commonPitfalls"]
          }
        }
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) throw new Error("Invalid response format from API.");

      // Defensively parse JSON
      let cleanJsonText = jsonText.trim();
      if (cleanJsonText.startsWith('```')) {
        const firstNewline = cleanJsonText.indexOf('\n');
        const lastBackticks = cleanJsonText.lastIndexOf('```');
        if (firstNewline !== -1 && lastBackticks !== -1 && lastBackticks > firstNewline) {
          cleanJsonText = cleanJsonText.substring(firstNewline + 1, lastBackticks).trim();
        }
      }

      const parsedResults = JSON.parse(cleanJsonText);
      setResults(parsedResults);

    } catch (err) {
      console.error("Analysis Error:", err);
      setError(err.message || "Failed to analyze the image. Please try again with a clearer image of code.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (results?.extractedCode) {
      const textArea = document.createElement("textarea");
      textArea.value = results.extractedCode;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Unable to copy', err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-blue-600 rounded-lg text-white shadow-lg">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Code Blueprint Tutor</h1>
            <p className="text-slate-500 font-medium">Extract, analyze, and learn programming syntax</p>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column: Input (Takes up 5 columns on extra large screens) */}
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full sticky top-8">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700 flex items-center">
                  <Upload className="w-4 h-4 mr-2" /> Source Image
                </h2>
                {imageFile && (
                  <button 
                    onClick={() => { setImageFile(null); setPreviewUrl(null); setResults(null); }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded"
                  >
                    Start Over
                  </button>
                )}
              </div>

              <div className="p-6 flex-grow flex flex-col justify-center">
                {!previewUrl ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center justify-center min-h-[300px]"
                  >
                    <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4">
                      <Upload size={32} />
                    </div>
                    <p className="text-slate-700 font-medium mb-1">Click to upload a code screenshot</p>
                    <p className="text-slate-500 text-sm">JPEG, PNG, WEBP supported</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img 
                      src={previewUrl} 
                      alt="Code preview" 
                      className="w-full h-auto object-contain max-h-[400px]"
                    />
                  </div>
                )}
              </div>

              {previewUrl && !results && !isProcessing && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={analyzeCodeImage}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-colors flex items-center justify-center"
                  >
                    <Cpu className="w-5 h-5 mr-2" /> Generate Learning Blueprint
                  </button>
                </div>
              )}

              {isProcessing && (
                <div className="p-8 border-t border-slate-100 flex flex-col items-center justify-center text-slate-500 space-y-4 bg-blue-50/30">
                  <Activity className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="font-medium animate-pulse text-blue-700">Analyzing syntax & writing explanations...</p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start shadow-sm">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Output (Takes up 7 columns on extra large screens) */}
          <div className="xl:col-span-7 space-y-6">
            {!results && !isProcessing && (
              <div className="bg-slate-100/50 rounded-2xl border border-slate-200 border-dashed h-full min-h-[400px] flex items-center justify-center text-slate-400 p-8 text-center">
                <div>
                  <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="max-w-xs mx-auto">Upload an image and run the analysis to view the extracted code, step-by-step breakdown, and syntax blueprint here.</p>
                </div>
              </div>
            )}

            {results && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                
                {/* Extracted Code Box & Purpose */}
                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-800/80 border-b border-slate-700">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                      </div>
                      <span className="text-slate-400 text-xs font-mono ml-2 uppercase tracking-wider">
                        {results.language} Extraction
                      </span>
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className="text-slate-400 hover:text-white transition-colors flex items-center text-xs bg-slate-700 px-2 py-1 rounded"
                    >
                      {copied ? <><CheckCircle2 className="w-3 h-3 mr-1 text-green-400" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                    </button>
                  </div>
                  <div className="p-5 overflow-x-auto">
                    <pre className="text-green-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      <code>{results.extractedCode}</code>
                    </pre>
                  </div>
                  <div className="bg-slate-800 p-4 border-t border-slate-700 text-slate-300 text-sm">
                    <span className="font-semibold text-white mr-2">Goal:</span> 
                    {results.codeDescription}
                  </div>
                </div>

                {/* NEW: Step-by-step Execution */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-green-50/50">
                    <h3 className="font-bold text-green-800 flex items-center">
                      <ListOrdered className="w-5 h-5 mr-2" /> Step-by-Step Execution
                    </h3>
                  </div>
                  <div className="p-0">
                    {results.lineByLine?.map((step, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row border-b border-slate-100 last:border-0 p-4 hover:bg-slate-50">
                        <div className="sm:w-16 flex-shrink-0 mb-2 sm:mb-0">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-bold w-6 h-6 rounded-full border border-slate-200">
                            {step.lineNumber}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <div className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-700 mb-2 inline-block">
                            {step.codeText}
                          </div>
                          <p className="text-sm text-slate-700">{step.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NEW: Common Beginner Pitfalls */}
                {results.commonPitfalls && results.commonPitfalls.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                        <div className="p-4 border-b border-red-100 bg-red-50/50">
                          <h3 className="font-bold text-red-800 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" /> Watch Out! (Common Mistakes)
                          </h3>
                        </div>
                        <div className="p-4 space-y-4">
                          {results.commonPitfalls.map((pitfall, idx) => (
                            <div key={idx} className="bg-red-50/30 border border-red-100 p-4 rounded-xl">
                              <h4 className="text-sm font-bold text-red-900 mb-1 flex items-center">
                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                Mistake: {pitfall.mistake}
                              </h4>
                              <p className="text-sm text-red-700 mb-3 ml-4">{pitfall.consequence}</p>
                              <div className="ml-4 bg-white border border-green-200 p-3 rounded-lg flex items-start">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-green-800"><span className="font-semibold">How to fix:</span> {pitfall.fix}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                {/* Blueprint Analysis Cards (Refined) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-blue-50/50">
                    <h3 className="font-bold text-blue-800 flex items-center">
                      <Activity className="w-5 h-5 mr-2" /> Syntax Breakdown (The Blueprints)
                    </h3>
                  </div>
                  <div className="p-0">
                    {results.annotations?.map((note, index) => (
                      <div key={index} className="flex flex-col sm:flex-row border-b border-slate-100 last:border-0 p-4 hover:bg-slate-50 transition-colors">
                        <div className="sm:w-24 flex-shrink-0 mb-2 sm:mb-0">
                          <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-200">
                            {note.id}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-sm font-bold text-slate-800 mb-1">{note.category}</h4>
                          <p className="text-sm text-slate-600 mb-3">{note.description}</p>
                          <div className="inline-block bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-700 border border-slate-200">
                            {note.targetText}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enhanced Schema Conversion Key */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm tracking-wide flex items-center uppercase">
                      Formal Schema Glossary
                    </h3>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded font-mono">CODE_ANALYSIS_01</span>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-4">
                      {results.schemaConversionKey?.map((keyItem, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="flex flex-wrap sm:flex-nowrap items-center text-sm font-mono mb-2">
                            <span className="text-slate-500">"{keyItem.original}"</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 mx-2 hidden sm:block" />
                            <span className="text-blue-700 font-bold ml-2 sm:ml-0">
                              {keyItem.idRef && <span className="text-blue-400 mr-2">({keyItem.idRef})</span>}
                              {keyItem.formal}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-2 mt-1">
                            {keyItem.definition || "No definition provided."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}