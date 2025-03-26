import nodemailer from 'nodemailer';
import { Game, User } from '@shared/schema';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Configuração SMTP para Gmail
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: 'filmesfxx@gmail.com',
        pass: 'ktlf kyqk sgxf imei',
      },
      tls: { rejectUnauthorized: false },
    });
  }

  async sendGameSubmissionNotification(game: Game, submitter: User, adminEmails: string[]) {
    const subject = `[Eternal Legend] Novo Jogo Enviado: ${game.title}`;
    const text = `
      Um novo jogo "${game.title}" foi enviado por ${submitter.username} e está aguardando aprovação.
      
      Faça login no painel de administração para revisar este envio.
    `;
    const html = `
      <h2>Novo Jogo Aguardando Aprovação</h2>
      <p>Um novo jogo <strong>${game.title}</strong> foi enviado por <strong>${submitter.username}</strong> e está aguardando aprovação.</p>
      <p>Detalhes do jogo:</p>
      <ul>
        <li><strong>Título:</strong> ${game.title}</li>
        <li><strong>Versão:</strong> ${game.version}</li>
        <li><strong>Data de Envio:</strong> ${new Date(game.createdAt).toLocaleString()}</li>
      </ul>
      <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/admin">Faça login no painel de administração</a> para revisar este envio.</p>
    `;

    for (const adminEmail of adminEmails) {
      try {
        await this.sendEmail({
          to: adminEmail,
          subject,
          text,
          html
        });
      } catch (error) {
        console.error(`Falha ao enviar e-mail para ${adminEmail}:`, error);
      }
    }
  }

  async sendGameApprovalNotification(game: Game, user: User) {
    const subject = `[Eternal Legend] Seu jogo "${game.title}" foi aprovado`;
    const text = `
      Parabéns! Seu jogo "${game.title}" foi aprovado e agora está disponível no Eternal Legend.
      
      Você pode visualizar seu jogo em: ${process.env.APP_URL || 'http://localhost:5000'}/games/${game.id}
    `;
    const html = `
      <h2>Jogo Aprovado!</h2>
      <p>Parabéns! Seu jogo <strong>${game.title}</strong> foi aprovado e agora está disponível no Eternal Legend.</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:5000'}/games/${game.id}">Visualizar seu jogo</a></p>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  async sendGameRejectionNotification(game: Game, user: User, reason: string) {
    const subject = `[Eternal Legend] Seu jogo "${game.title}" requer alterações`;
    const text = `
      Seu jogo "${game.title}" não pôde ser aprovado no momento.
      
      Motivo: ${reason}
      
      Você pode editar e reenviar seu jogo a partir do seu painel.
    `;
    const html = `
      <h2>Envio de Jogo Requer Alterações</h2>
      <p>Seu jogo <strong>${game.title}</strong> não pôde ser aprovado no momento.</p>
      <p><strong>Motivo:</strong> ${reason}</p>
      <p>Você pode editar e reenviar seu jogo a partir do seu painel.</p>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  /**
   * Envia um e-mail com instruções para redefinição de senha
   * @param user Usuário que solicitou redefinição de senha
   * @param token Token de redefinição (hash único e seguro)
   * @param resetUrl URL para redefinição de senha
   */
  async sendPasswordResetEmail(user: User, token: string, resetUrl: string) {
    const subject = `[Eternal Legend] Recuperação de Senha`;
    const text = `
      Olá ${user.username},
      
      Você solicitou a recuperação da sua senha no Portal de Jogos para Cegos - Eternal Legend.
      
      Para redefinir sua senha, acesse o link abaixo (válido por 1 hora):
      ${resetUrl}
      
      Se você não solicitou essa redefinição, por favor ignore este e-mail ou entre em contato conosco.
      
      Atenciosamente,
      Equipe Eternal Legend
    `;
    const html = `
      <h2>Recuperação de Senha</h2>
      <p>Olá <strong>${user.username}</strong>,</p>
      <p>Você solicitou a recuperação da sua senha no Portal de Jogos para Cegos - Eternal Legend.</p>
      <p>Para redefinir sua senha, clique no botão abaixo (o link é válido por 1 hora):</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Redefinir Minha Senha
        </a>
      </p>
      <p>Ou copie e cole o seguinte link no seu navegador:</p>
      <p>${resetUrl}</p>
      <p>Se você não solicitou essa redefinição, por favor ignore este e-mail ou entre em contato conosco.</p>
      <p>Atenciosamente,<br>Equipe Eternal Legend</p>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }
  
  /**
   * Envia um e-mail confirmando que a senha foi alterada com sucesso
   * @param user Usuário que alterou a senha
   */
  async sendPasswordChangedConfirmation(user: User) {
    const subject = `[Eternal Legend] Senha Alterada com Sucesso`;
    const text = `
      Olá ${user.username},
      
      Sua senha foi alterada com sucesso no Portal de Jogos para Cegos - Eternal Legend.
      
      Se você não realizou esta alteração, entre em contato conosco imediatamente.
      
      Atenciosamente,
      Equipe Eternal Legend
    `;
    const html = `
      <h2>Senha Alterada com Sucesso</h2>
      <p>Olá <strong>${user.username}</strong>,</p>
      <p>Sua senha foi alterada com sucesso no Portal de Jogos para Cegos - Eternal Legend.</p>
      <p><strong>Se você não realizou esta alteração, entre em contato conosco imediatamente.</strong></p>
      <p>Atenciosamente,<br>Equipe Eternal Legend</p>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  private async sendEmail(options: EmailOptions) {
    if (!this.transporter) {
      console.log('E-mail seria enviado em produção:');
      console.log('Para:', options.to);
      console.log('Assunto:', options.subject);
      console.log('Texto:', options.text);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Portal de Jogos para Cegos <filmesfxx@gmail.com>',
        ...options
      });
      
      console.log('E-mail enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
