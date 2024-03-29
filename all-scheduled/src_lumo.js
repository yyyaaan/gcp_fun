const { send_emails } = require('./util_send.js')
const puppeteer = require('puppeteer');
const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery(); 
const req_url = 'https://lumo.fi/vuokra-asunnot/';


async function insert_to_bigquery(all_data) {
	await bigquery.dataset('Explore').table('LUMO01').insert(all_data);
	console.log(`LUMO: Inserted ${all_data.length} rows to bigquery`);
}


function prettify(raw_data){
    better_data = raw_data.map((element) => ({
        apt: element.address + ', ' + element.area + '--  '  + 
             element.rent + '\u20AC ' + element.floor + 'F ' + element.size + 
             '\u33A1 (~' + Math.round(element.rent / element.size)  + '\u20AC/\u33A1\u00B7month)' +
             (element.href ? ('  https://lumo.fi' + element.href) : '' )
    }));

    const dttxt = JSON.stringify(better_data)
                    .replace(/\},\{/g, '\n')
                    .replace(/[\[\{\}\]"]|(tss..)|(value..)|(apt..)/g, '')
                    .replace(/--/g, '\n');
    return dttxt;
}


async function fetch_webpage(maxn){
	// start browser and block pictures
    const browser = await puppeteer.launch({
        headless: 'new', 
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
        await page.waitForTimeout(399);
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
                tss: the_time,
                href: all_apts[i].querySelector('.atom-itemApartment__link').getAttribute('href')
            }
        }
        return all_data;
    });

    await browser.close();
    console.log(`LUMO: fetched ${all_data.length} rows from webpage`);
	
	return all_data;
}


async function bq_lumo_rawn(n) {
    const sqlQuery = `SELECT address
    FROM \`yyyaaannn.Explore.LUMO01\`
    where tss = (select max(tss) from \`yyyaaannn.Explore.LUMO01\`)
    order by rent desc
    limit ${n}`;

    const [rows] = await bigquery.query({query: sqlQuery});
    console.log(`LUMO: read ${rows.length} rows from BigQuery`);
    return rows;
}

async function send_lumo(){
    var maxn = 9;
	
    // fetch lumo webpages + formatted msg
    all_data = await fetch_webpage(maxn);

    // find setdiff with previous scraping, push to BotYYY
    old20 = await bq_lumo_rawn(25);
    new10 = all_data.slice(0, 15);
    new_ones = new10.filter(x => !old20.map((element) => (element.address)).includes(x.address) );
    if(new_ones.length > 0){
        send_emails(
            subject=`BotYYY: ${new_ones.length} new top apartments`,
            text=prettify(new_ones),
            html=prettify(new_ones),
        )
    }

    // bigquery data, drop href field; notify YanCloud
    for(i = 0; i < all_data.length; i++){
        delete all_data[i].href;
    }
    await insert_to_bigquery(all_data);
}

module.exports = {send_lumo};


// async function main() {
//     await send_lumo();
// }

// main()