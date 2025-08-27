'use client'

import { useState, useEffect, useRef } from 'react';

// Deepgram STT Hook
export function useStt() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  
  const startListening = async () => {
    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create WebSocket connection to Deepgram
      const socket = new WebSocket('wss://api.deepgram.com/v1/listen', [
        'token',
        process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || ''
      ]);
      
      socket.onopen = () => {
        console.log('Deepgram WebSocket connected');
        setIsListening(true);
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]) {
          const transcript = data.channel.alternatives[0].transcript;
          if (data.is_final) {
            setTranscript(prev => prev + transcript + ' ');
            setInterimTranscript('');
          } else {
            setInterimTranscript(transcript);
          }
        }
      };
      
      socket.onerror = (error) => {
        console.error('Deepgram WebSocket error:', error);
        setError('Speech recognition failed');
        fallbackToWebSpeech();
      };
      
      // Set up MediaRecorder to send audio to Deepgram
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };
      
      mediaRecorder.start(100); // Send data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      socketRef.current = socket;
      
    } catch (error) {
      console.error('STT error:', error);
      setError('Microphone access denied');
      fallbackToWebSpeech();
    }
  };
  
  const stopListening = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setIsListening(false);
  };
  
  // Fallback to Web Speech API
  const fallbackToWebSpeech = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript + ' ');
      }
      setInterimTranscript(interimTranscript);
    };
    
    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
    setIsListening(true);
  };
  
  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  };
  
  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript
  };
}

// Deepgram TTS Hook
export function useTts() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [isEnabled, setIsEnabled] = useState(true);
  
  const speak = async (text) => {
    if (!text || !isEnabled) return;
    
    setIsSpeaking(true);
    
    try {
      // Try Deepgram TTS first (fix endpoint path)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model: 'aura-2-hermes-en' })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          console.error('Audio playback failed, falling back to Web Speech');
          fallbackToWebSpeech(text);
        };
        
        await audio.play();
      } else {
        throw new Error('Deepgram TTS failed');
      }
    } catch (error) {
      console.error('TTS error:', error);
      fallbackToWebSpeech(text);
    }
  };
  
  // Fallback to Web Speech API
  const fallbackToWebSpeech = (text) => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech not supported');
      setIsSpeaking(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };
    
    speechSynthesis.speak(utterance);
  };
  
  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };
  
  const toggleEnabled = () => {
    setIsEnabled(prev => !prev);
    if (isSpeaking) {
      stopSpeaking();
    }
  };
  
  return {
    isSpeaking,
    isEnabled,
    error,
    speak,
    stopSpeaking,
    toggleEnabled
  };
}