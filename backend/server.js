const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const bodyParser = require('body-parser')
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

const pg = require('pg')
const pool = pg.Pool()

app.post('/authenticate', function(req, res) {

  // TODO: verify that the user's ID token is valid, i.e. that they are who they say they are

  // TODO: connect to database and check if user already exists;
  // if they exist then update their last login otherwise create a DB entry representing them

  pool.query('SELECT NOW()', [], (err, queryRes) => {

    if (err) {
      console.log(err)
    }

    console.log(queryRes.rows)

    res.send(queryRes.rows)
  })

})

app.listen(3000)