export interface SendEmailOptions {
  to: string
  subject: string
  template: string
  context: Record<string, unknown>
}
