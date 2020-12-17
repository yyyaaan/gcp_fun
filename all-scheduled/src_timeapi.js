const axios = require('axios');

async function getHourAPI() {
  try {
    // API Option 1 (new)
    const response = await axios.get('http://worldclockapi.com/api/json/eest/now');
    let the_hour = response.data.currentDateTime.substring(11,13);
    return parseInt(the_hour); 
  } catch (error) {
      try {
        // API Option 2
        const response = await axios.get('http://worldtimeapi.org/api/timezone/Europe/Helsinki');
        let the_hour = response.data.datetime.substring(11,13);
        return parseInt(the_hour); 
      } catch(error) {
          console.log("Failed to get time: both api failed")
          return 0;
      }
  }
}

async function tester(){
   a = await getHourAPI();
   console.log(a + 1);
}

module.exports = {getHourAPI};

