// Deepgram Voice Utilities for Fitbear AI

let currentAudio = null;
let currentUrl = null;

/**
 * Speak text using Deepgram Aura-2 TTS
 * @param {string} text - Text to speak
 * @param {string} model - Deepgram model (default: aura-2-hermes-en)
 */
export async function speakDeepgram(text, model = 'aura-2-hermes-en') {
  try {
    // Stop any previous audio
    stopSpeaking();
    
    if (!text || text.trim() === '') {
      throw new Error('No text provided for TTS');
    }
    
    console.log('Requesting TTS for:', text.substring(0, 50) + '...');
    
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), model })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TTS failed: ${error.error}`);
    }
    
    const audioBlob = await response.blob();
    currentUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(currentUrl);
    
    // Auto-cleanup when audio ends
    currentAudio.onended = () => stopSpeaking();
    
    // Handle audio errors
    currentAudio.onerror = () => {
      console.error('Audio playback error');
      stopSpeaking();
    };
    
    await currentAudio.play();
    console.log('TTS playback started');
    
  } catch (error) {
    console.error('Deepgram TTS error:', error);
    stopSpeaking();
    throw error;
  }
}

/**
 * Stop current TTS playback
 */
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

/**
 * Check if TTS is currently playing
 */
export function isSpeaking() {
  return currentAudio && !currentAudio.paused;
}

/**
 * Record audio using push-to-talk
 * @param {number} maxDuration - Maximum recording duration in milliseconds (default: 5000)
 */
export async function recordOnce(maxDuration = 5000) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });
    
    const mediaRecorder = new MediaRecorder(stream, { 
      mimeType: 'audio/webm;codecs=opus' 
    });
    
    const chunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    mediaRecorder.start();
    console.log('Recording started...');
    
    // Auto-stop after maxDuration
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, maxDuration);
    
    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunks.length === 0) {
          reject(new Error('No audio recorded'));
          return;
        }
        
        const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        console.log('Recording completed, size:', audioBlob.size, 'bytes');
        resolve(audioBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        stream.getTracks().forEach(track => track.stop());
        reject(new Error(`Recording error: ${event.error}`));
      };
    });
    
  } catch (error) {
    console.error('Microphone access error:', error);
    throw new Error(`Microphone access failed: ${error.message}`);
  }
}

/**
 * Transcribe audio using Deepgram STT
 * @param {Blob} audioBlob - Audio blob from recording
 */
export async function transcribeAudio(audioBlob) {
  try {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('No audio data to transcribe');
    }
    
    console.log('Sending audio for transcription, size:', audioBlob.size, 'bytes');
    
    const response = await fetch('/api/stt', {
      method: 'POST',
      body: audioBlob,
      headers: {
        'Content-Type': 'audio/webm'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`STT failed: ${error.error}`);
    }
    
    const result = await response.json();
    console.log('Transcription result:', result);
    
    return {
      text: result.transcript || '',
      confidence: result.confidence || 0
    };
    
  } catch (error) {
    console.error('Deepgram STT error:', error);
    throw error;
  }
}

/**
 * Complete push-to-talk workflow: record → transcribe
 * @param {number} maxDuration - Maximum recording duration
 */
export async function pushToTalk(maxDuration = 5000) {
  try {
    const audioBlob = await recordOnce(maxDuration);
    const transcription = await transcribeAudio(audioBlob);
    
    if (!transcription.text.trim()) {
      throw new Error('No speech detected in recording');
    }
    
    return transcription;
    
  } catch (error) {
    console.error('Push-to-talk error:', error);
    throw error;
  }
}

/**
 * Check if voice features are available
 */
export function isVoiceSupported() {
  return {
    tts: true, // Deepgram TTS via API
    stt: navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
    mediaRecorder: typeof MediaRecorder !== 'undefined'
  };
}