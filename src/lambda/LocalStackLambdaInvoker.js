const { InvokeCommand } = require("@aws-sdk/client-lambda");

class LocalStackLambdaInvoker {
  constructor({ lambda, profile }) {
    this.lambda = lambda;
    this.profile = profile;
  }

  async invoke(functionName, payload) {
    console.log("[aws-lambda] Invoke", {
      profile: this.profile,
      runtime: "localstack-lambda",
      functionName,
      payload
    });

    const response = await this.lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        Payload: Buffer.from(JSON.stringify(payload))
      })
    );

    const result = JSON.parse(Buffer.from(response.Payload || []).toString() || "null");

    if (response.FunctionError) {
      console.log("[aws-lambda] InvokeError", {
        profile: this.profile,
        functionName,
        result
      });
      throw new Error(result.errorMessage || result.errorType || "Lambda failed");
    }

    console.log("[aws-lambda] InvokeComplete", {
      profile: this.profile,
      functionName,
      result
    });

    return result;
  }
}

module.exports = {
  LocalStackLambdaInvoker
};
