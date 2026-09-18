const { getLambdaRuntime } = require("./runtime");

exports.handler = async (event, context) => {
  console.log("[aws-lambda] generateUploadUrl invoked", {
    profile: process.env.PROFILE,
    functionName: context.functionName,
    awsRequestId: context.awsRequestId,
    event
  });

  const { storage, urls } = await getLambdaRuntime();
  const { fileName, contentType } = event;

  if (!fileName || !contentType) {
    console.log("[aws-lambda] generateUploadUrl failed", {
      reason: "fileName and contentType are required"
    });
    throw new Error("fileName and contentType are required");
  }

  const key = `uploads/${Date.now()}-${fileName}`;
  const data = await storage.createUploadUrl({ key, contentType });
  const result = {
    ...data,
    openUrl: urls.openUrl(key),
    getVideoUrl: urls.getVideoUrl(key)
  };

  console.log("[aws-lambda] generateUploadUrl success", result);
  return result;
};
