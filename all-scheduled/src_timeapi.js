const axios = require('axios');

async function getHourAPI() {
  try {
    const response = await axios.get('http://worldtimeapi.org/api/timezone/Europe/Helsinki');
    //console.log(response.data);
    let the_hour = response.data.datetime.substring(11,13);
    return parseInt(the_hour); 
  } catch (error) {
    console.error(error);
    return 0;
  }
}

async function tester(){
    a = await getHourAPI();
    console.log(a + 1);
}

module.exports = {getHourAPI};
