// Fulfillment: (1) daily broadcast (2) reply by token and client (3) push message by userId

const puppeteer = require('puppeteer');
const line = require('@line/bot-sdk');
const max_bubbles = 8;
var lineClient;


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

        nice_data = all_data[i].map((element) => ({
            a: ((parseInt(element.time.substring(0, 2)) + 2) + 
                element.time.substring(2, 5) +
                element.note + ' ').replace(/NaNll|\n/g, ''),
            b: (element.home + ' vs. ' + element.away).replace(/NaNll|\n/g, '').replace(/\t/g, ' '),
        }));

        cur_array = nice_data.map((element) => ({
            type: "box",
            layout: "horizontal",
            contents: [{type: "text", size: "xs", wrap: true, weight: "bold", text: element.a},
                       {type: "text", size: "xs", wrap: true, flex: 4, text: element.b}] 
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
                        away: games[j].querySelector('span:nth-child(3)').innerText,
                        note: games[j].querySelector('aside').innerText
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


exports.main = (async (req, res) => {

    if(req.query.test){
        lineClient = new line.Client({channelAccessToken: process.env.LINE});
    } else {
        lineClient = new line.Client({channelAccessToken: process.env.LINEY});
    }

    // changing requested date
    var req_url = 'https://www.bbc.co.uk/sport/football/scores-fixtures/';
    if(req.query.days){
        var d = new Date();
        d.setDate(d.getDate() + parseInt(req.query.days));
        req_url = req_url + d.toISOString().substring(0, 10);
    } else if(req.query.date){
        req_rul = req_url + req.query.date.substring(0, 10)
    } 

    // fetch from bbc sports
    var all_data = await fetch_webpage(req_url);
    var richMessage = {
        type: "flex", 
        altText: "Your requested schedule", 
        contents: line_carousel(all_data)
    };

    // Scenario 1: broadcasting, called by scheduler
    if(req.query.broadcast){
        lineClient
            .broadcast(richMessage)
            .catch((err) => { console.log(err.toString()) });
        console.log("Broadcasting " + JSON.stringify(richMessage));
    }

    // Scenario 2: reply to user, need to determine client by destination
    if(req.query.replyToken){
        lineClient
            .replyMessage(req.query.replyToken, richMessage)
            .catch((err) => { console.log(err.toString()) });
        console.log("sending reply to " + req.query.replyToken + ' with ' + JSON.stringify(richMessage));
    }

    // Scenario 3: push message, this has to be use due to DialogFlow limitation (push is payable)
    if(req.query.userId){
        lineClient
            .pushMessage(req.query.userId, richMessage)
            .catch((err) => { console.log(err.toString()) });
        console.log("Pushing to " + req.query.userId + ' with ' + JSON.stringify(richMessage));
    }

    res.status(200).send('request recieved');
});


var req = {query:{
    days: '0', 
    broadcast: 'yes',
    test: 'yes'

    // destination: 'U21ddff11fc82268d8551c21b4019ee6c',
    // replyToken: 'test',
    }}

exports.main(req, "b");

(async()=> {
    var out = await fetch_webpage('https://www.bbc.com/sport/football/scores-fixtures');
    console.log(out);
})();

