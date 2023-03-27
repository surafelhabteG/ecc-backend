const express = require('express');

// const pool = require('../helpers/Db')
const router = express.Router();
const { uuid } = require('uuidv4');
const transporter = require('../helpers/Mailer');
const date = require('date-and-time');
const moment = require("moment");


const { pool } = require('../helpers/Db');


/**
 * @api {post} /generateCertificate Create Certificate
 * @apiName Create Certificate
 * @apiGroup Certificate
 *
 * @apiParam {String} studentName Student's name.
 * @apiParam {String} email Student's email.
 * @apiParam {String} courseId ID of the completed course.
 * @apiParam {String} courseName Name of the completed course.
 * @apiParam {Date} courseStartDate Date when the course was started.
 * @apiParam {Date} courseEndDate Date when the course was completed.
 *
 * @apiSuccess {Object} response Response object.
 * @apiSuccess {Boolean} response.status Status of the response (true or false).
 * @apiSuccess {Object} response.message Message object containing the generated ID of the created certificate.
 * @apiSuccess {String} response.message.id Generated ID of the created certificate.
 */


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

/**
 * @api {post} /updateCertificate Update certificate
 * @apiName UpdateCertificate
 * @apiGroup Certificate
 * 
 * @apiParam {Object} req.body Certificate data to be updated

 * @apiSuccess {Object} message The ID of the updated certificate
 * @apiError {Object} error Error object containing error message

 */
router.post('/updateCertificate',(req,res) => {
    try {
       
        pool.get_connection(qb => {
            qb.update('tbl_certificate' , req.body, { id: req.body.id } , async (err) => {
                qb.release()
                
                if (err) return res.send({ status: false, message: err.message });
                res.send({ status: true, message: { id: req.body.id } });                    
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

                    response.coureseStartDate = moment(response.coureseStartDate).format('ll');
                    response.coureseEndDate = moment(response.coureseEndDate).format('ll');

                    return await res.render('certificate.ejs',response);
                    // return res.status(200).send({ status: true, message: response });
                });
        })

    } catch(err){
        return res.status(200).send({ status: false, message: err.message });
    }
    
})


/**
 * @api {post} /verifayCertificate Verify Certificate
 * @apiName VerifyCertificate
 * @apiGroup Certificate
 *
 * @apiParam {String} code Certificate ID to be verified.
 *
 * @apiSuccess {Object} message Object containing the verified certificate details.
 * @apiSuccess {Number} message.id Certificate ID.
 * @apiSuccess {String} message.name Name of the person who received the certificate.
 * @apiSuccess {String} message.courseName Name of the course for which the certificate was issued.
 * @apiSuccess {String} message.createdAt Date when the certificate was issued (formatted as 'MMM D, YYYY').
 * @apiError {Object} message Error message.

 */


router.post('/verifayCertificate', async (req,res) => {
    try {

        pool.get_connection(qb  => {
            qb.select('*')
                .where('id', req.body.code)
                .get('tbl_certificate', async (err, response) => {
                    qb.release();
                    if (err) return res.send({ status: false, message: err.sqlMessage });
    
                    response = await response[0];

                    if(response) {
                        response.createdAt = moment(response.createdAt).format('ll');

                        return res.status(200).send({ status: true, message: response });

                    } else {
                        return res.status(200).send({ status: false, message: `Not verified` });

                    }

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