const nodemailer = require('nodemailer');
require('dotenv').config();

const transporterGmail = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});
/*
const mailOptions = {
    from: { name: 'The Pizza store', address: process.env.GMAIL_USER },
    to: process.env.RECIPIENT_EMAIL,
    subject: 'Test Email nodemailer',
    text: 'This is a test email sent from Node.js!',
    html: '<p>This is a <b>test email</b> sent from Node.js!</p>'
};
*/

const sendEmail = async (mailOptions,transporter=transporterGmail) => {
    try {
       await transporter.sendMail(mailOptions);
       console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = {sendEmail};