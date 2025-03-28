
import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Clipboard, Settings, Github, Mic, MicOff } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import WebcamFeed from '@/components/WebcamFeed';
import DetectionStatus from '@/components/DetectionStatus';
import AlertBox, { Alert } from '@/components/AlertBox';
import {
  initializeDetection,
  processVideoFrame,
  getDetectionStatus,
  drawDetections
} from '@/utils/detectionUtils';
import {
  initializeAudio,
  processAudio,
  stopAudio
} from '@/utils/audioUtils';

const Index = () => {
  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [facePresent, setFacePresent] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [lookingAway, setLookingAway] = useState(false);
  const [estimatedAttention, setEstimatedAttention] = useState(100);
  const [detectionStatus, setDetectionStatus] = useState<'safe' | 'warning' | 'danger'>('safe');
  const [statusMessage, setStatusMessage] = useState('Starting detection...');
  
  // Audio detection state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [noiseDetected, setNoiseDetected] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Handle setting video element ref from WebcamFeed
  const handleVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);
  
  // Get canvas element ref
  const handleCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);
  
  // Initialize detection model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await initializeDetection();
        setIsModelLoaded(true);
        toast({
          title: 'Detection Model Loaded',
          description: 'The AI model is ready to monitor for suspicious activity.',
        });
      } catch (error) {
        console.error('Error loading model:', error);
        toast({
          title: 'Error',
          description: 'Failed to load detection model. Please refresh the page.',
          variant: 'destructive',
        });
      }
    };
    
    loadModel();
  }, []);
  
  // Initialize audio detection
  const toggleAudio = async () => {
    if (audioEnabled) {
      stopAudio();
      setAudioEnabled(false);
      toast({
        title: 'Audio Monitoring Disabled',
        description: 'Audio detection has been turned off.',
      });
    } else {
      const initialized = await initializeAudio();
      setAudioEnabled(initialized);
      if (initialized) {
        toast({
          title: 'Audio Monitoring Enabled',
          description: 'The system will now detect suspicious sounds.',
        });
      }
    }
  };
  
  // Start or stop detection loop
  useEffect(() => {
    const detectFrame = async () => {
      if (!videoRef.current || !isDetecting || !isModelLoaded) return;
      
      try {
        // Process video frame
        const results = await processVideoFrame(videoRef.current);
        
        // Update state with detection results
        setFacePresent(results.facePresent);
        setFaceCount(results.faceCount);
        setLookingAway(results.lookingAway);
        setEstimatedAttention(results.estimatedAttention);
        
        // Process audio if enabled
        if (audioEnabled) {
          const audioResults = processAudio();
          setNoiseDetected(audioResults.noiseDetected);
          setVolumeLevel(audioResults.volumeLevel);
          
          // Add alert for suspicious audio
          if (audioResults.noiseDetected) {
            const shouldAddAlert = !alerts.some(
              alert => alert.message === 'Suspicious sounds detected' && 
                      (new Date().getTime() - alert.timestamp.getTime()) < 10000
            );
            
            if (shouldAddAlert) {
              setAlerts(prev => [
                {
                  id: `alert-${Date.now()}`,
                  message: 'Suspicious sounds detected',
                  type: 'warning',
                  timestamp: new Date()
                },
                ...prev
              ]);
            }
          }
        }
        
        // Determine overall detection status
        let status = getDetectionStatus(
          results.facePresent,
          results.faceCount,
          results.lookingAway
        );
        
        // Update status if audio problems detected
        if (audioEnabled && noiseDetected && status.status === 'safe') {
          status = {
            status: 'warning',
            message: 'Suspicious audio detected'
          };
        }
        
        setDetectionStatus(status.status);
        setStatusMessage(status.message);
        
        // Add alerts for suspicious activities
        if (status.status === 'danger' || status.status === 'warning') {
          const shouldAddAlert = !alerts.some(
            alert => alert.message === status.message && 
                    (new Date().getTime() - alert.timestamp.getTime()) < 10000
          );
          
          if (shouldAddAlert) {
            setAlerts(prev => [
              {
                id: `alert-${Date.now()}`,
                message: status.message,
                type: status.status,
                timestamp: new Date()
              },
              ...prev
            ]);
          }
        }
        
        // Draw detections on canvas
        if (canvasRef.current && results.predictions) {
          drawDetections(
            canvasRef.current,
            results.predictions,
            videoRef.current.videoWidth,
            videoRef.current.videoHeight
          );
        }
      } catch (error) {
        console.error('Error in detection loop:', error);
      }
      
      // Schedule next frame
      animationRef.current = requestAnimationFrame(detectFrame);
    };
    
    if (isDetecting && isModelLoaded) {
      detectFrame();
    } else if (!isDetecting && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDetecting, isModelLoaded, audioEnabled, noiseDetected, alerts]);
  
  // Handle dismissing an alert
  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };
  
  // Toggle detection
  const toggleDetection = () => {
    if (!isModelLoaded) {
      toast({
        title: 'Please Wait',
        description: 'The detection model is still loading.',
      });
      return;
    }
    
    setIsDetecting(prev => !prev);
    
    if (!isDetecting) {
      toast({
        title: 'Detection Started',
        description: 'The system is now monitoring for suspicious activity.',
      });
    } else {
      toast({
        title: 'Detection Paused',
        description: 'Monitoring is currently paused.',
      });
      // Also stop audio monitoring when stopping detection
      if (audioEnabled) {
        stopAudio();
        setAudioEnabled(false);
      }
    }
  };
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (audioEnabled) {
        stopAudio();
      }
    };
  }, [audioEnabled]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-detection-info" />
            <h1 className="text-xl font-bold">CheatGuardian</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/your-repo/cheatguardian"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <Github className="h-5 w-5" />
            </a>
            {isDetecting && (
              <Button
                onClick={toggleAudio}
                variant="outline"
                size="sm"
                className={audioEnabled ? "text-detection-info" : ""}
              >
                {audioEnabled ? (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Audio On
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Audio Off
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={toggleDetection}
              variant={isDetecting ? "destructive" : "default"}
              size="sm"
            >
              {isDetecting ? "Stop Monitoring" : "Start Monitoring"}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Webcam feed */}
          <div className="md:col-span-2">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Live Monitoring</h2>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-block w-3 h-3 rounded-full",
                      isDetecting ? "bg-detection-safe animate-pulse" : "bg-muted"
                    )}></span>
                    <span className="text-sm text-muted-foreground">
                      {isDetecting ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                
                <WebcamFeed 
                  onVideoElement={handleVideoElement} 
                  status={detectionStatus}
                />
                
                {!isModelLoaded && (
                  <div className="mt-4 text-center">
                    <p className="text-muted-foreground">Loading AI detection model...</p>
                    <div className="w-full bg-muted mt-2 rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full animate-pulse w-1/2"></div>
                    </div>
                  </div>
                )}
                
                <canvas 
                  ref={handleCanvasRef} 
                  className="hidden" 
                  width={640} 
                  height={480}
                />
              </CardContent>
            </Card>
            
            <AlertBox alerts={alerts} onDismiss={dismissAlert} />
          </div>
          
          {/* Right column - Status and metrics */}
          <div className="space-y-6">
            <DetectionStatus 
              facePresent={facePresent}
              faceCount={faceCount}
              lookingAway={lookingAway}
              estimatedAttention={estimatedAttention}
              noiseDetected={audioEnabled ? noiseDetected : undefined}
              volumeLevel={audioEnabled ? volumeLevel : undefined}
              status={detectionStatus}
              statusMessage={statusMessage}
            />
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  How It Works
                </h3>
                
                <div className="space-y-4 text-sm">
                  <p>
                    CheatGuardian uses AI-powered computer vision to detect potential cheating behavior during online exams.
                  </p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">The system detects:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Multiple faces in the webcam view</li>
                      <li>Face disappearance from the frame</li>
                      <li>Frequent looking away from the screen</li>
                      <li>Unusual head movements</li>
                      {audioEnabled && <li>Suspicious sounds or conversations</li>}
                    </ul>
                  </div>
                  
                  <p className="text-muted-foreground">
                    All processing happens locally in your browser - no video or audio is uploaded or stored.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper function for className conditionals
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default Index;
