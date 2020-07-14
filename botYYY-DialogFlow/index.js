// this is a webhook for DiaglogFlow; integration is handled there
// https://stackoverflow.com/questions/50163661/opensearch-call-in-dialogflow-webhook-intent-response-does-not-return-data

const {WebhookClient, Text, Card, Image, Suggestion, Payload} = require('dialogflow-fulfillment');
const {agent_bqstatus, agent_lumo} = require('./query-bq.js');
const {agent_flightbq} = require('./flight-search.js');
const https = require("https");
const testflag = "&test=yes"; // set non-BotYYY when call other function
var isLine = false; 

function intentional_sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

exports.main = (async (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log(JSON.stringify({body: request.body, headers: request.headers}));
    if(request.body.originalDetectIntentRequest){
        isLine = (request.body.originalDetectIntentRequest.source === 'line');
        console.log('Source LINE detected');
    } 

    // hooks for different intentions
    function googleAssistantHandler(agent) { // not in use
        let conv = agent.conv(); 
        agent.add('default fall back - google assistant');
        conv.ask('Hello from the Actions on Google client library!');
        agent.add(conv); 
    }

    async function agent_schedule(agent){
        // call external with replyToken and possible date
        if(isLine){
            const line_replyToken = request.body.originalDetectIntentRequest.payload.data.replyToken;
            // const line_userId = request.body.originalDetectIntentRequest.payload.data.source.userId;
            var ext_url = "https://europe-west2-yyyaaannn.cloudfunctions.net/send-games" +
                        "?replyToken=" + line_replyToken + testflag; //"?userId=" + line_userId

            if(agent.parameters.date) ext_url += "&date=" + agent.parameters.date.substring(0, 10);
            https.get(ext_url, res => {console.log('helper function done:' + ext_url)});
        }
        await intentional_sleep(6000); // timeout to recycle replyToken
        agent.add('we are preparing your schedule... ~30 seconds');
    }


    let intentMap = new Map();
    intentMap.set('MyBQ Lumo', agent_lumo);
    intentMap.set('MyBQ Status', agent_bqstatus);
    intentMap.set('MyPP Sports', agent_schedule);
    intentMap.set('flight.search', agent_flightbq);
    intentMap.set('Default Fallback Intent', googleAssistantHandler); // not in action
    agent.handleRequest(intentMap);
});
