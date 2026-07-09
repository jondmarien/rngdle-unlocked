import { Resend } from 'resend';
import { createLogger } from './logger.js';

const log = createLogger('email');

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    'RNGdle Unlocked <noreply@outreach.chron0.tech>'
  );
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Fire-and-forget friendly: logs failures, does not throw to callers that
 * intentionally void the promise (Better Auth timing guidance).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resend = getResend();
  if (!resend) {
    log.error('RESEND_API_KEY missing — cannot send email', {
      to: input.to.replace(/(.{2}).+(@.+)/, '$1***$2'),
      subject: input.subject,
    });
    throw new Error('Email delivery is not configured (RESEND_API_KEY)');
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? `<p>${input.text.replace(/\n/g, '<br/>')}</p>`,
  });

  if (error) {
    log.error('Resend send failed', {
      to: input.to.replace(/(.{2}).+(@.+)/, '$1***$2'),
      message: error.message,
    });
    throw new Error(error.message || 'Failed to send email');
  }

  log.info('sent', {
    to: input.to.replace(/(.{2}).+(@.+)/, '$1***$2'),
    subject: input.subject,
  });
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
