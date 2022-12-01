const express = require('express');
const router = express.Router();

const QueryBuilder = require('node-querybuilder');

const connection = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecc'
};

const pool = new QueryBuilder(connection, 'mysql', 'pool');

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