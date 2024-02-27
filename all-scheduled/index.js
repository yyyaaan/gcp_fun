const { getHourAPI } = require('./src_timeapi.js');
// const { send_hermes } = require('./src_hermes.js');
const { send_lumo } = require('./src_lumo.js');
const { send_bbcsports } = require('./src_bbcsports.js');
const { send_hokelanto } = require('./src_hokelanto.js');

// set proper schedule in HELSINKI time zone (999 to skip)
let schedule_lumo = [9,14,18];
let schedule_hermes = [999];
let schedule_bbcsports = [10];
let schedule_hokelanto = [999];

exports.main = (async(req, res) => {
    let cur_hour = await getHourAPI();
    cur_hour = req.body ? parseInt(req.body.hour) : cur_hour;
    let info = `Time${cur_hour}hr`;

    if(schedule_hokelanto.includes(cur_hour)){
        await send_hokelanto();
        info += ' HOKELANTO';
    } 
    if(schedule_lumo.includes(cur_hour)){
        await send_lumo(false);
        info += ' LUMO';
    } 
    if(schedule_hermes.includes(cur_hour)){
        // await send_hermes();
        info += ' HERMES not ready';
    }
    if(schedule_bbcsports.includes(cur_hour)){
        await send_bbcsports();
        info += ' BBCSPORTS+HOKELANTO';
    } 

    console.log(info);
    res.status(200).send("completed " + info);
});