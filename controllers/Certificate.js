const express = require('express');

// const pool = require('../helpers/Db')
const router = express.Router();
const { uuid } = require('uuidv4');
const transporter = require('../helpers/Mailer');
const date = require('date-and-time');

const { pool } = require('../helpers/Db');

//create certificate for user who has completed all course requirements
router.post('/generateCertificate',(req,res) => {
    try {
        req.body.id = uuid().replace('-', '');
       
        pool.get_connection(qb => {
    
            qb.insert('tbl_certificate' , req.body , async (err) => {
    
                qb.release()
    
                if (err) return res.send({ status: false, message: err.message });
    
                res.send({ status: true, message: { id: req.body.id } });
    
                let subject = `Congragulation ${req.body.studentName} 
                              on completing ${req.body.courseName} course`;

                let message = `To view and collect head over to ___ and click the generate certificate button `;

                try {

                    const mailData = {
                        from: 'surafel@360ground.com',
                        to: req.body.email,
                        subject: subject,
                        text: message,
                    };
                
                    transporter.sendMail(mailData, function (err, info) {
                        if(err){
                            res.status(200).send({ status: false, message: err.message});
                
                        } else {
                            res.status(200).send({ status: true, message: 'success'});
                        }   
                    });

                } catch(error){
                    res.status(200).send(
                        { 
                            status: false, message: error.message 
                        }
                    );
                }                    
            })
        })
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
    
})

router.get('/viewCertificate/:id', async (req,res) => {
    try {

        pool.get_connection(qb  => {
            qb.select('*')
                .where('id', req.params.id)
                .get('tbl_certificate', async (err, response) => {
                    qb.release();
                    if (err) return res.send({ status: false, message: err.sqlMessage });
    
                    response = await response[0];
                    response.createdAt = date.format(response.createdAt, 'YYYY/MM/DD HH:mm:ss');
                    
                    return res.render('certificate.ejs',response);

                });
        })

    } catch(err){
        return res.status(200).send({ status: false, message: err.message });
    }
    
})

router.delete('/deleteCertificate/:id', async (req,res) => {
    try {
        pool.get_connection(qb => {
            qb.delete('tbl_certificate',{ id: req.params.id }, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: 'certificate deleted successfully.' });
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
})

//returns a list of all completed courses certificates
//this list can be presented to show the number of courses completed by the user
router.get('/getAllCertificates/:userId',async (req,res) => {
    try {

        pool.get_connection(qb  => {
        qb.select('*')
            .where('studentId', req.params.userId)
            .get('tbl_certificate', (err, response) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                
                return res.send({status:true,message:response})
            })
        })
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
})

module.exports = router;