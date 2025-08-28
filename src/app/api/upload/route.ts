import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)} MB` },
        { status: 400 }
      )
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // Try Vercel Blob first, fallback to local storage
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'your_vercel_blob_token_here') {
        // Upload to Vercel Blob
        const blob = await put(filename, file, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })

        return NextResponse.json({ 
          url: blob.url,
          filename: file.name,
          size: file.size,
          type: file.type
        })
      }
    } catch (blobError) {
      console.log('Vercel Blob upload failed, falling back to local storage:', blobError)
    }

    // Fallback: Local file storage for development
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    
    // Ensure uploads directory exists
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      console.log('Uploads directory already exists or could not be created')
    }

    const filePath = join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)
    
    const localUrl = `/uploads/${filename}`

    return NextResponse.json({ 
      url: localUrl,
      filename: file.name,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
} 