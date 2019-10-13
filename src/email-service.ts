import nodemailer = require('nodemailer'); // for sending emails
import hbs = require('nodemailer-express-handlebars');
import nodeSchedule = require('node-schedule');
import db = require('./database')


export const frequency = {
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

export async function sendEmail(receivers: string[], emailContent, callback) {
  // Source: https://nodemailer.com/about/
  /* TODO:
  - email content
   */

  let mailOptions = {
    from: `${sender.name} <${sender.email}>`,
    to: `${receivers}`,
    subject: 'DevAlarm Test',
    text: 'Wooohooo it works!!',
    template: 'index',
    context: {
      name: emailContent
    } // TODO: send extra values to template
  };

  transporter.sendMail(mailOptions, (err, data) => {
    if (err) {
      console.log('Error occurs')
      return
    }
    console.log('Email sent!!!');
    callback()
    return
  });
}

export async function scheduleEmail(githubUsername, frequencyOption?) {
  /**
   * Note:
   * - scheduled jobs will only fire as long as your script is running 
   * - consider saving events in a database and mark them complete/incomplete
   * - reschedule incomplete events at the start of the script
  */
  /**
   * - pass in username/userid and frequency
   * - check repos related to user --> need to notify
   * - check files in each repos to see if need to know specifically which files have changed
   * - after sending email, set the need_to_notfiy to false
   * - need_to_notify true when receive webhook
   */
  console.log('email scheduler initialised')
  // For testing
  nodeSchedule.scheduleJob(frequency.minute, async () => {
    // console.log('1 minute has passed!')
    const userEmail = (await db.executeQuery('SELECT * FROM public.users WHERE github_username=$1', [githubUsername]))[0].email_address
    const reposToNotify = await db.getReposToNotify(githubUsername)

    if (reposToNotify.length > 0) {
      let repoIds = []
      console.log(reposToNotify)
      let emailContent = ""
      let prefix = ""

      // Create email content
      // TODO: do we prefer just sending the repo names or specific file names?
      reposToNotify.forEach(repo => {
        emailContent += prefix + repo.name
        prefix = ", "
        repoIds.push(repo.id)
      })

      // TODO: user may want notifcations to be sent to emails different from their github account
      sendEmail([userEmail], emailContent, async function () {
        // Change need_to_notify to false after done sending email
        repoIds.forEach(async id => {
          await db.executeQuery('UPDATE public.repos SET need_to_notify=false WHERE id=$1', [id])
        })
        console.log('Changed notification status succesfully')
        return
      })
    }
  })
}

