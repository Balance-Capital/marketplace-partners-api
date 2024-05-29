/* eslint-disable no-restricted-syntax */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const os = require('os');
const { validationResult } = require('express-validator');
const logger = require('../services/logger');

const {
  WITHDRAW_STATUS_OFF,
  WITHDRAW_STATUS_ON
} = require('../constants/salesReport');

const {
  RESPONSE_STATUS_OK,
  RESPONSE_STATUS_WRONG_PARAMS,
  RESPONSE_STATUS_BAD_REQUEST
} = require('../constants/httpResponse');

const db = require('../models/index');
const {
  checkSignedByServer,
  signByUser,
  checkSignedByUser
} = require('../utils/sign');

const intermediateFingerprint = process.env.FINGERPRINT || null;
const uCommissionReportProof = require('../proofs/uCommissionReportProof');
const transportDataProof = require('../proofs/transportDataProof');
const transportCommissionDataProof = require('../proofs/transportCommissionDataProof');

const get = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(RESPONSE_STATUS_WRONG_PARAMS)
        .json({ errors: errors.array() });
    }

    const { userId } = req.query;
    const search = new RegExp(`^${userId}.*`, 'gui');

    return db.models.UnifyCommissionReport.find({
      customId: search,
      // 'transactionDetails.withDrawStatus': WITHDRAW_STATUS_OFF
    })
      .then(async (reports) => {
        // here check, if each records is properly signed by server
        for (const report of reports) {
          const proof = Object.create(uCommissionReportProof);
          proof.orderAmount = report.transactionDetails.orderAmount;
          proof.publisherAmount = report.transactionDetails.publisherAmount;
          proof.currency = report.transactionDetails.currency;
          proof.createdAt = report.createdAt;

          const hostname = os.hostname();
          const signValue =
            report?.signed?.filter((item) => item.name === hostname)[0]
              ?.value || false;
          if (!signValue) {
            return res.status(RESPONSE_STATUS_BAD_REQUEST).json([]);
          }

          // eslint-disable-next-line no-await-in-loop
          const checkByServer = await checkSignedByServer(proof, signValue);
          if (!checkByServer) {
            return res.status(RESPONSE_STATUS_BAD_REQUEST).json([]);
          }
        }
        const proof = Object.create(transportCommissionDataProof);
        proof.lengthOfRecords = reports.length;
        proof.sumOfOrdersAmount = reports.reduce(
          (a, b) => a + b?.transactionDetails?.orderAmount,
          0
        );
        const intermediateSign = await signByUser(
          proof,
          intermediateFingerprint
        );
        const headers = {
          'Content-type': 'application/json',
          intermediateSign,
          token: process.env.API_ACCESS_TOKEN || null
        };
        return res.status(RESPONSE_STATUS_OK).header(headers).json(reports);
      })
      .catch((err) => logger.warning(`Issue from database ${err?.message}`, err, req, res));
  } catch (err) {
    logger.warning(`[CommissionReportAffiliateNetworksController] get method ${err?.message}`, err, req, res);
  }
};

const put = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(RESPONSE_STATUS_WRONG_PARAMS).json({ errors: errors.array() });
      return;
    }

    const { intermediatesign } = req.headers;
    const { transactionId, status } = req.query;

    const checkProof = Object.create(transportDataProof);
    checkProof.lengthOfParams = 2;
    checkProof.valuesOfParams = [transactionId, status];

    const signed = await checkSignedByUser(
      checkProof,
      intermediateFingerprint,
      intermediatesign
    );

    if (!signed) {
      res.status(RESPONSE_STATUS_WRONG_PARAMS).json(new Error('wrong signed'));
    } else {
      db.models.UnifyCommissionReport.updateOne(
        { _id: transactionId },
        { 'transactionDetails.withDrawStatus': WITHDRAW_STATUS_ON }
      ).then(async () => {
        const result = await db.models.UnifyCommissionReport.findOne({_id: transactionId}).exec();
        const proof = Object.create(transportDataProof);
        proof.lengthOfParams = 1;
        proof.valuesOfParams = [result];
        const intermediateSign = await signByUser(
          proof,
          intermediateFingerprint
        );
        const headers = {
          'Content-type': 'application/json',
          intermediateSign,
          token: process.env.API_ACCESS_TOKEN || null
        };
        res.status(RESPONSE_STATUS_OK).header(headers).json(result);
      });
    }
  } catch (err) {
    logger.warning(`[CommissionReportAffiliateNetworksController] put method ${err?.message}`, err, req, res);
  }
};

module.exports = { get, put };
