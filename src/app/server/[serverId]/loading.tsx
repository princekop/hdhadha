"use client";

// Prevent full-screen loader flicker on this route segment.
// Returning null avoids overlaying the chat UI during background updates.
export default function Loading() {
  return null;
}
