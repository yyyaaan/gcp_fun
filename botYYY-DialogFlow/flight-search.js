const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery(); 

async function bq_flights(ddate, rdate, from, to, limit_n) {

    // all options are optional except for:
    if((!ddate)) return 'Departure date must be specified';
    console.log([ddate, rdate, from, to]);

    // build where-conditions (from to only needed in A -- due to inner join)
    var where_a = "", where_b = "", where_c = "";
    if(ddate) where_a += `and ddate = DATE("${ddate}")`;
    if(rdate) where_b += `and ddate = DATE("${rdate}") `;
    if(from) where_a += `and REGEXP_CONTAINS(route, r"(?i)${from}")`;
    if(to) where_a += `and REGEXP_CONTAINS(route, r"(?i)${to}")`;

    // any date mode for return
    if(!rdate){
        where_c = `and (b.rdate BETWEEN DATE_ADD(a.ddate, INTERVAL 11 DAY) 
                                    and DATE_ADD(a.ddate, INTERVAL 33 DAY))`;

    }

    query_a = `
        SELECT route, flight as outbound, ddate, eur as eur1, tss
        FROM Explore.QR01
        where inout="Outbound" ${where_a}
        and tss > DATE_SUB(CURRENT_DATE(), INTERVAL 4 DAY)
    `;

    query_b = `
        SELECT route, flight as inbound, ddate as rdate, eur as eur2, tss
        FROM Explore.QR01
        where inout="Inbound" ${where_b}
        and tss > DATE_SUB(CURRENT_DATE(), INTERVAL 4 DAY)
    `;

    query = `
        select a.route, outbound, inbound, 
               FORMAT_DATE("%d%b", ddate) as ddate, FORMAT_DATE("%d%b", rdate) as rdate, 
               concat("(" , ceiling(eur1), "+", ceiling(eur2), ")[", FORMAT_DATE("%d%b",  a.tss) , "]") as detail, 
               eur1 + eur2 as total 
        from (${query_a}) a inner join (${query_b}) b
        on a.route = b.route and a.tss = b.tss ${where_c}
        order by total limit ${limit_n}
    `;

    const [rows] = await bigquery.query({query: query});
    console.log(`Fetched ${rows.length} rows from BigQuery`);
    return rows.join('\n');
}



///////////////////////////////
// For Dialogflow Agent only //
///////////////////////////////

async function agent_flightbq(agent){
    var dtname = "QR01";
    var out = await bq_flights(
        agent.parameters['departure'], agent.parameters['return'], 
        agent.parameters['from'], agent.parameters['to'], 20
    );
    agent.add(out);
}



module.exports = {agent_flightbq};
