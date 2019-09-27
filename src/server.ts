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
  return fetchAsync(`https://api.github.com/user?access_token=${accessToken}`)
}

async function getPullEvents(username, accessToken) {
  // Closed pull events
  return fetchAsync(`https://api.github.com/search/issues?q=type:pr+state:closed+author:${username}&per_page=100&page=1&access_token=${accessToken}`)
}

async function getRepoContents(repo_url) {
  return fetchAsync(`${repo_url}/contents`)
}

async function getFileCommits(repo_url, file_path) {
  return fetchAsync(`${repo_url}/commits?path=${file_path}`)
}

async function fetchAsync(url) {
  let response = await fetch(url)
  let data = await response.json()
  return data
}

app.get('/api/user', async function (req, res) {
  const accessToken = req.query.access_token
  let userData = await getUserAsync(accessToken) // data of authorized user
  res.send(userData)
})

app.get('/api/repositories', async function (req, res) {

  const accessToken = req.query.access_token
  let userData = await getUserAsync(accessToken) // data of authorized user
  console.log(userData)

  const reposUrl = userData.repos_url
  console.log(reposUrl)

  fetch(reposUrl).then(fetchRes => {
    fetchRes.json().then(json => {
      console.log(json)

      // format to only send repository names
      const repos = json.map(repo => ({
        name: repo.name,
        url: repo.html_url,
        description: repo.description
      }))

      res.send(repos)
    })
  })
})

app.delete('/api/webhooks', async function (req, res) {

  // TODO: Remove the webhook from the repository on Github

  // TODO: If this succeeded, remove the repository from the tracked repositories list in the database

})

app.post('/api/webhooks', async function (req, res) {
  /**
   * 'x-oauth-scopes': [ '' ],
   * 'x-accepted-oauth-scopes': [ '' ],
   * TODO: oauth scope is not enough to get private repo
   * see https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
   * 
   * May need to authorise as GitHub app rather than Oauth app to be able to create webhook
   */


  // Test setting up webhook
  const accessToken = '85b226df5a2d2d16e5ce170440f48d30140138ea'
  const my_repo = `https://api.github.com/repos/sara1479/test-repo-fit2101/hooks?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`
  fetch(my_repo, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "name": "web",
      "active": true,
      "events": [
        "push"
      ],
      "config": {
        "url": "http://5a8c7739.ngrok.io/payload",
        "content_type": "json",
        "insecure_ssl": "0"
      }
    })
  }).then(fetchRes => {
    console.log(fetchRes)
    fetchRes.json().then(jsonRes => {
      console.log(jsonRes)
    })
  })
  // TODO: Add a webhook to the repository on Github, if one does not exist

  // fetch('')

  // TODO: If this succeeded, add the repository to the tracked repositories list in the database

})

app.get('/api/owner-contributed-files', async function (req, res) {
  /**
   * This will return the repositories of the authenticated user and the files that they have committed to
   *
   * TODO:
   * - Refactor the nested loops
   * - Check for performance, currently I think it's quite slow because of the many API calls
   * - Check with larger repos
   */
  let response = []
  const accessToken = req.query.access_token
  const username = (await fetchAsync(`https://api.github.com/user?access_token=${accessToken}`)).login
  const userRepos = await fetchAsync(`http://api.github.com/user/repos?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`)

  // Check each repo
  for (let repo of userRepos) {
    let obj = {}
    obj["repo_name"] = repo.name
    obj["repo_url"] = repo.url
    obj["files_contributed"] = []

    // Get all events related to the repo
    const repoEvents = await fetchAsync(repo.events_url + `?client_id=${clientID}&client_secret=${clientSecret}`) // Contain many events of the repo
    // console.log(repoEvents)

    // It pains me to write this horrible nested loops :'(
    // go through each event, see which one is PushEvent
    for (let event of repoEvents) {
      if (event.type === "PushEvent") {
        let commits = event.payload.commits

        // Get more data for each commit, specifically about the files that were committed
        for (let commit of commits) {
          let commit_files = (await fetchAsync(commit.url + `?client_id=${clientID}&client_secret=${clientSecret}`)).files

          for (let file of commit_files) {
            // If file has already been added before, don't check again
            if (!obj["files_contributed"].includes(file.filename)) {
              let file_commits = await (fetchAsync(repo.url + `/commits?path=${file.filename}&client_id=${clientID}&client_secret=${clientSecret}`))

              // Go through each commit on the file
              for (let file_commit of file_commits) {
                if (file_commit.commit.author.name === username) {
                  // user has committed to this file before
                  obj["files_contributed"].push(file.filename)
                  break
                }
              }
            }
          }
        }
      }
    }

    response.push(obj)
  }

  console.log(JSON.stringify(response, null, 4))
  res.json(response)
})

app.get('/api/user-contributed-files', async function (req, res) {
  let response = []
  const accessToken = req.query.access_token

  /*
      'x-oauth-scopes': [ '' ],
     'x-accepted-oauth-scopes': [ '' ],

     TODO: oauth scope is not enough to get private repo
    see https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
  */  

  // fetch(`https://api.github.com/users/sara1479?access_token=${accessToken}`).then(fetchRes => {
  //   console.log(fetchRes.headers)
  // })
  let userData = await getUserAsync(accessToken) // data of authorized user 
  // console.log(userData)

  // All closed pull requests
  // TODO: should change to push events?
  let pullEvents = await getPullEvents(userData.login, accessToken)
  // console.log(pullEvents)

  // Get all repos from pull requests
  const items = pullEvents.items;
  // console.log(items)

  // Going through each repo
  // TODO: may need to check for branches?
  for (let item of items) {
    let obj = {}
    let repoContents = await getRepoContents(item.repository_url)
    let repoName = (await fetchAsync(item.repository_url)).name
    // console.log(repoContents)
    // console.log(repoName)
    obj["repo_name"] = repoName
    obj["repo_url"] = item.repository_url
    obj["files_commited"] = []

    // Going through each file
    for (let file of repoContents) {
      let file_name = file.name
      let file_url = file.url
      let file_path = file.path
      let commits = await getFileCommits(item.repository_url, file_path)
      // Checking if any commit is done by the user
      for (let commit of commits) {
        // console.log(commit)
        if (commit.commit.author.name === userData.login) {
          // File have contributed to
          // TODO: save to response, test with larger repos
          // console.log(file_name)
          let file_data = {
            "name": file_name,
            "path": file_path,
            "url": file_url
          }
          obj["files_commited"].push(file_data)
          break
        }
      }
    }
    response.push(obj)
    console.log(obj)
  };
  console.log(JSON.stringify(response, null, 4))
  res.json(response)
}
)

// Serve frontend
app.use('/', express.static('frontend'));

const port = process.env.ENV === "SERVER" ? 80 : 3000;
app.listen(port);
console.log(`Listening on port ${port}`);