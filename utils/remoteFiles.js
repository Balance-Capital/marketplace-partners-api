const fetch = require('node-fetch')

const { DEFAULT_IMAGE_PRODUCT } = require('../constants/defaultImageProduct')

const { DEFAULT_IMAGE_STORE } = require('../constants/defaultImageStore')

const { IMAGE_TYPE_STORE_LOGO, IMAGE_TYPE_PRODUCT } = require('../constants/imageType')

const PATH_TO_PRODUCT_IMAGE = 'assets/images/products'
const PATH_TO_STORE_IMAGE = 'assets/images/stores'

const CONN_TIME_OUT = 150000;

const VALID_EXTENSION = ['png','jpg','gif','svg', 'jpeg'];

const ISSUE_STATUS = 415;

const logger = require('../services/logger')

AbortSignal.timeout ??= function timeout(ms) {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), ms)
  return ctrl.signal
}

/**
 * Determines the file extension of a given buffer by comparing the first four bytes of the buffer with predefined file type signatures.
 * @param {ArrayBuffer} buffer - The buffer containing the file data.
 * @returns {string|null} - The file extension of the given buffer, or null if the file extension cannot be determined.
 */
const detectFileExtension = (buffer) => {
  const fileType = {
    jpg: 'FFD8',
    png: '89504E47',
    gif: '47494638',
    bmp: '424D',
    tiff: ['49492A00', '4D4D002A'],
    webp: '52494646'
  };

  const uint8Array = new Uint8Array(buffer);
  let hex = '';

  for (let i = 0; i < 4; i++) {
    hex += uint8Array[i].toString(16).toUpperCase();
  }

  for (let key in fileType) {
    const signatures = Array.isArray(fileType[key]) ? fileType[key] : [fileType[key]];
    if (signatures.some(signature => hex.startsWith(signature))) {
      return key;
    }
  }

  return null;
}

/**
 * Checks if a given file name has a valid extension.
 * @param {string} fileName - The name of the file.
 * @returns {boolean} - True if the file extension is valid, false otherwise.
 */
const isValidFileExtension = (fileName) => {
  const fileExtension = fileName.split('.').pop();
  return VALID_EXTENSION.includes(fileExtension);
}


/**
 * Retrieves an image from a remote server.
 * @param {string} url - The URL of the image to retrieve from the remote server.
 * @param {string} _fileName - The original file name of the image.
 * @param {string} [imageType='product'] - The type of the image.
 * @returns {Promise<Object>} - An object containing the file name, path and name, file data, status code, and file extension validity.
 * @throws {Error} - If the request fails, the file extension is not detected, or the file extension is invalid.
 */
const getImageFromRemoteServer = async (url, _fileName, imageType = 'product') => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(CONN_TIME_OUT),
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const body = await response.arrayBuffer();
    const buff = Buffer.from(body, 'binary');
    const fileExt = detectFileExtension(buff);
    if (!fileExt) {
      throw new Error('Detect file extension error: ext null');
    }
    const isValidFileExt = isValidFileExtension(_fileName);
    const fileName = isValidFileExt
      ? _fileName
      : `${_fileName.toString().replace('.', '_')}.${fileExt}`;
    
    const pathAndName =
      imageType === IMAGE_TYPE_STORE_LOGO
        ? `${PATH_TO_STORE_IMAGE}/${fileName}`
        : `${PATH_TO_PRODUCT_IMAGE}/${fileName}`;

    return {
      fileName,
      pathAndName,
      fileData: buff,
      status: response.status,
      fileExt: isValidFileExt
    };
  } catch (err) {
    // logger.warning(`[remoteFiles] fetch getImageFromRemoteServer ${err?.message}`, err);
    const fN =
      imageType === IMAGE_TYPE_STORE_LOGO
        ? DEFAULT_IMAGE_STORE.split('/')
        : DEFAULT_IMAGE_PRODUCT.split('/');

    const fileName = fN[fN.length - 1];
    const isValidFileExt = isValidFileExtension(_fileName);
    return {
      fileName,
      pathAndName:
        imageType === IMAGE_TYPE_STORE_LOGO
          ? DEFAULT_IMAGE_STORE
          : DEFAULT_IMAGE_PRODUCT,
      fileData: null,
      status: ISSUE_STATUS,
      fileExt: isValidFileExt
    };
  }
};

module.exports = {
  getImageFromRemoteServer,
  isValidFileExtension,
  detectFileExtension
}