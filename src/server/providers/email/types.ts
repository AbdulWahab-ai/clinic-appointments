export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  meta?: Record<string, string>;
}

export interface EmailSendResult {
  providerMessageId: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
