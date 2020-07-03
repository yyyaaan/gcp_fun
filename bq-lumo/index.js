const puppeteer = require('puppeteer');
const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery({projectId: 'yyyaaannn'}); //remove projectID in production
const req_url = 'https://lumo.fi/vuokra-asunnot/';


async function insert_to_bigquery(all_data) {
	await bigquery.dataset('Explore').table('LUMO01').insert(all_data);
	console.log(`LUMO: Inserted ${all_data.length} rows to bigquery`);
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

    res.status(200).send(`Job completed: inserted ${all_data.length} rows`);
});


//debug function, remove on deployment
async function run_it() {
	all_data = await fetch_webpage(9);
	await insert_to_bigquery(all_data);	
}

run_it();
