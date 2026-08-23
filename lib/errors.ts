const MESSAGES: Record<string, string> = {
  NO_TEXT_FOUND:
    "No readable text found. If this is a photo, try a sharper, well-lit image.",
  InvalidPDFException: "This PDF appears to be corrupted or isn't a valid PDF.",
  PasswordException: "This PDF is password-protected. Remove the password and retry.",
};

export function toUserMessage(err: unknown): string {
  if (err instanceof Error) {
    if (MESSAGES[err.message]) return MESSAGES[err.message];
    if (MESSAGES[err.name]) return MESSAGES[err.name];
  }
  return "Something went wrong while reading this file. Please try again.";
}