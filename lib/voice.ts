// Deepgram Voice Utilities for Production

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

/**
 * Speak text using Deepgram TTS
 */
export async function speakDeepgram(text: string, model = 'aura-asteria-en'): Promise<void> {
  try {
    // Stop any previous audio
    stopSpeaking();
    
    if (!text || text.trim() === '') {
      throw new Error('No text provided for TTS');
    }
    
    console.log('Requesting Deepgram TTS for:', text.substring(0, 50) + '...');
    
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
    console.log('Deepgram TTS playback started');
    
  } catch (error) {
    console.error('Deepgram TTS error:', error);
    stopSpeaking();
    throw error;
  }
}

/**
 * Stop current TTS playback
 */
export function stopSpeaking(): void {
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
 * Complete push-to-talk workflow: record → transcribe
 */
export async function pushToTalk(maxDuration = 5000): Promise<{ text: string }> {
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
    
    const chunks: BlobPart[] = [];
    
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
    
    const audioBlob = await new Promise<Blob>((resolve, reject) => {
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
        reject(new Error(`Recording error: ${(event as any).error}`));
      };
    });
    
    // Transcribe audio using Deepgram STT
    console.log('Sending audio for Deepgram transcription, size:', audioBlob.size, 'bytes');
    
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
    console.log('Deepgram transcription result:', result);
    
    if (!result.text || !result.text.trim()) {
      throw new Error('No speech detected in recording');
    }
    
    return {
      text: result.text.trim()
    };
    
  } catch (error) {
    console.error('Push-to-talk error:', error);
    throw error;
  }
}

/**
 * Check if TTS is currently playing
 */
export function isSpeaking(): boolean {
  return currentAudio && !currentAudio.paused;
}