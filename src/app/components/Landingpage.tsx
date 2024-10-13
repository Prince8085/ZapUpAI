'use client'

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Search, ChevronDown, Cpu, Brain, Sparkles, ArrowRight, Upload, HelpCircle, Menu, X, Linkedin, Instagram, Mic, VolumeX, Volume2, Loader2, Send, Paperclip, Play, Pause } from "lucide-react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip"
import { ScrollArea } from "../components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Slider } from "../components/ui/slider"
import Link from "next/link"
import axios from "axios"
import { createWorker } from 'tesseract.js'
import * as THREE from "three"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Background3D from "./Background3D"

gsap.registerPlugin(ScrollTrigger)

interface Model {
  name: string
  icon: React.ElementType
  description: string
}

interface ModelOption {
  value: string
  label: string
}

interface ModelProvider {
  name: string
  models: string[]
}

interface Response {
  type: 'user' | 'ai' | 'error'
  content: string
  model?: string
}

const models: Model[] = [
  { name: "ZapGPT", icon: Cpu, description: "Fast and efficient language model for general-purpose tasks" },
  { name: "NeuroBolt", icon: Brain, description: "Advanced reasoning and analysis for complex problem-solving" },
  { name: "LightningBERT", icon: Sparkles, description: "Rapid text understanding and generation for content creation" },
  { name: "VisionZap", icon: Search, description: "Image recognition and analysis for visual tasks" },
  { name: "AudioSpark", icon: Volume2, description: "Speech recognition and audio processing capabilities" },
]

const modelOptions: ModelOption[] = [
  { value: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant" },
  { value: "gemma2-9b-it", label: "gemma2-9b-it" },
  { value: "gemma-7b-it", label: "gemma-7b-it" },
  { value: "llama-3.1-70b-versatile", label: "llama-3.1-70b-versatile" },
  { value: "llama-3.2-11b-vision-preview", label: "llama-3.2-11b-vision-preview" },
  { value: "llama-3.2-90b-text-preview", label: "llama-3.2-90b-text-preview" },
  { value: "llava-v1.5-7b-4096-preview", label: "llava-v1.5-7b-4096-preview" },
]

const modelProviders: ModelProvider[] = [
  { name: "Google", models: ["gemma-7b-it", "gemma2-9b-it"] },
  { name: "Groq", models: ["llama3-groq-70b-8192-tool-use-preview", "llama3-groq-8b-8192-tool-use-preview"] },
  { name: "Hugging Face", models: ["distil-whisper-large-v3-en"] },
  {
    name: "Meta",
    models: [
      "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-11b-text-preview",
      "llama-3.2-11b-vision-preview", "llama-3.2-1b-preview", "llama-3.2-3b-preview",
      "llama-3.2-90b-text-preview", "llama-guard-3-8b", "llama3-70b-8192", "llama3-8b-8192",
    ],
  },
  { name: "Mistral AI", models: ["mixtral-8x7b-32768"] },
  { name: "OpenAI", models: ["whisper-large-v3"] },
  { name: "Other", models: ["llava-v1.5-7b-4096-preview"] },
]

export default function LandingPage() {
  const [selectedModel, setSelectedModel] = useState<Model>(models[0])
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("home")
  const [responses, setResponses] = useState<Response[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const responseEndRef = useRef<HTMLDivElement>(null)
  const [model, setModel] = useState("llama-3.1-70b-versatile")
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [voiceRate, setVoiceRate] = useState(1)
  const [voicePitch, setVoicePitch] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null
  const recognition = typeof window !== 'undefined' ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() : null

  const filteredModels = modelProviders.map(provider => ({
    ...provider,
    models: provider.models.filter(model => 
      model.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(provider => provider.models.length > 0)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const clearUploadedFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const extractTextFromImage = async (file: File): Promise<string> => {
    const worker = await createWorker('eng')
    const { data: { text } } = await worker.recognize(file)
    await worker.terminate()
    return text
  }

  const handleQuerySubmit = async () => {
    if (query.trim()) {
      setResponses(prev => [{ type: 'user', content: query }, ...prev])
      setQuery("")
      setIsTyping(true)
      setLoading(true)

      try {
        let messageContent = query
        if (uploadedFile) {
          if (uploadedFile.type.startsWith('image/')) {
            const extractedText = await extractTextFromImage(uploadedFile)
            messageContent += `\nExtracted Text from Image: ${extractedText}`
          } else {
            const fileText = await readFile(uploadedFile)
            messageContent += `\nFile Content: ${fileText}`
          }
        }

        const response = await callModelAPI(model, messageContent)
        setResponses(prev => [{ type: 'ai', content: response, model: model }, ...prev])
      } catch (error) {
        console.error("Error fetching response from API", error)
        let errorMessage = "An error occurred while fetching the response. Please try again."
        if (axios.isAxiosError(error) && error.response) {
          errorMessage = `Error: ${error.response.data.error?.message || "Unknown error occurred"}`
        } else if (axios.isAxiosError(error) && error.request) {
          errorMessage = "Error: No response received from the server. Please check your network."
        } else if (error instanceof Error) {
          errorMessage = `Error: ${error.message}`
        }
        setResponses(prev => [{ type: 'error', content: errorMessage }, ...prev])
      } finally {
        setLoading(false)
        setIsTyping(false)
      }
    }
  }

  const callModelAPI = async (model: string, content: string): Promise<string> => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer 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
`,
    }

    const body = {
      model,
      messages: [{ role: "user", content }],
      temperature: 1,
      max_tokens: 1024,
      top_p: 1,
      stream: model === "llama-3.2-90b-text-preview",
      stop: null,
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      body,
      { headers }
    )

    if (model === "llama-3.2-90b-text-preview") {
      let fullResponse = ""
      for (let chunk of response.data) {
        fullResponse += chunk.choices[0]?.delta?.content || ""
      }
      return fullResponse
    } else {
      return response.data.choices[0]?.message?.content || "No response received"
    }
  }

  useEffect(() => {
    if (responses.length > 0 && responses[0].type === 'ai') {
      responseEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [responses])

  const startListening = () => {
    if (recognition) {
      recognition.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognition) {
      recognition.stop()
      setIsListening(false)
    }
  }

  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: any;
  }

  const handleSpeech = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0][0].transcript
    setQuery(transcript)
    stopListening()
    handleQuerySubmit()
  }

  const speakResponse = (text: string) => {
    if (speechSynthesis && !isMuted) {
      speechSynthesis.cancel() // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = voiceRate
      utterance.pitch = voicePitch
      utterance.volume = 1.0 // Full volume
      speechSynthesis.speak(utterance)
      setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
    }
  }

  const toggleSpeech = (text: string) => {
    if (isSpeaking) {
      speechSynthesis?.cancel()
      setIsSpeaking(false)
    } else {
      speakResponse(text)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (isSpeaking) {
      speechSynthesis?.cancel()
      setIsSpeaking(false)
    }
  }

  if (recognition) {
    recognition.onresult = handleSpeech
    recognition.onend = () => setIsListening(false)
  }

  useEffect(() => {
    // GSAP animations
    gsap.from("h1", { opacity: 0, y: 50, duration: 1, delay: 0.5 })
    gsap.from("p", { opacity: 0, y: 30, duration: 1, delay: 0.8 })
    
    ScrollTrigger.batch("#about .card", {
      onEnter: (elements) => gsap.from(elements, { opacity: 0, y: 50, stagger: 0.15, duration: 0.8 }),
      once: true
    })

    ScrollTrigger.batch("#models .card", {
      onEnter: (elements) => gsap.from(elements, { opacity: 0, scale: 0.8, stagger: 0.15, duration: 0.8 }),
      once: true
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white relative">
      <Background3D />
      <header className="fixed top-0 left-0 right-0  z-50 bg-gray-900 bg-opacity-90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Zap className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold">ZapUp AI</span>
          </div>
          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              {["home", "about", "models", "contact"].map((section) => (
                <li key={section}>
                  <Link
                    href={`#${section}`}
                    className={`hover:text-yellow-400 transition-colors ${
                      activeSection === section ? "text-yellow-400" : ""
                    }`}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Button
            className="md:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 bg-gray-900 z-40 md:hidden"
          >
            <nav className="container mx-auto px-4 py-4">
              <ul className="space-y-4">
                {["home", "about", "models", "contact"].map((section) => (
                  <li key={section}>
                    <Link
                      href={`#${section}`}
                      className={`block py-2 hover:text-yellow-400 transition-colors ${
                        activeSection === section ? "text-yellow-400" : ""
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container mx-auto px-4 py-24">
        <section id="home" className="min-h-screen flex flex-col justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4">ZapUp AI</h1>
            <p className="text-xl md:text-2xl text-gray-300">The Fastest Answering AI Using Open Source Models</p>
            <motion.p
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 3, repeatDelay: 0.5 }}
              className="text-2xl md:text-3xl text-yellow-400 mt-2"
            >
              Instant answers at your fingertips
            </motion.p>
          </motion.div>

          <div className="max-w-4xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-gray-800 border-gray-700 mb-6">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-yellow-400">How to Use ZapUp AI</CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.ol
                    className="list-decimal list-inside space-y-2 text-gray-300"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.1 } },
                    }}
                  >
                    {[
                      "Select an AI model from the dropdown below.",
                      "Type your question, use voice input, or upload a file for context.",
                      "Click the 'Zap It!' button or use voice commands to get your instant answer.",
                      "Use the play/pause button to have the AI read the response aloud.",
                    ].map((instruction, index) => (
                      <motion.li
                        key={index}
                        variants={{
                          hidden: { opacity: 0, x: -20 },
                          visible: { opacity: 1, x: 0 },
                        }}
                      >
                        {instruction}
                      </motion.li>
                    ))}
                  </motion.ol>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              className="mb-6 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative z-50">
                <Select onValueChange={(value) => setModel(value)} defaultValue={model}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="absolute bg-gray-800 border-gray-700">
                    {modelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-2 text-sm text-gray-400">Selected model: {model}</p>
            </motion.div>

            <motion.div
              className="flex flex-col bg-gray-900 text-white p-4 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex flex-col md:flex-row items-center mb-4 space-y-2 md:space-y-0 md:space-x-2">
                <div className="relative flex-grow w-full">
                  <Textarea
                    placeholder="Ask me anything..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-gray-800 border-gray-700 focus:border-yellow-400 text-white pl-10 pr-4 py-2 rounded-md resize-none"
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleQuerySubmit()}
                    rows={3}
                  />
                  <Search className="absolute left-3 top-3 text-gray-400" />
                </div>
                <div className="flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={startListening}
                          className={`bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 ${
                            isListening ? 'animate-pulse' : ''
                          }`}
                        >
                          <Mic className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isListening ? 'Listening...' : 'Start voice input'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleQuerySubmit}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black rounded-full px-6 py-2 font-bold transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 shadow-lg"
                          style={{
                            boxShadow: "0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3), 0 0 30px rgba(250, 204, 21, 0.1)"
                          }}
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 mr-1" />}
                          {loading ? "Processing..." : "Zap It!"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Submit your question</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <ScrollArea className="flex-grow mb-4 bg-gray-800 rounded-lg p-4 overflow-y-auto" style={{ height: '400px', maxHeight: '60vh' }}>
                <AnimatePresence>
                  {responses.map((response, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className={`mb-4 flex ${response.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start max-w-[80%] ${response.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Avatar className={`w-8 h-8 ${response.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                          <AvatarImage src={response.type === 'user' ? "/user-avatar.png" : "/ai-avatar.png"} />
                          <AvatarFallback>{response.type === 'user' ? 'U' : 'AI'}</AvatarFallback>
                        </Avatar>
                        <div className={`p-3 rounded-lg ${
                          response.type === 'user' ? 'bg-blue-600' : 
                          response.type === 'ai' ? 'bg-gray-700' : 'bg-red-600'
                        }`}>
                          {response.type === 'ai' && (
                            <p className="text-xs text-gray-400 mb-1">{response.model}</p>
                          )}
                          {typeof response.content === 'string' ? response.content : (
                            <div className="space-y-2">
                              {response.content}
                            </div>
                          )}
                        </div>
                        {response.type === 'ai' && (
                          <Button
                            onClick={() => toggleSpeech(response.content)}
                            className="ml-2 p-1 bg-gray-700 hover:bg-gray-600 rounded-full"
                            size="icon"
                          >
                            {isSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-400 flex items-center"
                  >
                    <Avatar className="w-8 h-8 mr-2">
                      <AvatarImage src="/ai-avatar.png" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <span className="inline-block p-3 rounded-lg bg-gray-700">
                      AI is typing
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      >
                        ...
                      </motion.span>
                    </span>
                  </motion.div>
                )}
                <div ref={responseEndRef} />
              </ScrollArea>

              <div className="flex flex-wrap items-center space-x-2 space-y-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-700 hover:bg-gray-600 text-white rounded-full px-4 py-2 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Upload File
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload an image or document</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {uploadedFile && (
                  <div className="flex items-center bg-gray-700 rounded-full px-3 py-1 text-sm">
                    <span className="truncate max-w-xs">{uploadedFile.name}</span>
                    <Button
                      onClick={clearUploadedFile}
                      variant="ghost"
                      size="icon"
                      className="ml-2 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                        onClick={() => setShowInstructions(!showInstructions)}
                      >
                        <HelpCircle className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Get help</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="voice-rate" className="text-sm text-gray-400">Voice Rate:</label>
                  <Slider
                    id="voice-rate"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[voiceRate]}
                    onValueChange={([value]) => setVoiceRate(value)}
                    className="w-64"
                  />
                  <span className="text-sm text-gray-400">{voiceRate.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="voice-pitch" className="text-sm text-gray-400">Voice Pitch:</label>
                  <Slider
                    id="voice-pitch"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[voicePitch]}
                    onValueChange={([value]) => setVoicePitch(value)}
                    className="w-64"
                  />
                  <span className="text-sm text-gray-400">{voicePitch.toFixed(1)}</span>
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {showInstructions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 bg-gray-800 rounded-lg p-4"
                >
                  <h3 className="text-lg font-semibold mb-2">Quick Instructions:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-300">
                    <li>Type your question in the text area or use the microphone for voice input.</li>
                    <li>Upload relevant files (images or documents) for additional context.</li>
                    <li>Click "Zap It!" or press Enter to submit your query.</li>
                    <li>Use the play/pause button next to AI responses to have them read aloud.</li>
                    <li>Adjust voice rate and pitch using the sliders below the chat interface.</li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section id="about" className="py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">About ZapUp AI</h2>
            <p className="text-xl text-gray-300">Revolutionizing conversations with cutting-edge AI technology</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Lightning Fast", icon: Zap, description: "Experience instant responses powered by state-of-the-art AI models" },
              { title: "Versatile Models", icon: Cpu, description: "Access a wide range of specialized AI models for diverse tasks" },
              { title: "Voice Enabled", icon: Mic, description: "Seamlessly interact using voice commands and text-to-speech technology" },
              { title: "Continuous Learning", icon: Brain, description: "Our AI models are constantly updated with the latest knowledge" },
              { title: "Multi-modal Capabilities", icon: Search, description: "Process text, images, and audio for comprehensive understanding" },
              { title: "Privacy Focused", icon: Sparkles, description: "Your data is handled securely and with utmost respect for privacy" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-gray-800 border-gray-700 h-full">
                  <CardHeader>
                    <feature.icon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <CardTitle className="text-xl font-bold text-center">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="models" className="py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Our AI Models</h2>
            <p className="text-xl text-gray-300">Explore our range of powerful and specialized AI models</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {models.map((model, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-gray-800 border-gray-700 h-full">
                  <CardHeader>
                    <model.icon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <CardTitle className="text-xl font-bold text-center">{model.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">{model.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="contact" className="py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Contact Us</h2>
            <p className="text-xl text-gray-300">Get in touch with our team</p>
          </motion.div>
          <div className="max-w-md mx-auto">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>We'll get back to you as soon as possible.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                    <Input id="name" placeholder="Your name" className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                    <Input id="email" type="email" placeholder="your@email.com" className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300">Message</label>
                    <Textarea id="message" placeholder="Your message" className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black">Send Message</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-8 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-2xl font-bold mb-2">ZapUp AI</h3>
              <p className="text-gray-400">Empowering conversations with AI</p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-yellow-400 transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors">
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} ZapUp AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}