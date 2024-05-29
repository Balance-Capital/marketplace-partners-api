const fs = require('fs');
const os = require('os');
const moment = require('moment');
const archiver = require('archiver');

const archive = archiver('zip', {
    zlib: { level: 9 }
});

const TMP_DIR = os.tmpdir();

const { uploadObject } = require('./spaceDigitalOcean');
const logger = require('./logger');

/**
 * Deletes the specified zip file and removes any empty directories in the given path.
 *
 * @param {string} zipFile - The name of the zip file to be deleted.
 * @param {string} path - The path containing the zip file and any empty directories to be removed.
 * @returns {undefined}
 */
const cleanUp = (zipFile, path) => {
    fs.unlinkSync(`${TMP_DIR}/${zipFile}.zip`);
    const dirs = path.split('/');
    const _path = `${TMP_DIR}/${dirs[0]}`;
    if (fs.existsSync(_path)) {
        fs.rmdirSync(_path, { recursive: true });
    }
};

/**
 * Creates directories recursively for the given path if they do not exist.
 *
 * @param {string} path - The path for which directories need to be created.
 * @returns {void}
 */
const checkPath = (path) => {
    const dirs = path.split('/');
    let _path = `${TMP_DIR}`;
    for (const dir of dirs) {
        _path += `/${dir}`;
        if (!fs.existsSync(_path)) {
            fs.mkdirSync(_path);
        }
    }
};

/**
 * Performs a backup of the Mongo database for the partners API.
 *
 * This function creates a backup of the Mongo database by retrieving all documents from each model
 * and saving them as JSON files in a temporary directory. The JSON files are then archived into a
 * zip file and uploaded to an S3 bucket. After the upload is complete, the temporary files and
 * directories are cleaned up.
 *
 * @returns {Promise<void>} A promise that resolves once the backup process is complete.
 * @throws {Error} If the S3_BACKUP_MONGO_BUCKET environment variable is not defined.
 */
const backupMogoPartnersAPI = async () => {
    const db = require('../models/index');
    const date = moment().format('YYYY-MM-DD');
    const name = 'partners_api';
    const path = `${name}/${process.env.ENV}`;
    try {
        if (!process.env.S3_BACKUP_MONGO_BUCKET) {
            throw new Error('S3_BACKUP_MONGO_BUCKET is not defined');
        }

        if (!process.env.ENV) {
            throw new Error('ENV is not defined');
        }

        checkPath(path);

        for (const model in db.models) {
            const documents = db.models[model];
            const records = await documents.find({}).exec();
            const backup = JSON.stringify(records);
            fs.writeFileSync(`${TMP_DIR}/${path}/${model}.json`, backup);
        }

        const output = fs.createWriteStream(`${TMP_DIR}/${name}_${date}.zip`);
        output.on('close', async () => {
            const params = {
                Bucket: process.env.S3_BACKUP_MONGO_BUCKET,
                Key: `${path}/${date}.zip`,
                Body: fs.readFileSync(`${TMP_DIR}/${name}_${date}.zip`),
                ACL: 'private'
            };

            const uploaded = await uploadObject(params);
            if (uploaded.$metadata.httpStatusCode === 200) {
                console.log(`[backupMongo] S3 uploaded`, params.Key);
            } else {
                console.warn(`[backupMongo] S3 issue`, params.Key, uploaded);
            }

            cleanUp(`${name}_${date}`, path);
            process.exit();
        });
        archive.on('error', (err) => {
            console.warn('[backupMongo] zip issue', err);
            process.exit();
        });

        archive.pipe(output);
        archive.directory(`${TMP_DIR}/${path}`, false);
        archive.finalize();
    } catch (err) {
        console.warn('[backupMongo] backupMongoPartnersAPI', err);
        logger.warning(`[backupMongo] backupMongoPartnersAPI ${err?.message}`, err);
        process.exit();
    }
};

const backupMogoAPI = async () => {
    const dbApi = require('../models/apiDatabase');
    const date = moment().format('YYYY-MM-DD');
    const name = 'api';
    const path = `${name}/${process.env.ENV}`;
    try {
        if (!process.env.S3_BACKUP_MONGO_BUCKET) {
            throw new Error('S3_BACKUP_MONGO_BUCKET is not defined');
        }

        if (!process.env.ENV) {
            throw new Error('ENV is not defined');
        }

        checkPath(path);

        for (const model in dbApi.models) {
            const documents = dbApi.apiDatabase.model(
                model,
                dbApi.models[model].schema
            );
            const records = await documents.find({}).exec();
            const backup = JSON.stringify(records);
            fs.writeFileSync(`${TMP_DIR}/${path}/${model}.json`, backup);
        }

        const output = fs.createWriteStream(`${TMP_DIR}/${name}_${date}.zip`);
        output.on('close', async () => {
            const params = {
                Bucket: process.env.S3_BACKUP_MONGO_BUCKET,
                Key: `${path}/${date}.zip`,
                Body: fs.readFileSync(`${TMP_DIR}/${name}_${date}.zip`),
                ACL: 'private'
            };

            const uploaded = await uploadObject(params);
            if (uploaded.$metadata.httpStatusCode === 200) {
                console.log(`[backupMongo] S3 uploaded`, params.Key);
            } else {
                console.warn(`[backupMongo] S3 issue`, params.Key, uploaded);
            }
            cleanUp(`${name}_${date}`, path);
            process.exit();
        });
        archive.on('error', (err) => {
            console.warn('[backupMongo] zip issue', err);
            process.exit();
        });

        archive.pipe(output);
        archive.directory(`${TMP_DIR}/${path}`, false);
        archive.finalize().then((r) => console.log(r));
    } catch (err) {
        console.warn('[backupMongo]', err);
        logger.warning(`[backupMongo] backupMongoAPI ${err?.message}`, err);
        process.exit();
    }
};

if (process.argv[2] === 'api') {
    backupMogoAPI();
}

if (process.argv[2] === 'partners_api') {
    backupMogoPartnersAPI();
}

module.exports = {
    backupMogoPartnersAPI,
    backupMogoAPI
};
