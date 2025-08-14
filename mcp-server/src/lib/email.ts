import nodemailer from "nodemailer";
import { config } from "../config/index.js";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export async function sendEmail(
  to: string,
  subject: string,
  content: string,
  isHtml = false
) {
  const mailOptions: any = {
    from: `"${config.app.name}" <${config.app.fromEmail}>`,
    to,
    subject,
  };

  if (isHtml) {
    mailOptions.html = content;
    mailOptions.text = content.replace(/<[^>]+>/g, ""); // Plain text fallback
  } else {
    mailOptions.text = content;
  }

  return transporter.sendMail(mailOptions);
}
