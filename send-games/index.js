const puppeteer = require('puppeteer');
const line = require('@line/bot-sdk');
const client = new line.Client({channelAccessToken: process.env.LINEY});
const req_url = 'https://www.bbc.co.uk/sport/football/scores-fixtures';


function send_to_line(msg) {
    const message = {type: 'text', text: msg};
    client.broadcast(message)
}


async function fetch_webpage(){
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

    var all_data = await page.evaluate(() => {
        var all_data = [];
        var all_fas = document.querySelectorAll('div.qa-match-block');

        for (var i = 0; i < all_fas.length; i++){
            var faname = all_fas[i].querySelector('h3').innerText.trim();
            var games = all_fas[i].querySelectorAll('li');
            if(games){
                for(var j = 0; j < games.length; j++){
                    all_data.push({
                        FA: faname,
                        Time: games[j].querySelector('.sp-c-fixture__block--time').innerText.trim(),
                        Home: games[j].querySelector('.sp-c-fixture__team--time-home').innerText.trim(),
                        Away: games[j].querySelector('.sp-c-fixture__team--time-away').innerText.trim()
                    })
                }
            }
        }
        return all_data;
    });

    await browser.close();
	return all_data;
}


exports.main = (async (req, res) => {
	var all_data = await fetch_webpage(1);

    var the_fa = "NA";
    var outtxt = "Today's Games (Finnish Time)";
    for(i = 0; i < all_data.length; i++){
        if(the_fa != all_data[i].FA){
            the_fa = all_data[i].FA;
            outtxt = outtxt + '\n\n' + the_fa;
        }
        timefin = (parseInt(all_data[i].Time.substring(0, 2)) + 2) + all_data[i].Time.substring(2, 5);
        outtxt = outtxt + '\n' + timefin + ' ' + all_data[i].Home + ' vs ' + all_data[i].Away;
    }

    if(req.query.flag) send_to_line(outtxt);    
    res.status(200).send(outtxt);
});


//exports.main("a", "b");
