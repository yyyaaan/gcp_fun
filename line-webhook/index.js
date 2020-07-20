// sports schedule now handled externally
const {BigQuery} = require('@google-cloud/bigquery');
const line = require('@line/bot-sdk');
const bigquery = new BigQuery(); // 
const client = new line.Client({channelAccessToken: process.env.LINE});
const https = require("https");


function reply_to_line(tkn, msg) {
    const message = {type: 'text', text: msg};
    console.log("sending reply to " + tkn + ' text:' + msg.replace(/\n/g, '|'));
    client.replyMessage(tkn, message).catch((err) => { console.log(err.toString())});
}


function prettify(bqrows){
    const regex = /[\[\{\}\]"]|(tss..)|(value..)|(apt..)/g;
    const dttxt = JSON.stringify(bqrows).replace(/\},\{/g, '\n').replace(regex, '').replace(/--/g, '\n');
    return dttxt;
}


////////////////////////////////////////////
// handle dataset status (STATUS dataset) //
////////////////////////////////////////////
async function bq_status(dataset) {
    if(dataset!="MRT01" && dataset!="QR01" && dataset!="LUMO01"){
        return "no such dataset";
    }
    const sqlQuery = `SELECT tss, count(*) as n
    FROM \`yyyaaannn.Explore.${dataset}\`
    GROUP BY tss ORDER BY tss desc LIMIT 10`;

    const [rows] = await bigquery.query({query: sqlQuery});
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return rows;
}


////////////////////////////////////////////
// handle top lumo results in bq (LUMO N) //
////////////////////////////////////////////
async function bq_lumo_topn(n) {
    const sqlQuery = `SELECT address, area, floor, size, rent
    FROM \`yyyaaannn.Explore.LUMO01\`
    where tss = (select max(tss) from \`yyyaaannn.Explore.LUMO01\`)
    order by rent desc
    limit ${n}`;

    const [rows] = await bigquery.query({query: sqlQuery});
    pretty_rows = rows.map((element) => ({
        apt: element.address + ', ' + element.area + ' -- '  + 
            element.rent + '\u20AC ' + element.floor + 'F ' + element.size + 
            '\u33A1 (~' + Math.round(element.rent / element.size)  + '\u20AC/\u33A1)'
    }));
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return pretty_rows;
}


//////////////////////////////////////////
// main function to handle all requests //
//////////////////////////////////////////

async function handle_msg_text(replyToken, cmd){
    var texts = cmd.toUpperCase().split(" ");
    var out = "Thank you for your message. I am not yet able to understand it. Please use BotYYY menu.";

    if(texts.length == 2){
        switch(texts[0]){
            case "STATUS":
                var out = await bq_status(texts[1]);
                reply_to_line(replyToken, prettify(out));
                break;
            case "LUMO":
                var out = await bq_lumo_topn(parseInt(texts[1], 10)); 
                reply_to_line(replyToken, prettify(out));
                break;
            case "SCHEDULE":
                var ext_url = "https://europe-west2-yyyaaannn.cloudfunctions.net/send-games?replyToken=" + replyToken;
                https.get(ext_url, res => {console.log('fired external:' + ext_url)})        
                break;
            default:
                reply_to_line(replyToken, out);
        }
    }

    return('ok');
}

exports.main = (async (req, res) => {
    console.log(JSON.stringify(req.body));

    const event = req.body.events[0];

    if (event.type === 'message') {
        const message = event.message;

        if (message.type === 'text') {
            await handle_msg_text(event.replyToken, message.text);
        } else {
            reply_to_line(event.replyToken, "Sorry. Only pure text message is supported");
        }
    } else if (event.type === 'postback') {
        const postback = event.postback;
        reply_to_line(event.replyToken, "(no response) Postback recieved " + postback.data)
    }

  res.status(200).send("ok");
});




// debugging function
// (async ()=> {
//     await handle_msg_text("TOKEN", "lumo 10");
// })();