const puppeteer = require('puppeteer');
const {BigQuery} = require('@google-cloud/bigquery');
const line = require('@line/bot-sdk');
const client = new line.Client({
  channelAccessToken: '/D6B+5TCvORkRjXa5Ae2lXu9msGgLKwXFjdkDcDxI42pm5sc6JqxXKDCGZVeOb1Q6b7pYv03I2lGMayQ2dTS6rWVoAgvlWQwuADIp0hAtxjDh83B9mCWpjwmbAWx1sKR3+GQa+KrAsmxcNZs84U/8QdB04t89/1O/w1cDnyilFU='
});
const bigquery = new BigQuery({projectId: 'yyyaaannn'}); //remove projectID in production
const req_url = 'https://lumo.fi/vuokra-asunnot/';


async function insert_to_bigquery(all_data) {
	await bigquery.dataset('Explore').table('LUMO01').insert(all_data);
	console.log(`LUMO: Inserted ${all_data.length} rows to bigquery`);
}

function send_to_line(msg) {
    const message = {type: 'text', text: msg};
    client.broadcast(message)
}

function prettify(data, rows){
    const regex = /[\[\{\}\]":]|(apt)/g;
    const outdt = data.slice(0, rows);
    const dttxt = JSON.stringify(outdt).replace(regex, '').replace(/,/g, '\n');
    const dltxt = "Total rows " + data.length + "\n";
    return (dltxt + dttxt);
}

async function fetch_webpage(maxn){
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
    await page.waitForSelector('select.mod-searchResults__sortSelect');
    await page.select('select.mod-searchResults__sortSelect', 'MostExpensive');
    for(i = 0; i  < maxn; i++){
        await page.waitFor(399);
        await page.waitForSelector('button.button--show-more');
        await page.click('button.button--show-more');  
    }

    var all_data = await page.evaluate(() => {
        var rxint = /\d{1,4}/; 
        var rxflt = /\d{2,3}.\d*/;
        var the_time = Date.now() / 1000;
        var all_apts = document.querySelectorAll('li.atom-itemApartment');
        var all_data = [];

        for (var i = 0; i < all_apts.length; i++) {
            var address = all_apts[i].querySelector('.atom-itemApartment__streetAddress-address').innerText.trim();
            var cityc = all_apts[i].querySelector('.atom-itemApartment__streetAddress-city').innerText.trim();
            var rentc = all_apts[i].querySelector('.atom-itemApartment__mainDetails-rent').innerText.trim();
            var floorc = all_apts[i].querySelector('.atom-itemApartment__mainDetails-floor').innerText.trim();
            var sizec = all_apts[i].querySelector('.atom-itemApartment__mainDetails-size').innerText.trim();
            var availability = all_apts[i].querySelector('.atom-itemApartment__availabilityInfo').innerText.trim();

            all_data[i] = {
                address: address,
                availability: availability,
                area: cityc,
                city: cityc.split(',')[1],
                room: sizec,
                floor: parseInt(rxint.exec(floorc), 10),
                nrooms: parseInt(rxint.exec(sizec), 10),
                sauna: sizec.toString().includes('+S'),
                size: parseFloat(rxflt.exec(sizec).toString().replace(',', '.')),
                rent: parseInt(rxint.exec(rentc), 10),
                tss: the_time
                }
        }
        return all_data;
    });

    await browser.close();
    console.log(`LUMO: fetched ${all_data.length} rows`);
	
	return all_data;
}


exports.main = (async (req, res) => {
    var maxn = req.query.maxn;
    if (!maxn) maxn = 9;
	
	all_data = await fetch_webpage(maxn);
	await insert_to_bigquery(all_data);

    msg_data = all_data.map((element) => ({
        apt: element.address + ' -- '  + element.rent + ' EUR (' + element.size + ' sq.m)'
    }));
    msg_text = prettify(msg_data, 10);
    send_to_line(msg_text);

    res.status(200).send(`Job completed: inserted ${all_data.length} rows`);
});


//debug function, remove on deployment
async function run_it() {
	all_data = await fetch_webpage(1);

    msg_data = all_data.map((element) => ({
        apt: element.address + ' -- '  + element.rent + ' EUR (' + element.size + ' sq.m)'
    }));
    msg_text = prettify(msg_data, 10);
    //send_to_line(msg_text);
	//await insert_to_bigquery(all_data);	
    
    console.log( msg_text)
}

run_it();
