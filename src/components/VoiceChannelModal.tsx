'use client'

import { X, Mic, Headphones, Volume2, Users, Zap, Star } from 'lucide-react'

interface VoiceChannelModalProps {
  isOpen: boolean
  onClose: () => void
  channel: any
}

export default function VoiceChannelModal({
  isOpen,
  onClose,
  channel
}: VoiceChannelModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 p-2 sm:p-4 flex">
      <div className="relative bg-gray-900 border border-white/20 w-full sm:max-w-lg sm:mx-auto rounded-none sm:rounded-xl overflow-hidden h-[96vh] sm:h-auto self-stretch sm:self-center">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-xl">
          <h2 className="text-white text-lg sm:text-2xl font-bold flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="truncate max-w-[60vw] sm:max-w-none">{channel?.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="text-center space-y-5 sm:space-y-6 px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto max-h-[calc(96vh-64px)] sm:max-h-none">

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-purple-300 font-medium">Coming in Next Update</span>
          </div>

          {/* Feature Preview */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-semibold">Voice Channel Features</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <Mic className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <h4 className="text-white font-medium text-sm">Voice Chat</h4>
                <p className="text-gray-400 text-xs mt-1">Crystal clear audio</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <Headphones className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <h4 className="text-white font-medium text-sm">Noise Suppression</h4>
                <p className="text-gray-400 text-xs mt-1">Background noise removal</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <Volume2 className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <h4 className="text-white font-medium text-sm">Audio Controls</h4>
                <p className="text-gray-400 text-xs mt-1">Individual volume control</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <Users className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                <h4 className="text-white font-medium text-sm">User Management</h4>
                <p className="text-gray-400 text-xs mt-1">Mute, deafen, disconnect</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Development Progress</span>
              <span className="text-purple-400 font-medium">75%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: '75%' }} />
            </div>
          </div>

          {/* Estimated Release */}
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center justify-center space-x-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-white font-medium">Estimated Release: Next Week</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="h-2" />
        </div>

        {/* Sticky actions */}
        <div className="sticky bottom-0 z-10 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium"
          >
            Got it!
          </button>
          <button
            onClick={() => {
              alert('Thanks for your interest! We\'ll notify you when voice channels are ready.')
            }}
            className="flex-1 px-4 py-2 text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-colors font-medium"
          >
            Notify Me
          </button>
        </div>
      </div>
    </div>
  )
}