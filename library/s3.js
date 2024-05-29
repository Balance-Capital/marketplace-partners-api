/* eslint-disable no-shadow */
/* eslint-disable no-plusplus */
require('dotenv').config();
const fs = require('fs');
const AWS = require('aws-sdk');
const path = require('path');

const s3 = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
});

const uploadFileToS3 = (fileName, fileContent) => {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: fileContent,
        CacheControl: 'public,max-age=864000'
    };
  
    s3.upload(params, (err) => {
        if(err) throw err;
    });
};

const notExistsFile = (fileName, result) => {

    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName
    };

    s3.headObject(params, (err) => {  
        if (err && err.statusCode === 404) {  
            result();
        };
    });

}

const mkDir = async (path) => {
    let directory = ``
    for(let x = 0; x < path.length-1; x++) { 
        try {
            // eslint-disable-next-line no-unused-vars
            const dir = fs.statSync(path[x])?.isDirectory
            directory = directory.length === 0 ? `${path[x]}` : `${directory}/${path[x]}`
        } catch(e) {

                directory = directory.length === 0 ? `${path[x]}` : `${directory}/${path[x]}`
                try {
                    fs.mkdirSync(directory);
                // eslint-disable-next-line no-empty
                } catch (e){
                    // console.log(e);
                }
        }
    }
    return directory;
}

const arrFileSession = [];

const downloadFilesFromS3 = (fileName) => {
    if(arrFileSession.find(item=>item===fileName)) {
        return 0;
    }
    arrFileSession.push(fileName)
    console.log(arrFileSession)
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName
    };
  
    s3.getObject(params, async (err, res) => {
        if (err === null) {
            const name = fileName.split('/');
            const directory = await mkDir(name);
            const readStream = s3.getObject(params).createReadStream();
            const writeStream = fs.createWriteStream(path.join(`${directory}`, name[name.length-1]));
            readStream.pipe(writeStream)    
         } else {
           res?.status(500)?.send(err);
        }
    });
    return 1;
};

// eslint-disable-next-line no-unused-vars
const listObjectsInBucket = async (bucketName, backFunc) => {
    // Create the parameters for calling listObjects
    const bucketParams = {
        Bucket : bucketName,
        MaxKeys : 10000,
        Prefix : ''
    };
  
    // Call S3 to obtain a list of the objects in the bucket
    s3.listObjects(bucketParams, backFunc);
}


module.exports = { uploadFileToS3, notExistsFile, downloadFilesFromS3 }