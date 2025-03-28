import { toast } from '@/components/ui/use-toast';

let audioContext: AudioContext | null = null;
let analyzer: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let audioStream: MediaStream | null = null;

// Keep track of noise levels for anomaly detection
const recentNoiseLevel: number[] = [];
const MAX_NOISE_SAMPLES = 20;
const NOISE_THRESHOLD = 0.2; // Threshold for suspicious noise level

/**
 * Initialize audio monitoring
 */
export const initializeAudio = async (): Promise<boolean> => {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // Get microphone permission
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });

    // Setup analyzer
    if (audioContext && audioStream) {
      microphone = audioContext.createMediaStreamSource(audioStream);
      analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      microphone.connect(analyzer);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to initialize audio detection:', error);
    toast({
      title: 'Audio Detection Error',
      description: 'Could not access microphone. Some detection features will be limited.',
      variant: 'destructive',
    });
    return false;
  }
};

/**
 * Stop audio monitoring and release resources
 */
export const stopAudio = () => {
  if (microphone) {
    microphone.disconnect();
    microphone = null;
  }
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  analyzer = null;
};

/**
 * Process audio to detect suspicious sounds
 * @returns Object containing noise metrics
 */
export const processAudio = (): { 
  noiseDetected: boolean; 
  noiseLevel: number;
  volumeLevel: number;
} => {
  const result = {
    noiseDetected: false,
    noiseLevel: 0,
    volumeLevel: 0
  };

  if (!analyzer) return result;

  // Get frequency data
  const dataArray = new Uint8Array(analyzer.frequencyBinCount);
  analyzer.getByteFrequencyData(dataArray);

  // Calculate current volume level (0-1)
  const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
  const normalizedVolume = average / 255;
  result.volumeLevel = normalizedVolume;

  // Track noise levels
  recentNoiseLevel.push(normalizedVolume);
  if (recentNoiseLevel.length > MAX_NOISE_SAMPLES) {
    recentNoiseLevel.shift();
  }

  // Calculate noise variance (rough indication of talking vs background noise)
  if (recentNoiseLevel.length > 5) {
    const mean = recentNoiseLevel.reduce((sum, val) => sum + val, 0) / recentNoiseLevel.length;
    const variance = recentNoiseLevel.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentNoiseLevel.length;
    
    result.noiseLevel = variance;
    // Higher variance often indicates talking or irregular noises
    result.noiseDetected = variance > NOISE_THRESHOLD && normalizedVolume > 0.1;
  }

  return result;
};
