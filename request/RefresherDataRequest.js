/* eslint-disable no-underscore-dangle */
const { check } = require('express-validator');
const i18n = require('../services/i18n');

const token = () => ([ 
    check('token').isString().withMessage(i18n.__('refreshToken'))
]);

module.exports = { token };