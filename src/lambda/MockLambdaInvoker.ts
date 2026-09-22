import type { LambdaContext, LambdaHandler, LambdaInvoker, Profile } from "../types";
import { handler as generateUploadUrl } from "./generateUploadUrl";
import { handler as listVideos } from "./listVideos";
import { handler as getVideo } from "./getVideo";
import { handler as verifyUserDocuments } from "./verifyUserDocuments";
import { LAMBDA_FUNCTIONS, type LambdaFunctionName } from "./functionNames";

export class MockLambdaInvoker implements LambdaInvoker {
  profile: Profile;
  handlers: Record<LambdaFunctionName, LambdaHandler>;

  constructor({ profile }: { profile: Profile }) {
    this.profile = profile;
    this.handlers = {
      [LAMBDA_FUNCTIONS.generateUploadUrl]: generateUploadUrl,
      [LAMBDA_FUNCTIONS.listVideos]: listVideos,
      [LAMBDA_FUNCTIONS.getVideo]: getVideo,
      [LAMBDA_FUNCTIONS.verifyUserDocuments]: verifyUserDocuments
    };
  }

  async invoke<TResult = unknown>(
    functionName: string,
    payload: Record<string, unknown>
  ): Promise<TResult> {
    console.log("[aws-lambda] Invoke", {
      profile: this.profile,
      runtime: "aws-lambda-handler",
      functionName,
      payload
    });

    const handler = this.handlers[functionName as LambdaFunctionName];

    if (!handler) {
      throw new Error(`Unknown Lambda function: ${functionName}`);
    }

    const context: LambdaContext = {
      functionName,
      awsRequestId: `mock-${Date.now()}`,
      invokedFunctionArn: `arn:aws:lambda:us-east-1:000000000000:function:${functionName}`
    };

    const result = (await handler(payload, context)) as TResult;

    console.log("[aws-lambda] InvokeComplete", {
      profile: this.profile,
      functionName,
      result
    });

    return result;
  }
}
