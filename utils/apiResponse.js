// backend/utils/apiResponce.js

/**
 * Standardized API Response shape as per Blueprint
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {Boolean} success - Success flag
 * @param {Array|Object} data - The actual payload
 * @param {Object} meta - SEO, Pagination, or Context data
 * @param {String} message - Human readable message
 */
export const sendResponse = (res, statusCode, success, data = null, meta = {}, message = "") => {
  return res.status(statusCode).json({
    success,
    message,
    data: data, // Always under 'data' key
    meta: {
      total: Array.isArray(data) ? data.length : (data ? 1 : 0),
      ...meta
    }
  });
};