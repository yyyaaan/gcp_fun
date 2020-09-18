// load individual function modules
const {send_hermes} = require('./src_hermes.js');
const {send_lumo} = require('./src_lumo.js');
const {send_skysports} = require('./src_skysports.js');

// set proper schedule in UTC time zone
const cur_hour = (new Date(Date.now())).getUTCHours();
const schedule_lumo = [6,10,14];
const schedule_hermes = [18];
const schedule_skysports = [7];

exports.main = (async(request, response) => {
    if(schedule_lumo.includes(cur_hour)) send_lumo(false);
    if(schedule_hermes.includes(cur_hour)) send_hermes();
    if(schedule_skysports.includes(cur_hour)) send_skysports();
});