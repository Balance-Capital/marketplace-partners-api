/* eslint-disable no-underscore-dangle */
require('dotenv').config();
const { header, check } = require('express-validator');

const get = () => ([ 
    header('token').isString().custom(value => value === process.env.API_ACCESS_TOKEN).withMessage('field is mandatory and token should be a valid'),
    header('intermediateSign').isString().withMessage('field is mandatory'),
    check('userId').isString().withMessage('field is mandatory')
]);

const put = () => ([ 
    header('token').isString().custom(value => value === process.env.API_ACCESS_TOKEN).withMessage('field is mandatory and token should be a valid'),
    header('intermediateSign').isString().withMessage('field is mandatory'),
    check('transactionId').isString().withMessage('field is mandatory')
]);

module.exports = { get, put };