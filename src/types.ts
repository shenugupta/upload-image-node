import type { Pool } from "pg";
import type { StoragePort } from "./ports/StoragePort";
import { FileType, Profile } from "./enums";

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

export interface RekognitionPort {
  verifyFaceMatch(input?: {
    document?: FaceMatchImage;
    selfie?: FaceMatchImage;
  }): Promise<FaceMatchResult>;
}

export type LambdaContext = {
  functionName?: string;
  awsRequestId?: string;
  invokedFunctionArn?: string;
};

export type LambdaHandler<TEvent = Record<string, unknown>, TResult = unknown> = (
  event: TEvent,
  context: LambdaContext
) => Promise<TResult>;

export interface LambdaInvoker {
  invoke<TResult = unknown>(
    functionName: string,
    payload: Record<string, unknown>
  ): Promise<TResult>;
}

export type UserStore = {
  init(): Promise<void>;
  findByEmail(email: string): Promise<UserProfile | null>;
  findById(id: number): Promise<UserProfile | null>;
  ensureMockUser(): Promise<UserProfile>;
  create(input: {
    name: string;
    email: string;
    phone: string | null;
  }): Promise<UserProfile>;
  createFile(input: {
    filename: string;
    filetype: FileType;
    fileurl: string;
    doctype: string;
    userid: number;
  }): Promise<UserFile>;
  markVerified(ids: number[]): Promise<UserFile[]>;
  findDocumentForUser(
    userid: number,
    doctype?: string
  ): Promise<UserFile | null>;
  findSelfieForUser(userid: number): Promise<UserFile | null>;
};

export type WorkflowInput = {
  fileName?: string;
  contentType?: string;
  userId?: string | number;
  email?: string;
  doctype?: string;
  key?: string;
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
