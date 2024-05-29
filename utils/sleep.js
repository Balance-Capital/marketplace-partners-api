/**
 * sleep - A function that pauses the execution for a specified number of seconds.
 *
 * @param {number} seconds - The number of seconds to sleep.
 * @returns {Promise} - A promise that resolves after the specified number of seconds.
 */
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

module.exports = sleep
