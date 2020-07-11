////////////////////////////////
// Only DialogFlow Hooks Here //
////////////////////////////////

const https = require("https");
const testflag = "&test=yes"; // set non-BotYYY when call other function

async function agent_schedule(agent){
    // call external with replyToken and possible date
    var ext_url = "https://europe-west2-yyyaaannn.cloudfunctions.net/send-games" +
                    "?replyToken=" + line_replyToken + testflag;
    if(agent.parameters.date) {
        ext_url = ext_url + "&date=" + agent.parameters.date.substring(0, 10)
    }
    https.get(ext_url, res => {console.log('fired external:' + ext_url)});
}

module.exports = {agent_schedule};