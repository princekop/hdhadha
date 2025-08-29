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
  const gradientPresets: { key: string; value: string; label: string }[] = [
    { key: 'lg-rgb', value: 'linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet)', label: 'RGB' },
    { key: 'lg-rgb-compact', value: 'linear-gradient(90deg,#f00,#0f0,#00f)', label: 'RGB Compact' },
    { key: 'lg-ice', value: 'linear-gradient(90deg,#8a2be2,#00ffff)', label: 'Ice' },
  ]
  const [customization, setCustomization] = useState({
    backgroundType: channel?.backgroundType || 'none', // 'none', 'image', 'video', 'gif', 'color', 'pattern'
    backgroundUrl: channel?.backgroundUrl || '',
    backgroundColor: channel?.backgroundColor || '#1a1a1a',
    isPrivate: channel?.isPrivate || false,
    // Channel name styling
    nameColor: channel?.nameColor || '',
    nameGradient: channel?.nameGradient || '',
    nameAnimation: channel?.nameAnimation || 'none',
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

  const getPatternStyle = (key: string): React.CSSProperties => {
    switch (key) {
      case 'checker-gradient':
        return {
          backgroundImage:
            'linear-gradient(45deg, rgb(248,255,182) 25%, transparent 25%, transparent 75%, rgb(248,255,182) 75%, rgb(248,255,182)), linear-gradient(135deg, rgb(248,255,182) 25%, rgb(0,3,49) 25%, rgb(0,3,49) 75%, rgb(248,255,182) 75%, rgb(248,255,182))',
          backgroundSize: '60px 60px',
          backgroundPosition: '0 0, 90px 90px',
        }
      case 'dark-stripes-cube':
        return { background: 'repeating-linear-gradient(135deg,#232526 0px,#232526 30px,#23252699 35px,#414345 65px)' }
      case 'radial-dots':
        return { backgroundColor: '#313131', backgroundImage: 'radial-gradient(rgba(255,255,255,0.171) 2px, transparent 0)', backgroundSize: '20px 20px', backgroundPosition: '-5px -5px' }
      case 'isometric-conic':
        return { backgroundImage: 'repeating-conic-gradient(from 30deg, #0000 0 120deg, #3c3c3c 0 180deg), repeating-conic-gradient(from 30deg, #1d1d1d 0 60deg, #4e4f51 0 120deg, #3c3c3c 0 180deg)', backgroundSize: '120px calc(120px * 0.577)', backgroundPosition: 'calc(0.5 * 120px) calc(0.5 * 120px * 0.577)' }
      case 'gridlines':
        return { backgroundColor: '#191a1a', backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(114,114,114,0.3) 25%, rgba(114,114,114,0.3) 26%, transparent 27%, transparent 74%, rgba(114,114,114,0.3) 75%, rgba(114,114,114,0.3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(114,114,114,0.3) 25%, rgba(114,114,114,0.3) 26%, transparent 27%, transparent 74%, rgba(114,114,114,0.3) 75%, rgba(114,114,114,0.3) 76%, transparent 77%, transparent)', backgroundSize: '35px 35px' }
      case 'noisy-mask':
        return { background: '#000' }
      default:
        return {}
    }
  }

  const getFileTypeIcon = () => {
    switch (customization.backgroundType) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'gif':
        return <FileText className="h-4 w-4" />
      case 'pattern':
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
          {/* Channel Name Style */}
          <div>
            <label className="text-white text-sm font-medium mb-3 block">Channel Name Style</label>
            <div className="grid grid-cols-1 gap-3">
              {/* Color */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-300">Text Color</span>
                  <input
                    type="color"
                    value={customization.nameColor || '#ffffff'}
                    onChange={(e) => setCustomization(prev => ({ ...prev, nameColor: e.target.value }))}
                    className="w-10 h-6 rounded border border-white/20 cursor-pointer"
                  />
                </div>
              </div>
              {/* Gradient Presets */}
              <div>
                <span className="text-xs text-gray-300 block mb-2">Gradient (overrides color)</span>
                <div className="grid grid-cols-3 gap-2">
                  {gradientPresets.map(g => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setCustomization(prev => ({ ...prev, nameGradient: g.value }))}
                      className={`h-8 rounded border text-[10px] text-white/90 ${customization.nameGradient === g.value ? 'border-purple-500 ring-2 ring-purple-500/40' : 'border-white/20 hover:border-white/40'}`}
                      style={{ backgroundImage: g.value }}
                      title={g.label}
                    >
                      {g.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomization(prev => ({ ...prev, nameGradient: '' }))}
                    className={`h-8 rounded border text-[10px] ${!customization.nameGradient ? 'border-purple-500 ring-2 ring-purple-500/40 text-white/90' : 'border-white/20 text-gray-300 hover:border-white/40 hover:text-white'}`}
                  >
                    None
                  </button>
                </div>
              </div>
              {/* Animation */}
              <div>
                <span className="text-xs text-gray-300 block mb-2">Animation</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'none', label: 'None' },
                    { key: 'rgb', label: 'RGB Flow' },
                    { key: 'rainbow', label: 'Hue Rotate' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCustomization(prev => ({ ...prev, nameAnimation: opt.key }))}
                      className={`h-8 rounded border text-[10px] ${customization.nameAnimation === opt.key ? 'border-purple-500 ring-2 ring-purple-500/40 text-white/90' : 'border-white/20 text-gray-300 hover:border-white/40 hover:text-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Background Type Selection */}
          <div>
            <label className="text-white text-sm font-medium mb-3 block">
              Background Type
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { type: 'none', label: 'None', icon: <EyeOff className="h-4 w-4" /> },
                { type: 'color', label: 'Color', icon: <Palette className="h-4 w-4" /> },
                { type: 'image', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
                { type: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> },
                { type: 'pattern', label: 'Pattern', icon: <FileText className="h-4 w-4" /> },
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

          {/* Pattern Presets */}
          {customization.backgroundType === 'pattern' && (
            <div>
              <label className="text-white text-sm font-medium mb-3 block">Pattern Presets</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  'checker-gradient',
                  'dark-stripes-cube',
                  'radial-dots',
                  'isometric-conic',
                  'gridlines',
                  'noisy-mask',
                ].map((key) => (
                  <button
                    key={key}
                    onClick={() => setCustomization(prev => ({ ...prev, backgroundUrl: key }))}
                    className={`h-16 rounded-lg border transition-all duration-200 ${
                      customization.backgroundUrl === key ? 'border-purple-500 ring-2 ring-purple-500/40' : 'border-white/20 hover:border-white/40'
                    }`}
                    style={getPatternStyle(key)}
                    title={key}
                  />
                ))}
              </div>
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
                  ...(customization.backgroundType === 'color' ? { backgroundColor: customization.backgroundColor } : {}),
                  ...(customization.backgroundType === 'image' || customization.backgroundType === 'gif'
                    ? { backgroundImage: customization.backgroundUrl ? `url(${customization.backgroundUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }
                    : {}),
                  ...(customization.backgroundType === 'pattern' && customization.backgroundUrl
                    ? getPatternStyle(customization.backgroundUrl)
                    : {}),
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