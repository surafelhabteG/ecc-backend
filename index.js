const app = require('express')();
var cors = require('cors');
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
    cors: { origin: '*' }
});

var bodyParser = require('body-parser')

app.use(cors({ origin: '*' }));

app.use(bodyParser({ extended: true }));

const canvasAPI = require('node-canvas-api')

const refNo = [];

const sockets = [];

const port = process.env.PORT || 4000;

app.get('/getAllCourses', (req, res) => {
    canvasAPI.getAllCoursesInAccount(1).then(
        response => res.send(response)
    );
});

app.get('/getAllModules/:courseId', (req, res) => {
    canvasAPI.getModules(req.params.courseId).then(
        response => res.send(response)
    );
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

            }).catch((err) => {
                res.status(200).send(err);
            });
        } else {
            res.status(200).send({ status: false, message: ['Unable to register this user. please try again'] });
        }
    }).catch((err) => {
        res.status(200).send(err);
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