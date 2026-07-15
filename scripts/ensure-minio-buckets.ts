import 'dotenv/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';

async function main() {
  const client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: process.env.MINIO_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });

  const wanted = [
    process.env.MINIO_BUCKET_RAW || 'ged-raw',
    process.env.MINIO_BUCKET_RENDERED || 'ged-rendered',
    process.env.MINIO_BUCKET_ARCHIVE || 'ged-archive',
  ];

  const existing = await client.send(new ListBucketsCommand({}));
  console.log(
    'existing buckets:',
    existing.Buckets?.map((b) => b.Name) ?? [],
  );

  for (const name of wanted) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: name }));
      console.log('exists:', name);
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: name }));
      console.log('created:', name);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
