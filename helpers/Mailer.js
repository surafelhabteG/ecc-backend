var nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    port: 465,          
    host: "smtp.gmail.com",
       auth: {
            user: 'surafel@360ground.com',
            pass: 'Abcd@5304',
         },
    secure: true,
});

const send = async (to, subject, text, from = 'surafel@360ground.com')=> {        
    const mailData = {
        from: from,
        to: to,
        subject: subject,
        text: text,
    };

    let result  = await transporter.sendMail(mailData, async function (err, info) {
        if(err){
            return await { status: false, message: err.message}

        } else {
            return await { status: true, message: 'success'}
        }   
    });

}

module.exports = transporter;