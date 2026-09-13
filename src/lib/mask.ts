// Numbers that identify a person never leave the browser. Card, account,
// BSB, TFN and Medicare numbers are masked before a line is sent anywhere.
// Names and street addresses are masked on a best-effort basis: explicit
// self-identification, direct address by name, and structured AU address
// forms. This is pattern matching, not named-entity recognition — it will
// not catch every name (a bare vocative like "— Daniel —" mid-sentence, or
// a spoken-out postcode like "three-oh-five-eight", slip through), but it
// covers the shapes a call actually takes: giving a name, being greeted by
// name, and reading out a street address.

const AU_STREET_SUFFIX =
  "Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Lane|Ln|Place|Pl|Boulevard|Blvd|Way|Close|Crescent|Cres|Highway|Hwy|Parade|Pde|Terrace|Tce";
const AU_STATE = "NSW|VIC|QLD|WA|SA|TAS|ACT|NT";

// Capitalised words that open a sentence often enough to be mistaken for a
// name standing before a comma ("Okay, so..."), never masked by that rule.
const NAME_STOPWORDS = new Set([
  "Okay",
  "Alright",
  "Right",
  "Yes",
  "No",
  "Well",
  "So",
  "Look",
  "Sure",
  "Great",
  "Perfect",
  "Thanks",
  "Sorry",
  "However",
  "Also",
  "Meanwhile",
  "Actually",
  "Anyway",
  "Unfortunately",
  "Regardless",
  "Yeah",
  "Now",
]);

interface Pattern {
  re: RegExp;
  group?: number; // capture group to mask; whole match if omitted
  filter?: (matched: string) => boolean; // return false to leave this match alone
}

const PATTERNS: Pattern[] = [
  { re: /\b(?:\d[ -]?){12,19}\b/g }, // card numbers
  { re: /\b\d{3}[ -]?\d{3}\b(?=[^\d]{0,12}\d{6,10})/g }, // BSB followed by an account
  { re: /\b\d{6,10}\b/g }, // account / TFN / Medicare-length runs
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/g }, // emails
  // "14 Beckwith Street" / "14 Beckwith Street, Coburg"
  {
    re: new RegExp(
      `\\b\\d{1,5}\\s+[A-Z][A-Za-z'-]+(?:\\s+[A-Z][A-Za-z'-]+){0,2}\\s+(?:${AU_STREET_SUFFIX})\\b(?:,?\\s+[A-Z][a-z]+)?`,
      "g",
    ),
  },
  // "Coburg VIC 3058" / "Coburg, VIC 3058"
  { re: new RegExp(`\\b[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)?,?\\s+(?:${AU_STATE})\\s+\\d{4}\\b`, "g") },
  // "it's Daniel Whitmore" / "my name is Daniel" / "this is Daniel speaking"
  {
    re: /\b(?:[Ii]t'?s|[Ii]'?m|[Ii] am|[Tt]his is|[Mm]y name is|[Nn]ame'?s)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b/g,
    group: 1,
  },
  // "Thanks Daniel" / "Hi Daniel" — a name used to greet or thank someone
  { re: /\b(?:Thanks|Thank you|Hi|Hello|Hey|Morning|Afternoon|Evening)\s+([A-Z][a-z]+)\b/g, group: 1 },
  // A capitalised word set off by a comma, e.g. "Daniel, what you've just told me..."
  {
    re: /\b([A-Z][a-z]{1,20}),/g,
    group: 1,
    filter: (name) => !NAME_STOPWORDS.has(name),
  },
];

export function maskSensitive(text: string): { text: string; masked: boolean } {
  let out = text;
  let masked = false;
  for (const { re, group = 0, filter } of PATTERNS) {
    out = out.replace(re, (...args) => {
      const match = args[0] as string;
      const captured = group ? (args[group] as string) : match;
      // keep short numbers like "21 days" or "$300"
      if (/^\d{1,5}$/.test(captured)) return match;
      if (filter && !filter(captured)) return match;
      masked = true;
      return group ? match.replace(captured, "••••") : "••••";
    });
  }
  return { text: out, masked };
}
