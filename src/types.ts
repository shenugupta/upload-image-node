import type { Pool } from "pg";
import type { StoragePort } from "./ports/StoragePort";
import { FileType, HttpStatus, PostgresErrorCode, Profile } from "./enums";

export { FileType, Profile };

export type AwsClientAuth = {
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
};

export type AppConfig = {
  profile: Profile;
  port: number;
  expiresIn: number;
  publicBaseUrl: string;
  mock: {
    secret: string;
    uploadDir: string;
    bucket: string;
  };
  localstack: AwsClientAuth & {
    bucket: string;
    publicEndpoint: string;
  };
  aws: AwsClientAuth & {
    bucket?: string;
  };
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

export type UserFile = {
  id: number;
  filename: string;
  fileurl: string;
  filetype: FileType;
  doctype: string;
  is_verified: boolean;
  userid: number;
};

export type PublicUserFile = {
  filename: string;
  fileurl: string;
  filetype: FileType;
  doctype: string;
  is_verified: boolean;
};

export type UploadUrlResult = {
  url: string;
  key: string;
  bucket: string;
  expires: number;
};

export type GenerateUploadUrlResult = UploadUrlResult & {
  openUrl: string;
  getVideoUrl: string;
};

export type VideoResult = {
  url: string;
  key: string;
  bucket: string;
  contentType?: string;
  contentLength?: number;
  expires: number;
};

export type ListedObject = {
  key: string;
  size?: number;
  lastModified?: Date;
};

export type UrlBuilder = {
  openUrl(key: string): string;
  getVideoUrl(key: string): string;
};

export type FaceMatchImage = {
  bytes?: Buffer;
  filetype?: string;
  fileurl?: string;
  key?: string | null;
  bucket?: string;
  doctype?: string;
};

export type FaceMatchResult = {
  verified: boolean;
  similarity?: number;
  reason: string;
};

export type VerifyUserDocumentsResult = {
  verified: boolean;
  similarity?: number;
  reason: string;
  document: PublicUserFile | null;
  selfie: PublicUserFile | null;
};

export type FaceMatchInput = {
  document?: FaceMatchImage;
  selfie?: FaceMatchImage;
};

export interface RekognitionPort {
  verifyFaceMatch(input?: FaceMatchInput): Promise<FaceMatchResult>;
}

export type LambdaContext = {
  functionName?: string;
  awsRequestId?: string;
  invokedFunctionArn?: string;
};

export type QueryParamValue =
  | string
  | string[]
  | { [key: string]: QueryParamValue }
  | QueryParamValue[]
  | undefined;

export type ErrorLike = {
  name?: string;
  message?: string;
  code?: PostgresErrorCode | string | number;
  status?: HttpStatus;
  $metadata?: {
    httpStatusCode?: HttpStatus;
  };
  errorMessage?: string;
  errorType?: string;
};

export type CaughtError = Error | ErrorLike | string | null | undefined;

export type SignUpInput = {
  name?: string;
  email?: string;
  phone?: string;
};

export type SignInInput = {
  email?: string;
  phone?: string;
};

export type ResolveUserInput = {
  userId?: string | number;
  email?: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  phone: string | null;
};

export type CreateFileInput = {
  filename: string;
  filetype: FileType;
  fileurl: string;
  doctype: string;
  userid: number;
};

export type RecordUserFileInput = {
  userId?: string | number;
  email?: string;
  fileName?: string;
  contentType?: string;
  fileurl?: string;
  doctype?: string;
};

export type LambdaPayload = {
  fileName?: string;
  contentType?: string;
  key?: string;
  userId?: string | number;
  email?: string;
  doctype?: string;
};

export type VerifyDocumentsInput = Pick<LambdaPayload, "userId" | "email" | "doctype">;

export type StorageKeyInput = {
  key: string;
};

export type CreateUploadUrlInput = {
  key: string;
  contentType: string;
};

export type FileUploadMeta = Pick<LambdaPayload, "fileName" | "contentType">;

export type LambdaErrorPayload = {
  errorMessage?: string;
  errorType?: string;
};

export type ListedVideo = ListedObject & {
  openUrl: string;
  getVideoUrl: string;
};

export type GetVideoResult = VideoResult & {
  openUrl: string;
};

export type LambdaResult =
  | GenerateUploadUrlResult
  | GetVideoResult
  | ListedVideo[]
  | VerifyUserDocumentsResult;

export type LambdaHandler<
  TEvent = LambdaPayload,
  TResult = LambdaResult
> = (event: TEvent, context: LambdaContext) => Promise<TResult>;

export interface LambdaInvoker {
  invoke<TResult extends LambdaResult = LambdaResult>(
    functionName: string,
    payload: LambdaPayload
  ): Promise<TResult>;
}

export type UserStore = {
  init(): Promise<void>;
  findByEmail(email: string): Promise<UserProfile | null>;
  findById(id: number): Promise<UserProfile | null>;
  ensureMockUser(): Promise<UserProfile>;
  create(input: CreateUserInput): Promise<UserProfile>;
  createFile(input: CreateFileInput): Promise<UserFile>;
  markVerified(ids: number[]): Promise<UserFile[]>;
  findDocumentForUser(
    userid: number,
    doctype?: string
  ): Promise<UserFile | null>;
  findSelfieForUser(userid: number): Promise<UserFile | null>;
};

export type WorkflowInput = LambdaPayload;

export type WorkflowOutput = {
  profile: Profile;
  upload: GenerateUploadUrlResult;
  list: ListedVideo[];
  video: GetVideoResult | null;
  verification: VerifyUserDocumentsResult | null;
};

export type StorageDependencies = {
  storage: StoragePort;
  urls: UrlBuilder;
  directUpload: StoragePort | null;
};

export type LambdaRuntime = StorageDependencies & {
  config: AppConfig;
  users: UserStore;
  rekognition: RekognitionPort;
  pool?: Pool;
};
