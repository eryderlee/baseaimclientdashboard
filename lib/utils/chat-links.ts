/**
 * Generate WhatsApp chat link with pre-filled message
 * @param phoneNumber - Phone number in any format (will be cleaned to digits only)
 * @param message - Message to pre-fill in the chat
 * @returns WhatsApp web URL with encoded message
 */
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  // Remove all non-digit characters
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate Telegram chat link
 * @param username - Telegram username (with or without @ prefix)
 * @returns Telegram web URL
 * @note Telegram does NOT support pre-filled messages for regular users (only bots)
 */
export function generateTelegramLink(username: string): string {
  // Remove leading @ if present
  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  return `https://t.me/${cleanUsername}`;
}

/**
 * Create a standardized client introduction message
 * @param clientName - Name of the client
 * @param companyName - Company name
 * @returns Formatted introduction message
 */
export function createClientMessage(clientName: string, companyName: string): string {
  return `Hello! I'm ${clientName} from ${companyName}. I'd like to discuss my project.`;
}
