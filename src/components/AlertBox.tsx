
import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

export interface Alert {
  id: string;
  message: string;
  type: 'warning' | 'danger';
  timestamp: Date;
}

interface AlertBoxProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

const AlertBox = ({ alerts, onDismiss }: AlertBoxProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Show toast for new alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const latestAlert = alerts[0];
      
      // Only show toast for alerts that are less than 1 second old
      const isNew = (new Date().getTime() - latestAlert.timestamp.getTime()) < 1000;
      
      if (isNew) {
        toast({
          title: latestAlert.type === 'danger' ? 'Cheating Detected' : 'Warning',
          description: latestAlert.message,
          variant: latestAlert.type === 'danger' ? 'destructive' : 'default',
        });
      }
    }
  }, [alerts]);

  if (alerts.length === 0) {
    return (
      <Card className="border border-dashed">
        <CardContent className="p-4 text-center text-muted-foreground">
          <p>No suspicious activity detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-destructive/50",
      alerts.some(a => a.type === 'danger') && "animate-alert-flash"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-detection-danger" />
          <h3 className="font-semibold">
            Suspicious Activity ({alerts.length})
          </h3>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      
      {!isCollapsed && (
        <CardContent className="p-0 max-h-[300px] overflow-y-auto">
          <ul className="divide-y">
            {alerts.map((alert) => (
              <li 
                key={alert.id} 
                className={cn(
                  "flex items-start justify-between p-4",
                  alert.type === 'danger' ? 'bg-destructive/5' : 'bg-orange-50'
                )}
              >
                <div className="flex-1">
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};

export default AlertBox;
