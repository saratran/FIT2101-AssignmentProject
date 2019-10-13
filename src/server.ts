import express = require('express'); // for web server
import cors = require('cors'); // allows us to make requests across domains/ports (Cross-Origin Resource Sharing)
import fetch from 'node-fetch'; // polyfill for browser JS 'fetch' functionality
import bodyParser = require('body-parser'); // allows express to handle body of POST requests
import pg = require('pg'); // PostgreSQL (PG) database interface
import dotenv = require('dotenv'); // environment variables
import flatMap = require('flatmap');
import emailService = require('./email-service');
import db = require('./database');

const app = express(); // initialise app
app.use(cors()); // allow Cross-Origin Resource Sharing
app.use(bodyParser.json()); // parse POST request JSON bodies

dotenv.config();

dotenv.config(); // variables set in the .env file in this folder are now accessible with process.env.[variableName]
// const pool = new pg.Pool(); // Create a DB query pool. The database connection only works if you have valid DB credentials in the .env file
const pool = db.pool;

const isDev = true;

const clientID = isDev ? '93c39afdbb7a9cb45fbc' : '3e670fbb378ba2969da8';
const clientSecret = isDev ? '502e47a56a3efafe5a03a37d7629e5f213af5d17' : 'c63bc1e0c44bde2ac43141be91edc04524bb5087';
const hookUrl = `https://devalarm.com/api/github`;

app.get('/callback', (req, res) => {
  const requestToken = req.query.code;
  fetch(`https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
    .then(queryRes => {
      queryRes.json().then(async json => {
        const username = await getUserAsync(json.access_token);
        const email = await getUserEmailAsync(json.access_token);
        await db.addUser(email, username.login);
        res.redirect(`/login.html?access_token=${json.access_token}`);
      })
    })
})


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

  console.log("sending email");
  emailService.sendEmail(['utra0001@student.monash.edu'], 'Sara Tran').catch(console.error);

  res.json({});
  res.status(200)
});



// let repo = {
//   name: 'repo3',
//   url: 'http://something.com',
//   description: 'some description'
// }
// addRepo(repo, 'pkbrett40@gmail.com', 'patrickbrett5')

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

async function getUserEmailAsync(accessToken) {
  let primaryEmail = null
  let emails = await fetchAsync(`https://api.github.com/user/emails?access_token=${accessToken}`)
  emails.forEach(email => {
    if (email.primary) {
      primaryEmail = email.email
    }
  })
  return primaryEmail
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
  let response = await fetch(url);
  let data = await response.json();
  return data
}

app.get('/api/user', async function (req, res) {
  const accessToken = req.query.access_token;
  let userData = await getUserAsync(accessToken); // data of authorized user
  res.send(userData)
});

/*
app.get('/api/emails', async function (req, res) {
  const accessToken = req.query.access_token;
  let userData = await getUserEmailAsync(accessToken); // data of authorized user
  res.send(userData)
});*/

app.get('/api/repositories', async function (req, res) {

  const accessToken = req.query.access_token;
  let userData = await getUserAsync(accessToken); // data of authorized user
  // console.log(userData);

  const reposUrl = userData.repos_url;
  //console.log(reposUrl);

  const repos = await fetch(reposUrl).then(async fetchRes => {
    return await fetchRes.json().then(json => {
      // console.log(json);
      // format to only send repository names
      const repos = json.map(repo => ({
        name: repo.name,
        url: repo.html_url,
        description: repo.description
      }));
      return repos;
    })
  })

  // todo: may excess api call
  const username = await getUserAsync(accessToken);
  // console.log(username)
  // console.log(email)
  repos.forEach(async repo => {
    // console.log(repo)
    await db.addRepo(repo, username.login)
  })
  res.send(repos)

});

app.delete('/api/webhooks', async function (req, res) {

  const { access_token, username, repo } = req.query;

  const getUrl = `https://api.github.com/repos/${username}/${repo}/hooks?access_token=${access_token}&client_id=${clientID}&client_secret=${clientSecret}`;

  // Find the ID of the webhook

  fetch(getUrl, { method: "GET" }).then(fetchRes => {
    fetchRes.json().then(jsonRes => {
      //console.log(jsonRes);

      // Find first webhook that points to correct webhook URL

      if (jsonRes.length === 0) {
        res.sendStatus(400);
        return;
      }

      const hookId = jsonRes.find(webhook => webhook.config.url === hookUrl).id;
      //console.log("hookId: ", hookId);

      // Remove the webhook from the repository on Github

      const deleteUrl = `https://api.github.com/repos/${username}/${repo}/hooks/${hookId}?access_token=${access_token}&client_id=${clientID}&client_secret=${clientSecret}`;

      fetch(deleteUrl, {
        method: "DELETE"
      }).then(fetchRes => {
        if (fetchRes.status === 204) { // success
          // TODO: If this succeeded, remove the repository from the tracked repositories list in the database
          res.sendStatus(204)
        } else { // failure
          res.sendStatus(400)
        }
      })
    })
  })
});

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
  // const accessToken = '1e8a7d73d0e86bd126a6d3f328a030ffd1b70785'
  const { access_token, username, repo } = req.query;

  const my_repo = `https://api.github.com/repos/${username}/${repo}/hooks?access_token=${access_token}&client_id=${clientID}&client_secret=${clientSecret}`;
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
        "url": hookUrl,
        "content_type": "json",
        "insecure_ssl": "0"
      }
    })
  }).then(fetchRes => {
    // console.log(fetchRes);
    fetchRes.json().then(jsonRes => {
      //console.log(jsonRes);

      // TODO: If this succeeded, add the repository to the tracked repositories list in the database

      res.send(jsonRes)
    })
  })
});

app.get('/api/owner-contributed-files/:repo', async function (req, res) {
  /**
   * This will return the repositories of the authenticated user and the files that they have committed to
   *
   * TODO:
   * - Refactor the nested loops
   * - Check for performance, currently I think it's quite slow because of the many API calls
   * - Check with larger repos
   */

  const { repo } = req.params;
  const accessToken = req.query.access_token;
  const user = await getUserAsync(accessToken)
  const username = user.login

  // Fetch all push events
  const repoUrl = `https://api.github.com/repos/${username}/${repo}`
  const eventsUrl = repoUrl + `/events?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`;
  const repoEvents = await fetchAsync(eventsUrl);
  let response = [];


  // Get all events related to the repo
  // It pains me to write this horrible nested loops :'(
  // go through each event, see which one is PushEvent
  for (let event of repoEvents) {
    //   console.log(event)
    if (event.type === "PushEvent") {
      let commits = event.payload.commits;
      //console.log(commits)

      // Get more data for each commit, specifically about the files that were committed
      for (let commit of commits) {
        console.log(commit.url)
        let commit_files = (await fetchAsync(commit.url + `?client_id=${clientID}&client_secret=${clientSecret}`)).files;

        for (let file of commit_files) {
          // If file has already been added before, don't check again
          //console.log(file.filename)

          if (!response.some(f => f.filename === file.filename)) {
            let file_commits = await (fetchAsync(repoUrl + `/commits?path=${file.filename}&client_id=${clientID}&client_secret=${clientSecret}`));
            let other_contributors = [];
            // Go through each commit on file
            for (let file_commit of file_commits) {
              if (file_commit.author.login !== username) {
                other_contributors.push(file_commit.commit.author.name)
              }
            }
            response.push({ filename: file.filename, otherContributors: other_contributors });
          }
        }
      }
    }
  }

  res.json(response)
});

app.get('/api/user-contributed-files', async function (req, res) {
  let response = [];
  const accessToken = req.query.access_token;

  /*
      'x-oauth-scopes': [ '' ],
     'x-accepted-oauth-scopes': [ '' ],

     TODO: oauth scope is not enough to get private repo
    see https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
  */

  // fetch(`https://api.github.com/users/sara1479?access_token=${accessToken}`).then(fetchRes => {
  //   console.log(fetchRes.headers)
  // })
  let userData = await getUserAsync(accessToken); // data of authorized user
  // console.log(userData)

  // All closed pull requests
  // TODO: should change to push events?
  let pullEvents = await getPullEvents(userData.login, accessToken);
  // console.log(pullEvents)

  // Get all repos from pull requests
  const items = pullEvents.items;
  // console.log(items)

  // Going through each repo
  // TODO: may need to check for branches?
  for (let item of items) {
    let obj = {};
    let repoContents = await getRepoContents(item.repository_url);
    let repoName = (await fetchAsync(item.repository_url)).name;
    // console.log(repoContents)
    // console.log(repoName)
    obj["repo_name"] = repoName;
    obj["repo_url"] = item.repository_url;
    obj["files_committed"] = [];

    // Going through each file
    for (let file of repoContents) {
      let file_name = file.name;
      let file_url = file.url;
      let file_path = file.path;
      let commits = await getFileCommits(item.repository_url, file_path);
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
          };
          obj["files_committed"].push(file_data);
          break
        }
      }
    }
    response.push(obj);
    // console.log(obj)
  }
  // console.log(JSON.stringify(response, null, 4));
  res.json(response)
});


app.get(`/api/files/:repo`, async (req, res) => {
  /**
   * Problem statement:
   * List of all files contributed to (just the number, not the actual lines)
   * Lines in each file modified/contributed
   * How many lines (or percentage) of code has the other person changed on the code that you have contributed
   * Show list of contributions and modifications from other people
   * Show visually / graph if desired.
   * Goal is to retrieve the list of all files the user has contributed to.
   *
   * Interpretation:
   * -- load all push events in the repo
   * -- load all commits from each push event
   * -- from these commits, get the file changes for each
   * -- summarise file changes for each file and send back to the user in the form of an array of FileInfo objects (defined in definitions.d.ts)
   */
  // TODO: I (Sara) notice that sometimes the author maybe null (ie for commits that are made by not GitHub user through a git client) and can throw an exception
  const { repo } = req.params;
  const accessToken = req.query.access_token;
  const user = await getUserAsync(accessToken);
  const username = user.login;
  const userEmail = await getUserEmailAsync(accessToken);
  const userRealName = user.name;

  // Fetch all push events

  const eventsUrl = `https://api.github.com/repos/${username}/${repo}/events?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`;

  const repoEvents = await fetchAsync(eventsUrl);
  const pushEvents = repoEvents.filter(({ type }) => type === "PushEvent");

  // Fetch all commits for each push event and flatten

  const commits = flatMap(pushEvents, ({ payload }) => payload.commits);

  // Get file changes for each commit

  const commitInfoProms = []

  commits.forEach(async commit => {
    const commitInfoUrl = commit.url + `?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`;
    const commitInfoProm = fetchAsync(commitInfoUrl);

    commitInfoProm.then(commitInfo => {
      commit.author.login = commitInfo.author.login
      // commit.committer = commitInfo.committer;
      commit.stats = commitInfo.stats;
      commit.files = commitInfo.files;
    });
    commitInfoProms.push(commitInfoProm);
  });

  // @ts-ignore
  Promise.all(commitInfoProms).then(async () => {
    /*
   console.log("***********************")
   console.log(commits)
   console.log("***********************")
   */

    // Identify unique files that were changed
    const contributorData = {};
    const files = {};
    commits.forEach(commit => {
      commit.files.forEach(file => {
        const name = file.filename;
        const lineChanges = {
          // additions: file.additions,
          // deletions: file.deletions,
          lineChangeCount: file.changes,
          author: commit.author
        };
        if (!Object.keys(contributorData).includes(commit.author.login)) {
          // todo: consider getting using getUserEmailAsync() because this get the github email
          contributorData[commit.author.login] = { email: commit.author.email, name: commit.author.name }
        }

        if (Object.keys(files).includes(name)) {
          files[name].changes.push(lineChanges);
        } else {
          files[name] = { changes: [lineChanges] }
        }
      });
    });

    // TODO: we should filter such that only the files the user has contributed to are shown.

    // Now evaluate the files by user and run a reduction algorithm on the changes

    const ownUserInfo = {
      username: username,
      email: userEmail,
      name: userRealName
    }

    const filesArrangedByUser: FileInfo[] = Object.keys(files).map(filename => {
      const file = files[filename]
      const contributionByUser: { [username: string]: Contribution } = {};


      file.changes.forEach(change => {
        const authorLogin = change.author.login;

        if (Object.keys(contributionByUser).includes(authorLogin)) {
          contributionByUser[authorLogin].lineChangeCount += change.lineChangeCount;
          contributionByUser[authorLogin].commitCount++;
        } else {

          contributionByUser[authorLogin] = {
            lineChangeCount: change.lineChangeCount,
            commitCount: 1,
          }
        }
      });

      // Note: when the owner accepts a pull request, it counts that they have contributed to the files
      const yourContributions = contributionByUser[ownUserInfo.username];
      const otherContributors = [];
      Object.keys(contributionByUser).forEach(username => {
        if (username !== ownUserInfo.username) {
          const contributor: Contributor = {
            username,
            email: contributorData[username].email,
            name: contributorData[username].name,
            contribution: contributionByUser[username]
          };
          otherContributors.push(contributor);
        }
      });

      /* const contributor1: Contributor = {
         username: "",
         email: "",
         name: "",
         contribution: {
           commitCount: 0,
           lineChangeCount: 0
         }
       };*/

      return {
        filename,
        yourContributions,
        otherContributors
      }
    });

    filesArrangedByUser.forEach(async file =>{
      if(file.yourContributions != null){
        // Note: only add file user has contributed to?
        await db.addFile(file, repo, username)
      }
    })

    res.send(filesArrangedByUser);
  })
});



function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.get(`/api/files-mock/:repo`, (req, res) => {
  /**
   * Mock endpoint for loading some random data on the frontend
   */
  const { repo } = req.params;

  const files = ["index.js", "server.js", "soup.js", "beans.js", "rmrfslash.sh"]
    .map((filename: string): FileInfo => ({
      filename,
      // lineCount: randInt(300, 500),
      yourContributions: {
        commitCount: randInt(2, 5),
        lineChangeCount: randInt(100, 200)
      },
      otherContributors: [{
        username: "coolhavefun3",
        email: "coolhavefun3@gmail.com",
        name: "Coolhave Fun3",
        contribution: {
          commitCount: randInt(1, 3),
          lineChangeCount: randInt(50, 120)
        }
      }, {
        username: "coolhavefun4",
        email: "coolhavefun4@gmail.com",
        name: "Coolhave Fun4",
        contribution: {
          commitCount: randInt(1, 3),
          lineChangeCount: randInt(30, 70)
        }
      }]
    }));
  res.send(files)
});

// Serve frontend
app.use('/', express.static('frontend'));

const port = process.env.ENV === "SERVER" ? 80 : 3000;
app.listen(port);
console.log(`Listening on port ${port}`);
emailService.scheduleEmail()