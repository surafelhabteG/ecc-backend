const express = require('express');

const { convertBase64 } = require('../helpers/Files');
const {redisClient} = require('../helpers/Db');
const transporter = require('../helpers/Mailer');

const router = express.Router();
const canvasAPI = require('node-canvas-api');
const fs = require("fs");
const path = require('path')

const jwt = require('jsonwebtoken');

const staticPath = path.join(process.cwd(),'public')

/**
 * @api {post} /isLoggedIn Check if user is logged in
 * @apiName IsLoggedIn
 * @apiGroup Authentication
 *
 * @apiSuccess {Object} data User data
 * 
 * @apiError {Object} error Error message
 */
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

/**
 * @api {post} /register Register User
 * @apiName RegisterUser
 * @apiGroup User
 *
 * @apiParam {String} name User's full name.
 * @apiParam {String} email User's email address.
 * @apiParam {String} password User's password.
 * @apiParam {String} [time_zone] User's time zone (e.g. "America/Los_Angeles").
 * @apiParam {String} [locale] User's locale (e.g. "en").
 * @apiParam {Object} [custom_data] Additional custom data to store for the user.
 * @apiParam {String} [memberId] Base64-encoded ID of the member associated with this user.
 *
 * @apiSuccess {Boolean} status `true` if the user was registered successfully, `false` otherwise.
 * @apiSuccess {String} message A success or error message.
 *
 * @apiError {Boolean} status `false`.
 * @apiError {String[]} message An array of error messages.
 */

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


/**

@api {post} /login Login to the system
@apiName Login
@apiGroup Authentication
@apiParam {String} username Username of the user.
@apiParam {String} password Password of the user.
@apiSuccess {Boolean} status The status of the response. true if successful, false otherwise.
@apiSuccess {Object} message The user object including access_token, profile, login_id, and account_id if successful.
@apiError {Boolean} status The status of the response. false if an error occurs.
@apiError {String} message The error message if an error occurs.
*/

router.post('/login', async (req, res) => {
    try {

        canvasAPI.getToken(req.body).then((response) => {
            let access_token = {
                access_token: response.access_token
            };
    
            canvasAPI.getSelf(response.user.id).then(async (response) => {
                response = { ...response, ...access_token };
    

                // let token = jwt.sign({ username: response.id }, process.env.TOKEN_SECRET, { expiresIn: '1800s' });

                if(response.sis_user_id == 'admin'){
                    var id = response.id;
                    // response.token = token;

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

                            // data.token = token;

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

/**
 * @api {post} /updateProfile/:userId Update User Profile
 * @apiName UpdateUserProfile
 * @apiGroup User
 *
 * @apiParam {String} userId The ID of the user whose profile is to be updated.
 * @apiParam {Object} custom_data The custom data to be stored with the user profile.
 * @apiParam {Object} user_data The user data to be updated.
 * @apiParam {String} account_id The ID of the account to which the user belongs.
 * @apiParam {String} login_id The ID of the user's login credentials.
 * @apiParam {String} memberId The base64 encoded file to be uploaded with the profile. Can be null.
 *
 * @apiSuccess {Boolean} status The status of the profile update request.
 * @apiSuccess {String} message The message indicating the success or failure of the profile update request.
 *
 * @apiError {Boolean} status The status of the profile update request.
 * @apiError {String} message The error message indicating the failure of the profile update request.
 */


router.post('/updateProfile/:userId', (req, res) => {
    var url = `/users/${req.params.userId}/custom_data/profile?ns=extraInfo`;
    var message = "profile updated successfully. relogin to get updated data.";

    var custom_data = req.body.custom_data;
    var user_data = req.body.user_data;

    var login_data = {
        login : {
            sis_user_id: custom_data.data.organizationName
        }
    };

    canvasAPI.updateUser(req.params.userId, user_data).then((response) => {
        if (response) {
            canvasAPI.storeCustomData(url, custom_data).then((response) => {
                if (response) {
                    canvasAPI.updateLogin(req.body.account_id,req.body.login_id, login_data).then((response) => {
                        if (response) {
                
                            var result = { status: true };
                
                            if (req.body.memberId !== null) {
                                result = convertBase64(req.body.memberId, req.params.userId);
                                !result.status ? message = `${message}, but unable to upload file.` : null;
                            }
                
                            res.status(200).send({ status: true, message: message });

                        } else {
                            res.status(200).send({ status: false, message: 'Faile to update the profile.' });
                        }

                    }).catch((errors) => {
                        res.status(200).send({
                            status: false,
                            message: errors.message
                        });
                    });    
        
                } else {
                    res.status(200).send({ status: false, message: 'Faile to update the profile.' });
                }
        
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });

        } else {
            res.status(200).send({ status: false, message: 'Faile to update the profile.' });
        }

    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

/**

@api {post} /changePassword/:accountId/:loginId Change password
@apiName ChangePassword
@apiGroup Authentication
@apiParam {String} accountId Account ID of the user.
@apiParam {String} loginId Login ID of the user.
@apiParam {String} current_password Current password of the user.
@apiParam {String} new_password New password of the user.
@apiSuccess {Boolean} status Indicates if the operation was successful.
@apiSuccess {String} message Success message.
@apiError {Boolean} status Indicates if the operation was unsuccessful.
@apiError {String} message Error message.
*/
router.post('/changePassword/:accountId/:loginId', (req, res) => {
    canvasAPI.changepassword(req.params.accountId, req.params.loginId, req.body).then((response) => {
        if (response) {
            res.status(200).send({ status: true, message: 'password changed successfully' });

        } else {
            res.status(200).send({ status: false, message: 'Faile to change password.' });
        }
    }).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

/**

@api {post} /resetPassword Request password reset
@apiName RequestPasswordReset
@apiGroup Authentication
@apiParam {String} email Email address of the user requesting password reset.
@apiParam {String} link Link to reset password.
@apiSuccess {Boolean} status The status of the password reset request.
@apiSuccess {String} message The message containing the outcome of the password reset request.
*/
router.post('/resetPassword', async(req, res) => {
    canvasAPI.searchUser(`sis_login_id:${req.body.email}`).then(async (response) => {

        if ('login_id' in response) {

            // call email sender for email reset
            let message = `
                Hi ${response.name}, You recently requested to reset the password for your account. 
                Click the link below to proceed. <a class='btn btn-light' href=' ${req.body.link }?user_id=${response.id}'>Reset link</a>
                If you did not request a password reset, 
                please ignore this email or reply to let us know.
            `;

            try {

                const mailData = {
                    from: 'surafel@360ground.com',
                    to: req.body.email,
                    subject: `Password reset`,
                    html: message,
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

/**
 * @api {get} /getUserLogin/:userId Retrieve user login information
 * @apiName GetUserLogin
 * @apiGroup User
 *
 * @apiParam {String} userId User ID of the Canvas LMS user.
 *
 * @apiSuccess {Boolean} status Indicates if the request was successful or not.
 * @apiSuccess {Object} message The user's login information. If there is no login information for the user, the response will be an empty object.
 *
 * @apiError {Boolean} status Indicates if the request was successful or not.
 * @apiError {String} message An error message.

 */

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

/**
 * @api {post} /saveMyEducation/:userId Save user's education data
 * @apiName SaveUserEducation
 * @apiGroup User
 *
 * @apiParam {String} userId User's unique ID.
 * @apiParam {Object} custom_data User's education data in JSON format.
 *
 * @apiSuccess {Boolean} status Status of the operation (true/false).
 * @apiSuccess {String} message A message describing the result of the operation.
 *
 * @apiError {Boolean} status Status of the operation (false).
 * @apiError {String} message Error message.
 */

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

/**

@api {get} /searchUser/:criteria Search for a user by criteria
@apiName SearchUser
@apiGroup User
@apiParam {String} criteria The search criteria for the user. It can be a name, email, sis_login_id, sis_user_id, or canvas_user_id.
@apiSuccess {Boolean} status The status of the response. true if the user is found, false otherwise.
@apiSuccess {Object} message The user object if the user is found, null otherwise.
@apiError {Boolean} status The status of the response. false if an error occurs.
@apiError {String} message The error message if an error occurs.
*/
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

/**
 * @api {delete} /logout/:user_id/:userId Logout a user
 * @apiName LogoutUser
 * @apiGroup User
 * 
 * @apiParam {String} user_id The ID of the user to be logged out. 
 * @apiParam {String} userId The ID of the current user performing the action. 
 *
 * @apiSuccess {Boolean} status The status of the response. true if the user is logged out successfully, false otherwise.
 * @apiSuccess {String} message The success message if the user is logged out successfully, error message otherwise.
 * 
 * @apiError {Boolean} status The status of the response. false if an error occurs.
 * @apiError {String} message The error message if an error occurs.
 */

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