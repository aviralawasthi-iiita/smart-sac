import nodemailer from "nodemailer";

export const createEmailTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, 
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error("Email transporter error:", error);
    } else {
      console.log("✅ Email server ready to send messages");
    }
  });

  return transporter;
};
