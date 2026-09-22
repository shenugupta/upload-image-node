const { createStorageDependencies } = require("./createStorage");
const { MockLambdaInvoker } = require("./lambda/MockLambdaInvoker");
const { LocalStackLambdaInvoker } = require("./lambda/LocalStackLambdaInvoker");
const { createLambdaClient } = require("./infrastructure/createLambdaClient");
const { ensureLocalStackLambdas } = require("./lambda/deployLocalStackLambdas");
const { StepFunctionsRunner } = require("./stepfunctions/StepFunctionsRunner");
const { createPostgresPool } = require("./infrastructure/createPostgresPool");
const { PostgresUserStore } = require("./users/PostgresUserStore");

function withWorkflow(deps, lambdaInvoker) {
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

async function createMockDependencies(config) {
  const deps = createStorageDependencies(config);
  const lambdaInvoker = new MockLambdaInvoker({
    profile: deps.storage.profile
  });

  return withWorkflow(deps, lambdaInvoker);
}

async function createLocalstackDependencies(config) {
  const deps = createStorageDependencies(config);
  const lambda = createLambdaClient(config.localstack);

  await ensureLocalStackLambdas({ lambda, config });

  const lambdaInvoker = new LocalStackLambdaInvoker({
    lambda,
    profile: deps.storage.profile
  });

  return withWorkflow(deps, lambdaInvoker);
}

async function createContainer(config) {
  let dependencies;

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

module.exports = {
  createContainer
};
