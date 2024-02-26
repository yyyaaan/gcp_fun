const axios = require('axios');
const puppeteer = require('puppeteer');
const sgMail = require('@sendgrid/mail')
const req_url = "https://hok-elanto.fi/asiakasomistajapalvelu/ajankohtaista-asiakasomistajalle/";
const audienceList = ["+358 44 9199857", "+358 41 3695423"]
const audienceEmails = ['yan@yan.fi', 'nocturn21st@gmail.com']

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
        var all_divs = document.querySelectorAll('div.textwidget');
        for (var i = 0; i < all_divs.length; i++){
            all_data[i] = all_divs[i].innerText;
        }
        return all_data;
    });

    await browser.close();

    // keep only text with "bounus tuplana"
    var outcome = "";
    for (var i = 0; i < all_data.length; i++){
        if(all_data[i].toLowerCase().indexOf("bonus tup") > 0){
            var split_txts = all_data[i].split("\n")
            // keep only the line with number
            for (var i = 0; i < split_txts.length; i++){
                if (split_txts[i].indexOf("202") > 0){
                    outcome = split_txts[i]
                }
            }
            break
        }
    }

    return outcome
}

async function send_hokelanto(){

    var bonusX2 = await fetch_webpage();

    if (bonusX2.length < 10){
        console.log("Bonus tuplana not available");
        bonusX2 = "Bonus tuplana N/A";
        if(process.env.VERBOSE != 'YES') {
            return "nothing";
        }
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    sgMail
        .send({
            to: audienceEmails,
            from: 'BotYYY@yan.fi',
            subject: `BotYYY ${bonusX2}`,
            text: bonusX2,
            html: bonusX2,
        })
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.error(error)
        })

    // whatsapp
    for (let audience of audienceList) {
        const postData = {
            messaging_product: "whatsapp", 
            recipient_type: "individual",
            to: audience, 
            type: "text", 
            text: { body: bonusX2 }
        }
    
        axios.post('https://graph.facebook.com/v18.0/217957681407032/messages', postData, {
            headers: {
                'Authorization': `Bearer ${process.env.whatsappTest}`,
            }
        })
            .then((response) => {
                console.log('Status:', response.status, response.data);
            })
            .catch((error) => {
                console.error('Error:', error.message);
            });
    
    }
}

module.exports = { send_hokelanto };



// async function main(){
//     // var all_data = await fetch_webpage();
//     // console.log(all_data)
//     await send_hokelanto();
// }

// main()
