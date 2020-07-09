// for illustration only

const line = require('@line/bot-sdk');
const client = new line.Client({channelAccessToken: process.env.LINEY});

function line_broadcast_flex(msg_obj, alt_txt) {
    client
        .broadcast({type: "flex", altText: alt_txt, contents: msg_obj})
        .catch((err) => { console.log(err.toString())});
}

function line_push_user(user, text){
    client
        .pushMessage(user, {type: 'text', text: text})
        .catch((err) => { console.log(err.toString())});
}


