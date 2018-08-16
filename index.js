'use strict';

// imports dependencies and set up http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()), // creates express http server
    PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening.'));

// creates the endpoint for the webhook
// adds support for POST requests to the webhook
app.post('/webhook', (req, res) =>{
    // Parse the request body from the POST
    let body = req.body;

    // checks if this is an event from a page subscription
    if (body.object === 'page'){

        // iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
            
            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or a postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message){
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback){
                handlePostback(sender_psid, webhook_event.postback);
            }
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

// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;

    // Check if the message contains text
    if (received_message.text){
        // Create the payload for a basic text message
        response = {
            "text" : 'You sent the message: "${received_message.text}". Now send me an image!'
        }
    }

    // Sends the response message
    callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
      "recipient": {
          "id": sender_psid
      },
      "message": response
  }
}