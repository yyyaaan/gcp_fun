const puppeteer = require('puppeteer');
const line = require('@line/bot-sdk');
const client = new line.Client({channelAccessToken: process.env.LINEY});
const max_bubbles = 8;


function line_broadcast_flex(msg_obj, alt_txt) {
    const message = {type: "flex", altText: alt_txt, contents: msg_obj}
    try{
        client.broadcast(message)
    } catch(e) {
        console.log(e)
    }
}


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
    await page.screenshot({path: 'screen.png', fullPage: true});

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


exports.main = (async (req, res) => {

    var req_url = 'https://www.bbc.co.uk/sport/football/scores-fixtures/';
    if(req.query.days){
        var d = new Date();
        d.setDate(d.getDate() + parseInt(req.query.days));
        req_url = req_url + d.toISOString().substring(0, 10)
    }

	var all_data = await fetch_webpage(req_url);
    var msg_obj = line_carousel(all_data);
    console.log(JSON.stringify(msg_obj));
    line_broadcast_flex(msg_obj, "Today's Games");

    // res.status(200).send(JSON.stringify(msg_obj));
});


var req = {query:{xdays: '0'}}
exports.main(req, "b");
