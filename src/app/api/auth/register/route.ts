import { NextRequest, NextResponse } from 'next/server'
import { createUser, getUserByEmail, getUserByUsername } from '@/lib/auth'
import { RegisterCredentials, ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: RegisterCredentials = await request.json()
    const { email, username, displayName, password } = body

    // Validation
    if (!email || !username || !displayName || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All fields are required'
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Password must be at least 6 characters long'
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUserByEmail = await getUserByEmail(email)
    if (existingUserByEmail) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User with this email already exists'
      }, { status: 409 })
    }

    const existingUserByUsername = await getUserByUsername(username)
    if (existingUserByUsername) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Username is already taken'
      }, { status: 409 })
    }

    // Create user
    const user = await createUser({
      email,
      username,
      displayName,
      password
    })

    // Remove password from response safely without relying on type having 'password'
    const userWithoutPassword = { ...(user as any) }
    if ('password' in userWithoutPassword) {
      delete (userWithoutPassword as any).password
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: userWithoutPassword,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 