const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const { promisify } = require('util');


require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_FROM,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    accessToken: process.env.ACCESS_TOKEN,
  },
});



async function main() {
  const messages = await getMessages();
  console.log(`Received ${messages.length} messages.`);
  for (const message of messages) {
    const email = await getEmail(message.id);
    console.log(`Sending email reply to ${email.from}...`);
    const subject = `RE: ${email.subject}`;
    const text = `Thank you for your message. I am currently out of the office and will respond to your email as soon as possible.`;
    const reply = await sendEmail(email.from, subject, text);
    console.log(`Reply sent with ID ${reply.messageId}.`);
  }
}

async function getMessages() {
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const res = await gmail.users.messages.list({ userId: 'me', q: 'is:unread' });
  return res.data.messages || [];
}

async function getEmail(id) {
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const res = await gmail.users.messages.get({ userId: 'me', id });
  const headers = res.data.payload.headers;
  const email = {
    id: res.data.id,
    threadId: res.data.threadId,
    from: '',
    subject: '',
    date: '',
  };
  for (const header of headers) {
    switch (header.name.toLowerCase()) {
      case 'from':
        email.from = header.value;
        break;
      case 'subject':
        email.subject = header.value;
        break;
      case 'date':
        email.date = header.value;
        break;
    }
  }
  return email;
}

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to,
    subject,
    text,
  };
  const sendMail = promisify(transporter.sendMail).bind(transporter);
  return sendMail(mailOptions);
}

main();
