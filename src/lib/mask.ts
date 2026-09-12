// Numbers that identify a person never leave the browser. Card, account,
// BSB, TFN and Medicare numbers are masked before a line is sent anywhere.

const PATTERNS: RegExp[] = [
  /\b(?:\d[ -]?){12,19}\b/g, // card numbers
  /\b\d{3}[ -]?\d{3}\b(?=[^\d]{0,12}\d{6,10})/g, // BSB followed by an account
  /\b\d{6,10}\b/g, // account / TFN / Medicare-length runs
  /[\w.+-]+@[\w-]+\.[\w.]+/g, // emails
];

export function maskSensitive(text: string): { text: string; masked: boolean } {
  let out = text;
  let masked = false;
  for (const re of PATTERNS) {
    out = out.replace(re, (m) => {
      // keep short numbers like "21 days" or "$300"
      if (/^\d{1,5}$/.test(m)) return m;
      masked = true;
      return "••••";
    });
  }
  return { text: out, masked };
}
