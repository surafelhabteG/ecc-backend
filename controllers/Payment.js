const express = require('express');

// const pool = require('../helpers/Db')
const requestPromise = require('request-promise');
const router = express.Router();
const { uuid } = require('uuidv4');

const { pool } = require('../helpers/Db');

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
                if (err) return { status: false, message: err.message };
                return { status: true, message: 'data deleted successfully.' };
            });
        });

    } catch(err){
        return { status: false, message: err.message };
    }
}

/**

@api {post} /createPaymentReference Create Payment Reference
@apiName CreatePaymentReference
@apiGroup Payment
@apiParam {Object} data Payment data.
@apiSuccess {Boolean} status Success status.
@apiSuccess {Object} message Response message.
@apiError {Boolean} status Error status.
@apiError {String} message Error message.

*/
router.post('/createPaymentReference', async (req, res) => {
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

/**

@api {post} /paymentSuccessCallBack Payment Success callback call by the server
@apiName paymentSuccessCallBack
@apiGroup Payment
@apiParam {Object} data Payment data.
@apiSuccess {Boolean} status Success status.
@apiSuccess {Object} message Response message.
@apiError {Boolean} status Error status.
@apiError {String} message Error message.

*/
router.post('/paymentSuccessCallBack', async (req, res) => {    
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


/**

@api {get} /verifayPayment/:billReferenceNumber/:paymentId check Payment Status
@apiName verifayPayment
@apiGroup Payment
@apiParam {Object} data Payment data.
@apiSuccess {Boolean} status Success status.
@apiSuccess {Object} message Response message.
@apiError {Boolean} status Error status.
@apiError {String} message Error message.

*/
router.get('/verifayPayment/:billReferenceNumber/:paymentId', (req, res) => {
    const requestOption = {
        'method': 'GET',
        'uri':`${process.env.MEDA_PAY_URL}/${req.params.billReferenceNumber}`,
        'headers': {
           'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MEDA_PAY_TOKEN}`
        }
    };

      requestPromise(requestOption)
      .then(function (response) {
        response = JSON.parse(response);

        if (response.status == 'PAYED') {
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
            'payment is not complete. whether you are not pay successfully or something happen. try again.'
          
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

/**

@api {post} /checkPaymnetSettlement check Payment Settlment
@apiName checkPaymnetSettlement
@apiGroup Payment
@apiParam {String} studentId studentId.
@apiParam {String} courseId courseId.

@apiSuccess {Boolean} status Success status.
@apiSuccess {Object} message Response message.
@apiError {Boolean} status Error status.
@apiError {String} message Error message.

*/
router.post('/checkPaymnetSettlement', (req, res) => {
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


/**
 * @api {post} /createPaymentSideeffect Create Payment Sideeffect
 * @apiName CreatePaymentSideeffect
 * @apiGroup Payment
 *
 * @apiParam {String} paymentId Unique payment identifier.
 * @apiParam {String} paymentMethod Payment method used for the transaction.
 * @apiParam {String} status Status of the payment.
 *
 * @apiSuccess {Boolean} status Status of the API request.
 * @apiSuccess {Object} message Object containing id of the created payment sideeffect.
 *
 * @apiError {Boolean} status Status of the API request.
 * @apiError {String} message Error message.
 *
 */

router.post('/createPaymentSideeffect', (req, res) => {
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

/**
 * @api {post} /updatePaymentSideeffect Update Payment Sideeffect
 * @apiName updatePaymentSideeffect
 * @apiGroup Payment
 *
 * @apiParam {String} paymentId Unique payment identifier.
 * @apiParam {Object} req.body Data of of the payment.
 *
 * @apiSuccess {Boolean} status Status of the API request.
 * @apiSuccess {Object} message Object containing id success message.
 *
 * @apiError {Boolean} status Status of the API request.
 * @apiError {String} message Error message.
 *
 */
router.post('/updatePaymentSideeffect', (req, res) => {
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

/**

@api {delete} /deletePaymentSideeffect/:paymentId Delete Payment Sideeffect
@apiName deletePaymentSideeffect
@apiGroup Payment
@apiParam {String} paymentId The ID of the payment sideeffect to delete
@apiSuccess {Boolean} status Indicates if the operation was successful
@apiSuccess {String} message A message indicating the result of the operation
@apiError {Boolean} status Indicates if the operation was successful
@apiError {String} message A message indicating the error that occurred during the operation
*/
router.delete('/deletePaymentSideeffect/:paymentId', (req, res) => {
    let result = deletePaymentSideeffect(req.params.paymentId);

    res.status(200).send(result);

});


/**

@api {delete} /getPaymentSideeffectById/:paymentId get detail of Payment Sideeffect
@apiName getPaymentSideeffectById
@apiGroup Payment
@apiParam {String} paymentId The ID of the payment sideeffect
@apiSuccess {Boolean} status Indicates if the operation was successful
@apiSuccess {String} message A message Detail of the payment sideeffect
@apiError {Boolean} status Indicates if the operation was successful
@apiError {String} message A message indicating the error that occurred during the operation
*/

router.get('/getPaymentSideeffectById/:paymentId', (req, res) => {
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


module.exports = router;