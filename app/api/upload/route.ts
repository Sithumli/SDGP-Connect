// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { ADMIN_READ_ROLES, requireRole, STUDENT_ROLES } from '@/lib/auth/permissions';

// ✅ Allow only these MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole([...STUDENT_ROLES, ...ADMIN_READ_ROLES]);
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ message: "No image provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json({ message: "File too large" }, { status: 413 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ message: "File type not allowed" }, { status: 400 });
    }

    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return NextResponse.json({ message: "Missing AWS config" }, { status: 500 });
    }

    const s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    const uniqueName = `${uuidv4()}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: uniqueName,
        Body: buffer,
        ContentType: file.type,
        ContentDisposition: 'attachment',
      })
    );

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${uniqueName}`;
    return NextResponse.json({ success: true, url: publicUrl });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
