import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  await transport.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: 'Reset your LearnPath password',
    text: [
      'We received a request to reset your LearnPath password.',
      '',
      `Open this link to choose a new password: ${link}`,
      '',
      'The link expires in 1 hour and can be used once.',
      "If you didn't ask for this, you can ignore this email.",
    ].join('\n'),
    html: `
      <p>We received a request to reset your LearnPath password.</p>
      <p><a href="${link}">Choose a new password</a></p>
      <p>The link expires in 1 hour and can be used once.<br>
      If you didn't ask for this, you can ignore this email.</p>`,
  });
}
