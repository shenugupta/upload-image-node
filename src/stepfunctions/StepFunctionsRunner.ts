import { LAMBDA_FUNCTIONS } from "../lambda/functionNames";
import { errorMessage } from "../errors";
import { WorkflowState, WorkflowStatus } from "../enums";
import type {
  GenerateUploadUrlResult,
  GetVideoResult,
  LambdaInvoker,
  ListedVideo,
  Profile,
  VerifyUserDocumentsResult,
  WorkflowInput,
  WorkflowOutput
} from "../types";

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
    status: WorkflowStatus;
    profile: Profile;
    output: WorkflowOutput;
  }> {
    const executionName = `video-workflow-${Date.now()}`;

    console.log("[stepfunctions] ExecutionStarted", {
      profile: this.profile,
      executionName,
      input
    });

    console.log("[stepfunctions] TaskStateEntered", {
      profile: this.profile,
      state: WorkflowState.GenerateUploadUrl,
      resource: LAMBDA_FUNCTIONS.generateUploadUrl
    });
    const upload = await this.lambdaInvoker.invoke<GenerateUploadUrlResult>(
      LAMBDA_FUNCTIONS.generateUploadUrl,
      input
    );
    console.log("[stepfunctions] TaskStateExited", {
      profile: this.profile,
      state: WorkflowState.GenerateUploadUrl,
      output: upload
    });

    console.log("[stepfunctions] TaskStateEntered", {
      profile: this.profile,
      state: WorkflowState.ListVideos,
      resource: LAMBDA_FUNCTIONS.listVideos
    });
    const list = await this.lambdaInvoker.invoke<ListedVideo[]>(
      LAMBDA_FUNCTIONS.listVideos,
      {}
    );
    console.log("[stepfunctions] TaskStateExited", {
      profile: this.profile,
      state: WorkflowState.ListVideos,
      output: { count: Array.isArray(list) ? list.length : 0 }
    });

    let video: GetVideoResult | null = null;
    let verification: VerifyUserDocumentsResult | null = null;
    try {
      console.log("[stepfunctions] TaskStateEntered", {
        profile: this.profile,
        state: WorkflowState.GetVideo,
        resource: LAMBDA_FUNCTIONS.getVideo
      });
      video = await this.lambdaInvoker.invoke<GetVideoResult>(
        LAMBDA_FUNCTIONS.getVideo,
        {
          key: upload.key
        }
      );
      console.log("[stepfunctions] TaskStateExited", {
        profile: this.profile,
        state: WorkflowState.GetVideo,
        output: video
      });
    } catch (error) {
      console.log("[stepfunctions] TaskFailed", {
        profile: this.profile,
        state: WorkflowState.GetVideo,
        error: errorMessage(error)
      });
      console.log("[stepfunctions] Catch", {
        profile: this.profile,
        next: WorkflowState.VerifyUserDocuments
      });
    }

    try {
      console.log("[stepfunctions] TaskStateEntered", {
        profile: this.profile,
        state: WorkflowState.VerifyUserDocuments,
        resource: LAMBDA_FUNCTIONS.verifyUserDocuments
      });
      verification = await this.lambdaInvoker.invoke<VerifyUserDocumentsResult>(
        LAMBDA_FUNCTIONS.verifyUserDocuments,
        {
          userId: input.userId,
          email: input.email,
          doctype: input.doctype
        }
      );
      console.log("[stepfunctions] TaskStateExited", {
        profile: this.profile,
        state: WorkflowState.VerifyUserDocuments,
        output: verification
      });
    } catch (error) {
      console.log("[stepfunctions] TaskFailed", {
        profile: this.profile,
        state: WorkflowState.VerifyUserDocuments,
        error: errorMessage(error)
      });
      console.log("[stepfunctions] Catch", {
        profile: this.profile,
        next: WorkflowState.Complete
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
      status: WorkflowStatus.Succeeded,
      profile: this.profile,
      output
    };
  }
}
