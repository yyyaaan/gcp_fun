req = {
   "events":[
      {
         "type":"message",
         "replyToken":"b0fccbb6fe1949539ec2994d8df02d38",
         "source":{
            "userId":"U4de6a435823ee64a0b9254783921216a",
            "type":"user"
         },
         "timestamp":1594063078743,
         "mode":"active",
         "message":{
            "type":"text",
            "id":"12272914580564",
            "text":"Hello Google cloud"
         }
      }
   ],
   "destination":"Uce2bad78ad5c947be21bbb1924854173"
};

const linereq = req.events[0];
const linemsg = linereq.message;
const linetkn = linereq.replyToken;
const linetxt = linemsg.text;

console.log("We recieved your message \"" + linetxt + "\" with token", linetkn);
