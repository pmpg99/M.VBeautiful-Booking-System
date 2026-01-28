import { validatePassword, getStrengthLabel } from "@/lib/passwordValidation";

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

export const PasswordStrengthIndicator = ({ 
  password, 
  showFeedback = true 
}: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const validation = validatePassword(password);
  const { label, color } = getStrengthLabel(validation.score);

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${color}`}
            style={{ width: `${(validation.score + 1) * 20}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className="space-y-1">
          {validation.errors.map((error, i) => (
            <p key={`error-${i}`} className="text-xs text-destructive">
              ✗ {error}
            </p>
          ))}
          {validation.suggestions.slice(0, 2).map((suggestion, i) => (
            <p key={`suggestion-${i}`} className="text-xs text-muted-foreground">
              💡 {suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
