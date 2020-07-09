// this is a webhook for DiaglogFlow; integration is handled there
// https://googleapis.dev/nodejs/dialogflow/latest/index.html
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

// import my modules
const {bq_status, bq_lumo_topn } = require('./query-bq.js');
const {line_rich_schedule} = require('./bbc-sports.js');

 
exports.main = (async (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    // hooks for different intentions
    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
    }

    async function sports(agent){
        agent.add('webhook ok Trying to find apartments...please wait');
        var out = await line_rich_schedule(0);
        agent.add({"line": out});
    }

    async function lumo(agent){
        agent.add('webhook ok Trying to find apartments...please wait');
        var out = await bq_lumo_topn(9);
        agent.add(out);
    }

    function googleAssistantHandler(agent) {
        let conv = agent.conv(); // Get Actions on Google library conv instance
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

