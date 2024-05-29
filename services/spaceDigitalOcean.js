const { PutObjectCommand, S3Client, DeleteObjectCommand, ListObjectsCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');

const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: false,
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
});

/**
 * Uploads an object to a DigitalOcean Space using the AWS SDK for JavaScript.
 * @param {object} params - An object containing the parameters for uploading the object.
 * @param {string} params.Bucket - The name of the DigitalOcean Space.
 * @param {string} params.Key - The key or path of the object in the Space.
 * @param {string|Buffer|TypedArray|Blob} params.Body - The content of the object.
 * @returns {Promise<object|null>} - The response data from the PutObjectCommand API call, or null if an error occurs.
 */
const uploadObject = async (params) => {
  try {
    const data = await s3Client.send(new PutObjectCommand(params));
    return data;
  } catch (err) {
    logger.warning(`[spaceDigitalOcean] uploadObject method ${err?.message}`, err, params);
    return null;
  }
};

/**
 * Deletes an object from an S3 bucket using the AWS SDK.
 * 
 * @param {Object} params - An object containing the parameters for the deletion operation.
 * @param {string} params.Bucket - The name of the S3 bucket.
 * @param {string} params.Key - The key of the object to be deleted.
 * @returns {Promise<Object|null>} - The result of the deletion operation, or null if an error occurs.
 */
const deleteObject = async (params) => {
  try {
    const data = await s3Client.send(new DeleteObjectCommand(params));
    return data;
  } catch (err) {
    logger.warning(`[spaceDigitalOcean] deleteObject method ${err?.message}`, err, params);
    return null;
  }
};

/**
 * Retrieves a list of objects from an S3 bucket using the DigitalOcean Spaces API.
 * @param {string} bucketName - The name of the S3 bucket to retrieve the objects from.
 * @param {string} marker - The marker to start the listing from. Only objects with keys greater than the marker will be included in the listing.
 * @param {number} maxkeys - The maximum number of objects to include in the listing.
 * @returns {Promise<object|null>} - The listing object containing information about the retrieved objects from the S3 bucket, or null if an error occurs.
 */
const listObject = async (bucketName, marker, maxkeys) => {
  const listParams = {
    Bucket: bucketName,
    Marker: marker,
    MaxKeys: maxkeys
  };
  try {
    if (!bucketName.trim() || typeof bucketName !== 'string') {
      throw new Error('Invalid bucketName');
    };
    const listing = await s3Client.send(new ListObjectsCommand(listParams));  
    return listing;
  } catch(err) {
    logger.warning(`[spaceDigitalOcean] listObject method ${err?.message}`, err, listParams);
    return null;
  }
}

/**
 * Copies an object from one S3 bucket to another.
 * @param {string} destinationBucketName - The name of the destination bucket.
 * @param {string} copySource - The source object to be copied in the format 'bucket-name/object-key'.
 * @param {string} key - The key (name) of the copied object in the destination bucket.
 * @returns {Promise<Object|null>} - The copied object if successful, or null if there was an error.
 */
const copyObject = async (destinationBucketName, copySource, key) => {
  const copyParams = {
    Bucket: destinationBucketName,
    CopySource: copySource,
    Key: key
  };
  try {
    if (!destinationBucketName.trim() || typeof destinationBucketName !== 'string') {
      throw new Error('Invalid destinationBucketName');
    };
    if (!copySource.trim() || typeof copySource !== 'string') {
      throw new Error('Invalid copySource');
    };    
    if (!key.trim() || typeof key !== 'string') {
      throw new Error('Invalid key');
    };    
    const copy = await s3Client.send(new CopyObjectCommand(copyParams));
    return copy;
  } catch (err) {
    logger.warning(`[spaceDigitalOcean] copyObject method ${err?.message}`, err, copyParams);
    return null;
  }
}
module.exports = {
  uploadObject,
  deleteObject,
  listObject,
  copyObject
};