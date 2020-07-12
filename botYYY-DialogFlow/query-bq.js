const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery(); // 
const max_bubbles = 8;


function prettify(bqrows){
    const regex = /[\[\{\}\]"]|(tss..)|(value..)|(apt..)/g;
    const dttxt = JSON.stringify(bqrows).replace(/\},\{/g, '\n').replace(regex, '').replace(/--/g, '\n');
    return dttxt;
}

/////////////////////////// /////////
// Commom Function for generic use //
/////////////////////////////////////

async function bq_status(dataset) {
    if(dataset!="MRT01" && dataset!="QR01" && dataset!="LUMO01"){
        return "no such dataset";
    }
    const sqlQuery = `SELECT tss, count(*) as n
    FROM \`yyyaaannn.Explore.${dataset}\`
    GROUP BY tss ORDER BY tss desc LIMIT 10`;

    const [rows] = await bigquery.query({query: sqlQuery});
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return prettify(rows);
}


async function bq_lumo_topn(n) {
    const sqlQuery = `SELECT address, area, floor, size, rent
    FROM \`yyyaaannn.Explore.LUMO01\`
    where tss = (select max(tss) from \`yyyaaannn.Explore.LUMO01\`)
    order by rent desc
    limit ${n}`;

    const [rows] = await bigquery.query({query: sqlQuery});
    pretty_rows = rows.map((element) => ({
        apt: element.address + ', ' + element.area + ' -- '  + 
            element.rent + '\u20AC ' + element.floor + 'F ' + element.size + 
            '\u33A1 (~' + Math.round(element.rent / element.size)  + '\u20AC/\u33A1)'
    }));
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return prettify(pretty_rows);
}

///////////////////////////////
// For Dialogflow Agent only //
///////////////////////////////

async function agent_lumo(agent){
    var param_n = 9;
    if(agent.parameters.number) param_n = agent.parameters.number;
    console.log(JSON.stringify(agent));
    agent.add(await bq_lumo_topn(param_n));
}


async function agent_bqstatus(agent){
    var dtname = "QR01";
    if(agent.parameters['bigqurey-dtname']) dtname = agent.parameters['bigqurey-dtname'].toUpperCase();
    console.log(JSON.stringify(agent));
    agent.add(await bq_status(dtname));
}



module.exports = {agent_bqstatus, agent_lumo};