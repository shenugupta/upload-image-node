export const LAMBDA_FUNCTIONS = {
  generateUploadUrl: "generateUploadUrl",
  listVideos: "listVideos",
  getVideo: "getVideo",
  verifyUserDocuments: "verifyUserDocuments"
} as const;

export type LambdaFunctionName =
  (typeof LAMBDA_FUNCTIONS)[keyof typeof LAMBDA_FUNCTIONS];
