/**
 * app
 */

"use strict";

import config from "./config.json";
import express from "express";
import path from "path";
import  bodyParser from "body-parser";
import nodeSchedule from "node-schedule";
//import CanvasJS from 'canvasjs';
var exec = require('child_process').exec;
var localStorage = require('localStorage');
var nodemailer = require("nodemailer");

var connections = [];

var app = express();
var exphbs  = require('express-handlebars');

app.set('views', path.join(__dirname, 'templates'));
app.engine('.hbs', exphbs({extname: '.hbs', defaultLayout: 'main',layoutsDir: path.join(__dirname, 'templates/layouts')}));
app.set('view engine', '.hbs');
app.use(express.static(path.join(__dirname, 'public')));

/* Files */
import {Logger} from "./lib/logger";
import {DataCleaner} from "./services/dataCleaner";
import {VisitorStore} from "./stores/visitor";
import {Visitors} from "./routes/visitors";
import {Postgres} from "./resources/postgres";
import {DbConnect} from "./resources/dbConnect";
import {EventListener} from "./services/eventListener";
import {VisitorService} from "./services/visitor";
import {TemplateManager} from "./services/templateManager";

let logger = new Logger();
let db = new DbConnect(config.db.postgres.string);

db.createConnection()
    .then((connection) => {

        //var server = require('http').createServer(app);
       if(config.env.status !== "Production"){
           var server = require('https').createServer({
               cert: fs.readFileSync("C:\\Users\\administrator.CROMDOMAIN\\cromwell-cer\\ssl_certificate.crt"),
               key:  fs.readFileSync("C:\\Users\\administrator.CROMDOMAIN\\cromwell-cer\\cromtoolssrv.key")
           },app);
       }else {
           var server = require('http').createServer(app);
       }

        var io = require('socket.io')(server);
        // create reusable transport method (opens pool of SMTP connections)
        var smtpTransport = nodemailer.createTransport("SMTP",{
            service: "Gmail",
            auth: {
                user: "shibbi.arora@gmail.com",
                pass: "Leicester@195"
            }
        });

        connection.query('LISTEN "watchers"');

        connection.on('notification', function(data) {
            // setup e-mail data with unicode symbols
            var mailOptions = {
                from: "shibi arora<shibbi.arora@gmail.com>", // sender address
                to: "shibbi.arora@gmail.com", // list of receivers
                subject: "Error: Cromwell Reception", // Subject line
                text: data.payload, // plaintext body
            };

            console.log("sending mail");
            // send mail with defined transport object
            smtpTransport.sendMail(mailOptions, function(error, info){
                if(error){
                    console.log(error);
                }
                console.log('Message sent: ' + info);
            });
        });

        let templateManager = new TemplateManager();
        let dataCleaner = new DataCleaner();
        //let emitter = new EventEmitter();
        let postgres = new Postgres(connection);
        let eventListener = new EventListener(connection, logger);
        let visitorStore = new VisitorStore(postgres, logger);
        let visitorService = new VisitorService(visitorStore, templateManager, dataCleaner, logger);
        let visitors = new Visitors(visitorService, logger, localStorage, io);



        /* Start Listening */
        eventListener.listen();
        app.use( bodyParser.json({limit: '50mb'}) );       // to support JSON-encoded bodies
        app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
            limit: '50mb',
            extended: true
        }));

        app.post("/visitors", visitors.post());
        app.get("/allSignOut", visitors.allSignOutToday());
        app.get("/allVisitors", visitors.allSignIns());
        app.get("/visitors/:id", visitors.get());
        app.put("/visitors/:id", visitors.put());
        app.get("/", visitors.loginView());
        app.post("/adminLogin", visitors.adminLogin());
        app.get("/templateTerms", visitors.templateTerms());
        app.get("/terms", visitors.getTerms());
        app.get("/terms/:id", visitors.getTerms());
        app.post("/terms", visitors.postTerms());
        app.put("/terms/:id", visitors.updateTerms());
        app.get("/allTerms", visitors.allTerms());
        app.get("/test", visitors.test());
        app.post("/appStatus", visitors.status());
        app.get("/graph", visitors.graph());
        app.get("/graph/getData", visitors.currentStatus());

        // request for suggestions

        app.get("/autoCompleteAdd", visitors.autoCompleteAdd());
        app.post("/autoCompletePost", visitors.autoCompletePost());
        app.get("/autoComplete", visitors.autoComplete());
        app.get("/autoComplete/:id", visitors.autoCompleteId());
        app.post("/autoComplete/:id", visitors.updateAutoComplete());
        app.delete("/autoComplete/:id", visitors.deleteAutoComplete());


        // request for staff
        app.get("/allStaff", visitors.allStaff());
        app.get("/staffSignIn/:id", visitors.staffSignIn());
        app.get("/staffSignOut/:id", visitors.staffSignOut());
        app.get("/staffSignedIn/:id", visitors.staffSignedIn());


        nodeSchedule.scheduleJob(config.runTime, function () {
            visitors.allSignOut()
                .then(done => {
                    logger.info("All Signed Out");
                })
                .catch(err => {
                    logger.error("Error occurred while Signing Out All using cron job: " + JSON.stringify(err));
                });

            visitors.cleanStatus()
                .then(done => {
                    logger.info("Status Clean");
                })
                .catch(err => {
                    logger.error("Error occurred cleaning status data for last day: " + JSON.stringify(err));
                });

            var cmd = "rm -Rf   build/pdf/*";

            exec(cmd, function(error, stdout, stderr) {
                // command output is in stdout
                console.log(stdout);

                if (error !== null) {
                    console.log('exec error: ' + error);
                }
                //process.exit();
            });
        });


        /* Start up the server */


        var status = 1;

        io.on("connection", function(socket){
            console.log(" new device connected");
            var alive;
            var down;
            socket.emit("connectMessage", { msg : "Connected" });
            socket.on('event', function(data){});

            socket.once('up', function(data){
                console.log("Serivce connected");
                socket.room = 'appStatus';
                socket.join('appStatus');
                socket.username = 'brc';
                status = 1;

                clearInterval(down);
            });

            socket.once('disconnect', function(){
                console.log("Serivce goes down");
                socket.leave('appStatus');
                status = 0;
                clearInterval(alive);
            });

            if(status != 'undefined'){
                alive = setInterval(function () {
                    visitors.deviceStatus(1);
                }, 600000);
            }
            if(status != 'undefined') {
                down = setInterval(function () {
                    visitors.deviceStatus(0);
                }, 10000);
            }

        });
        server.listen(config.server.port, () => {
            logger.info("System Listen on port " + config.server.port);
        });

        // app.listen(config.server.port, () => {
        //     logger.info("System Listen on port " + config.server.port);
        // });



    }).catch((err) => {
        logger.fatal("Database Failure:  " +  err);
        process.exit();
    });
