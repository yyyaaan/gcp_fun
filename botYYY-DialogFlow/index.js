// this is a webhook for DiaglogFlow; integration is handled there
// https://googleapis.dev/nodejs/dialogflow/latest/index.html
// https://github.com/dialogflow/dialogflow-fulfillment-nodejs/blob/master/src/dialogflow-fulfillment.js

const {WebhookClient, Text, Card, Image, Suggestion, Payload} = require('dialogflow-fulfillment');
const {bq_status, bq_lumo_topn } = require('./query-bq.js');
const {line_rich_schedule} = require('./bbc-sports.js');
const {line_reply_flex} = require('./line_direct.js');

// handle long runing promise for LINE
var long_processing; 
var line_replyToken;
 

exports.main = (async (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    line_replyToken = new String(request.body.originalDetectIntentRequest.payload.data.replyToken);

    // hooks for different intentions
    function welcome(agent) {
        agent.add(`Welcome to my agent! (default webhook)`);
    }

    async function sports(agent){
        console.log(agent.parameters);
        long_processing = line_rich_schedule(0); // NO AWAIT, handle later
        agent.add('webhook ok Preparing schedules...(~30 seconds)');
    }

    async function lumo(agent){
        var param_n = 9
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