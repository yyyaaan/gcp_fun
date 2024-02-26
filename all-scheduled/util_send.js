const axios = require('axios');
const sgMail = require('@sendgrid/mail')
const audienceList = ["+358 44 9199857", "+358 41 3695423"]
const audienceEmails = ["yan@yan.fi", "lixiaoyuan23@gmail.com"]

function send_emails(subject, text, html) {
    const payload = {
        to: audienceEmails,
        from: 'BotYYY@yan.fi',
        subject: subject,
        text: text,
        html: html,
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    sgMail
        .send(payload)
        .then(() => { console.log('Email sent') })
        .catch((error) => { console.error(error) })
}

function send_whatsapp(text_content) {
    for (let audience of audienceList) {
        const postData = {
            messaging_product: "whatsapp", 
            recipient_type: "individual",
            to: audience, 
            type: "text", 
            text: { body: text_content }
        }

        const postHeaders = {
            headers: { 'Authorization': `Bearer ${process.env.whatsappTest}`}
        }

        axios
            .post('https://graph.facebook.com/v18.0/217957681407032/messages', postData, postHeaders)
            .then((response) => { console.log('Status:', response.status, response.data); })
            .catch((error) => { console.error('Error:', error.message); });
    }
}

module.exports = { send_whatsapp, send_emails };
