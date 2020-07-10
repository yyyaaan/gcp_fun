// this is a webhook for DiaglogFlow; integration is handled there
// https://googleapis.dev/nodejs/dialogflow/latest/index.html
// https://github.com/dialogflow/dialogflow-fulfillment-nodejs/blob/master/src/dialogflow-fulfillment.js

const {WebhookClient, Text, Card, Image, Suggestion, Payload} = require('dialogflow-fulfillment');
const {bq_status, bq_lumo_topn } = require('./query-bq.js');
const https = require("https");


exports.main = (async (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    const line_replyToken = new String(request.body.originalDetectIntentRequest.payload.data.replyToken);
    const line_destination = 'U21ddff11fc82268d8551c21b4019ee6c';

    // hooks for different intentions
    function welcome(agent) {
        agent.add(`Welcome to my agent! (default webhook)`);
    }

    async function sports(agent){
        agent.add('webhook ok Preparing schedules...(~30 seconds)');
        // call external with replyToken and possible date
        var ext_url = 'https://europe-west2-yyyaaannn.cloudfunctions.net/send-games' +
                  + '?replyToken=' + line_replyToken
                  + '&destination=' + line_destination;
        if(agent.parameters.date) {
            ext_url = ext_url + '&date=' + agent.parameters.date.substring(0, 10)
        }
        https.get(ext_url, res => {console.log('fired external link for sports');})
    }

    async function lumo(agent){
        var param_n = 9;
        if(agent.parameters.number) param_n = agent.parameters.number;
        var out = await bq_lumo_topn(param_n);
        agent.add(out);
    }

    function googleAssistantHandler(agent) {
        let conv = agent.conv(); // Get Actions on Google library conv instance
        agent.add('default fall back - google assistant');
        conv.ask('Hello from the Actions on Google client library!'); // Use Actions on Google library
        agent.add(conv); // Add Actions on Google library responses to your agent's response
    }

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', googleAssistantHandler);
    intentMap.set('A-BQ Lumo', lumo);
    intentMap.set('A-PP sports', sports);
    agent.handleRequest(intentMap);


    // hanlde long_processing
    if(long_processing){
        if(request.body.originalDetectIntentRequest.source.toLowerCase() === 'line'){
            console.log('captured token for LINE: ' + line_replyToken);
            await long_processing.then((val) => line_reply_flex(line_replyToken, val, "Your requested schedule"));
        }
    }
});


// (async ()=> {})();