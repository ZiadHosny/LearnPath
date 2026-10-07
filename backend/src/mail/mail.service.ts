import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { EnvironmentVariables } from '../config/env.validation.js';

@Injectable()
export class MailService {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.transport = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: false,
    });
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  async sendPasswordResetEmail(to: string, link: string): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
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
}
