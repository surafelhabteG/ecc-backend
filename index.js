const app = require('express')();
const express = require('express');
const morgan = require('morgan');
const { uuid } = require('uuidv4');
const axios = require("axios").create({baseUrl: ""});

const Jimp = require("jimp");
const base64 = require('node-base64-image');

const cors = require('cors');
const request = require('request');
const QueryBuilder = require('node-querybuilder');
const bodyParser = require('body-parser')
const httpServer = require('http').createServer(app);
const path = require('path')

const staticPath = path.join(__dirname,'static')
app.use(express.static(staticPath))

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


let userName = 'bisratdev@outlook.com'
const transporter2 = nodemailer.createTransport({
    service : 'hotmail',
    auth : {
        user : userName,
        pass : 'Dever123'
    }
  });

const redis = require('redis');

const date = require('date-and-time');

let redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
})();

app.use(morgan('dev'));

app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

const connection = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecc'
};
const canvasAPI = require('node-canvas-api')
const port = process.env.PORT || 4000;
const pool = new QueryBuilder(connection, 'mysql', 'pool');

require('dotenv').config();
const fs = require("fs")

const requestPromise = require('request-promise');





app.get('/', (req, res) => {
    res.status(200).send('welcome to Ecc Express Api App');

});



// convert base64 string into actual file.
async function convertBase64ToImage(data, fileName, directory = 'ids') {
    var url = `${staticPath}/uploads/${directory}/`;
    data = data.split("base64,");

    if (data[0].includes('data:image')) {
        try {

            if (!fs.existsSync(url)) {
                fs.mkdirSync(url, { recursive: true });   
            } 

            const buffer = Buffer.from(data[1], "base64");
            let result = await base64.decode(buffer, { fname: `${url}${fileName}`, ext: 'jpeg' });

            if(result == 'file written successfully to disk'){

                Jimp.read(`${url}${fileName}.jpeg`)
                .then(image => {
                    return image.quality(40).write(`${url}${fileName}.jpeg`);
                    
                }).catch(err => {
                    return {
                        status: false, message: err.message
                    };
                });
            }
        } catch(err) {
            return {
                status: false, message: err.message
            }
        }
    } else {
        return {
            status: false, message: 'Only image is allowed to upload. please try again.'
        }
    }
}

async function updatePaymentSideeffect(data){
    try {
        pool.get_connection(qb => {
            qb.update('tbl_payment_sideeffect', data, { id: data.id }, (err) => {
                qb.release();
                if (err) return { status: false, message: err.message };
                return { status: true, message: 'success.' };
            });
        });

    } catch(err){
        return { status: false, message: err.message };
    }
}

async function deletePaymentSideeffect(id){
    try {
        
        pool.get_connection(qb => {
            qb.delete('tbl_payment_sideeffect',{ id: id }, (err) => {
                qb.release();
                if (err) return { status: false, message: err };
                return { status: true, message: 'data deleted successfully.' };
            });
        });

    } catch(err){
        return { status: false, message: err.message };
    }
}

// Course and other related
app.get('/getAllCourses', async (req, res) => {
    try {

        const cacheResults = await redisClient.get('courses');

        if (cacheResults) {
            res.status(200).send(JSON.parse(cacheResults));

        } else {
            canvasAPI.getAllCoursesInAccount(2).then( async (response) => { 
                if(response.length){
                    await redisClient.set('courses', JSON.stringify(response), {
                        EX: 300,
                        NX: true,
                    });
                }

                res.status(200).send(response);
  
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
        }
    } catch (err) {
        res.status(200).send({
            status: false,
            message: err
        })
    }
});

app.get('/getAllModules/:courseId', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(`modules/${req.params.courseId}`);

        if (cacheResults) {
            res.status(200).send(JSON.parse(cacheResults));

        } else {
            canvasAPI.getModules(req.params.courseId).then(async (response) => {
                await redisClient.set(`modules/${req.params.courseId}`, JSON.stringify(response), {
                    EX: 300,
                    NX: true,
                  });
                res.status(200).send(response);
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
        }
    } catch (err) {
        res.status(200).send({
            status: false,
            message: err
        })
    }
});

app.get('/getCourseExtraInfo/:courseId', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(`courseExtraInfo/${req.params.courseId}`);

        if (cacheResults) {
            res.status(200).send(JSON.parse(cacheResults));

        } else {

            canvasAPI.getCourseFile(req.params.courseId).then((response) => {
                let file = response.find((element) => element.display_name == "extraInfo.json");
        
                request.get(file.url, async function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        await redisClient.set(`courseExtraInfo/${req.params.courseId}`, body, {
                            EX: 300,
                            NX: true,
                          });
                        res.status(200).send(JSON.parse(body));
                    }
                });
        
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
        }

    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }
});


// Payment and sideEffect
app.post('/createPaymentReference', async (req, res) => {
    try {

          const requestOption = {
            'method': 'POST',
            'uri': `${process.env.MEDA_PAY_URL}`,
            'body': JSON.stringify(req.body.data),
            'headers': {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MEDA_PAY_TOKEN}`
            }
          };
    
          requestPromise(requestOption)
          .then(async function (response) {
            response = JSON.parse(response);
    
            let data = {
                billReferenceNumber: response.billReferenceNumber,
                id: req.body.data.metaData.paymentId,
            };
            
            if (response.status == 'created') {
                updatePaymentSideeffect(data);
                res.status(200).send({ status: true, message: response });
    
            } else {
                let result = deletePaymentSideeffect(req.body.data.metaData.paymentId);

                res.status(200).send({ 
                    status: result.status, 
                    message: 'unable to process the payment now. please try again later.' 
                });
            }        
        })
        .catch(function (error) {
            let err = JSON.parse(error.error);
    
            res.status(200).send({ 
                status: false, 
                message: err.message
            });
        });

    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }

});

app.post('/paymentSuccessCallBack', async (req, res) => {    
    try {

        let payload = {
            id: req.body.metaData.metaData.paymentId,
            billReferenceNumber: req.body.referenceNumber,
            paymentMethod: req.body.paymentMethod,
            status: req.body.status
        };
        
        if (req.body.status == 'PAYED') {
            updatePaymentSideeffect(payload);
            res.status(200).send({ status: true, message: req.body });
    
        } else {
            let result = deletePaymentSideeffect(req.body.metaData.metaData.paymentId);

            res.status(200).send({ 
                status: result.status, 
                message: 'unable to process the payment now. please try again later.' 
            });
        }

    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }

});



app.get('/verifayPayment/:billReferenceNumber/:paymentId', (req, res) => {
    const requestOption = {
        'method': 'POST',
        'uri':`${process.env.MEDA_PAY_URL}/${req.params.billReferenceNumber}`,
        'headers': {
           'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MEDA_PAY_TOKEN}`
        }
    };

      requestPromise(requestOption)
      .then(function (response) {
        response = JSON.parse(response);

        if (response.status == 'completed') {
            let data = {
                status: response.status,
                id: req.params.paymentId,
            };

            updatePaymentSideeffect(data);

            res.status(200).send({
                status: true, message: 'success'
            });

        } else {
          let message = 
            'payment is not complete. whether you are not pay successfully or something happen. tray again.'
          
            res.status(200).send({ 
                status: false, 
                message: message 
            });        
        }        
    })
    .catch(function (error) {
        res.status(200).send({ 
            status: false, 
            message: error.message 
        });
    });
});

app.get('/getPaymentSideeffectById/:paymentId', (req, res) => {
    try {
        
        pool.get_connection(qb => {
            qb.select('*')
                .where('id', req.params.paymentId)
                .get('tbl_payment_sideeffect', (err, response) => {
                    qb.release();
                    if (err) return res.send({ status: false, message: err.sqlMessage });
                    res.send(response);
                });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

app.post('/checkPaymnetSettlement', (req, res) => {
    try {
        
        pool.get_connection(qb => {
            qb.select('*')
                .where('studentId', req.body.studentId)
                .where('courseId', req.body.courseId)
                .where('status', 'PAYED')

                .get('tbl_payment_sideeffect', (err, response) => {
                    qb.release();
                    if (err) return res.send({ status: false, message: err.sqlMessage });
                    res.status(200).send({ status: true, message: response });
                });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

app.post('/createPaymentSideeffect', (req, res) => {
    req.body.id = uuid().replace('-', '');

    try {
    
        pool.get_connection(qb => {
            qb.insert('tbl_payment_sideeffect', req.body, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: { id: req.body.id } });
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

app.post('/updatePaymentSideeffect', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.update('tbl_payment_sideeffect', req.body, { id: req.body.id }, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: 'success.' });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});


// Enrollment
app.post('/selfEnroll/:course_id', (req, res) => {
    canvasAPI.createUserCourseEnrollment(req.params.course_id, req.body).then(
        () => res.send({ status: true, message: 'Course is Added to Your Learning Plan.' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.delete('/selfUnEnroll/:course_id/:enrollment_id', (req, res) => {
    canvasAPI.deleteUserCourseEnrollment(req.params.course_id, req.params.enrollment_id).then(
        () => res.send({ status: true, message: 'Course Is Removed From Learning Plan.' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.get('/getAllEnrolledCourses/:userId', (req, res) => {
    canvasAPI.getCoursesByUser(req.params.userId).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.get('/getUserEnrollment/:userId', (req, res) => {
    canvasAPI.getUserEnrollment(req.params.userId).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

// enrollment request
app.post('/createEnrollmentRequest', async (req, res) => {
    try {

        req.body.id = uuid().replace('-', '');
    
        let uploadresult = await convertBase64ToImage(req.body.traineelist, 'traineelist',`requests/${req.body.id}`);
    
        if(uploadresult == undefined){
            uploadresult = await convertBase64ToImage(req.body.bankSlip, 'bankSlip', `requests/${req.body.id}`);
        }
    
        delete req.body.traineelist;
        delete req.body.bankSlip;

        if(uploadresult == undefined){
            pool.get_connection(qb => {
                qb.insert('tbl_enrollment_request', req.body, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err });
                    res.send({ status: true, message: 'request created successfully.' });
                });
            });
    
        } else {
            res.status(200).send(uploadresult);
        }
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }

});

app.post('/updateEnrollmentRequest', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.update('tbl_enrollment_request', req.body, { id: req.body.id }, (err) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err });
                res.send({ status: true, message: 'request updated successfully.' });
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

app.get('/getAllEnrollmentRequest', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select('*')
            .get('tbl_enrollment_request', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

app.get('/getDetailEnrollmentRequest/:id', (req, res) => {
    try {

        pool.get_connection(qb => {
            qb.select('*')
            .where('id', req.params.id)
                .get('tbl_enrollment_request', (err, response) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                    res.status(200).send({ status: true, message: response });
                });
        });
    
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

app.get('/deleteEnrollmentRequest/:id', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.delete('tbl_enrollment_request',{ id: id }, (err) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err });
                res.status(200).send({ status: true, message: 'data deleted successfully.' });
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

app.get('/getMyEnrollmentRequest/:institution_id', (req, res) => {
    try {

        pool.get_connection(qb => {
            qb.select('*')
            .where('institution_id', req.params.institution_id)
                .get('tbl_enrollment_request', (err, response) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                    res.status(200).send({ status: true, message: response });
                });
        });
    
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});



// User Authntication and other
app.post('/isLoggedIn', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(`auth/${req.body.access_token}`);

        if (cacheResults) {
            res.status(200).send({ status: true, message: JSON.parse(cacheResults) });

        } else {
            res.status(200).send({ status: false, message: {}});
        }
    } catch (err) {
        res.status(200).send({
            status: false,
            message: err
        })
    }
});

app.post('/register', async (req, res) => {
    var body = req.body;

    var custom_data = body.custom_data;
    var memberId = body.memberId;

    delete body.custom_data;
    delete body.memberId;

    canvasAPI.searchUser(`sis_login_id:${body.pseudonym.unique_id}`).then((response) => {
        if ('login_id' in response) {
            res.status(200).send(
                { status: false, message: ['email address already exist. please try using another one.'] }
            );
        }
    }).catch((errors) => {
        if (errors.statusCode == 404) {
            canvasAPI.createUser(body).then((response) => {
                var message = "Success";

                if (response) {
                    let url = `/users/${response.id}/custom_data/profile?ns=extraInfo`;
                    var id = response.id;

                    canvasAPI.storeCustomData(url, custom_data).then((response) => {
                        if (response) {

                            var result = { status: true };

                            if (memberId) {
                                result = convertBase64ToImage(memberId, id);
                                !result.status ? message = 'register successfully, but unable to upload file.' : null;
                            }

                            res.status(200).send({ status: true, message: message });

                        } else {
                            res.status(200).send({ status: false, message: ['Unable to register this user. please try again'] });
                        }

                    }).catch((errors) => {
                        res.status(200).send({
                            status: false,
                            message: errors.message
                        })
                    });
                } else {
                    res.status(200).send({ status: false, message: ['Unable to register this user. please try again'] });
                }
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
        }
    });
});

app.post('/login', async (req, res) => {
    try {

        canvasAPI.getToken(req.body).then((response) => {
            let access_token = {
                access_token: response.access_token
            };
    
            canvasAPI.getSelf(response.user.id).then(async (response) => {
                response = { ...response, ...access_token };
    
                if(response.sis_user_id == 'admin'){
                    await redisClient.set(`auth/${response.access_token}`, JSON.stringify(response), {
                        EX: 3600,
                        NX: true,
                      });
                    res.status(200).send({
                        status: true,
                        message: response
                    });
                } else {
                    canvasAPI.getUserCustomData(response.id).then(async (customData) => {
                        let data = { ...response, ...{ profile: customData.data }};

                        // check & add member Id if it's exist
                        let url = `${staticPath}/uploads/ids/${response.id}.jpeg`;

                        if (fs.existsSync(url)) { 
                            data.profile.memberId = `/uploads/ids/${response.id}.jpeg`;

                        } else {
                            data.profile.memberId = null;

                        }

                        await redisClient.set(`auth/${data.access_token}`, JSON.stringify(data), {
                            EX: 300,
                            NX: true,
                          });

                        res.status(200).send({
                            status: true,
                            message: data
                        });
    
                    }).catch((err) => {
                        res.status(200).send({
                            status: false,
                            message: err.message
                        })
                    });
                }
            }).catch((err) => {
                res.status(200).send({
                    status: false,
                    message: err.message
                })
            });
    
        }).catch((err) => {
            res.status(200).send({
                status: false,
                message: err.message
            })
        });

    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }




   
});

app.post('/updateProfile/:userId', (req, res) => {
    var url = `/users/${req.params.userId}/custom_data/profile?ns=extraInfo`;
    var message = "profile updated successfully. relogin to get updated data.";
    var custom_data = req.body.custom_data;

    canvasAPI.storeCustomData(url, custom_data).then((response) => {
        if (response) {

            var result = { status: true };

            if (req.body.memberId !== null) {
                result = convertBase64ToImage(req.body.memberId, req.params.userId);
                !result.status ? message = `${message}, but unable to upload file.` : null;
            }

            res.status(200).send({ status: true, message: message });

        } else {
            res.status(200).send({ status: false, message: 'fail to update the profile.' });
        }

    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.post('/saveMyEducation/:userId', (req, res) => {
    let url = `/users/${req.params.userId}/custom_data/profile?ns=extraInfo`;

    canvasAPI.storeCustomData(url, req.body.custom_data).then((response) => {
        if (response) {
            res.status(200).send({ status: true, message: 'education updated successfully. relogin to get updated data.' });

        } else {
            res.status(200).send({ status: false, message: 'fail to update the education.' });
        }

    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.get('/searchUser/:criteria', (req, res) => {
    canvasAPI.searchUser(req.params.criteria).then((response) => {
        if ('login_id' in response) {
            res.status(200).send({ status: true, message: response });

        } else {
            res.status(200).send({ status: false, message: null });
        }

    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.delete('/logout/:user_id/:access_token', async (req, res) => {
    try {

        canvasAPI.terminateUserSession(req.params.user_id).then(async (response) => {
            if (response == 'ok') {
                const result = await redisClient.del(`auth/${req.params.access_token}`);

                if(result){
                    res.send({ status: true, message: 'success' })

                } else {
                    res.send({ status: false, message: 'unable to logout the user Redis. try again.' })
                }

            } else {
                res.send({ status: false, message: 'unable to logout the user. try again.' })
            }
        }).catch((errors) => {
            res.status(200).send({
                status: false,
                message: errors.message
            })
        });

    } catch (err) {
        res.status(200).send({
            status: false,
            message: err
        })
    }
});


// contact us

app.post('/contactUs', async (req, res) => {
    const mailData = {
        from: req.body.email,
        to: 'surafel@360ground.com',
        subject: `contactus message from ${req.body.fullName}, phone number : ${req.body.phoneNumber}`,
        text: req.body.message,

    };
    transporter.sendMail(mailData, function (err, info) {
        if(err){
            res.status(200).send({
              status: false, message: err.message
            });
        } else {
            res.status(200).send({
                status: true, message: info
            });
        }   
     });
});



//create certificate for user who has completed all course requirements
//this is the certificate table name


app.post('/generateCertificate',(req,res) => {
    try {
        req.body.id = uuid().replace('-', '');
       
        pool.get_connection(qb => {
    
            qb.insert('tbl_certificate' , req.body , err => {
    
                qb.release()
    
                if (err) return res.send({ status: false, message: err });
    
                res.send({ status: true, message: { id: req.body.id } });
    
                const mailData = {
                    from: 'surafel@360ground.com',
                    to: req.body.email,
                    subject: `Congragulation ${req.body.studentName} on completing ${req.body.courseName} course`,
                    text: `To view and collect head over to ___ and click the generate certificate button `,
                };
    
                transporter.sendMail(mailData, function (err, info) {
                    if(err){
    
                    } else {
                
                    }   
                 });
            })
        })
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
    
})

app.get('/viewCertificate/:id', async (req,res) => {
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

app.delete('/deleteCertificate/:id', async (req,res) => {
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


//returns a list of all completed courses
//this list can be presented to show the number of courses completed by the user
app.get('/getAllCertificates/:userId',async (req,res) => {
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

// general file delete endpoint

app.post('/deleteFiles', (req, res) => {
    try {

        if (fs.existsSync(`${staticPath}${req.body.url}`)) {

            fs.unlinkSync(`${staticPath}${req.body.url}`);

            res.status(200).send({
                status: true, 
                message: `file deleted successfully. please re-login to complete the operation`
            });

        } else {
            res.status(200).send({ status: false, message: 'file does not exist.' });
        }

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }

});

httpServer.listen(port, () => console.log(`listening on port ${port}`));