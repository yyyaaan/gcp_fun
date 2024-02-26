const { send_emails } = require('./util_send.js')
const puppeteer = require('puppeteer');

const standings = [
    {type: "button", margin: "xs", height: "sm", action: {type: "uri", label: "Premier League", uri: "https://www.bbc.com/sport/football/premier-league/table"}},
    {type: "button", margin: "xs", height: "sm", action: {type: "uri", label: "La Liga", uri: "https://www.bbc.com/sport/football/spanish-la-liga/table"}},
    {type: "button", margin: "xs", height: "sm", action: {type: "uri", label: "Bundesliga", uri: "https://www.bbc.com/sport/football/german-bundesliga/table"}},
    {type: "button", margin: "xs", height: "sm", action: {type: "uri", label: "Serie A", uri: "https://www.bbc.com/sport/football/italian-serie-a/table"}},
    {type: "button", margin: "xs", height: "sm", action: {type: "uri", label: "Ligue 1", uri: "https://www.bbc.com/sport/football/french-ligue-one/table"}},
    {type: "button", margin: "xs", height: "sm", action: {type: "uri", label: "Veikkauliiga", uri: "https://www.bbc.com/sport/football/finnish-veikkausliiga/table"}},
    {type: "button", margin: "xs", height: "sm", action: {type: "uri", label: "Champions League", uri: "https://www.bbc.com/sport/football/champions-league/table"}},
    {type: "separator"}
];



function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getRandomStyle() {
    randomColor = getRandomColor()
    styleText = "border-style: none none none solid; border-color:";
    styleText += randomColor + ";";
    styleText += "color:" + randomColor + ";";
    return styleText
}

function html_message(all_data) {
    var html_content = '';
    var title_text = 'Today';
    
    for(i = 0; i < all_data.length; i++){
        nice_data = all_data[i].map((element) => ({
            time: ((parseInt(element.time.substring(0, 2)) + 2) + 
                element.time.substring(2, 5) +
                element.note + ' ').replace(/NaNll|\n/g, ''),
            game: (element.home + ' vs. ' + element.away).replace(/NaNll|\n/g, '').replace(/\t/g, ' '),
        }));

        time_game_list = nice_data.map((element) => `<b>${element.time}</b>  ${element.game}`);

        html_content += `<h3 style="${getRandomStyle()}"> ${all_data[i][0].fa}</h3>`;
        html_content += `<p>${time_game_list.join('<br>')}</p>`;

        if (i < 2) {
            title_text += ` ${nice_data.length} ${all_data[i][0].fa.replace("THE ", "")}` 
        }
    }

    return {
        title: title_text,
        html: html_content,
    };
}


async function fetch_webpage(req_url){
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
    await page.waitForSelector('div.qa-match-block');

    // return 2d array [[games in FA], [games in FA]]
    var all_data = await page.evaluate(() => {
        var all_data = [];
        var all_fas = document.querySelectorAll('div.qa-match-block');
        var regex1 = /\d{1,2}:\d{2}/;
        var regex_excl = /league one|league two|national league|fa trophy|efl trophy|scottish cup|lowland/i;

        for (var i = 0; i < all_fas.length; i++){
            var cur_data = [];
            var faname = all_fas[i].querySelector('h3').innerText.trim();
            var games = all_fas[i].querySelectorAll('li');
            
            if(regex_excl.test(faname)) continue;

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
            all_data.push(cur_data);
        }
        return all_data;
    });

    await browser.close();
	return all_data;
}


// this is all fulfillment function
async function all_bbcsports(req, res) {

    var req_url = 'https://www.bbc.co.uk/sport/football/scores-fixtures/';
    if(req.query.days){
        var d = new Date();
        d.setDate(d.getDate() + parseInt(req.query.days));
        req_url = req_url + d.toISOString().substring(0, 10);
        alt_txt = 'Schedule for ' + d.toISOString().substring(5, 10);
    } else if(req.query.date){
        req_url = req_url + req.query.date.substring(0, 10);
        alt_txt = 'Schedule for ' + req.query.date.substring(5, 10);
    } 

    // fetch from bbc sports, build rich message
    const all_data = await fetch_webpage(req_url);
    const html_data = html_message(all_data);

    send_emails(
        subject=html_data.title, 
        text=html_data.title, 
        html=html_data.html,
    )
}

// export submodule
async function send_bbcsports(){

    await all_bbcsports({query:{days: '0', broadcast: 'yes'}}, ".");
    //await all_bbcsports({query:{days: '0', broadcast: 'yes', test: 'yes' }}, ".");
}

module.exports = { send_bbcsports };


// send_bbcsports()