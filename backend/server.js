const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');

const app = express()
app.use(cors())
app.use(bodyParser.json())

require("dotenv").config()

const sender = {
  email: 'devalarm.test@gmail.com',
  name: 'DevAlarm Notification',
  pass: 'fit2101devalarm'
}

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
}

// Use handlebars to render
transporter.use('compile', hbs(handlebarsOption));

app.get('/', function (req, res) {
  const response = { cool: { have: "fun" } }

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

app.post('/github', function (req, res) {
  const { headers, body } = req

  console.log("body", body)
  console.log("header", headers)

  res.json({})
  res.status(200)
})

async function sendEmail(receivers, emailContent) {
  /**
   * Source: https://nodemailer.com/about/
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
};

// sendEmail('utra0001@student.monash.edu','Sara Tran').catch(console.error)
const pg = require('pg')
const pool = pg.Pool()

app.post('/authenticate', function (req, res) {
  /**
   * Register a user in the database:
   * If they have logged in before the call returns HTTP 200 with their user ID
   * If they are logging in for the first time the call returns HTTP 201 with their user ID
   */

  // TODO: verify that the user's ID token is valid, i.e. that they are who they say they are
  // -- we need the Github auth to be done before this is possible

  // connect to database and check if user already exists;
  // if they exist then update their last login otherwise create a DB entry representing them

  const { email, idToken, githubUsername } = req.body

  pool.query('SELECT * FROM public.users WHERE email_address=$1 OR github_username=$2', [email, githubUsername], (err, queryRes) => {

    if (err) {
      console.log(err)
      res.status(500)
      res.json()
    } else {
      console.log(queryRes.rows)

      // If user does not exist, create an account for them
      if (queryRes.rows.length) { // user exists already, get their ID?
        const { id } = queryRes.rows[0]
        res.status(200)
        res.json({ id })
      } else { // user does not exist
        pool.query('INSERT INTO public.users (email_address, github_username, first_login_date) VALUES ($1, $2, NOW()) RETURNING id', [email, githubUsername], (err, queryRes2) => {

          if (err) {
            console.log(err)
            res.status(500)
            res.json()
          } else {
            console.log("User created")
            res.status(201)
            const { id } = queryRes2.rows[0]
            res.json({ id })
          }
        })
      }
    }
  })
})

app.listen(3000)