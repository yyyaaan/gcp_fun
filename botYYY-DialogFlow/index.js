// this is a webhook for DiaglogFlow; integration is handled there
// https://googleapis.dev/nodejs/dialogflow/latest/index.html
// https://github.com/dialogflow/dialogflow-fulfillment-nodejs/blob/master/src/dialogflow-fulfillment.js

const {WebhookClient, Text, Card, Image, Suggestion, Payload} = require('dialogflow-fulfillment');
const {agent_bqstatus, agent_lumo} = require('./query-bq.js');
const {agent_schedule} = require('./forward-requst.js')


exports.main = (async (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    const line_replyToken = new String(request.body.originalDetectIntentRequest.payload.data.replyToken);

    // hooks for different intentions
    function welcome(agent) {
        agent.add('Welcome to my agent! (default webhook)');
    }

    function googleAssistantHandler(agent) {
        let conv = agent.conv(); // Get Actions on Google library conv instance
        agent.add('default fall back - google assistant');
        conv.ask('Hello from the Actions on Google client library!'); // Use Actions on Google library
        agent.add(conv); // Add Actions on Google library responses to your agent's response
    }

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();

    intentMap.set('MyBQ Lumo', agent_lumo);
    intentMap.set('MyBQ Status', agent_bqstatus);
    intentMap.set('MyPP Sports', agent_schedule);

    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', googleAssistantHandler);
    agent.handleRequest(intentMap);
});


// (async ()=> {})();