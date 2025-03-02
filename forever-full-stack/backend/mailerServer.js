// backend/mailerServer.js
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const mailerApp = express();
const MAILER_PORT = 5000;  // Dedicated port for Nodemailer service

mailerApp.use(express.json());
mailerApp.use(cors());

// Subscription Endpoint
mailerApp.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Create the Nodemailer transporter using Gmail's configuration
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASS  // Your App Password
    }
  });

  // Define the email options
  let mailOptions = {
    from: `"Shashi Adda" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to Our Newsletter!",
    text: "Thank you for subscribing to our newsletter. Enjoy your exclusive 20% off on your first purchase and stay tuned for more exclusive offers!",
    html: "<p>Thank you for subscribing to our newsletter. Enjoy your exclusive <strong>20% off</strong> on your first purchase and stay tuned for more exclusive offers!</p>"
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    res.status(200).json({ message: 'Subscription successful, email sent!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

mailerApp.listen(MAILER_PORT, () =>
  console.log(`Mailer server running on port ${MAILER_PORT}`)
);
