const express = require('express');

const { convertBase64 } = require('../helpers/Files');
const redisClient = require('../helpers/Db');
const transporter = require('../helpers/Mailer');

const router = express.Router();
const canvasAPI = require('node-canvas-api');
const fs = require("fs");
const path = require('path')

const staticPath = path.join(process.cwd(),'public')

// User Authntication and other
router.post('/isLoggedIn', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(req.body.userId);

        if (cacheResults) {
            res.status(200).send({ status: true, message: JSON.parse(cacheResults) });

        } else {
            res.status(200).send({ status: false, message: {}});
        }
    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }
});

router.post('/register', async (req, res) => {
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
                                result = convertBase64(memberId, id);
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

router.post('/login', async (req, res) => {
    try {

        canvasAPI.getToken(req.body).then((response) => {
            let access_token = {
                access_token: response.access_token
            };
    
            canvasAPI.getSelf(response.user.id).then(async (response) => {
                response = { ...response, ...access_token };
    
                if(response.sis_user_id == 'admin'){
                    var id = response.id;

                    await redisClient.set(id.toString(), JSON.stringify(response), {
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

                        // call to get user login id
                        canvasAPI.getUserLogin(response.id).then(async (loginDetail) => {
                            data.login_id = loginDetail[0].id;
                            data.account_id = loginDetail[0].account_id;
                            var id = data.id;

                            await redisClient.set(id.toString(), JSON.stringify(data), {
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

router.post('/updateProfile/:userId', (req, res) => {
    var url = `/users/${req.params.userId}/custom_data/profile?ns=extraInfo`;
    var message = "profile updated successfully. relogin to get updated data.";

    var custom_data = req.body.custom_data;
    var user_data = req.body.user_data;


    canvasAPI.updateUser(req.params.userId, user_data).then((response) => {
        if (response) {
            canvasAPI.storeCustomData(url, custom_data).then((response) => {
                if (response) {
        
                    var result = { status: true };
        
                    if (req.body.memberId !== null) {
                        result = convertBase64(req.body.memberId, req.params.userId);
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

router.post('/changePassword/:accountId/:loginId', (req, res) => {
    canvasAPI.changepassword(req.params.accountId, req.params.loginId, req.body).then((response) => {
        if (response) {
            res.status(200).send({ status: true, message: 'password changed successfully' });

        } else {
            res.status(200).send({ status: false, message: 'fail to change password.' });
        }
    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

router.post('/resetPassword', async(req, res) => {
    canvasAPI.searchUser(`sis_login_id:${req.body.email}`).then(async (response) => {

        if ('login_id' in response) {

            // call email sender for email reset
            let message = `
                Hi ${response.name}, You recently requested to reset the password for your account. 
                Click the button below link to proceed. 
                ${req.body.link }?user_id=${response.id}
                If you did not request a password reset, 
                please ignore this email or reply to let us know.
            `;

            try {

                const mailData = {
                    from: 'surafel@360ground.com',
                    to: req.body.email,
                    subject: `Password reset`,
                    text: message,
                };
            
                transporter.sendMail(mailData, function (err, info) {
                    if(err){
                        res.status(200).send({ status: false, message: err.message});
            
                    } else {
                        res.status(200).send({ status: true, 
                            message: 'Password reset link sent to your email successfully. check and proceed'});
                    }   
                });

            } catch(error){
                res.status(200).send(
                    { 
                        status: false, message: error.message 
                    }
                );
            }
        }

    }).catch((errors) => {
        res.status(200).send(
            { 
                status: false, message: `User not found by email address : ${req.body.email}` 
            }
        );
    })
});

router.get('/getUserLogin/:userId', (req, res) => {
    canvasAPI.getUserLogin(req.params.userId).then((response) => {
        res.status(200).send({
            status: response.length ? true : false,
            message: response.length ? response[0] : response
        });

    }).catch((err) => {
        res.status(200).send({
            status: false,
            message: err.message
        })
    });
});

router.post('/saveMyEducation/:userId', (req, res) => {
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

router.get('/searchUser/:criteria', (req, res) => {
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

async function logout(req, res){
    let userId = req.params.userId;

    const result = await redisClient.del(userId.toString());

    if(result){
        res.send({ status: true, message: 'success' })

    } else {
        res.send({ status: false, message: 'unable to logout the user Redis. try again.' })
    }
}

router.delete('/logout/:user_id/:userId', async (req, res) => {
    if(req.params.user_id == 'admin'){
        logout(req, res);

    } else {
        try {
    
            canvasAPI.terminateUserSession(req.params.user_id).then(async (response) => {
                if (response == 'ok') {
                    logout(req, res);
    
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
                message: err.message
            })
        }
    }
});

module.exports = router;