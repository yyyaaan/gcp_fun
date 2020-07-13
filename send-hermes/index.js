const puppeteer = require('puppeteer');
const line = require('@line/bot-sdk');
const lineClient = new line.Client({channelAccessToken: process.env.LINEY});
const req_url = 'https://www.hermes.com/fi/en/category/women/bags-and-small-leather-goods/bags-and-clutches/';

async function fetch_webpage(){
    // start browser and block pictures
    const browser = await puppeteer.launch({
        headless: true, 
        ignoreHTTPSErrors: true,
        defaultViewport: {width: 1023, height: 1366},
        args: ['--no-sandbox', '--lang=en-US,en']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');
    await page.setExtraHTTPHeaders({'Accept-Language': 'en'});
    await page.setRequestInterception(true);
    await page.setJavaScriptEnabled(false);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
            request.abort();
        } else {
            request.continue();
        }
    });

    // read web and get data
    await page.goto(req_url, {waitUntil: 'domcontentloaded'});

    var all_data = await page.evaluate(() => {
        var all_data = [];
        var all_divs = document.querySelectorAll('div.product-item');
        for (var i = 0; i < all_divs.length; i++){
            all_data[i] = all_divs[i].innerText;
        }
        return all_data;
    });

    await browser.close();
    return all_data;
}

exports.main = (async (req, res) => {

    var all_data = await fetch_webpage();

    var out = [];
    for(i = 0; i < all_data.length; i ++ ){
        var keywords = all_data[i].toLowerCase().match("strap|clutch|backpack")
        if(!keywords){
            var element = all_data[i].split("\n,");
            var price = element[2].match(/\d{1,2},\d{3}/g)[0];
            var pricen = parseInt(price.split(',').join(''), 10);
            if(pricen < 4699) out.push(element[2] + "  " + element[0]);
        }
    }

    var textMessage = {
        type: "text", 
        text: `${out.length} Qualified Products (Total ${all_data.length})\n` + out.join("\n")
    };

    lineClient
        .broadcast(textMessage)
        .catch((err) => { console.log(err.toString()) });

    console.log("Broadcasting " + JSON.stringify(textMessage));
    res.status(200).send(out.join("<br />"));

});

// exports.main(null, null);