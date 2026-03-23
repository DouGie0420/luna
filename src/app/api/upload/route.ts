import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

function extFromMime(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'video/webm': 'webm',
        'application/pdf': 'pdf',
    };
    return map[mimeType] ?? mimeType.split('/')[1] ?? 'bin';
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const folder = (formData.get('folder') as string) || 'uploads';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = extFromMime(file.type);
        const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        await s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        }));

        const url = `${process.env.R2_PUBLIC_URL}/${key}`;
        return NextResponse.json({ url });
    } catch (error) {
        console.error('[R2 Upload]', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
