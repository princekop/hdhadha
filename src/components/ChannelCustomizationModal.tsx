'use client'

import { useState, useRef } from 'react'
import { X, Upload, Image as ImageIcon, Video, FileText, Palette, Eye, EyeOff } from 'lucide-react'

interface ChannelCustomizationModalProps {
  isOpen: boolean
  onClose: () => void
  channel: any
  onSave: (channelId: string, customization: any) => void
}

export default function ChannelCustomizationModal({
  isOpen,
  onClose,
  channel,
  onSave
}: ChannelCustomizationModalProps) {
  const [customization, setCustomization] = useState({
    backgroundType: 'none', // 'none', 'image', 'video', 'gif', 'color'
    backgroundUrl: '',
    backgroundColor: '#1a1a1a',
    isPrivate: channel?.isPrivate || false
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      setCustomization(prev => ({
        ...prev,
        backgroundType: file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 'gif',
        backgroundUrl: result.url
      }))

      setUploadProgress(100)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSave = () => {
    onSave(channel.id, customization)
    onClose()
  }

  const getFileTypeIcon = () => {
    switch (customization.backgroundType) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'gif':
        return <FileText className="h-4 w-4" />
      default:
        return <Palette className="h-4 w-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 p-2 sm:p-4 flex">
      <div className="relative bg-gray-900 border border-white/20 w-full sm:max-w-md sm:mx-auto rounded-none sm:rounded-xl overflow-hidden h-[96vh] sm:h-auto self-stretch sm:self-center">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-xl">
          <h2 className="text-base sm:text-xl font-semibold text-white">
            Customize Channel: {channel?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 sm:space-y-6 px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto max-h-[calc(96vh-64px)] sm:max-h-none">
          {/* Background Type Selection */}
          <div>
            <label className="text-white text-sm font-medium mb-3 block">
              Background Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { type: 'none', label: 'None', icon: <EyeOff className="h-4 w-4" /> },
                { type: 'color', label: 'Color', icon: <Palette className="h-4 w-4" /> },
                { type: 'image', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
                { type: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> }
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => setCustomization(prev => ({ ...prev, backgroundType: option.type }))}
                  className={`p-2.5 sm:p-3 rounded-lg border transition-all duration-200 flex items-center space-x-2 ${
                    customization.backgroundType === option.type
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {option.icon}
                  <span className="text-xs sm:text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          {customization.backgroundType === 'color' && (
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Background Color
              </label>
              <input
                type="color"
                value={customization.backgroundColor}
                onChange={(e) => setCustomization(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-full h-12 rounded-lg border border-white/20 cursor-pointer"
              />
            </div>
          )}

          {/* File Upload */}
          {(customization.backgroundType === 'image' || customization.backgroundType === 'video') && (
            <div>
              <label className="text-white text-sm font-medium mb-3 block">
                Upload {customization.backgroundType === 'image' ? 'Image' : 'Video'}
              </label>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-4 sm:p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={customization.backgroundType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center space-x-2 mx-auto px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">
                    {isUploading ? `Uploading... ${uploadProgress}%` : 'Choose File'}
                  </span>
                </button>
                {isUploading && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {customization.backgroundType !== 'none' && (
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Preview
              </label>
              <div 
                className="w-full h-24 rounded-lg border border-white/20 relative overflow-hidden"
                style={{
                  backgroundColor: customization.backgroundType === 'color' ? customization.backgroundColor : 'transparent',
                  backgroundImage: customization.backgroundUrl ? `url(${customization.backgroundUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {customization.backgroundType === 'video' && customization.backgroundUrl && (
                  <video
                    src={customization.backgroundUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                  />
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-medium">
                    Channel Background Preview
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white text-sm font-medium">Private Channel</label>
              <p className="text-gray-400 text-xs">Only admins can see this channel</p>
            </div>
            <button
              onClick={() => setCustomization(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                customization.isPrivate ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                customization.isPrivate ? 'transform translate-x-6' : 'transform translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 z-10 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}