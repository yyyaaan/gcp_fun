// load individual function modules
const {send_hermes} = require('./src_hermes.js');
const {send_lumo} = require('./src_lumo.js');
const {send_bbcsports} = require('./src_bbcsports.js');

// set proper schedule in UTC time zone
var schedule_lumo = [6,11,15];
var schedule_hermes = [18];
var schedule_bbcsports = [7];
var cur_utc = (new Date(Date.now())).getUTCHours();
var cur_tzh  = (new Date(Date.now())).getHours();
var tref = 1601164800000;
var tunit= 3600 * 1000;
var cur_hour = Math.floor((Date.now() - tref) % (24 * tunit) / tunit);

exports.main = (async(req, res) => {
    var info = `UTC${cur_utc}hr SYS${cur_tzh}hr CAL${cur_hour}hr`;
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
