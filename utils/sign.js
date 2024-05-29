/* eslint-disable no-return-await */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const bcrypt = require('bcrypt');
const si = require('systeminformation');
const logger = require('../services/logger');

const SALT_FOR_BCRYPT = parseInt(process.env.SALT_FOR_BCRYPT, 10) || 10;

const uniqueServerSerialNo = () => new Promise((resolve, reject) => {
    try {
        si.uuid((sys) => {
            const serialNumber = sys?.hardware || sys?.os || null;
            if (!serialNumber) throw new Error('cant read serial number');
            resolve(serialNumber)
        })
    } catch (err) {
        logger.warning(`[SIGN] try get serial number ${err?.message}`, err)
        reject(err?.message)
    }
})

const sign = async (proof) => {
    try {
        const signedProof = JSON.stringify(proof);

        const salt = bcrypt.genSaltSync(SALT_FOR_BCRYPT);
        if(!salt) return false;

        const hash = bcrypt.hashSync(signedProof, salt);
        if(!hash) return false;
        
        return hash;
        
    } catch (err) {
        logger.warning(`[sign] sing method ${err?.message}`, err);
        return err;
    };
};

const checkSign = async (proof, signed) => {
    const signedProof = JSON.stringify(proof);
    return bcrypt.compareSync(signedProof,signed);
}

const signByServer = async (proof) => {
    try {
        const fingerPrint = await uniqueServerSerialNo();
        return await sign({...proof,fingerPrint});        
    } catch (err) {
        logger.warning(`[sign] signByServer method ${err?.message}`, err);
        return err;
    };
}

const checkSignedByServer = async (proof, signed) => {
    const fingerPrint = await uniqueServerSerialNo();
    return await checkSign({...proof,fingerPrint}, signed);
}

const signByUser = async(proof, fingerPrint) => await sign({...proof,fingerPrint})

const checkSignedByUser = async (proof, fingerPrint, signed) => await checkSign({...proof,fingerPrint}, signed)

module.exports = {
    signByServer,
    signByUser,
    checkSignedByServer,
    checkSignedByUser
}