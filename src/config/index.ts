export const config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  email: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  server: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001'
    ]
  },
  app: {
    name: "The Last Mile",
    fromEmail: "no-reply@lastmile.com",
  },
} as const;