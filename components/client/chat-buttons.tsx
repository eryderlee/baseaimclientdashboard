'use client'

import { MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateWhatsAppLink, generateTelegramLink, createClientMessage } from '@/lib/utils/chat-links'

interface ChatButtonsProps {
  whatsappNumber?: string | null
  telegramUsername?: string | null
  clientName: string
  companyName: string
  layout?: 'row' | 'column'
}

export function ChatButtons({
  whatsappNumber,
  telegramUsername,
  clientName,
  companyName,
  layout = 'row'
}: ChatButtonsProps) {
  // If neither is configured, render nothing
  if (!whatsappNumber && !telegramUsername) {
    return null
  }

  return (
    <div className={`flex gap-4 ${layout === 'column' ? 'flex-col' : 'flex-row'}`}>
      {whatsappNumber && (
        <Button
          asChild
          className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white shadow-lg"
        >
          <a
            href={generateWhatsAppLink(whatsappNumber, createClientMessage(clientName, companyName))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp (opens in new tab)"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Chat on WhatsApp
          </a>
        </Button>
      )}

      {telegramUsername && (
        <Button
          asChild
          className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-lg"
        >
          <a
            href={generateTelegramLink(telegramUsername)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on Telegram (opens in new tab)"
          >
            <Send className="h-5 w-5 mr-2" />
            Chat on Telegram
          </a>
        </Button>
      )}
    </div>
  )
}
