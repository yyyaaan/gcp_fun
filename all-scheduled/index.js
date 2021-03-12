// load individual function modules
const {getHourAPI} = require('./src_timeapi.js');
const {send_hermes} = require('./src_hermes.js');
const {send_lumo} = require('./src_lumo.js');
const {send_bbcsports} = require('./src_bbcsports.js');

// set proper schedule in HELSINKI time zone (999 to skip)
let schedule_lumo = [9,14,18];
let schedule_hermes = [999];
let schedule_bbcsports = [10];

exports.main = (async(req, res) => {
    // get correct time from API
    let cur_hour = await getHourAPI();
    let info = `Time${cur_hour}hr`;

    if(schedule_lumo.includes(cur_hour)){
        await send_lumo(false);
        info += ' LUMO';
    } 
    if(schedule_hermes.includes(cur_hour)){
        await send_hermes();
        info += ' HERMES';
    }
    if(schedule_bbcsports.includes(cur_hour)){
        await send_bbcsports();
        info += ' BBCSPORTS';
    } 

    console.log(info);
    res.status(200).send("completed " + info);
});