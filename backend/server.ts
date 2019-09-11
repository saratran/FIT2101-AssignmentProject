import express = require('express'); // for web server
import cors = require('cors'); // allows us to make requests across domains/ports (Cross-Origin Resource Sharing)
import fetch from 'node-fetch'; // polyfill for browser JS 'fetch' functionality
import bodyParser = require('body-parser'); // allows express to handle body of POST requests
import nodeMailer = require('nodemailer'); // for sending emails
import pg = require('pg'); // PostgreSQL (PG) database interface
import dotenv = require('dotenv'); // environment variables

const app = express(); // initialise app
app.use(cors()); // allow Cross-Origin Resource Sharing
app.use(bodyParser.json()); // parse POST request JSON bodies

dotenv.config(); // variables set in the .env file in this folder are now accessible with process.env.[variableName]
const pool = new pg.Pool(); // Create a DB query pool. The database connection only works if you have valid DB credentials in the .env file

async function sendEmail(receivers, emailContent){
  // Source: https://nodemailer.com/about/
  /* TODO:
  - configure receiver, email content
  - error handling
   */

  // create reusable transporter object using the default SMTP transport
  let transporter = nodeMailer.createTransport({
    service: 'gmail',
    auth: {
      user: sender.email,
      pass: sender.pass
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: `${sender.name} <${sender.email}>`, // sender address
    to: `${receivers}`, // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    html: '<b>Hello world?</b>' // html body
  });

  console.log('Email sent: %s', info.messageId);
}
//sendEmail('utra0001@student.monash.edu').catch(console.error)

const sender = {
  email: 'devalarm.test@gmail.com',
  name: 'DevAlarm Notification',
  pass:'fit2101devalarm'
}; // login details for Gmail account

app.get('/api', function (req, res) { // demo API homepage to verify that backend works
  const response = { cool: { have: "fun" }};

  res.json(response)
});

app.get('/api/repo', function (req, res) {
  const { owner, repo } = req.query;

  fetch(`https://api.github.com/repos/${owner}/${repo}`).then(fetchRes => {
    fetchRes.json().then(fetchJson => {
      console.log(fetchJson);

      res.json(fetchJson)
    })
  })
});

app.post('/api/github', function(req, res) {
  const { headers, body } = req;

  console.log("body", body);
  console.log("header", headers);

  res.json({});
  res.status(200)
});

app.post('/api/authenticate', function(req, res) {
  /**
   * Register a user in the database:
   * If they have logged in before the call returns HTTP 200 with their user ID
   * If they are logging in for the first time the call returns HTTP 201 with their user ID
   */

  // TODO: verify that the user's ID token is valid, i.e. that they are who they say they are
  // -- we need the Github auth to be done before this is possible

  // connect to database and check if user already exists;
  // if they exist then update their last login otherwise create a DB entry representing them

  const { email, idToken, githubUsername } = req.body;

  pool.query('SELECT * FROM public.users WHERE email_address=$1 OR github_username=$2', [email, githubUsername], (err, queryRes) => {

    if (err) {
      console.log(err);
      res.status(500);
      res.json()
    } else {
      console.log(queryRes.rows);

      // If user does not exist, create an account for them
      if (queryRes.rows.length) { // user exists already, get their ID?
        const { id } = queryRes.rows[0];
        res.status(200);
        res.json({ id })
      } else { // user does not exist
        pool.query('INSERT INTO public.users (email_address, github_username, first_login_date) VALUES ($1, $2, NOW()) RETURNING id', [email, githubUsername], (err, queryRes2) => {

          if (err) {
            console.log(err);
            res.status(500);
            res.json()
          } else {
            console.log("User created");
            res.status(201);
            const { id } = queryRes2.rows[0];
            res.json({ id })
          }
        })
      }
    }
  })
});

app.listen(3000);