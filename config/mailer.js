const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('[Nodemailer] Configured with custom SMTP user:', process.env.SMTP_USER);
  } else {
    // Generate test account automatically with Ethereal if credentials not provided
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('[Nodemailer] Using Ethereal Test Account:', testAccount.user);
    } catch (err) {
      console.warn('[Nodemailer] Warning: Could not create Ethereal account, falling back to mock send.');
      transporter = {
        sendMail: async (opts) => {
          console.log(`[Nodemailer Mock] To: ${opts.to} | Subject: ${opts.subject}`);
          return { messageId: 'mock-mail-' + Date.now() };
        }
      };
    }
  }

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailClient = await initTransporter();
    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"CampusConnect" <noreply@campusconnect.edu>',
      to,
      subject,
      text: text || '',
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email Sent] Preview URL: ${previewUrl}`);
    } else {
      console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
    }
    return { success: true, info, previewUrl };
  } catch (error) {
    console.error(`[Email Error] Failed sending to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  initTransporter
};
