import { createStorageDependencies } from "./createStorage";
import { MockLambdaInvoker } from "./lambda/MockLambdaInvoker";
import { LocalStackLambdaInvoker } from "./lambda/LocalStackLambdaInvoker";
import { createLambdaClient } from "./infrastructure/createLambdaClient";
import { ensureLocalStackLambdas } from "./lambda/deployLocalStackLambdas";
import { StepFunctionsRunner } from "./stepfunctions/StepFunctionsRunner";
import { createPostgresPool } from "./infrastructure/createPostgresPool";
import { PostgresUserStore } from "./users/PostgresUserStore";
import type { AppConfig, LambdaInvoker, StorageDependencies, UserStore } from "./types";

type ContainerDependencies = StorageDependencies & {
  lambdaInvoker: LambdaInvoker;
  stepFunctions: StepFunctionsRunner;
};

function withWorkflow(
  deps: StorageDependencies,
  lambdaInvoker: LambdaInvoker
): ContainerDependencies {
  const stepFunctions = new StepFunctionsRunner({
    lambdaInvoker,
    profile: deps.storage.profile
  });

  return {
    ...deps,
    lambdaInvoker,
    stepFunctions
  };
}

async function createMockDependencies(
  config: AppConfig
): Promise<ContainerDependencies> {
  const deps = createStorageDependencies(config);
  const lambdaInvoker = new MockLambdaInvoker({
    profile: deps.storage.profile
  });

  return withWorkflow(deps, lambdaInvoker);
}

async function createLocalstackDependencies(
  config: AppConfig
): Promise<ContainerDependencies> {
  const deps = createStorageDependencies(config);
  const lambda = createLambdaClient(config.localstack);

  await ensureLocalStackLambdas({ lambda, config });

  const lambdaInvoker = new LocalStackLambdaInvoker({
    lambda,
    profile: deps.storage.profile
  });

  return withWorkflow(deps, lambdaInvoker);
}

export async function createContainer(config: AppConfig): Promise<
  ContainerDependencies & {
    config: AppConfig;
    users: UserStore;
  }
> {
  let dependencies: ContainerDependencies;

  if (process.env.PROFILE === "mock" || process.env.PROFILE === "aws") {
    dependencies = await createMockDependencies(config);
  } else if (process.env.PROFILE === "localstack") {
    dependencies = await createLocalstackDependencies(config);
  } else {
    throw new Error(
      `Unknown PROFILE "${process.env.PROFILE || ""}". Use npm run start:mock, npm run start:localstack, or npm run start:aws`
    );
  }

  const users = new PostgresUserStore({
    pool: createPostgresPool(config)
  });

  return {
    config,
    users,
    ...dependencies
  };
}
