// this is a webhook for DiaglogFlow; integration is handled there
// https://googleapis.dev/nodejs/dialogflow/latest/index.html
// https://github.com/dialogflow/dialogflow-fulfillment-nodejs/blob/master/src/dialogflow-fulfillment.js

const {WebhookClient, Text, Card, Image, Suggestion, Payload} = require('dialogflow-fulfillment');
const {bq_status, bq_lumo_topn } = require('./query-bq.js');
const {line_rich_schedule} = require('./bbc-sports.js');

 
exports.main = (async (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    // hooks for different intentions
    function welcome(agent) {
        agent.add(`Welcome to my agent! (default webhook)`);
    }

    async function sports(agent){
        // agent.add('webhook ok Preparing schedules...(~30 seconds)');
        console.log(agent.parameters);
        const lineMessage = await line_rich_schedule(0);
        var payload = new Payload('line', lineMessage, {sendAsMessage: true});
        agent.add(payload);
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
});




// (async ()=> {})();
