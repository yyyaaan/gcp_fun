// this is a webhook for DiaglogFlow; integration is handled there
// https://stackoverflow.com/questions/50163661/opensearch-call-in-dialogflow-webhook-intent-response-does-not-return-data


const {WebhookClient, Text, Card, Image, Suggestion, Payload} = require('dialogflow-fulfillment');
const {agent_bqstatus, agent_lumo} = require('./query-bq.js');
const https = require("https");
const testflag = "&test=yes"; // set non-BotYYY when call other function


exports.main = (async (request, response) => {
    const agent = new WebhookClient({ request, response });
    const line_replyToken = new String(request.body.originalDetectIntentRequest.payload.data.replyToken);
    const line_userId = new String(request.body.originalDetectIntentRequest.payload.data.source.userId);
    // console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    // console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    console.log(request.body);


    // hooks for different intentions
    function googleAssistantHandler(agent) {
        // https://developers.google.com/assistant/conversational/df-asdk/reference/nodejsv2/overview
        let conv = agent.conv(); // Get Actions on Google library conv instance
        agent.add('default fall back - google assistant');
        conv.ask('Hello from the Actions on Google client library!'); // Use Actions on Google library
        agent.add(conv); // Add Actions on Google library responses to your agent's response
    }

    async function agent_schedule(agent){
        // call external with replyToken and possible date
        var ext_url = "https://europe-west2-yyyaaannn.cloudfunctions.net/send-games" +
                      "?userId=" + line_userId + testflag;
        if(agent.parameters.date) {
            ext_url = ext_url + "&date=" + agent.parameters.date.substring(0, 10)
        }
        https.get(ext_url, res => {console.log('fired external:' + ext_url)});
        agent.add('we are preparing your schedule... ~30 seconds');
    }


    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('MyBQ Lumo', agent_lumo);
    intentMap.set('MyBQ Status', agent_bqstatus);
    intentMap.set('MyPP Sports', agent_schedule);
    intentMap.set('Default Fallback Intent', googleAssistantHandler);
    agent.handleRequest(intentMap);
});


// (async ()=> {})();