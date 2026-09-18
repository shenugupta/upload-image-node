class MockLambdaInvoker {
  constructor({ profile }) {
    this.profile = profile;
    this.handlers = {
      generateUploadUrl: require("./generateUploadUrl").handler,
      listVideos: require("./listVideos").handler,
      getVideo: require("./getVideo").handler
    };
  }

  async invoke(functionName, payload) {
    console.log("[aws-lambda] Invoke", {
      profile: this.profile,
      runtime: "aws-lambda-handler",
      functionName,
      payload
    });

    const handler = this.handlers[functionName];

    if (!handler) {
      throw new Error(`Unknown Lambda function: ${functionName}`);
    }

    const context = {
      functionName,
      awsRequestId: `mock-${Date.now()}`,
      invokedFunctionArn: `arn:aws:lambda:us-east-1:000000000000:function:${functionName}`
    };

    const result = await handler(payload, context);

    console.log("[aws-lambda] InvokeComplete", {
      profile: this.profile,
      functionName,
      result
    });

    return result;
  }
}

module.exports = {
  MockLambdaInvoker
};
