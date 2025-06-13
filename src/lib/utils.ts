// Utility function for className merging
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Type-safe variant for more complex use cases
export type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cnAdvanced(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cnAdvanced(...input);
      if (nested) classes.push(nested);
    }
  }
  
  return classes.join(' ');
}

// Alternative implementation if clsx/tailwind-merge aren't available
export function cnSimple(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
} 