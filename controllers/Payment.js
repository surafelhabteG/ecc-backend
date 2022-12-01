const express = require('express');

// const pool = require('../helpers/Db')
const requestPromise = require('request-promise');
const router = express.Router();
const { uuid } = require('uuidv4');

const QueryBuilder = require('node-querybuilder');

const connection = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecc'
};

const pool = new QueryBuilder(connection, 'mysql', 'pool');

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

// Payment and sideEffect
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

router.get('/verifayPayment/:billReferenceNumber/:paymentId', (req, res) => {
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


router.get('/getAllFinancialReports',(req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select('*')
            .order_by('updatedAt','desc')
            .limit(5)
            .get('tbl_payment_sideeffect', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });
    
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/filterFinancialReports', (req, res) => {
    try {

        var where;

        if(req.body.startDate == req.body.endDate){
            where = `createdAt = ${req.body.startDate}`;

        } else {
            where = `createdAt >= ${req.body.startDate} AND createdAt <= ${req.body.endDate}`;
        }

        // if(req.body.courseId){
        //     where = `${where} AND courseId = ${req.body.institutionId}`
        // }

        pool.get_connection(qb => {
            qb.select('*')
            .from('tbl_payment_sideeffect')
            .where(where)
            .order_by('updatedAt','desc')
            .get((err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

module.exports = router;