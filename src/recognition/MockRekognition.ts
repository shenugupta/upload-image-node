import type { FaceMatchInput, FaceMatchResult, RekognitionPort } from "../types";

export class MockRekognition implements RekognitionPort {
  async verifyFaceMatch({
    document,
    selfie
  }: FaceMatchInput = {}): Promise<FaceMatchResult> {
    console.log("[rekognition] mock face match", {
      document: document?.fileurl,
      selfie: selfie?.fileurl
    });

    if (!document?.fileurl || !selfie?.fileurl) {
      return {
        verified: false,
        similarity: 0,
        reason: "Document and selfie fileurl are required"
      };
    }

    return {
      verified: true,
      similarity: 99,
      reason: "Mock Rekognition matched selfie with PAN/AADHAR"
    };
  }
}
