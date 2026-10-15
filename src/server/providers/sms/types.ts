export interface SmsMessage {
  /** E.164 */
  to: string;
  body: string;
  /** Free-form tags for logs/outbox, e.g. { event: "otp" } */
  meta?: Record<string, string>;
}

export interface SmsSendResult {
  providerMessageId: string;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsSendResult>;
}
