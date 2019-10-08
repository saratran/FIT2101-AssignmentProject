import nodemailer = require('nodemailer'); // for sending emails
import hbs = require('nodemailer-express-handlebars');
import nodeSchedule = require('node-schedule');

interface Frequency {

}

const frequency = {
  daily: { hour: 10 }, // trigger event at 10:00 am everyday
  weekly: { hour: 10, dayOfWeek: 0 }, // trigger event at 10:00am every Sunday
  minute: { second: 0 } // every minute at 0 second, for testing
}

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

export function scheduleEmail(frequencyOption?) {
  /**
   * Note:
   * - scheduled jobs will only fire as long as your script is running 
   * - consider saving events in a database and mark them complete/incomplete
   * - reschedule incomplete events at the start of the script
   * 
   * What to save in database: 
   * - information for a single PushEvent
   * - then need to compile the email content based on those events
   */
  console.log('email scheduler initialised')
  nodeSchedule.scheduleJob(frequency.daily, function(){
    sendEmail(['utra0001@student.monash.edu'], 'Sara')
  })

  // For testing
  nodeSchedule.scheduleJob(frequency.minute, function(){
    console.log('1 minute has passed!')
  })
}