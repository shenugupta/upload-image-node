export enum Profile {
  Mock = "mock",
  Localstack = "localstack",
  Aws = "aws"
}

export enum FileType {
  Png = "png",
  Jpeg = "jpeg",
  Video = "video",
  Mov = "mov"
}

export enum FileExtension {
  Png = "png",
  Jpeg = "jpeg",
  Jpg = "jpg",
  Mov = "mov",
  Mp4 = "mp4",
  Webm = "webm",
  Mkv = "mkv",
  Avi = "avi"
}

export enum MimeType {
  Png = "image/png",
  Jpeg = "image/jpeg",
  Jpg = "image/jpg",
  Quicktime = "video/quicktime",
  Mp4 = "video/mp4",
  Webm = "video/webm",
  Matroska = "video/x-matroska",
  Avi = "video/x-msvideo",
  OctetStream = "application/octet-stream"
}

export enum DocType {
  Pan = "PAN",
  Aadhar = "AADHAR",
  Aadhaar = "AADHAAR",
  Selfie = "SELFIE",
  Other = "OTHER"
}

export enum LambdaState {
  Pending = "Pending",
  Active = "Active",
  Inactive = "Inactive",
  Failed = "Failed"
}

export enum LambdaLastUpdateStatus {
  Successful = "Successful",
  Failed = "Failed",
  InProgress = "InProgress"
}

export enum LambdaRuntime {
  Nodejs20 = "nodejs20.x"
}

export enum LambdaInvokerKind {
  Localstack = "localstack-lambda",
  Handler = "aws-lambda-handler"
}

export enum RekognitionMode {
  Aws = "aws-compare-faces",
  Localstack = "localstack-compare-faces",
  Mock = "mock-compare-faces"
}

export enum AwsErrorName {
  NotFound = "NotFound",
  NoSuchKey = "NoSuchKey",
  BucketAlreadyOwnedByYou = "BucketAlreadyOwnedByYou",
  BucketAlreadyExists = "BucketAlreadyExists",
  ResourceNotFoundException = "ResourceNotFoundException",
  ResourceConflictException = "ResourceConflictException"
}

export enum WorkflowState {
  GenerateUploadUrl = "GenerateUploadUrl",
  ListVideos = "ListVideos",
  GetVideo = "GetVideo",
  VerifyUserDocuments = "VerifyUserDocuments",
  Complete = "Complete"
}

export enum WorkflowStatus {
  Succeeded = "SUCCEEDED"
}

export enum HttpMethod {
  Get = "GET",
  Put = "PUT",
  Post = "POST",
  Head = "HEAD"
}

export enum HttpStatus {
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  Conflict = 409,
  InternalServerError = 500
}

export enum PostgresErrorCode {
  ForeignKeyViolation = "23503",
  UniqueViolation = "23505",
  CheckViolation = "23514"
}

export enum AwsPlaceholderCredential {
  Test = "test"
}

export enum PostgresHost {
  Localhost = "localhost",
  DockerInternal = "host.docker.internal"
}

export function isProfile(value: string | undefined): value is Profile {
  return Object.values(Profile).includes(value as Profile);
}
