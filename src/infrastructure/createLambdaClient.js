const { LambdaClient } = require("@aws-sdk/client-lambda");

function createLambdaClient({ region, endpoint, accessKeyId, secretAccessKey }) {
  return new LambdaClient({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

module.exports = {
  createLambdaClient
};
