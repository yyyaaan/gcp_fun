const line = require('@line/bot-sdk');
const fs = require('fs');
const client = new line.Client({channelAccessToken: process.env.LINEY});

var menu_v1 = {
    "size": {width: 2500, height: 1500},
    "selected": false,
    "name": "YYYmenu v1",
    "chatBarText": "Ask BotYYY",
    "areas": [
        {bounds: {x: 0, y: 0, width: 2500, height: 1500},
         action: {type: "postback", data: "btn1"}},
        {bounds: {x: 0, y: 0, width: 2500, height: 1500},
         action: {type: "postback", data: "btn1"}},
   ]
}

// 2. register the rich menu
// client.createRichMenu(menu1).then((richMenuId) => console.log(richMenuId));

// 3. set the picture
// client.setRichMenuImage('richmenu-745490f44a6598b2ff5aef90b13753e9', fs.createReadStream('a.png'));

// 4. set default
// client.setDefaultRichMenu('richmenu-745490f44a6598b2ff5aef90b13753e9');

// x. remove default
client.deleteDefaultRichMenu().catch((err) => { console.log(err.toString())});; 
client.deleteRichMenu('richmenu-745490f44a6598b2ff5aef90b13753e9').catch((err) => { console.log(err.toString())});;