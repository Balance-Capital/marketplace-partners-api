/* eslint-disable no-underscore-dangle */
const S3 = require('./s3');
const db = require('../models/index');

const imagesDownloadS3 = async () => db.models.Stores
    .find({},{logo:1, domain:1, name:1, _id:1})
    .exec()
    .then(async (stores) => Promise.all(
        stores.map(store => {
            const file = store.logo;
            S3.downloadFilesFromS3(file)
            return file
        })))

const testFunction = async () => {
    await imagesDownloadS3().then(result=>console.log(result));
}

if(process.argv[2] === 'test') {
    testFunction();
};
testFunction();
module.exports = {
    imagesDownloadS3,
    testFunction
};