import express = require('express'); // for web server
import cors = require('cors'); // allows us to make requests across domains/ports (Cross-Origin Resource Sharing)
import fetch from 'node-fetch'; // polyfill for browser JS 'fetch' functionality
import bodyParser = require('body-parser'); // allows express to handle body of POST requests
import dotenv = require('dotenv'); // environment variables
import flatMap = require('flatmap');
import emailService = require('./email-service');
import db = require('./database');
import { sendEmail } from "./email-service";
import path = require('path')


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
// const hookUrl = `https://devalarm.com/api/github`;
const hookUrl = `http://07ce2089.ngrok.io/api/github`

app.get('/callback', (req, res) => {
  const requestToken = req.query.code;

  fetch(`https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).then(queryRes => {
    queryRes.json().then(async json => {
      console.log("json: ", json)
      const username = await getUserAsync(json.access_token);
      const email = await getUserEmailAsync(json.access_token);
      await db.addUser(email, username.login, json.access_token);
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

app.get('/api/users/:username', function (req, res) {
  var user = req.params.username;
  fetch(`https://api.github.com/users/` + user).then(fetchRes => {
    fetchRes.json().then(fetchJson => {
      res.json(fetchJson)
    })
  })
});

app.post('/api/github/:username', async function (req, res) {
  const { headers, body } = req;
  const { username } = req.params
  const userRows = await db.executeQuery('SELECT * FROM public.users WHERE github_username=$1', [username])
  if (!userRows.length) {
    console.log('Email scheduler: Cannot find user')
    return
  }
  console.log('webhook payload received')
  const userEmail = userRows[0].email_address
  // console.log("headers", headers)
  // console.log("body", body);
  // console.log(username)
  const event_name = headers["x-github-event"]
  const emailFrequency = await db.getEmailFrequency(username)

  // TODO: check for user email frequency
  if (emailFrequency === "individual") {
    // Send email immediate
    // TODO: do we need to update the frontend to show new files/issues while the user is logged in?
    if (event_name === "push") {
      const repoName = body.repository.name
      const userId = (await db.getUserId(username))
      const repoId = (await db.getRepoId(userId, repoName))
      // TODO: Check if files are user contributed and save them to db (similar to .....)
      console.log("Received webhook push event")
      let { commits } = body
      const repoFullname = body.repository.full_name
      commits.forEach(commit => {
        commit.url =`https://api.github.com/repos/${repoFullname}/commits/${commit.id}`
      })
      
      const accessToken = (await db.executeQuery(`SELECT access_token FROM public.users WHERE github_username=$1`,[username]))[0].access_token
      const filesArrangedByUser = await commitsFilter(commits, accessToken, username)
      console.log(filesArrangedByUser)
      const userContributedFiles = []

      filesArrangedByUser.forEach(async file => {
        if (file.yourContributions) {
          // Save new files you contributed to
          await db.addFile(file, repoName, username)
        }
      })

      const contributedFilesRows = await db.executeQuery(`SELECT name FROM public.files WHERE user_id=$1 AND repo_id=$2`, [userId, repoId])
      const contributeFileNames = contributedFilesRows.map(({name})=> name)
      filesArrangedByUser.forEach( (file) => {
        if(contributeFileNames.includes(file.filename)){
          userContributedFiles.push(filesArrangedByUser)
        }
      })
      console.log(userContributedFiles)
      if(userContributedFiles.length){
        console.log('Updates on file contributed')
      }
    }
  } else if (emailFrequency !== "never") {
  // Send email noti immediately when user is an assignee to the issue
  if (event_name === "issues") {
    const { action } = body
    if (action === "assigned") {
      if (body.assignee.login === username) {
        // TODO: save to database
        console.log(`${username} is assigned new issue`)
      }
    } else if (action === "unassigned") {
      if (body.assignee.login === username) {
        // TODO: remove from database
        console.log(`${username} is unassigned from an issue`)
      }
    } else {
      const logins = body.issue.assignees.map(({ login }) => login)
      // Only send email if user is an assignee
      if (logins.includes(username)) {
        console.log(`There has been changes to an issue ${username} is assigned to`)
      }
    }
    // events: opened, edited, deleted, transferred, pinned, unpinned, closed, reopened, assigned, unassigned, labeled, unlabeled, locked, unlocked, milestoned, or demilestoned.
    console.log("Received webhook issues event")

  } else if (event_name === "issue_comment") {
    console.log("Received webhook issue_comment event")
    const logins = body.issue.assignees.map(({ login }) => login)
    // Only send email if user is an assignee
    if (logins.includes(username)) {
      console.log(`There are changes to the comment to an issues ${username} is assigned to`)
      const repoName = body.repository.name
      const issueName = body.issue.title
      const modifiedBy = body.sender.login
      // TODO: set up correct email content
      const emailContent: EmailContent = {
        content: {
          name: username,
          assignee: modifiedBy
        },
        template: emailService.templates.issue
      }
      console.log(emailContent)
      // await emailService.sendEmail([userEmail], emailContent)
    }
  }
}

/**
 * TODO here: send emails when webhooks arrive
 *
 * Emails for:
 * * issues
 * * code changes
 *
 * Also: mark repos as 'need_to_notify' in the DB when messages arrive about those repos.
 */

// console.log("sending email");
// emailService.sendEmail(['utra0001@student.monash.edu'], 'Sara Tran').catch(console.error);

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

async function getUserEmailAsync(accessToken) {
  let emails = await fetchAsync(`https://api.github.com/user/emails?access_token=${accessToken}`)
  if (emails.length) {
    emails.forEach(email => {
      if (email.primary) {
        return email.email
      }
    })
  }
  return null
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

app.get('/api/repositories', async function (req, res) {

  const accessToken = req.query.access_token;
  let userData = await getUserAsync(accessToken); // data of authorized user
  // console.log(userData);

  const reposUrl = `${userData.repos_url}?access_token=${accessToken}`
  //console.log(reposUrl);

  const repos = await fetch(reposUrl).then(async fetchRes => {
    return await fetchRes.json().then(async json => {
      // console.log(json);
      // format to only send repository names
      let repos: Repo[] = json.map(({ name, html_url, description }) => ({
        name,
        url: html_url,
        description
      }));

      const username = await getUserAsync(accessToken);

      const userId = await db.getUserId(username.login)
      await db.addRepos(repos, userId)

      const dbRepos = (await db.getReposForUser(userId))
        .filter(dbRepo => repos.map(({ url }) => url).includes(dbRepo.url))
        .map(({ name, url, description, is_watching }) => ({ name, url, description, isWatching: is_watching }))

      res.send(dbRepos)
    })
  })
});

const deleteWebhook = (accessToken, username, repoName) => {

  const getUrl = `https://api.github.com/repos/${username}/${repoName}/hooks?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`;

  // Find the ID of the webhook

  fetch(getUrl, { method: "GET" }).then(fetchRes => {
    fetchRes.json().then(jsonRes => {
      //console.log(jsonRes);

      // Find first webhook that points to correct webhook URL

      if (!jsonRes.length) {
        return;
      }

      const hookId = jsonRes.find(webhook => webhook.config.url === hookUrl).id;
      //console.log("hookId: ", hookId);

      // Remove the webhook from the repository on Github

      const deleteUrl = `https://api.github.com/repos/${username}/${repoName}/hooks/${hookId}?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`;

      fetch(deleteUrl, {
        method: "DELETE"
      }).then(fetchRes => {
        if (fetchRes.status === 204) { // success
          console.log("Successfully deleted webhook")
        } else { // failure
          console.log("Failed to delete webhook")
        }
      })
    })
  })
};

const createWebhook = (accessToken, username, repoName) => {
  /**
   * 'x-oauth-scopes': [ '' ],
   * 'x-accepted-oauth-scopes': [ '' ],
   * TODO: oauth scope is not enough to get private repo
   * see https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
   *
   * May need to authorise as GitHub app rather than Oauth app to be able to create webhook
   */

  const repoUrl = `https://api.github.com/repos/${username}/${repoName}/hooks?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}`;

  fetch(repoUrl, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "name": "web",
      "active": true,
      "events": [
        "push",
        "issues",
        "issue_comment"
      ],
      "config": {
        "url": `${hookUrl}/${username}`,
        "content_type": "json",
        "insecure_ssl": "0"
      }
    })
  }).then(fetchRes => {
    fetchRes.json().then(jsonRes => {
      console.log("Successfully added webhook")
    })
  })
};

app.get(`/api/issues/:repo`, async (req, res) => {
  const { repo } = req.params
  const accessToken = req.query.access_token
  const user = await getUserAsync(accessToken)
  const username = user.login

  const issuesUrl = `https://api.github.com/repos/${username}/${repo}/issues?access_token=${accessToken}&client_id=${clientID}&client_secret=${clientSecret}&assignee=${username}&state=open`
  const issues = await fetchAsync(issuesUrl)
  const issueData = issues.map(({ title, body, url, user, updated_at }) => ({ title, body, url, createdBy: user.login, lastUpdated: updated_at }))
  // TODO: save issue to database
  res.send(issueData)
})

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
  console.log(commits)

  // Get file changes for each commit
  // const ownUserInfo = {
  //   username,
  //   email: userEmail,
  //   name: userRealName
  // }
  const filesArrangedByUser = await commitsFilter(commits, accessToken, username)
  filesArrangedByUser.forEach(async file => {
    if (file.yourContributions) {
      // Note: only add file user has contributed to?
      await db.addFile(file, repo, username)
    }
  })
  res.send(filesArrangedByUser);
});

function commitsFilter(commits, accessToken, ownUsername) {
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
  return Promise.all(commitInfoProms).then(async () => {
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
      const yourContributions = contributionByUser[ownUsername];
      const otherContributors = [];
      Object.keys(contributionByUser).forEach(username => {
        if (username !== ownUsername) {
          const contributor: Contributor = {
            username,
            email: contributorData[username].email,
            name: contributorData[username].name,
            contribution: contributionByUser[username]
          };
          otherContributors.push(contributor);
        }
      });

      return {
        filename,
        yourContributions,
        otherContributors
      }
    });
    // res.send(filesArrangedByUser);
    return filesArrangedByUser
  })
}

app.patch(`/api/repos`, async (req, res) => {
  console.log("*** PATCH repos ***")

  const accessToken = req.query.access_token
  const { op, path, value: isWatching } = req.body

  // Current support is only for PATCH /repos/[reponame]/is_watching
  if (op !== 'replace' || !path.includes('is_watching')) {
    res.sendStatus(404)
    return
  }

  const repoName = path.split('/')[1]
  const user = await getUserAsync(accessToken)
  const userId = await db.getUserId(user.login)
  const repoId = await db.getRepoId(userId, repoName)

  await db.executeQuery(`UPDATE public.repos SET is_watching=$1 WHERE id=$2`, [isWatching, repoId])



  if (isWatching) {
    createWebhook(accessToken, user.login, repoName)
  } else {
    deleteWebhook(accessToken, user.login, repoName)
  }

  console.log(`Updated isWatching to ${isWatching} for ${repoId} (${repoName})`)

  res.send(204)
})

/** Calls setEmailFrequency in database.ts
* You can modify where in the database the frequency is stored in setEmailFrequency
*/
app.post(`/api/email-frequency`, async (req, res) => {
  const { frequency } = req.body
  const accessToken = req.query.access_token
  const username = (await getUserAsync(accessToken)).login

  if (frequency === "daily") {
    await emailService.setEmailScheduler(username, emailService.frequency.daily)
  } else if (frequency === "weekly") {
    await emailService.setEmailScheduler(username, emailService.frequency.weekly)
  } else {
    await emailService.removeEmailScheduler(username)
  }
  await db.setEmailFrequency(username, frequency)
  console.log("Set email frequency: " + frequency)
  res.sendStatus(204);
})

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Serve frontend
app.use('/', express.static('frontend'));

const port = process.env.ENV === "SERVER" ? 80 : 3000;
app.listen(port);
console.log(`Listening on port ${port}`);

async function forTesting() {
  // await emailService.sendEmail([null],'somehting', ()=>{})

  await emailService.initialiseEmailSchedulers()
  // await emailService.setEmailScheduler('sara1479', emailService.frequency.daily)
  // await emailService.removeEmailScheduler('sara1479')
  // await emailService.setEmailScheduler('saratran', emailService.frequency.minute)

  // const emailContent: EmailContent = {
  //   content: {
  //     name: 'Sara', // <------ replacing {{name}} in the template
  //     fileChanges:[{
  //       repoName: "repo1",
  //       fileName: "file1",
  //       contributor: "user1"
  //     }]
  //   },
  //   template: emailService.templates.daily
  // }

  // console.log(emailContent)
  // emailService.sendEmail(['saraut1479@gmail.com'], emailContent)

  // console.log(await db.executeQuery('SELECT public.files.name, public.files.last_contributors, public.repos.name FROM public.files WHERE public.files.need_to_notify=true INNER JOIN public.repos ON public.files.repo_id == public.repos.id  ',[]))
}

forTesting()

// app.get("/api/test-email", async(req, res) => {
//   await emailService.sendEmail(["pbre0003@student.monash.edu"], "Hello", ()=>{})

//   res.send({})
// })