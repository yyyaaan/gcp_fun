const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery(); // 
const max_bubbles = 8;


function prettify(bqrows){
    const regex = /[\[\{\}\]"]|(tss..)|(value..)|(apt..)/g;
    const dttxt = JSON.stringify(bqrows).replace(/\},\{/g, '\n').replace(regex, '').replace(/--/g, '\n');
    return dttxt;
}


////////////////////////////////////////////
// handle dataset status (STATUS dataset) //
////////////////////////////////////////////
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


////////////////////////////////////////////
// handle top lumo results in bq (LUMO N) //
////////////////////////////////////////////
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


module.exports = {bq_status, bq_lumo_topn};