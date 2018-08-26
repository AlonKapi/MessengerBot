'use strict';

// imports dependencies and set up http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    app = express().use(bodyParser.json()), // creates express http server
    PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

var isSetup = false;
// sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening.'));

// setup, run once
app.get('/setup',function(req,res){
    if (!isSetup){
        setupBot(res);
        isSetup = true;
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
            console.error("Failed verification. Tokens don't match!");
            res.sendStatus(403);
        }
    }
});

// creates the endpoint for the webhook
// adds support for POST requests to the webhook
app.post('/webhook', (req, res) =>{
    // Parse the request body from the POST
    let body = req.body;

    // checks if this is an event from a page subscription
    if (body.object === 'page'){

        // iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // Gets the data of the entry
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(messagingEvent){
                if (messagingEvent.optin){  // authentication
                    handleAuthentication(messagingEvent);
                } else if (messagingEvent.message){ // message
                    handleMessage(messagingEvent);
                } else if (messagingEvent.delivery){    // delivery
                    handleDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback){    // postback
                    handlePostback(messagingEvent);
                } else if (messagingEvent.read){    // message read
                    handleMessageRead(messagingEvent);
                } else{ // unknown
                    console.log("Webhook received with unknown messaging event: ", messagingEvent);
                }
            });
        });

        // returns a 'OK' response to all requests, assume all went well
        res.status(200).send('EVENT_RECEIVED');
    }
});

// Handles authentication events
function handleAuthentication(event){
    var body = req.body;
    var sender_psid = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;

    var passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " + "through param '%s' at %d", sender_psid, recipientID, passThroughParam, timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendTextMessage(sender_psid, "Authentication successful");
}

// Handles messages events
function handleMessage(event) {
    var sender_psid = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    var isEcho = message.is_echo;
    var messageID = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // May receive a text or attachement but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;

    if (isEcho){
        // User repeated the bot, just logging the message
        console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
        return;
    } else if (quickReply){
        // Check the reply payload and address it accordingly
        var quickReplyPayload = quickReply.payload;
        return;
    }

    if (messageText){
        console.log("Received message for user %d and page %d at %d with message: %s", sender_psid, recipientID, timeOfMessage,messageText);
        
        switch(messageText.toLowerCase()){
            case 'שלום':
                sendTextMessage(sender_psid, "אהלן :)");
                break;

            default:
                sendTextMessage(sender_psid, messageText);
        }
    } else if (messageAttachments){ // option to handle user attachments
        return;
    }
}

// Handles messaging_postbacks events
function handlePostback(event) {
    var sender_psid = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // Get the payload for the postback
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " + "at %d", sender_psid, recipientID, payload, timeOfPostback);

    // Handle the payload
}

// Handles delivery confirmation event
function handleDeliveryConfirmation(event){
    var sender_psid = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var seqNum = delivery.seq;

    if (messageIDs){
        messageIDs.forEach(function(messageID) {
            console.log("Received delivery confirmation for message ID: %s", messageID);
        });
    }

    console.log("All message before %d were delivered.", watermark);
}

// Handles message read event
function handleMessageRead(event){
    var sender_psid = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " + "number %d", watermark, sequenceNumber);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
    var messageData = {
      "recipient": {
        "id": recipientId
      },
      "message": {
        "text": messageText,
        "metadata": "DEVELOPER_DEFINED_METADATA"
      }
    };
  
    callSendAPI(messageData);
  }

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response.
 */
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v3.1/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData
    
      }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var recipientId = body.recipient_id;
          var messageId = body.message_id;
    
          if (messageId) {
            console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);
          } else {
          console.log("Successfully called Send API for recipient %s", recipientId);
          }
        } else {
          console.error("Unable to send message. :" + response.error);
        }
      });  
}

function setupBot(res){
    var messageData = {
        "get_started":{
          "payload":"start"
        }
    };

    request({
        uri: 'https://graph.facebook.com/v3.1/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        json: messageData
    
    }, function(error, response, body){
        if (!error && response.statusCode == 200){
            res.send(body);
        } else{
            console.error("Unable to send message. :" + response.error);
        }
    });
}