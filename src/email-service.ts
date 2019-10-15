import nodemailer = require('nodemailer'); // for sending emails
import hbs = require('nodemailer-express-handlebars');
import nodeSchedule = require('node-schedule');
import db = require('./database')
import path = require('path')

const date = new Date()

export const templates = { // <---- Edit this to add more templates
  welcome: {
    name: "index",
    attachments: // <---- Edit this to add more attachements/images to the emails
      [{
        filename: 'logo.png',
        path: path.join(__dirname, '../emails/email-img/logo.png'),
        cid: 'logo.png' // <------ Change the src of image in the template to "src=cid:logo.png" if the image is not showing up
      },
      {
        filename: 'file-details.png',
        path: path.join(__dirname, '../emails/email-img/file-details.png'),
        cid: 'file-details.png'
      }, {
        filename: 'files-issues.png',
        path: path.join(__dirname, '../emails/email-img/files-issues.png'),
        cid: 'files-issues.png'
      }, {
        filename: 'repositories.png',
        path: path.join(__dirname, '../emails/email-img/repositories.png'),
        cid: 'repositories.png'
      }
      ]
  },
  daily: {
    name: "daily",
    attachments: // <---- Edit this to add more attachements/images to the emails
      [{
        filename: 'logo.png',
        path: path.join(__dirname, '../emails/email-img/logo.png'),
        cid: 'logo.png' // <------ Change the src of image in the template to "src=cid:logo.png" if the image is not showing up
      },
      {
        filename: 'daily-banner.png',
        path: path.join(__dirname, '../emails/email-img/daily-banner.png'),
        cid: 'daily-banner.png'
      }]
  },
  weekly: {
    name: 'weekly',
    attachments:
      [{
        filename: 'logo.png',
        path: path.join(__dirname, '../emails/email-img/logo.png'),
        cid: 'logo.png' // <------ Change the src of image in the template to "src=cid:logo.png" if the image is not showing up
      },
      {
        filename: 'weekly-banner.png',
        path: path.join(__dirname, '../emails/email-img/weekly-banner.png'),
        cid: 'weekly-banner.png'
      }]
  },
  single: {
    name: 'single',
    attachments:
      [{
        filename: 'logo.png',
        path: path.join(__dirname, '../emails/email-img/logo.png'),
        cid: 'logo.png' // <------ Change the src of image in the template to "src=cid:logo.png" if the image is not showing up
      },
      {
        filename: 'single-banner.png',
        path: path.join(__dirname, '../emails/email-img/single-banner.png'),
        cid: 'single-banner.png'
      }]
  },
  issue: {
    name: 'issue',
    attachments:
      [{
        filename: 'logo.png',
        path: path.join(__dirname, '../emails/email-img/logo.png'),
        cid: 'logo.png' // <------ Change the src of image in the template to "src=cid:logo.png" if the image is not showing up
      },
      {
        filename: 'issue-banner.png',
        path: path.join(__dirname, '../emails/email-img/issue-banner.png'),
        cid: 'issue-banner.png'
      }]
  }
}

export const frequency = {
  daily: {
    option: { hour: 10 },
    template: templates.daily
  }, // trigger event at 10:00 am everyday
  weekly: {
    option: { hour: 10, dayOfWeek: 0 },
    template: templates.weekly
  }, // trigger event at 10:00am every Sunday
  minute: {
    option: { second: 0 }, // every minute at 0 second, for testing
    template: templates.daily
  }
}

const sender = {
  email: 'devalarm.test@gmail.com',
  name: 'DevAlarm Notification',
  pass: 'fit2101devalarm'
}; // login details for Gmail account

// create reusable transporter object to send email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: sender.email,
    pass: sender.pass
  }
});

const handlebarsOption = {
  viewEngine: {
    partialsDir: 'partials/',
    defaultLayout: false
  },
  viewPath: path.resolve(__dirname, '../emails')
};

// Use handlebars to render
transporter.use('compile', hbs(handlebarsOption));

export async function sendEmail(receivers: string[], emailContent: EmailContent, callback?) {
  let mailOptions = {
    from: `${sender.name} <${sender.email}>`,
    to: `${receivers}`,
    subject: 'DevAlarm Test',
    template: emailContent.template.name,
    context: emailContent.content,
    attachments: emailContent.template.attachments,
  };

  transporter.sendMail(mailOptions, (err, data) => {
    if (err) {
      console.log(err)
      console.log('Error occurs when sending email')
      return
    }
    console.log('Email sent!!!');
    callback()
    return
  });
}

export async function setEmailScheduler(githubUsername, frequencyConfig) {
  /**
   * - pass in username/userid and frequency
   * - check repos related to user --> need to notify
   * - after sending email, set the need_to_notfiy to false
   * - need_to_notify true when receive webhook
   */
  console.log(`Setting email scheduler: ${githubUsername}, ${JSON.stringify(frequencyConfig.option)}`)

  // Delete old email scheduler so that each user can only have 1 instance of email scheduler running
  await deleteEmailSchedulerInstance(githubUsername)

  // Add/Update new scheduler to database
  await db.executeQuery('INSERT INTO public.email_schedules (github_username, frequency) VALUES($1,$2) ON CONFLICT (github_username) DO UPDATE SET frequency=$2', [githubUsername, frequencyConfig])

  // Set up new scheduler
  await nodeSchedule.scheduleJob(githubUsername, frequencyConfig.option, async () => {
    console.log(`Email job executing: ${githubUsername}`)
    const userRows = await db.executeQuery('SELECT * FROM public.users WHERE github_username=$1', [githubUsername])
    if (!userRows.length) {
      console.log('Email scheduler: Cannot find user')
      return
    }
    const userEmail = userRows[0].email_address
    const filesToNotify = await db.getFilesToNotify(githubUsername)
    const fileIds = filesToNotify.map(({ id }) => id)
    // console.log(filesToNotify)
    if (filesToNotify.length) {
      const emailContent: EmailContent = {
        content: {
          name: githubUsername,
          fileChanges: filesToNotify,
          issues: "", // <------ TODO: Edit this to include content of issues
          dateAndDay: `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`
        },
        template: frequencyConfig.template
      }

      console.log(emailContent)
      sendEmail([userEmail], emailContent, async () => {
        await db.executeQuery('UPDATE public.files SET need_to_notify=false WHERE id=ANY($1)', [fileIds])
        console.log('Changed notification status succesfully')
      })
    }
    // // const reposToNotify = await db.getReposToNotify(githubUsername)

    // // console.log(reposToNotify)
    // if (reposToNotify.length) {
    //   const repoIds = reposToNotify.map(({ id }) => id)
    //   /**
    //    * Create email content: same format for both weekly and daily
    //    * - File changes: repo, file, [last contributors] <----- currently missing, needs to add to db this when webhook event is triggered
    //    * - Issues: issue name, repo, opened by/last commenters
    //    */
    //   const emailContent = reposToNotify.map(({ name }) => name).join(`, `)

    //   // Send email notification to their github email
    //   // TODO: user may want notifcations to be sent to emails different from their github account
    //   sendEmail([userEmail], emailContent, async () => {
    //     // Change need_to_notify to false after done sending email
    //     await db.executeQuery('UPDATE public.repos SET need_to_notify=false WHERE id=ANY($1)', [repoIds])
    //     console.log('Changed notification status succesfully')
    //     return
    //   })
    // }
  })
}

async function deleteEmailSchedulerInstance(githubUsername) {
  /**
   * Delete running instance of email scheduler
   */
  const oldSchedule = await nodeSchedule.scheduledJobs[githubUsername]
  // console.log(`${oldSchedule}, ${githubUsername}`)
  // await db.executeQuery('DELETE FROM public.email_schedules WHERE github_username=$1', [githubUsername])
  if (oldSchedule) {
    oldSchedule.cancel()
    console.log('Old schedule found and deleted')
  }
}

export async function removeEmailScheduler(githubUsername) {
  /**
   * Delete running instance of email scheduler and remove it from database (to essentially stop sending email at a frequency)
   */
  await db.executeQuery('DELETE FROM public.email_schedules WHERE github_username=$1', [githubUsername])
  await deleteEmailSchedulerInstance(githubUsername)
}

export async function initialiseEmailSchedulers() {
  /**
   * Reschedule pending email schedulers that have been saved to the database and should be run at the start of the script.
   */
  // Get all users
  const usersRows = await db.executeQuery('SELECT github_username FROM public.users', [])
  const usernames = usersRows.map(({ github_username }) => github_username)
  // console.log(usernames)

  // Get email schedulers for each user
  const emailScheduleRows = await db.executeQuery('SELECT * FROM public.email_schedules WHERE github_username=ANY($1)', [usernames])
  // console.log(emailScheduleRows)

  // Set the schedules
  await asyncForEach(emailScheduleRows, async row => {
    await setEmailScheduler(row.github_username, JSON.parse(row.frequency))
  })
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

