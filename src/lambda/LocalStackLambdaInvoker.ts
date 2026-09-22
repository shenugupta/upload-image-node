import { InvokeCommand, type LambdaClient } from "@aws-sdk/client-lambda";
import { LambdaInvokerKind } from "../enums";
import type { LambdaInvoker, Profile } from "../types";

export class LocalStackLambdaInvoker implements LambdaInvoker {
  lambda: LambdaClient;
  profile: Profile;

  constructor({ lambda, profile }: { lambda: LambdaClient; profile: Profile }) {
    this.lambda = lambda;
    this.profile = profile;
  }

  async invoke<TResult = unknown>(
    functionName: string,
    payload: Record<string, unknown>
  ): Promise<TResult> {
    console.log("[aws-lambda] Invoke", {
      profile: this.profile,
      runtime: LambdaInvokerKind.Localstack,
      functionName,
      payload
    });

    const response = await this.lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        Payload: Buffer.from(JSON.stringify(payload))
      })
    );

    const result = JSON.parse(
      Buffer.from(response.Payload || []).toString() || "null"
    ) as TResult & { errorMessage?: string; errorType?: string };

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
