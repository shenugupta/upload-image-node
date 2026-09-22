const { MockRekognition } = require("../recognition/MockRekognition");
const { AwsRekognition } = require("../recognition/AwsRekognition");
const { createRekognitionClient } = require("./createRekognitionClient");

function createRekognition(config) {
  if (config.profile === "mock") {
    return new MockRekognition();
  }

  if (config.profile === "aws") {
    return new AwsRekognition({
      client: createRekognitionClient(config.aws),
      localStack: false
    });
  }

  return new AwsRekognition({
    client: createRekognitionClient(config.localstack),
    localStack: true
  });
}

module.exports = {
  createRekognition
};
