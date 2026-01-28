// Common compromised passwords blocklist (top 100)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'monkey', 'master', 'dragon',
  'letmein', 'login', 'welcome', 'princess', 'admin', 'admin123', 'root',
  'toor', 'pass', 'test', 'guest', 'master', 'changeme', 'hello', 'shadow',
  'sunshine', 'superman', 'michael', 'football', 'baseball', 'iloveyou',
  'trustno1', 'batman', 'access', 'love', 'passw0rd', 'mustang', 'whatever',
  'qazwsx', 'solo', 'ashley', 'bailey', 'hunter', 'harley', 'killer', 'jordan',
  'george', 'andrew', 'charlie', 'thomas', 'taylor', 'matrix', 'hammer', 'silver',
  'internet', 'golfer', 'cheese', 'yankees', 'thunder', 'joshua', 'pepper',
  'sophie', 'computer', 'flower', 'summer', 'lovely', 'purple', 'freedom',
  'nicole', 'secret', 'junior', 'chelsea', 'diamond', 'orange', 'banana',
  'jennifer', 'richard', 'coffee', 'tigger', 'ranger', 'soccer', 'hockey',
  'chicken', 'merlin', 'corvette', 'bulldog', 'patrick', 'rachel', 'amanda',
  'starwars', 'cookie', 'phoenix', 'guitar', 'midnight', 'samantha',
  '000000', '111111', '121212', '654321', '666666', '696969', '777777', '888888',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r', 'q1w2e3r4'
]);

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4 (weak, fair, good, strong, very strong)
  errors: string[];
  suggestions: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Check minimum length (6 characters as per existing requirement)
  if (password.length < 6) {
    errors.push("A password deve ter pelo menos 6 caracteres");
  } else {
    score += 1;
  }

  // Check for longer passwords (bonus)
  if (password.length >= 8) {
    score += 1;
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    suggestions.push("Adicione pelo menos uma letra maiúscula");
  } else {
    score += 0.5;
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    suggestions.push("Adicione pelo menos uma letra minúscula");
  } else {
    score += 0.5;
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    suggestions.push("Adicione pelo menos um número");
  } else {
    score += 0.5;
  }

  // Check for special character
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password)) {
    suggestions.push("Adicione pelo menos um caractere especial (!@#$%...)");
  } else {
    score += 0.5;
  }

  // Check against common passwords blocklist
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowerPassword)) {
    errors.push("Esta password é muito comum e fácil de adivinhar");
    score = 0; // Reset score for common passwords
  }

  // Check for sequential patterns
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push("Evite caracteres repetidos consecutivos");
    score = Math.max(0, score - 0.5);
  }

  // Check for keyboard patterns
  const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456', '654321', 'abcdef'];
  if (keyboardPatterns.some(pattern => lowerPassword.includes(pattern))) {
    suggestions.push("Evite padrões de teclado comuns");
    score = Math.max(0, score - 0.5);
  }

  // Normalize score to 0-4 range
  score = Math.min(4, Math.max(0, Math.round(score)));

  return {
    isValid: errors.length === 0 && password.length >= 6,
    score,
    errors,
    suggestions
  };
}

export function getStrengthLabel(score: number): { label: string; color: string } {
  switch (score) {
    case 0:
      return { label: "Muito fraca", color: "bg-destructive" };
    case 1:
      return { label: "Fraca", color: "bg-orange-500" };
    case 2:
      return { label: "Razoável", color: "bg-yellow-500" };
    case 3:
      return { label: "Boa", color: "bg-lime-500" };
    case 4:
      return { label: "Forte", color: "bg-green-500" };
    default:
      return { label: "Muito fraca", color: "bg-destructive" };
  }
}
