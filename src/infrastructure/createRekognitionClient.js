const { RekognitionClient } = require("@aws-sdk/client-rekognition");

function createRekognitionClient({ region, endpoint, accessKeyId, secretAccessKey }) {
  const client = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  };

  if (endpoint) {
    client.endpoint = endpoint;
  }

  return new RekognitionClient(client);
}

module.exports = {
  createRekognitionClient
};
