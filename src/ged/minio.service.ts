import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService {
  private readonly enabled = process.env.MINIO_ENABLED === 'true';
  private readonly endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
  private readonly region = process.env.MINIO_REGION ?? 'us-east-1';
  private readonly accessKeyId = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
  private readonly secretAccessKey =
    process.env.MINIO_SECRET_KEY ?? 'minioadmin';
  private readonly forcePathStyle =
    process.env.MINIO_FORCE_PATH_STYLE !== 'false';

  private readonly client: S3Client | null = this.enabled
    ? new S3Client({
        endpoint: this.endpoint,
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
        forcePathStyle: this.forcePathStyle,
      })
    : null;

  isEnabled(): boolean {
    return this.enabled;
  }

  async putObject(params: {
    bucket: string;
    key: string;
    body: Buffer | Uint8Array | string;
    contentType: string;
    contentEncoding?: string;
  }) {
    const client = this.getClientOrThrow();
    await client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        ContentEncoding: params.contentEncoding,
      }),
    );

    return { bucket: params.bucket, key: params.key };
  }

  async getObject(params: { bucket: string; key: string }) {
    const client = this.getClientOrThrow();
    return client.send(
      new GetObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      }),
    );
  }

  async getObjectAsBuffer(params: { bucket: string; key: string }) {
    const objectResponse = await this.getObject(params);
    if (!objectResponse.Body) {
      throw new Error('Object body is empty.');
    }

    if ('transformToByteArray' in objectResponse.Body) {
      const bytes = await objectResponse.Body.transformToByteArray();
      return Buffer.from(bytes);
    }

    throw new Error('Unable to read object body as buffer.');
  }

  async removeObject(params: { bucket: string; key: string }) {
    const client = this.getClientOrThrow();
    await client.send(
      new DeleteObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      }),
    );
  }

  async getSignedDownloadUrl(params: {
    bucket: string;
    key: string;
    expiresInSeconds?: number;
  }) {
    const client = this.getClientOrThrow();
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    return getSignedUrl(client, command, {
      expiresIn: params.expiresInSeconds ?? 300,
    });
  }

  private getClientOrThrow(): S3Client {
    if (!this.client) {
      throw new Error(
        'MinIO is disabled. Set MINIO_ENABLED=true and provide MinIO credentials.',
      );
    }
    return this.client;
  }
}
