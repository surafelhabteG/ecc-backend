const express = require('express');
const router = express.Router();

const { pool } = require('../helpers/Db');

router.post('/reportOne', (req, res) => {
    try {
        
        pool.get_connection(qb => {
            qb.select('*')
                .where('courseId', req.body.courseId)
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