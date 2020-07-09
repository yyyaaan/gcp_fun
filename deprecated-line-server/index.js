// USE DIALOGFLOW

const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery(); // {projectId: 'yyyaaannn'} remove projectID in production
const line = require('@line/bot-sdk');
const client = new line.Client({channelAccessToken: process.env.LINE});


function reply_to_line(tkn, msg) {
    const message = {type: 'text', text: msg};
    console.log("sending reply to" + tkn + msg);
    client.replyMessage(tkn, message)
}


function prettify(bqrows){
    const regex = /[\[\{\}\]"]|(tss..)|(value..)|(address..)/g;
    const dttxt = JSON.stringify(bqrows).replace(/\},\{/g, '\n').replace(regex, '');
    return dttxt;
}


async function bq_status(dataset) {
    if(dataset!="MRT01" && dataset!="QR01" && dataset!="LUMO01"){
        return "no such dataset";
    }
    const sqlQuery = `SELECT tss, count(*) as n
    FROM \`yyyaaannn.Explore.${dataset}\`
    GROUP BY tss ORDER BY tss desc LIMIT 10`;

    const [rows] = await bigquery.query({query: sqlQuery});
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return rows;
}


async function bq_lumo_topn(n) {
    const sqlQuery = `SELECT address, size, rent
    FROM \`yyyaaannn.Explore.LUMO01\`
    where tss = (select max(tss) from \`yyyaaannn.Explore.LUMO01\`)
    order by rent desc
    limit ${n}`;

    const [rows] = await bigquery.query({query: sqlQuery});
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return rows;
}


async function prepare_res(cmd){
    var texts = cmd.toUpperCase().split(" ");

    if(texts.length == 2){
        switch(texts[0]){
            case "STATUS":
                var out = await bq_status(texts[1]);
                break;
            case "TOP":
                var out = await bq_lumo_topn(parseInt(texts[1], 10)); 
                break;
            default:
                var out = "supported questions: status dataset; top n.";
        }
    } else {
        var out = "supported questions: status dataset; top n.";
    }
    
    return prettify(out);
}

//prepare_res("status luo01"); prepare_res("top 10"); prepare_res("abc cba adsf");


exports.main = (async (req, res) => {
  console.log(JSON.stringify(req.body));
  const linereq = req.body.events[0];
  const linemsg = linereq.message;
  const linetkn = linereq.replyToken;
  const linetxt = linemsg.text;

  //console.log("Token"+linetkn + "MsgTxt"+linetxt);
  const the_res = await prepare_res(linetxt);
  reply_to_line(linetkn, the_res);

  res.status(200).send("ok");
});

