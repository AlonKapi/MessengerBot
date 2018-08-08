'use strict';

// imports dependencies and set up http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); // creates express http server

// sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening.'));

// creates the endpoint for the webhook
// adds support for POST requests to the webhook
app.post('/webhook', (req, res) =>{
    let body = req.body;

    // checks if this is an event from a page subscription
    if (body.object === 'page'){
        // iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // gets the message, entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
        });

        // returns a 'OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else{
        // returns a 'NOT FOUND' response if event is not from a page subscription
        res.sendStatus(404);
    }
});

// adds support for GET requests to the webhook
app.get('/webhook', (req, res) => {
    // verify token
    let VERIFY_TOKEN = 'kappyboy89';

    // parse the query parameters
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // checks if a token and mode is in the query string of the request
    if (mode && token){
        // checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN){
            // responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});