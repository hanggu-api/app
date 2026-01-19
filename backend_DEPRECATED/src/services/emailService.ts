import nodemailer from 'nodemailer';
import logger from '../utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private getTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px; }
    .header { background-color: #FFE600; padding: 40px 20px; text-align: center; }
    .logo-text { color: #000000; font-size: 28px; font-weight: 800; letter-spacing: -1px; margin: 0; text-transform: uppercase; }
    .content { padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px; }
    .button { display: inline-block; background-color: #000000; color: #FFE600 !important; text-decoration: none; padding: 12px 24px; border-radius: 25px; font-weight: bold; margin-top: 20px; }
    .footer { background-color: #333333; padding: 20px; text-align: center; color: #888888; font-size: 12px; }
    h1 { color: #000000; margin-top: 0; font-size: 24px; }
    h2 { color: #000000; margin-top: 0; font-size: 20px; }
    strong { color: #000000; font-weight: 700; }
    p { margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">101 Service</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0;">© 2026 101 Service. Todos os direitos reservados.</p>
      <p style="margin: 5px 0 0;">Este é um e-mail automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('EmailService: SMTP credentials not configured. Email skipped.');
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"101 Service" <noreply@101service.com>',
        to,
        subject,
        html,
      });
      logger.info(`Email sent: ${info.messageId}`);
    } catch (error) {
      logger.error('Error sending email:', error);
    }
  }

  async sendWelcomeEmail(to: string, name: string, role: string) {
    const subject = 'Bem-vindo ao 101 Service! 🚀';
    const content = `
      <h1>Olá, ${name}! 👋</h1>
      <p>Seja muito bem-vindo ao <strong>101 Service</strong>.</p>
      <p>Seu cadastro como <strong>${role === 'provider' ? 'Prestador de Serviços' : 'Cliente'}</strong> foi realizado com sucesso.</p>
      <p>Estamos muito felizes em ter você conosco. Agora você pode aproveitar todos os recursos do aplicativo.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" class="button">Acessar o App</a>
      </div>
    `;
    await this.sendEmail(to, subject, this.getTemplate(content));
  }

  async sendServiceRequestNotification(to: string, serviceName: string, clientName: string) {
    const subject = '🔔 Novo Pedido de Serviço';
    const content = `
      <h1>Você tem um novo pedido!</h1>
      <p>O cliente <strong>${clientName}</strong> está solicitando seus serviços.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #FFE600; margin: 20px 0;">
        <p style="margin: 0;"><strong>Serviço:</strong> ${serviceName}</p>
      </div>
      <p>Abra o aplicativo agora mesmo para ver os detalhes, calcular o orçamento e aceitar o trabalho.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" class="button">Ver Pedido no App</a>
      </div>
    `;
    await this.sendEmail(to, subject, this.getTemplate(content));
  }

  async sendServiceAcceptedEmail(to: string, providerName: string, serviceDescription: string) {
    const subject = 'Seu serviço foi aceito! ✅';
    const content = `
      <h1>Tudo pronto!</h1>
      <p>O prestador <strong>${providerName}</strong> aceitou seu pedido.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #FFE600; margin: 20px 0;">
        <p style="margin: 0;"><strong>Serviço:</strong> ${serviceDescription}</p>
      </div>
      <p>O profissional já está se preparando. Você pode acompanhar o deslocamento e o status do serviço diretamente pelo aplicativo.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" class="button">Acompanhar Agora</a>
      </div>
    `;
    await this.sendEmail(to, subject, this.getTemplate(content));
  }
}

export const emailService = new EmailService();
