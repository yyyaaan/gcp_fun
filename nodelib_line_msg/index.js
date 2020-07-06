const line = require('@line/bot-sdk');
const client = new line.Client({
  channelAccessToken: '/D6B+5TCvORkRjXa5Ae2lXu9msGgLKwXFjdkDcDxI42pm5sc6JqxXKDCGZVeOb1Q6b7pYv03I2lGMayQ2dTS6rWVoAgvlWQwuADIp0hAtxjDh83B9mCWpjwmbAWx1sKR3+GQa+KrAsmxcNZs84U/8QdB04t89/1O/w1cDnyilFU='
}); // https://line.github.io/line-bot-sdk-nodejs/#getting-started


exports.main = (async (req, res) => {
    var msg = req.query.msg;
    if (!msg) msg = "test message sent from NodeJS";
	const message = {type: 'text', text: msg};
        
    try{
        client.broadcast(message)
    } catch(err){
        console.log(err.toString())
        res.status(500).send(err.toString())
    }

    res.status(200).send(`Message sent`);
});


function send_to_line(msg) {
    const message = {type: 'text', text: msg};
        
    try{
        client.broadcast(message)
    } catch(err){
        console.log(err.toString())
    }
}

send_to_line("test message sent from NodeJS");
