const PATH_TO_PRODUCT_IMAGE = 'assets/images/products';
const PATH_TO_STORE_IMAGE = 'assets/images/stores';
const { DEFAULT_IMAGE_PRODUCT } = require('../constants/defaultImageProduct');
const { DEFAULT_IMAGE_STORE } = require('../constants/defaultImageStore');
const IMAGE_HOST = 'https://XXX';
const { IMAGE_TYPE_STORE_LOGO, IMAGE_TYPE_PRODUCT } = require('../constants/imageType');
const ISSUE_STATUS = 415;
const CHECK_AGAIN_STATUS = 429;

const logger = require('../services/logger');
const dbApi = require('../models/apiDatabase');
const { uploadObject, deleteObject } = require('./spaceDigitalOcean');
const { getImageFromRemoteServer, isValidFileExtension } = require('../utils/remoteFiles');

/**
 * Updates the image path and HTTP status of a product in the database.
 * @param {Object} model - The model of the database collection.
 * @param {string} id - The ID of the product to be updated.
 * @param {string} path - The new image path.
 * @param {number} httpStatus - The new HTTP status.
 * @returns {Promise<void>} - A promise that resolves when the update is complete.
 */
const updateProductImage = async (model, id, path, httpStatus) => {
  try {
    await model.findByIdAndUpdate({ _id: id }, { image: path, 'checked.httpStatus': httpStatus }).exec();
  } catch (error) {
    console.error(`Error updating product image: ${error}`);
    throw error;
  }
};

/**
 * Retrieves an image from a remote server.
 * @param {string} url - The URL of the image to be retrieved.
 * @param {string} fileName - The name of the image file.
 * @param {string} type - The type of the image.
 * @returns {Promise<Object>} - An object containing information about the image.
 */
const checkImage = async (url, fileName, type) => {
  try {
    const image = await getImageFromRemoteServer(url, fileName, type);
    return image;
  } catch (error) {
    console.error('Error retrieving image:', error);
    logger.warning(`[imageFix] Error retrieving image: ${error?.message}`, error)
    return null;
  }
};

/**
 * Checks the images of products in a database.
 * Retrieves a list of products with a `httpStatus` value of 0, sorts them by creation date, and limits the number of products to check.
 * For each product, it constructs parameters for uploading and deleting images from a remote server.
 * It then calls the `checkImage` function to retrieve the image and performs different actions based on the image status.
 * Finally, it updates the product image and status in the database.
 * 
 * @param {number} [limit=10] - The maximum number of products to check.
 * @param {number} [offset=0] - The number of products to skip before starting to check.
 */
const checkProductsImages = async (limit=10, offset=0) => {
  let exit = false;
    try {
        const productsModel = dbApi.apiDatabase.model('Products', dbApi.models.Products.schema);

        const products = await productsModel.find({'checked.httpStatus':0}, {_id: 1, image: 1})
            .sort({updatedAt: 1})
            .limit(limit)
            .skip(offset)
            .lean()
            .exec();
        
        if(products.length === 0) {
          exit = true;
          return;
        }
        
        for(const product of products) {
            const paramsUpdate = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: null,
                Body: null,
                ACL: "public-read",
                CacheControl: 'public,max-age=864000'
            };
            
            const paramsDelete = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: null
            };    
            const fileName = product.image.split('/').pop();
            const image = await checkImage(`${IMAGE_HOST}/${product.image}`, fileName, IMAGE_TYPE_PRODUCT);
            let status = CHECK_AGAIN_STATUS;
            let path = DEFAULT_IMAGE_PRODUCT;
            if(image) {
                if(image.status === ISSUE_STATUS) {
                    paramsDelete.Key = product.image;
                    await deleteObject(paramsDelete);
                    status = ISSUE_STATUS;    
                } else if(!image.fileExt && isValidFileExtension(fileName)) {
                    paramsUpdate.Key = `${PATH_TO_PRODUCT_IMAGE}/${fileName}`;
                    paramsUpdate.Body = image.fileData;
                    await uploadObject(paramsUpdate);
                    path = paramsUpdate.Key;
                } else {
                    path = image.pathAndName;
                }    
            }
            
            await updateProductImage(productsModel, product._id, path, status);
        }
    } catch (err) {
        console.log(err);
        logger.warning(`[imageFix] checkProductsImages method ${err?.message}`, err);
    } finally {
      console.log('offset:', offset);
      return (exit) ? null : await checkProductsImages(limit, offset+=limit);
    }
}

module.exports = {
    checkProductsImages
}

if (process.argv[2] === 'products') {
  checkProductsImages(10,0).finally(()=>process.exit());
}