const app = require('express')();
const express = require('express');
const morgan = require('morgan');
const { uuid } = require('uuidv4');

const Jimp = require("jimp");
const base64 = require('node-base64-image');

const cors = require('cors');
const request = require('request');
const QueryBuilder = require('node-querybuilder');
const bodyParser = require('body-parser')
const httpServer = require('http').createServer(app);

const redis = require('redis');
const client = redis.createClient(process.env.redisPort, process.env.redisHost);

app.use(morgan('dev'));
app.use(express.static('public'));
app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

const connection = {
    host: 'localhost',
    user: 'root',
    password: 'Abcd@5304',
    database: 'ecc'
};
const canvasAPI = require('node-canvas-api')
const port = process.env.PORT || 4000;
const pool = new QueryBuilder(connection, 'mysql', 'pool');

require('dotenv').config();

// convert base64 string into actual file.
async function convertBase64ToImage(data, fileName) {
    const url = `./public/uploads/ids/${fileName}`;
    data = data.split("base64,");

    if (data[0].includes('data:image')) {
        const buffer = Buffer.from(data[1], "base64");
        await base64.decode(buffer, { fname: url, ext: 'jpeg' });

        Jimp.read(`${url}.jpeg`, async (err, image) => {
            if (err) {
                return {
                    status: false, message: err
                };
            } else {
                await image.quality(40).write(`${url}.jpeg`);
                return true;
            }
        });

    } else {
        return {
            status: false, message: 'Only image is allowed to upload. please try again.'
        }
    }
}

async function updatePaymentSideeffect(data){
    pool.get_connection(qb => {
        qb.update('tbl_payment_sideeffect', data, { id: data.id }, (err) => {
            qb.release();
            if (err) return res.send({ status: false, message: err });
            res.send({ status: true, message: 'data updated successfully.' });
        });
    });
}

async function deletePaymentSideeffect(id){
    pool.get_connection(qb => {
        qb.delete('tbl_payment_sideeffect',{ id: id }, (err) => {
            qb.release();
            if (err) return res.send({ status: false, message: err });
            res.send({ status: true, message: 'data deleted successfully.' });
        });
    });
}

// Course and other related
app.get('/getAllCourses', (req, res) => {
    try {

        client.get('users', (err, data) => {
    
          if (err) {
            res.status(200).send({ status: false, message: err })
            throw err;
          }
    
          if (data) {
            res.status(200).send(JSON.parse(data));
          } else {
            canvasAPI.getAllCoursesInAccount(2).then((response) => { 
              client.setEx('courses', 600, JSON.stringify(response));
              res.status(200).send(response);

            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
          }
        });
        
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/getAllModules/:courseId', (req, res) => {
    canvasAPI.getModules(req.params.courseId).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.get('/getCourseExtraInfo/:courseId', (req, res) => {
    canvasAPI.getCourseFile(req.params.courseId).then((response) => {
        let file = response.find((element) => element.display_name == "extraInfo.json");

        request.get(file.url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                res.send(JSON.parse(body));
            }
        });

    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});


// Payment and sideEffect
app.post('/createPaymentReference', (req, res) => {
    fetch(process.env.MEDA_PAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MEDA_PAY_TOKEN}`,
        },
        body: JSON.stringify(req.body.data)
    })
    .then((response) => response.json())
    .then((response) => {
        let data = {
            billReferenceNumber: response.billReferenceNumber,
            id: req.body.metaData.paymentId,
        };
        
        if (response.status == 'created') {
            updatePaymentSideeffect(data);
            res.status(200).send({ status: true, message: response });

        } else {
            deletePaymentSideeffect(req.body.metaData.paymentId);
            res.status(200).send({ 
                status: false, 
                message: 'unable to process the payment now. please try again later.' 
            });
        }
    })
    .catch((error) => {
        res.status(200).send({ 
            status: false, 
            message: error 
        });
    }); 
});

app.get('/verifayPayment/:billReferenceNumber/:paymentId', (req, res) => {
    let url = `${process.env.MEDA_PAY_URL}/${req.params.billReferenceNumber}`;

    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MEDA_PAY_TOKEN}`,
      },
    })
      .then((response) => response.json())
      .then((response) => {
        if (response.status == 'completed') {
            let data = {
                status: response.status,
                id: req.params.paymentId,
            };

            updatePaymentSideeffect(data);

            res.status(200).send({ 
                status: true, 
                message: 'success' 
            });

        } else {
          let message = 
            'payment is not complete. whether you are not pay successfully or something happen. tray again.'
          
            res.status(200).send({ 
                status: false, 
                message: message 
            });        
        }

      }).catch((error) => {
            res.status(200).send({ 
                status: false, 
                message: error 
            });
       });
});


app.get('/getPaymentSideeffectById/:paymentId', (req, res) => {
    pool.get_connection(qb => {
        qb.select('*')
            .where('id', req.params.paymentId)
            .get('tbl_payment_sideeffect', (err, response) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.msg });
                res.send(response);
            });
    });
});

app.post('/createPaymentSideeffect', (req, res) => {
    req.body.id = uuid().replace('-', '');

    pool.get_connection(qb => {
        qb.insert('tbl_payment_sideeffect', req.body, (err) => {
            qb.release();
            if (err) return res.send({ status: false, message: err });
            res.send({ status: true, message: { id: req.body.id } });
        });
    });
});

app.post('/updatePaymentSideeffect', (req, res) => {
    pool.get_connection(qb => {
        qb.update('tbl_payment_sideeffect', req.body, { id: req.body.id }, (err) => {
            qb.release();
            if (err) return res.send({ status: false, message: err });
            res.send({ status: true, message: 'data updated successfully.' });
        });
    });
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
    req.body.id = uuid().replace('-', '');

    pool.get_connection(qb => {
        qb.insert('tbl_enrollment_request', req.body, (err) => {
            qb.release();
            if (err) return res.status(200).send({ status: false, message: err });
            res.send({ status: true, message: 'request created successfully.' });
        });
    });
});

app.post('/updateEnrollmentRequest', (req, res) => {
    pool.get_connection(qb => {
        qb.update('tbl_enrollment_request', req.body, { id: req.body.id }, (err) => {
            qb.release();
            if (err) return res.status(200).send({ status: false, message: err });
            res.send({ status: true, message: 'request updated successfully.' });
        });
    });
});

app.get('/getAllEnrollmentRequest', (req, res) => {
    pool.get_connection(qb => {
        qb.select('*')
            .get('tbl_enrollment_request', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.msg });
                res.send(response);
            });
    });
});

app.get('/getDetailEnrollmentRequest/:id', (req, res) => {
    pool.get_connection(qb => {
        qb.select('*')
        .where('id', req.params.id)
            .get('tbl_enrollment_request', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.msg });
                res.send(response);
            });
    });
});

app.get('/deleteEnrollmentRequest/:id', (req, res) => {
    pool.get_connection(qb => {
        qb.delete('tbl_enrollment_request',{ id: id }, (err) => {
            qb.release();
            if (err) return res.status(200).send({ status: false, message: err });
            res.status(200).send({ status: true, message: 'data deleted successfully.' });
        });
    });
});




// User Authntication and other
app.post('/isLoggedIn', async (req, res) => {
    try {

        client.get('IPADDRESS', (err, data) => {
          if (err) {
            res.status(200).send({ status: false, message: err })
            throw err;
          }
    
          if (data) {
            res.status(200).send({ status: true, message: JSON.parse(data) });
          } else {
            res.status(200).send({ status: false, message: '' });
          }
        });
        
    } catch (err) {
        res.status(200).send({ error: err.message });
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

                            const result = { status: true };

                            if (memberId !== undefined) {
                                convertBase64ToImage(memberId, id);
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

app.post('/login', (req, res) => {
    canvasAPI.getToken(req.body).then((response) => {
        let access_token = {
            access_token: response.access_token
        };

        canvasAPI.getSelf(response.user.id).then((response) => {
            response = { ...response, ...access_token };

            if(response.sis_user_id == 'admin'){
                client.setEx('IPADDRESS', 600, JSON.stringify(response));

                res.status(200).send({
                    status: true,
                    message: response
                })
            } else {
                canvasAPI.getUserCustomData(response.id).then((customData) => {
                    let profile = { ...response, ...customData.data };
                    client.setEx('IPADDRESS', 600, JSON.stringify(profile));

                    res.send(profile)

                }).catch((errors) => {
                    res.status(200).send({
                        status: false,
                        message: errors.message
                    })
                });
            }
        }).catch((errors) => {
            res.status(200).send({
                status: false,
                message: errors.message
            })
        });

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

app.delete('/logout/:user_id/', (req, res) => {
    canvasAPI.terminateUserSession(req.params.user_id).then((response) => {
        if (response == 'ok') {
            res.send({ status: true, message: 'success' })
        } else {
            res.send({ status: false, message: 'unable to logout the user. try again.' })
        }
    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

httpServer.listen(port, () => console.log(`listening on port ${port}`));