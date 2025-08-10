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

export async function sendEmail(to: string, subject: string, text: string) {
  return transporter.sendMail({
    from: `"${config.app.name}" <${config.app.fromEmail}>`,
    to,
    subject,
    text,
  });
}
