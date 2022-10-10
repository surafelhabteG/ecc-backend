const app = require('express')();
const express = require('express');

var cors = require('cors');
var request = require('request');
const mysql = require('mysql');
const QueryBuilder = require('node-querybuilder');

var bodyParser = require('body-parser')

const connection = {
    host: 'localhost',
    user: 'root',
    password: 'Abcd@5304',
    database: 'ecc'
};

const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
    cors: { origin: '*' }
});


// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.use(cors({ origin: '*' }));

const canvasAPI = require('node-canvas-api')

const refNo = [];

const sockets = [];

const port = process.env.PORT || 4000;

const pool = new QueryBuilder(connection, 'mysql', 'pool');

app.get('/getAllCourses', (req, res) => {
    canvasAPI.getAllCoursesInAccount(1).then(
        response => res.send(response)
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

app.post('/register', async (req, res) => {
    var body = req.body;
    var custom_data = body.custom_data;
    delete body.custom_data;

    canvasAPI.createUser(body).then((response) => {
        if (response) {
            let url = `/users/${response.id}/custom_data/profile?ns=extraInfo`;

            canvasAPI.storeCustomData(url, custom_data).then((response) => {
                if (response) {
                    res.status(200).send({ status: true, message: 'Success' });

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
});

app.post('/getToken', (req, res) => {
    canvasAPI.getToken(req.body).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.get('/getUserDetail/:userId', (req, res) => {
    canvasAPI.getSelf(req.params.userId).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.get('/getUserCustomData/:userId', (req, res) => {
    canvasAPI.getUserCustomData(req.params.userId).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
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

app.post('/createPaymentSideeffect', (req, res, next) => {
    pool.get_connection(qb => {
        qb.query('SELECT UUID() AS id', async (err, response) => {
            req.body.id = await response[0].id;

            qb.insert('tbl_payment_sideeffect', req.body, (err, response) => {
                qb.release();
                if (err) return res.send({ status: false, message: err });
                res.send({ status: true, message: { id: req.body.id } });
            });
        })
    });
});

app.post('/updatePaymentSideeffect', (req, res, next) => {
    pool.get_connection(qb => {
        qb.update('tbl_payment_sideeffect', req.body, { id: req.body.id }, (err, response) => {
            qb.release();
            if (err) return res.send({ status: false, message: err });
            res.send({ status: true, message: 'data inserted successfully.' });
        });
    });
});


app.post('/selfEnroll/:course_id', (req, res) => {
    canvasAPI.createUserCourseEnrollment(req.params.course_id, req.body).then(
        response => res.send({ status: true, message: 'success' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.delete('/selfUnEnroll/:course_id/:enrollment_id', (req, res) => {
    canvasAPI.deleteUserCourseEnrollment(req.params.course_id, req.params.enrollment_id).then(
        response => res.send({ status: true, message: 'success' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

// io.on('connection', (socket) => {
//     socket.on('event', (message) => {
//         io.emit('message', message);
//         refNo.push(message.refNo)
//         sockets.push(socket);
//     });

//     socket.on('disconnect', () => { });
// });

// app.get('/paymentSuccessful', (req, res) => {
//     // if () {

//     // }
//     res.send({ name: 'surafel habte' })

//     sockets[0].emit('message', 'successfull');
// });

httpServer.listen(port, () => console.log(`listening on port ${port}`));