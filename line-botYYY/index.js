const puppeteer = require('puppeteer');
const {BigQuery} = require('@google-cloud/bigquery');
const line = require('@line/bot-sdk');
const bigquery = new BigQuery(); // 
const client = new line.Client({channelAccessToken: process.env.LINEY});
const max_bubbles = 8;


function reply_to_line(tkn, msg) {
    const message = {type: 'text', text: msg};
    console.log("sending reply to " + tkn + ' text:' + msg.replace(/\n/g, '|'));
    client.replyMessage(tkn, message).catch((err) => { console.log(err.toString())});
}


function reply_flex(tkn, msg_obj, alt_txt) {
    const message = {type: "flex", altText: alt_txt, contents: msg_obj}
    console.log("sending reply to " + tkn + ' rich:' + JSON.stringify(msg_obj));
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
// Get Live Scroes - same as send-games //
//////////////////////////////////////////

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


function line_carousel(all_data){
    var bubble_array = [];
    for(i = 0; i < Math.min(all_data.length, max_bubbles); i++){

        cur_array = all_data[i].map((element) => ({
            type: "text",
            size: "xs",
            wrap: true,
            text: ((parseInt(element.time.substring(0, 2)) + 2) + 
                    element.time.substring(2, 5) + 
                    ' ' + element.home + ' vs. ' + element.away).replace(/NaNll|\n/g, '').replace(/\t/g, ' ')
        }));

        bubble_array.push({
            "type":"bubble",
            "size":"kilo",
            "header":{
                "type":"box",
                "layout":"vertical",
                "contents":[{
                    "type":"text",
                    "text": all_data[i][0].fa,
                    "color":"#ffffff",
                    "align":"start",
                    "size":"md",
                    "gravity":"center"
                }],
                "backgroundColor": getRandomColor(),
            },
            "body":{
                "type":"box",
                "layout":"vertical",
                "contents": cur_array,
                "spacing":"md",
                "paddingAll":"12px"
            }
        })
    }
    return {type: 'carousel', contents: bubble_array};
}


async function fetch_webpage(req_url){
	// start browser and block pictures
    const browser = await puppeteer.launch({
        headless: true, 
		ignoreHTTPSErrors: true,
		args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
    await page.setRequestInterception(true);
    page.on('request', (request) => {
		if (request.resourceType() === 'image') request.abort();
		else request.continue();
    });

    // read web and get data
    await page.goto(req_url, {waitUntil: 'networkidle0'});
    await page.waitForSelector('div.qa-match-block');

    // return 2d array [[games in FA], [games in FA]]
    var all_data = await page.evaluate(() => {
        var all_data = [];
        var all_fas = document.querySelectorAll('div.qa-match-block');
        var regex1 = /\d{1,2}:\d{2}/;

        for (var i = 0; i < all_fas.length; i++){
            var cur_data = [];
            var faname = all_fas[i].querySelector('h3').innerText.trim();
            var games = all_fas[i].querySelectorAll('li');
            if(games){
                for(var j = 0; j < games.length; j++){
                    cur_data.push({
                        fa: faname,
                        time: String(regex1.exec(games[j].innerText)),
                        home: games[j].querySelector('span:nth-child(1)').innerText, 
                        away: games[j].querySelector('span:nth-child(3)').innerText
                    })
                }
            }
            all_data[i] = cur_data;
        }
        return all_data;
    });

    await browser.close();
	return all_data;
}

async function ppt_schedule(days){
    var req_url = 'https://www.bbc.co.uk/sport/football/scores-fixtures/';
    
    if(days > 0){
        var d = new Date();
        d.setDate(d.getDate() + parseInt(days));
        req_url = req_url + d.toISOString().substring(0, 10)
    }

	var all_data = await fetch_webpage(req_url);
    var msg_obj = line_carousel(all_data);
    // console.log(JSON.stringify(msg_obj));
    return(msg_obj)
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
                var msg_obj = await ppt_schedule(parseInt(texts[1], 10));
                reply_flex(replyToken, msg_obj, "Football Games");
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
(async ()=> {
    await handle_msg_text("TOKEN", "lumo 10");
})();