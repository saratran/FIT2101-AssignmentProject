import express = require('express'); // for web server
import cors = require('cors'); // allows us to make requests across domains/ports (Cross-Origin Resource Sharing)
import fetch from 'node-fetch'; // polyfill for browser JS 'fetch' functionality
import bodyParser = require('body-parser'); // allows express to handle body of POST requests
import nodemailer = require('nodemailer'); // for sending emails
import pg = require('pg'); // PostgreSQL (PG) database interface
import dotenv = require('dotenv'); // environment variables
import hbs = require('nodemailer-express-handlebars');

const app = express(); // initialise app
app.use(cors()); // allow Cross-Origin Resource Sharing
app.use(bodyParser.json()); // parse POST request JSON bodies

dotenv.config();

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

dotenv.config(); // variables set in the .env file in this folder are now accessible with process.env.[variableName]
const pool = new pg.Pool(); // Create a DB query pool. The database connection only works if you have valid DB credentials in the .env file

const isDev = true

const clientID = isDev ? '93c39afdbb7a9cb45fbc' : '3e670fbb378ba2969da8';
const clientSecret = isDev ? '502e47a56a3efafe5a03a37d7629e5f213af5d17' : 'c63bc1e0c44bde2ac43141be91edc04524bb5087';

app.get('/callback', (req, res) => {
  const requestToken = req.query.code
  fetch(`https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
    .then(queryRes => {
      queryRes.text().then(text => {
        console.log(text)
        res.redirect(`/login.html?${text}`);
      })
    })
})

async function sendEmail(receivers: string[], emailContent) {
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
// sendEmail(['utra0001@student.monash.edu','saraut1479@gmail.com'],'Sara Tran').catch(console.error)

app.get('/api', function (req, res) { // demo API homepage to verify that backend works
  const response = { cool: { have: "fun" } };

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

app.post('/api/github', function (req, res) {
  const { headers, body } = req;

  console.log("body", body);
  console.log("header", headers);

  console.log("sending email")
  sendEmail(['pbre0003@student.monash.edu'], 'Sara Tran').catch(console.error)

  res.json({});
  res.status(200)
});

app.post('/api/authenticate', function (req, res) {
  /**
   * Register a user in the database:
   * If they have logged in before the call returns HTTP 200 with their user ID
   * If they are logging in for the first time the call returns HTTP 201 with their user ID
   */

  // TODO: verify that the user's ID token is valid, i.e. that they are who they say they are
  // -- we need the Github auth to be done before this is possible

  // connect to database and check if user already exists;
  // if they exist then update their last login otherwise create a DB entry representing them

  const { email, githubUsername } = req.body;

  pool.query('SELECT * FROM public.users WHERE email_address=$1 AND github_username=$2', [email, githubUsername], (err, queryRes) => {

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


async function getUserAsync(accessToken) {
  let response = await fetch(`https://api.github.com/user?access_token=${accessToken}`)
  let data = await response.json()
  return data
}

async function getPullEvents(username, accessToken) {
  let response = await fetch(`https://api.github.com/search/issues?q=type:pr+state:closed+author:${username}&per_page=100&page=1&access_token=${accessToken}`)
  let data = await response.json()
  return data
}

async function getRepo(repo_url) {
  let response = await fetch(`${repo_url}/contents`)
  let data = await response.json()
  return data
}


app.get('/api/user-contributed-files', async function (req, res) {
  const accessToken = req.query.access_token

  let userData = await getUserAsync(accessToken) // data of authorized user 
  // console.log(userData)

  // All closed pull requests
  // TODO: should change to push events?
  let pullEvents = await getPullEvents(userData.login, accessToken)
  // console.log(pullEvents)

  // Get all repos from pull requests
  let contributedRepos = [];
  const items = pullEvents.items;
  // console.log(items)

  for (let i = 0; i < items.length; i++){
    contributedRepos.push(await getRepo(items[i].repository_url))
  }
  // console.log(contributedRepos)
}
)

// Serve frontend
app.use('/', express.static('frontend'));

const port = process.env.ENV === "SERVER" ? 80 : 3000;
app.listen(port);
console.log(`Listening on port ${port}`);