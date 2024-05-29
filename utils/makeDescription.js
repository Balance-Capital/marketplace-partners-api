const { AIClient } = require('p4u-client-ai');

const MAX_LOOPS = 5;

const logger = require('../services/logger');

/**
 * Generates a description using an AI client.
 * @param {string} description - The input description for which the AI will generate a text.
 * @param {string} [context=''] - The context in which the description is provided.
 * @returns {Promise<string|null>} The generated text based on the input description. If no text is generated, it returns null.
 * @throws {Error} If apiKey or taskId is not provided.
 */
const makeDescriptionAI = async (description, context = ' ') => {
  const apiKey = process.env.P4U_CLIENT_AI_KEY || null;
  const taskId = process.env.P4U_DESCRIPTION_TASK_ID || null;

  if (!apiKey || !taskId) {
    throw new Error('apiKey or taskId is not provided');
  }

  try {
    const client = new AIClient(apiKey);
    const request = {
      idTask: taskId,
      context,
      ask: description
    };

    for (let loops = 1; loops <= MAX_LOOPS; loops++) {
      const { data: { text = '' } = {} } = await client.runTask(request);
      if (text) {
        return text;
      }
    }

    return null;
  } catch (err) {
    logger.warning(`[makeDescription] makeDescriptionAI ${err?.message}`, err);
    return null;
  }
};

module.exports = { makeDescriptionAI };