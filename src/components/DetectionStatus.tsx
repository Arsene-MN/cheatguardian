
import { useEffect, useState } from 'react';
import { Shield, Check, AlertTriangle, AlertCircle, Eye, Users, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  status: 'safe' | 'warning' | 'danger' | 'info';
  tooltip?: string;
}

const StatusItem = ({ icon, label, value, status, tooltip }: StatusItemProps) => {
  const statusClasses = {
    safe: 'bg-detection-safe/10 text-detection-safe border-detection-safe/30',
    warning: 'bg-detection-warning/10 text-detection-warning border-detection-warning/30',
    danger: 'bg-detection-danger/10 text-detection-danger border-detection-danger/30',
    info: 'bg-detection-info/10 text-detection-info border-detection-info/30',
  };

  const content = (
    <div className={cn(
      'flex items-center gap-3 p-3 border rounded-lg transition-all',
      statusClasses[status]
    )}>
      <div className="text-current">{icon}</div>
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

interface DetectionStatusProps {
  facePresent: boolean;
  faceCount: number;
  lookingAway: boolean;
  estimatedAttention: number;
  status: 'safe' | 'warning' | 'danger';
  statusMessage: string;
}

const DetectionStatus = ({
  facePresent,
  faceCount,
  lookingAway,
  estimatedAttention,
  status,
  statusMessage
}: DetectionStatusProps) => {
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get formatted time
  const formattedTime = time.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  // Get overall status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'safe':
        return <Check className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'danger':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="font-semibold text-lg">Detection Status</h3>
        <div className="text-muted-foreground text-sm">{formattedTime}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div 
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg transition-colors",
            status === 'safe' && "bg-detection-safe/10 text-detection-safe",
            status === 'warning' && "bg-detection-warning/10 text-detection-warning",
            status === 'danger' && "bg-detection-danger/10 text-detection-danger",
            status !== 'safe' && "animate-pulse"
          )}
        >
          {getStatusIcon()}
          <span className="font-medium">{statusMessage}</span>
        </div>

        {/* Status metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatusItem 
            icon={<Eye className="h-4 w-4" />}
            label="Face Detected"
            value={facePresent ? "Yes" : "No"}
            status={facePresent ? "safe" : "danger"}
            tooltip="Indicates if a face is detected in the webcam feed"
          />
          
          <StatusItem 
            icon={<Users className="h-4 w-4" />}
            label="Face Count"
            value={faceCount}
            status={faceCount === 1 ? "safe" : faceCount === 0 ? "danger" : "danger"}
            tooltip="Number of faces detected in the frame"
          />
          
          <StatusItem 
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Looking Away"
            value={lookingAway ? "Yes" : "No"}
            status={lookingAway ? "warning" : "safe"}
            tooltip="Detects if the student is frequently looking away from the screen"
          />
          
          <StatusItem 
            icon={<Brain className="h-4 w-4" />}
            label="Attention"
            value={`${estimatedAttention}%`}
            status={
              estimatedAttention >= 80 ? "safe" : 
              estimatedAttention >= 50 ? "warning" : "danger"
            }
            tooltip="Estimated attention level based on behavior"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DetectionStatus;
