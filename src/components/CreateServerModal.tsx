'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, Cloud, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CreateServerModalProps {
  onClose: () => void
  onServerCreated: (server: any) => void
  userId: string
}

export default function CreateServerModal({ onClose, onServerCreated, userId }: CreateServerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    iconFile: null as File | null,
    bannerFile: null as File | null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [iconPreview, setIconPreview] = useState<string>('')
  const [bannerPreview, setBannerPreview] = useState<string>('')
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (iconPreview) URL.revokeObjectURL(iconPreview)
      if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    }
  }, [iconPreview, bannerPreview])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      
      if (type === 'icon') {
        setFormData(prev => ({ ...prev, iconFile: file }))
        setIconPreview(previewUrl)
      } else {
        setFormData(prev => ({ ...prev, bannerFile: file }))
        setBannerPreview(previewUrl)
      }
    }
  }

  const uploadToBlob = async (file: File, type: 'icon' | 'banner'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Set uploading state
    if (type === 'icon') {
      setUploadingIcon(true)
    } else {
      setUploadingBanner(true)
    }
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data.url
    } finally {
      // Clear uploading state
      if (type === 'icon') {
        setUploadingIcon(false)
      } else {
        setUploadingBanner(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setUploadProgress(0)

    try {
      let iconUrl = formData.icon
      let bannerUrl = ''

      // Upload icon if file is selected
      if (formData.iconFile) {
        setUploadProgress(25)
        iconUrl = await uploadToBlob(formData.iconFile, 'icon')
      }

      // Upload banner if file is selected
      if (formData.bannerFile) {
        setUploadProgress(50)
        bannerUrl = await uploadToBlob(formData.bannerFile, 'banner')
      }

      setUploadProgress(75)

      // Create server
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          icon: iconUrl,
          banner: bannerUrl,
          ownerId: userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create server')
      }

      const newServer = await response.json()
      setUploadProgress(100)

      // Add to local state
      onServerCreated({
        id: newServer.id,
        name: newServer.name,
        icon: newServer.icon || formData.name.substring(0, 2).toUpperCase(),
        description: newServer.description,
        isActive: true,
        type: 'owned',
        members: 1,
        ownerId: userId
      })

    } catch (error) {
      console.error('Error creating server:', error)
      alert(`Failed to create server: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-2 sm:p-4 flex">
      <div className="relative bg-black/90 backdrop-blur-xl border border-white/10 w-full sm:max-w-md sm:mx-auto rounded-none sm:rounded-2xl p-4 sm:p-6 md:p-8 overflow-y-auto h-[96vh] sm:h-auto self-stretch sm:self-center">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Create Server</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Name */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Server Name *
            </label>

            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter server name"
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
              required
            />
          </div>

          {/* Server Description */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Description
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your server"
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Server Icon */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Server Icon
            </label>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center overflow-hidden">
                {iconPreview ? (
                  <img 
                    src={iconPreview} 
                    alt="Icon preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-base sm:text-lg">
                    {formData.icon || formData.name.substring(0, 2).toUpperCase() || 'SV'}
                  </span>
                )}
                {uploadingIcon && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-white animate-pulse" />
                      <span className="text-white text-xs">Uploading...</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1">

                <Input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  placeholder="Icon text (2-3 characters)"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 mb-2"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'icon')}
                    className="hidden"
                    id="icon-upload"
                  />
                  <label
                    htmlFor="icon-upload"
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 cursor-pointer text-sm"
                  >
                    {uploadingIcon ? (
                      <>
                        <Cloud className="h-4 w-4 animate-pulse" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload Icon</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Server Banner */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Server Banner
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'banner')}
                className="hidden"
                id="banner-upload"
              />
              <label
                htmlFor="banner-upload"
                className="relative flex items-center justify-center space-x-2 w-full h-24 border-2 border-dashed border-gray-600 rounded-lg hover:border-purple-500 transition-colors cursor-pointer overflow-hidden"
              >
                {bannerPreview ? (
                  <img 
                    src={bannerPreview} 
                    alt="Banner preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                    <span className="text-gray-400">Upload Banner Image</span>
                  </>
                )}
                {uploadingBanner && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-white animate-pulse" />
                      <span className="text-white text-sm">Uploading...</span>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-purple-400">
                <Cloud className="h-5 w-5 animate-pulse" />
                <span className="text-sm">Creating server...</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              disabled={isLoading || !formData.name}
            >
              {isLoading ? 'Creating...' : 'Create Server'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}