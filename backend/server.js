const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const nodemailer = require('nodemailer');

const sender = {
  email: 'devalarm.test@gmail.com',
  name: 'DevAlarm Notification',
  pass:'fit2101devalarm'
}

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/', function (req, res) {
  const response = { cool: { have: "fun" }}

  res.json(response)
})

app.get('/repo', function (req, res) {
  const { owner, repo } = req.query

  fetch(`https://api.github.com/repos/${owner}/${repo}`).then(fetchRes => {
    fetchRes.json().then(fetchJson => {
      console.log(fetchJson)

      res.json(fetchJson)
    })
  })
})

app.post('/github', function(req, res) {
  const { headers, body } = req

  console.log("body", body)
  console.log("header", headers)

  res.json({})
  res.status(200)
})

async function sendEmail(receivers, emailContent){
  // Source: https://nodemailer.com/about/
  /* TODO: 
  - configure receiver, email content
  - error handling
   */

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: sender.email, 
        pass: sender.pass
    }
  });
  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: `${sender.name} <${sender.email}>`, // sender address
    to: 'utra0001@student.monash.edu', // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    html: '<b>Hello world?</b>' // html body
  });

  console.log('Email sent: %s', info.messageId);
};

app.listen(3000)