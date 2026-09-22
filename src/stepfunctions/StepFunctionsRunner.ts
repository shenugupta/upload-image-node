import { LAMBDA_FUNCTIONS } from "../lambda/functionNames";
import { errorMessage } from "../errors";
import type { LambdaInvoker, Profile, WorkflowInput } from "../types";

export class StepFunctionsRunner {
  lambdaInvoker: LambdaInvoker;
  profile: Profile;

  constructor({
    lambdaInvoker,
    profile
  }: {
    lambdaInvoker: LambdaInvoker;
    profile: Profile;
  }) {
    this.lambdaInvoker = lambdaInvoker;
    this.profile = profile;
  }

  async startExecution(input: WorkflowInput = {}): Promise<{
    executionName: string;
    status: string;
    profile: Profile;
    output: Record<string, unknown>;
  }> {
    const executionName = `video-workflow-${Date.now()}`;

    console.log("[stepfunctions] ExecutionStarted", {
      profile: this.profile,
      executionName,
      input
    });

    console.log("[stepfunctions] TaskStateEntered", {
      profile: this.profile,
      state: "GenerateUploadUrl",
      resource: LAMBDA_FUNCTIONS.generateUploadUrl
    });
    const upload = await this.lambdaInvoker.invoke<{ key: string }>(
      LAMBDA_FUNCTIONS.generateUploadUrl,
      input
    );
    console.log("[stepfunctions] TaskStateExited", {
      profile: this.profile,
      state: "GenerateUploadUrl",
      output: upload
    });

    console.log("[stepfunctions] TaskStateEntered", {
      profile: this.profile,
      state: "ListVideos",
      resource: LAMBDA_FUNCTIONS.listVideos
    });
    const list = await this.lambdaInvoker.invoke<unknown[]>(
      LAMBDA_FUNCTIONS.listVideos,
      {}
    );
    console.log("[stepfunctions] TaskStateExited", {
      profile: this.profile,
      state: "ListVideos",
      output: { count: Array.isArray(list) ? list.length : 0 }
    });

    let video: unknown = null;
    let verification: unknown = null;
    try {
      console.log("[stepfunctions] TaskStateEntered", {
        profile: this.profile,
        state: "GetVideo",
        resource: LAMBDA_FUNCTIONS.getVideo
      });
      video = await this.lambdaInvoker.invoke(LAMBDA_FUNCTIONS.getVideo, {
        key: upload.key
      });
      console.log("[stepfunctions] TaskStateExited", {
        profile: this.profile,
        state: "GetVideo",
        output: video
      });
    } catch (error) {
      console.log("[stepfunctions] TaskFailed", {
        profile: this.profile,
        state: "GetVideo",
        error: errorMessage(error)
      });
      console.log("[stepfunctions] Catch", {
        profile: this.profile,
        next: "VerifyUserDocuments"
      });
    }

    try {
      console.log("[stepfunctions] TaskStateEntered", {
        profile: this.profile,
        state: "VerifyUserDocuments",
        resource: LAMBDA_FUNCTIONS.verifyUserDocuments
      });
      verification = await this.lambdaInvoker.invoke(
        LAMBDA_FUNCTIONS.verifyUserDocuments,
        {
          userId: input.userId,
          email: input.email,
          doctype: input.doctype
        }
      );
      console.log("[stepfunctions] TaskStateExited", {
        profile: this.profile,
        state: "VerifyUserDocuments",
        output: verification
      });
    } catch (error) {
      console.log("[stepfunctions] TaskFailed", {
        profile: this.profile,
        state: "VerifyUserDocuments",
        error: errorMessage(error)
      });
      console.log("[stepfunctions] Catch", {
        profile: this.profile,
        next: "Complete"
      });
    }

    const output = {
      profile: this.profile,
      upload,
      list,
      video,
      verification
    };

    console.log("[stepfunctions] ExecutionSucceeded", {
      profile: this.profile,
      executionName,
      output
    });

    return {
      executionName,
      status: "SUCCEEDED",
      profile: this.profile,
      output
    };
  }
}
