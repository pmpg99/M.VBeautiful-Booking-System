import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

interface PushNotificationToggleProps {
  variant?: 'button' | 'switch';
  showLabel?: boolean;
  className?: string;
}

export function PushNotificationToggle({ 
  variant = 'switch', 
  showLabel = true,
  className = ''
}: PushNotificationToggleProps) {
  const { user } = useAuth();
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    isLoading, 
    toggleSubscription 
  } = usePushNotifications();

  // Don't show if not logged in or not supported
  if (!user || !isSupported) {
    return null;
  }

  // Don't show if permission was denied
  if (permission === 'denied') {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        <p>Notificações bloqueadas pelo navegador</p>
        <p className="text-xs">Ative nas configurações do navegador</p>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        variant={isSubscribed ? 'secondary' : 'default'}
        size="sm"
        onClick={toggleSubscription}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : isSubscribed ? (
          <BellOff className="h-4 w-4 mr-2" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        )}
        {isSubscribed ? 'Desativar Notificações' : 'Ativar Notificações'}
      </Button>
    );
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {showLabel && (
        <div className="space-y-0.5">
          <Label htmlFor="push-notifications" className="text-base">
            Notificações Push
          </Label>
          <p className="text-sm text-muted-foreground">
            Receber alertas sobre alterações nas marcações
          </p>
        </div>
      )}
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Switch
          id="push-notifications"
          checked={isSubscribed}
          onCheckedChange={toggleSubscription}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
