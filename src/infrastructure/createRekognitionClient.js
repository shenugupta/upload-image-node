const { RekognitionClient } = require("@aws-sdk/client-rekognition");

function createRekognitionClient({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  sessionToken
}) {
  const client = {
    region
  };

  if (accessKeyId && secretAccessKey) {
    client.credentials = {
      accessKeyId,
      secretAccessKey
    };

    if (sessionToken) {
      client.credentials.sessionToken = sessionToken;
    }
  }

  if (endpoint) {
    client.endpoint = endpoint;
  }

  return new RekognitionClient(client);
}

module.exports = {
  createRekognitionClient
};
