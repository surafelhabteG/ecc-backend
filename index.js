const app = require('express')();
const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const path = require("path");
const { uuid } = require('uuidv4');

const Jimp = require("jimp");
const fs = require("fs");

const base64 = require('node-base64-image');

var cors = require('cors');
var request = require('request');
const mysql = require('mysql');
const QueryBuilder = require('node-querybuilder');

var bodyParser = require('body-parser')

app.use(morgan('dev'));
app.use(express.static('public'));

app.use(express.json({ limit: '25mb' }));

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


// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

const canvasAPI = require('node-canvas-api')

const refNo = sockets = [];

const port = process.env.PORT || 4000;

const pool = new QueryBuilder(connection, 'mysql', 'pool');






// const storage = (id) => multer.diskStorage({
//     destination: function (req, file, callback) {
//         callback(null, './public/uploads/ids');
//     },
//     filename: function (req, file, callback) {
//         callback(null, `${id}${path.extname(file.originalname).toLowerCase()}`);
//     }
// });

// const checkFileType = function (file, cb) {
//     const fileTypes = /jpeg|jpg|png/;
//     const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
//     const mimeType = fileTypes.test(file.mimetype);

//     if (mimeType && extName) {
//         return cb(null, true);
//     } else {
//         cb("Error: You can Only Upload Images!!");
//     }
// }

// const upload = (id) => multer({
//     storage: storage(id),
//     limits: { fileSize: 10000000 },
//     fileFilter: (req, file, cb) => {
//         checkFileType(file, cb);
//     },
// });



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


app.post('/base64', (req, res) => {
    if (convertBase64ToImage(req.body.image, uuid().replace('-', ''))) {

        res.status(200).send({ status: true, message: 'success' });

    } else {
        res.status(200).send(res);
    }
});

app.get('/getAllCourses', (req, res) => {
    canvasAPI.getCourses().then(
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
    var memberId = body.memberId;

    delete body.custom_data;
    delete body.memberId;

    body.id = uuid().replace('-', '');

    canvasAPI.createUser(body).then((response) => {
        var message = "Success";

        if (response) {
            let url = `/users/${response.id}/custom_data/profile?ns=extraInfo`;

            canvasAPI.storeCustomData(url, custom_data).then((response) => {
                if (response) {

                    const result = convertBase64ToImage(memberId, body.id);

                    !result.status ? message = 'register successfully, but unable to upload file.' : null;

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
        qb.insert('tbl_payment_sideeffect', req.body, (err, response) => {
            qb.release();
            if (err) return res.send({ status: false, message: err });
            res.send({ status: true, message: { id: req.body.id } });
        });
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
        response => res.send({ status: true, message: 'Course is Added to Your Learning Plan.' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

app.delete('/selfUnEnroll/:course_id/:enrollment_id', (req, res) => {
    canvasAPI.deleteUserCourseEnrollment(req.params.course_id, req.params.enrollment_id).then(
        response => res.send({ status: true, message: 'Course Is Removed From Learning Plan.' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});


app.delete('/logout/:user_id/:login_id', (req, res) => {
    canvasAPI.logoutUser(req.params.user_id, req.params.login_id).then(
        response => res.send({ status: true, message: 'success' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

httpServer.listen(port, () => console.log(`listening on port ${port}`));