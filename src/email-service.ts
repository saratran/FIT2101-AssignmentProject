import nodemailer = require('nodemailer'); // for sending emails
import hbs = require('nodemailer-express-handlebars');


const sender = {
    email: 'devalarm.test@gmail.com',
    name: 'DevAlarm Notification',
    pass: 'fit2101devalarm'
  }; // login details for Gmail account
  
  // create reusable transporter object to send email
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: sender.email,
      pass: sender.pass
    }
  });
  
  const handlebarsOption = {
    viewEngine: {
      extName: '.hbs',
      partialsDir: './emails',
      layoutsDir: './emails',
      defaultLayout: 'index.handlebars',
    },
    viewPath: "./emails"
  };
  
  // Use handlebars to render
transporter.use('compile', hbs(handlebarsOption));

export async function sendEmail(receivers: string[], emailContent) {
    // Source: https://nodemailer.com/about/
    /* TODO:
    - email content
     */
  
    let mailOptions = {
      from: `${sender.name} <${sender.email}>`,
      to: `${receivers}`, // TODO: check if can send to many receivers
      subject: 'DevAlarm Test',
      text: 'Wooohooo it works!!',
      template: 'index',
      context: {
        name: emailContent
      } // send extra values to template
    };
  
    transporter.sendMail(mailOptions, (err, data) => {
      if (err) {
        return console.log('Error occurs');
      }
      return console.log('Email sent!!!');
    });
  }