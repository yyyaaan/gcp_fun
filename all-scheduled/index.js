// load individual function modules
const {send_hermes} = require('./src_hermes.js');
const {send_lumo} = require('./src_lumo.js');
const {send_skysports} = require('./src_skysports.js');

// set proper schedule in UTC time zone
const cur_hour = (new Date(Date.now())).getUTCHours();
const schedule_lumo = [6,11,15];
const schedule_hermes = [18];
const schedule_skysports = [7];

exports.main = (async(req, res) => {
    var info = `UTC${cur_hour}hr`;
    if(schedule_lumo.includes(cur_hour)){
        await send_lumo(false);
        info += ' LUMO';
    } 
    if(schedule_hermes.includes(cur_hour)){
        await send_hermes();
        info += ' HERMES';
    }
    if(schedule_skysports.includes(cur_hour)){
        await send_skysports();
        info += ' SKYSPORTS';
    } 

    console.log(info);
    res.status(200).send("completed " + info);
});