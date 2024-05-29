const { listObject, copyObject } = require('./spaceDigitalOcean');
const logger = require('./logger');
/**
 * Performs a backup of objects from one S3 bucket to another.
 * @returns {Promise<void>} A promise that resolves when the backup is complete.
 */
const backup = async () => {
  try {
    if (!process.env.S3_BUCKET_NAME || !process.env.S3_BACKUP_BUCKET_NAME) {
        throw new Error("Environment variables S3_BUCKET_NAME and S3_BACKUP_BUCKET_NAME must be set.");
    };
    const sourceBucketName = process.env.S3_BUCKET_NAME;
    const backupBucketName = process.env.S3_BACKUP_BUCKET_NAME;
    let marker = process.env.S3_BACKUP_MARKER_START;
    let maxKeys = +process.env.S3_BACKUP_KEY_LIST;
    let isTruncated = true;

    while (isTruncated) {
      const { Contents, IsTruncated, NextMarker } = await listObject(sourceBucketName, marker, maxKeys);

      for (const item of Contents) {
        const sourceKey = item.Key;
        const sourceBucketAndName = `${sourceBucketName}/${sourceKey}`;
        const copyResult = await copyObject(backupBucketName, sourceBucketAndName, sourceKey);

        if (copyResult) {
          console.log(`Copied ${sourceBucketAndName} to ${backupBucketName}/${sourceKey}`, copyResult);
        } else {
          console.error(`Error copying ${sourceBucketAndName} to ${backupBucketName}/${sourceKey}`, copyResult);
        }
      }
      isTruncated = IsTruncated;
      marker = NextMarker;
    }
  } catch (err) {
    console.error(err);
    logger.warning(`[BackupS3] ${err?.message}`, err);
  }
};

backup()
    .then(()=>{console.log("Backup completed successfully.")})
    .catch((error) => console.error("Backup failed:", error))
    .finally(()=>process.exit());