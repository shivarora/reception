"use strict";

import {_} from "lodash";
import config from "../config.json";
var base64 = require("node-base64-image");
var allTablets;

export class StaffRoutes {

    constructor(visitorService, logger, io, tabletCache) {
        this._visitorService = visitorService;
        this._logger = logger;
        this._io = io;
        allTablets = tabletCache.get( "allTabs" );
    }

    /**
     *
     * @return {*[]}
     */
    allStaff(){
        return [
            (req, res) => {
                this._logger.info(">>> All Staff for Tab Id " + req.query.tabId);
                if(req.query.tabId === undefined){
                    return res.send({status: "ok", message: "Error!" , count_total: 0, data:""});
                }
                this._visitorService.allStaff(req.query.tabId)
                    .then(result => {
                        let row = result.rows;
                        res.send({status: "ok", message: "Success" , count_total: result.rowCount, data: row});
                    })
                    .catch(err => {
                        this._logger.error(err);
                        res.send({success: 0, message: "Error!", data: JSON.stringify(err), retry: 1});
                    });
            }
        ];
    }

    /**
     *
     * @return {*[]}
     */
    staffData(){
        return [
            (req, res) => {
                this._visitorService.staffData(req.params.id)
                    .then(result => {
                        let row = result.rows;
                        res.send({status: "ok", message: "Success" , count_total: result.rowCount, data: row});
                    })
                    .catch(err => {
                        this._logger.error(err);
                        res.send({success: 0, message: "Error!", data: JSON.stringify(err), retry: 1});
                    });
            }
        ];
    }

    /**
     *
     * @return {*[]}
     */
    staffSignIn(){
        return [
            (req, res) => {

                this._visitorService.staffSignIn(req.params.id)
                    .then(result => {
                        res.send({success: 1, message: "completed"});
                    })
                    .catch(err => {
                        this._logger.error(err);
                        res.send({success: 0, message: "Error!", data: JSON.stringify(err), retry: 1});
                    });
            }
        ];
    }

    /**
     *
     * @return {*[]}
     */
    staffSignedIn(){
        return [
            (req, res) => {

                this._visitorService.staffSignedIn(req.params.id)
                    .then(result => {
                        let row = result.rows;
                        res.render("allStaffSignedIn", {data: row});
                    })
                    .catch(err => {
                        this._logger.error(err);
                        res.send({success: 0, message: "Error!", data: JSON.stringify(err), retry: 1});
                    });
            }
        ];
    }

    /**
     *
     * @return {*[]}
     */
    staffSignedOut(){
        return [
            (req, res) => {

                    this._visitorService.staffSignedOut(req.params.id)
                        .then(result => {
                            result.locations = allTablets;
                            res.render("allStaffSignedOut", {data: result});
                        })
                    .catch(err => {
                        this._logger.error(err);
                        res.send({success: 0, message: "Error!", data: JSON.stringify(err), retry: 1});
                    });
            }
        ];
    }

    /**
     *
     * @return {*[]}
     */
    staffSignOut(){
        return [
            (req, res) => {

                this._visitorService.staffSignOut(req.params.id)
                    .then(result => {
                        res.send({success: 1, message: "completed", data: JSON.stringify(result.rows)});
                    })
                    .catch(err => {
                        this._logger.error(err.message);
                        res.send({success: 0, message: "Error!", data: JSON.stringify(err.message), retry: 1});
                    });
            }
        ];
    }

    /**
     *
     * @return {*[]}
     */
    captureStaffImage() {
        return [
            (req, res) => {
                console.log("this is staff id" + req.body.paramStaffId);
                console.log("this is staff image path" + req.body.paramLocalImagePath);

                var imageName = req.body.paramStaffId ;
                var options = {filename: config.staffImagePath + imageName};
                var imageData = new Buffer(req.body.paramImagePath, "base64");

                base64.base64decoder(imageData, options, function (err, saved) {
                    if (err) {
                        console.log(err);
                        res.send({success: 0, message: "Error!", data: JSON.stringify(err), retry: 1});
                    }
                    console.log(saved);
                    res.send({success: 1, message: "Completed"});
                });
            }
        ];
    }

    //NFC SignIn And SignOut
    /**
     *
     * @return {*[]}
     */
    nfcActivity(){
        return [
            (req, res) => {

                this._visitorService.nfcActivity(req.params.id)
                    .then(result => {
                        var status = result.activity === "UPDATE" ? "sign_out" : "sign_in" ;
                        res.send({
                            message: "Success",
                            activity: status, name: result.rows[0].first_name + " " + result.rows[0].surname
                        });
                    })
                    .catch(err => {
                        this._logger.error(err);
                        res.send({ message: "Error", data: JSON.stringify(err)});
                    });
            }
        ];
    }
}
