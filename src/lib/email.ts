import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  const info = await transporter.sendMail({
    from: from || `EduNexus <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return info;
}
