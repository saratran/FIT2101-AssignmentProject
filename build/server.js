"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var express = require("express"); // for web server
var cors = require("cors"); // allows us to make requests across domains/ports (Cross-Origin Resource Sharing)
var node_fetch_1 = require("node-fetch"); // polyfill for browser JS 'fetch' functionality
var bodyParser = require("body-parser"); // allows express to handle body of POST requests
var nodemailer = require("nodemailer"); // for sending emails
var pg = require("pg"); // PostgreSQL (PG) database interface
var dotenv = require("dotenv"); // environment variables
var hbs = require("nodemailer-express-handlebars");
var app = express(); // initialise app
app.use(cors()); // allow Cross-Origin Resource Sharing
app.use(bodyParser.json()); // parse POST request JSON bodies
dotenv.config();
var sender = {
    email: 'devalarm.test@gmail.com',
    name: 'DevAlarm Notification',
    pass: 'fit2101devalarm'
}; // login details for Gmail account
// create reusable transporter object to send email
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: sender.email,
        pass: sender.pass
    }
});
var handlebarsOption = {
    viewEngine: {
        extName: '.hbs',
        partialsDir: './emails',
        layoutsDir: './emails',
        defaultLayout: 'index.handlebars'
    },
    viewPath: "./emails"
};
// Use handlebars to render
transporter.use('compile', hbs(handlebarsOption));
dotenv.config(); // variables set in the .env file in this folder are now accessible with process.env.[variableName]
var pool = new pg.Pool(); // Create a DB query pool. The database connection only works if you have valid DB credentials in the .env file
function sendEmail(receivers, emailContent) {
    return __awaiter(this, void 0, void 0, function () {
        var mailOptions;
        return __generator(this, function (_a) {
            mailOptions = {
                from: sender.name + " <" + sender.email + ">",
                to: "" + receivers,
                subject: 'DevAlarm Test',
                text: 'Wooohooo it works!!',
                template: 'index',
                context: {
                    name: emailContent
                } // send extra values to template
            };
            transporter.sendMail(mailOptions, function (err, data) {
                if (err) {
                    return console.log('Error occurs');
                }
                return console.log('Email sent!!!');
            });
            return [2 /*return*/];
        });
    });
}
// sendEmail(['utra0001@student.monash.edu','saraut1479@gmail.com'],'Sara Tran').catch(console.error)
app.get('/api', function (req, res) {
    var response = { cool: { have: "fun" } };
    res.json(response);
});
app.get('/api/repo', function (req, res) {
    var _a = req.query, owner = _a.owner, repo = _a.repo;
    node_fetch_1["default"]("https://api.github.com/repos/" + owner + "/" + repo).then(function (fetchRes) {
        fetchRes.json().then(function (fetchJson) {
            console.log(fetchJson);
            res.json(fetchJson);
        });
    });
});
app.post('/api/github', function (req, res) {
    var headers = req.headers, body = req.body;
    console.log("body", body);
    console.log("header", headers);
    console.log("sending email");
    sendEmail('pbre0003@student.monash.edu', 'Sara Tran')["catch"](console.error);
    res.json({});
    res.status(200);
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
    var _a = req.body, email = _a.email, idToken = _a.idToken, githubUsername = _a.githubUsername;
    pool.query('SELECT * FROM public.users WHERE email_address=$1 OR github_username=$2', [email, githubUsername], function (err, queryRes) {
        if (err) {
            console.log(err);
            res.status(500);
            res.json();
        }
        else {
            console.log(queryRes.rows);
            // If user does not exist, create an account for them
            if (queryRes.rows.length) { // user exists already, get their ID?
                var id = queryRes.rows[0].id;
                res.status(200);
                res.json({ id: id });
            }
            else { // user does not exist
                pool.query('INSERT INTO public.users (email_address, github_username, first_login_date) VALUES ($1, $2, NOW()) RETURNING id', [email, githubUsername], function (err, queryRes2) {
                    if (err) {
                        console.log(err);
                        res.status(500);
                        res.json();
                    }
                    else {
                        console.log("User created");
                        res.status(201);
                        var id = queryRes2.rows[0].id;
                        res.json({ id: id });
                    }
                });
            }
        }
    });
});
// Serve frontend
app.use('/', express.static('frontend'));
var port = process.env.ENV === "SERVER" ? 80 : 3000;
app.listen(port);
console.log("Listening on port " + port);
//# sourceMappingURL=server.js.map