'use client'

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStt, useTts } from '@/lib/hooks/useVoice';
import { usePostHog } from '@/lib/hooks/usePostHog';

export function VoiceButton({ onTranscriptComplete, className = "" }) {
  const { track } = usePostHog();
  const { 
    isListening, 
    transcript, 
    interimTranscript, 
    error: sttError, 
    startListening, 
    stopListening, 
    clearTranscript 
  } = useStt();
  
  const { 
    isSpeaking, 
    isEnabled: ttsEnabled, 
    error: ttsError, 
    speak, 
    stopSpeaking, 
    toggleEnabled: toggleTts 
  } = useTts();
  
  const [showTranscript, setShowTranscript] = useState(false);
  
  const handleMouseDown = () => {
    if (isListening) return;
    
    clearTranscript();
    setShowTranscript(true);
    startListening();
    
    // Track voice usage
    track('voice_recording_started', {
      feature: 'push_to_talk',
      location: 'coach_chat'
    });
  };
  
  const handleMouseUp = () => {
    if (!isListening) return;
    
    stopListening();
    setShowTranscript(false);
    
    // Send transcript to parent component
    if (transcript.trim()) {
      onTranscriptComplete(transcript.trim());
      track('voice_transcript_completed', {
        feature: 'push_to_talk', 
        transcript_length: transcript.length
      });
    }
  };
  
  const handleTouchStart = handleMouseDown;
  const handleTouchEnd = handleMouseUp;
  
  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Push-to-talk button */}
      <div className="flex items-center space-x-2">
        <Button
          variant={isListening ? "default" : "outline"}
          size="lg"
          className={`${className} ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={!!sttError}
        >
          {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          <span className="ml-2">
            {isListening ? 'Listening...' : 'Hold to Talk'}
          </span>
        </Button>
        
        {/* TTS toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTts}
          title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>
      
      {/* Live transcript display */}
      {showTranscript && (isListening || interimTranscript) && (
        <div className="w-full max-w-md p-3 bg-gray-100 rounded-lg text-sm">
          <div className="text-gray-600 mb-1">Transcript:</div>
          <div className="text-gray-900">
            {transcript}
            <span className="text-gray-500 italic">{interimTranscript}</span>
            {isListening && <span className="animate-pulse">|</span>}
          </div>
        </div>
      )}
      
      {/* Error display */}
      {(sttError || ttsError) && (
        <div className="text-red-500 text-xs text-center max-w-md">
          {sttError || ttsError}
        </div>
      )}
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="flex items-center space-x-2 text-blue-500 text-sm">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span>Coach C is speaking...</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopSpeaking}
            className="text-blue-500 hover:text-blue-700"
          >
            Stop
          </Button>
        </div>
      )}
    </div>
  );
}

// TTS Speaker component for coach responses
export function CoachSpeaker({ text, autoSpeak = false }) {
  const { speak, isSpeaking, isEnabled } = useTts();
  const { track } = usePostHog();
  
  React.useEffect(() => {
    if (autoSpeak && isEnabled && text) {
      speak(text);
      track('coach_response_spoken', {
        feature: 'auto_tts',
        response_length: text.length
      });
    }
  }, [text, autoSpeak, isEnabled, speak, track]);
  
  if (!isEnabled) return null;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        speak(text);
        track('coach_response_spoken', {
          feature: 'manual_tts',
          response_length: text.length
        });
      }}
      disabled={isSpeaking}
      className="text-blue-500 hover:text-blue-700"
    >
      <Volume2 className="w-4 h-4 mr-1" />
      {isSpeaking ? 'Speaking...' : 'Listen'}
    </Button>
  );
}