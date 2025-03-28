
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';

interface WebcamFeedProps {
  onVideoElement?: (videoElement: HTMLVideoElement | null) => void;
  showDetectionOverlay?: boolean;
  status?: 'safe' | 'warning' | 'danger';
}

const WebcamFeed = ({ 
  onVideoElement, 
  showDetectionOverlay = true,
  status = 'safe' 
}: WebcamFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
            frameRate: { min: 15, ideal: 30 } // Request higher framerate for better tracking
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsLoading(false);
            if (onVideoElement) {
              onVideoElement(videoRef.current);
            }
          };
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Could not access webcam. Please ensure you have granted camera permissions.');
        setIsLoading(false);
      }
    };

    startWebcam();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (onVideoElement) {
        onVideoElement(null);
      }
    };
  }, [onVideoElement]);

  // Determine border color based on status
  const borderColorClass = {
    safe: 'border-detection-safe',
    warning: 'border-detection-warning',
    danger: 'border-detection-danger',
  }[status];

  // Animation based on status
  const animationClass = status !== 'safe' ? 'animate-pulse' : '';

  return (
    <Card className={cn(
      "w-full overflow-hidden relative transition-all duration-300", 
      borderColorClass,
      status !== 'safe' && 'shadow-lg',
      status === 'danger' && animationClass
    )}>
      <CardContent className="p-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-10">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-10">
            <div className="bg-white p-4 rounded-lg max-w-xs text-center">
              <CameraOff className="h-8 w-8 mx-auto mb-2 text-detection-danger" />
              <p className="text-red-500">{error}</p>
              <button 
                className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Status overlay */}
        {status !== 'safe' && (
          <div className={cn(
            "absolute top-2 right-2 z-20 px-3 py-1 rounded-full text-white text-sm font-medium",
            status === 'warning' ? "bg-detection-warning" : "bg-detection-danger"
          )}>
            {status === 'warning' ? 'Warning' : 'Alert'}
          </div>
        )}
        
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted
          className="w-full h-auto" 
        />
        
        {!isLoading && !error && showDetectionOverlay && (
          <canvas 
            id="detection-overlay"
            className="absolute top-0 left-0 w-full h-full pointer-events-none" 
            width={640}
            height={480}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default WebcamFeed;
