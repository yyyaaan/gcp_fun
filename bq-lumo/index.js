const puppeteer = require('puppeteer');
const {BigQuery} = require('@google-cloud/bigquery');
const line = require('@line/bot-sdk');
const client = new line.Client({channelAccessToken: process.env.LINE});
const clientY = new line.Client({channelAccessToken: process.env.LINEY});
const bigquery = new BigQuery(); 
const req_url = 'https://lumo.fi/vuokra-asunnot/';


async function insert_to_bigquery(all_data) {
	await bigquery.dataset('Explore').table('LUMO01').insert(all_data);
	console.log(`LUMO: Inserted ${all_data.length} rows to bigquery`);
}

function send_to_line(msg) {
    const message = {type: 'text', text: msg};
    client.broadcast(message)
}

function prettify(data){
    const regex = /[\[\{\}\]"]|(tss..)|(value..)|(apt..)/g;
    const dttxt = JSON.stringify(data).replace(/\},\{/g, '\n').replace(regex, '').replace(/--/g, '\n');
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

    var both_data = await page.evaluate(() => {
        var rxint = /\d{1,4}/; 
        var rxflt = /\d{2,3}.\d*/;
        var the_time = Date.now() / 1000;
        var all_apts = document.querySelectorAll('li.atom-itemApartment');
        var all_data = [];
        var apt_hrefs= [];

        for (var i = 0; i < all_apts.length; i++) {
            var address = all_apts[i].querySelector('.atom-itemApartment__streetAddress-address').innerText.trim();
            var cityc = all_apts[i].querySelector('.atom-itemApartment__streetAddress-city').innerText.trim();
            var rentc = all_apts[i].querySelector('.atom-itemApartment__mainDetails-rent').innerText.trim();
            var floorc = all_apts[i].querySelector('.atom-itemApartment__mainDetails-floor').innerText.trim();
            var sizec = all_apts[i].querySelector('.atom-itemApartment__mainDetails-size').innerText.trim();
            var availability = all_apts[i].querySelector('.atom-itemApartment__availabilityInfo').innerText.trim();
            
            apt_hrefs[i] = all_apts[i].querySelector('.atom-itemApartment__link').getAttribute('href');

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
        return [all_data, apt_hrefs];
    });

    await browser.close();
    console.log(`LUMO: fetched ${both_data[0].length} rows`);
	
	return both_data;
}


async function bq_lumo_rawn(n) {
    const sqlQuery = `SELECT address
    FROM \`yyyaaannn.Explore.LUMO01\`
    where tss = (select max(tss) from \`yyyaaannn.Explore.LUMO01\`)
    order by rent desc
    limit ${n}`;

    const [rows] = await bigquery.query({query: sqlQuery});
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return rows;
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

(async ()=> {
    
    // fetch lumo webpages
    two_items = await fetch_webpage(1);
    all_data = two_items[0];

    // find setdiff with previous scraping
    old20 = await bq_lumo_rawn(20);
    new10 = all_data.slice(20, 23);
    new_ones = new10.filter(x => !old20.map((element) => (element.address)).includes(x.address) );

    // prepare message
    msg_data = new_ones.map((element) => ({
        apt: element.address + ' -- '  + element.rent + ' EUR (' + element.size + ' sq.m)'
    }));
    msg_text = prettify(msg_data);
    // send_to_line(msg_text);
	// await insert_to_bigquery(all_data);	
    
    console.log( msg_text)

})();

function test_diff(){
    new10 = [ 'Lehtisaarentie 14 as. 3',
        'Linnankatu 11 A 1',
        'Asematie 12 A 1',
        'Lönnrotinkatu 30 E 59',
        'Kahvipavunkuja 4 A 2',
        'Katariina Saksilaisen katu 11 A 1',
        'Linnankatu 11 C 35',
        'Karibiankuja 4 A 27',
        'Karibiankuja 4 A 13',
        'Karibiankuja 4 A 6',
        'Karibiankuja 4 A 18',
        'Karibiankuja 4 B 52',
        'Karibiankuja 4 A 11',
        'Karibiankuja 4 A 4',
        'Karibiankuja 4 B 45',
        'Katariina Saksilaisen katu 11 A 10'];

    old20 = [ 'Lehtisaarentie 14 as. 3',
        'Linnankatu 11 A 1',
        'Asematie 12 A 1',
        'Lönnrotinkatu 30 E 59',
        'Kahvipavunkuja 4 A 2',
        'Katariina Saksilaisen katu 11 A 1',
        'Linnankatu 11 C 35',
        'Karibiankuja 4 A 27',
        'Karibiankuja 4 A 13',
        'Karibiankuja 4 A 6',
        'Karibiankuja 4 A 18',
        'Karibiankuja 4 B 52',
        'Karibiankuja 4 A 11',
        'Karibiankuja 4 B 45',
        'Karibiankuja 4 A 4',
        'Katariina Saksilaisen katu 11 A 10',
        'Hopeatie 9 B 9',
        'Linnankatu 11 C 43',
        'Karibiankuja 4 A 33',
        'Karibiankuja 4 B 67' ];

    new_ones = new10.filter(x => !old20.includes(x) );
    console.log(new_ones)
}
