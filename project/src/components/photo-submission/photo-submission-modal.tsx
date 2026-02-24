import React, { useState } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Camera, Upload, X, CheckCircle2, Clock, Image as ImageIcon } from 'lucide-react';
import { StaffTask } from '../../types';
import { submitTaskPhotos } from '../../store/enhanced-mock-data';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface PhotoSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: StaffTask;
  onSuccess: () => void;
}

export function PhotoSubmissionModal({ isOpen, onClose, task, onSuccess }: PhotoSubmissionModalProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        // Convert to base64 for demo storage
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setSelectedPhotos(prev => [...prev, imageUrl]);
        };
        reader.readAsDataURL(file);
      }

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Photos uploaded successfully! 📸');
    } catch (error) {
      toast.error('Failed to upload photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitPhotos = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('Please upload at least one photo');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitTaskPhotos(task.id, selectedPhotos);
      toast.success('Task photos submitted for approval! 🎉');
      onSuccess();
      onClose();
      setSelectedPhotos([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit photos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Task Completion Photos" size="lg">
      <div className="space-y-6">
        {/* Task Information */}
        <Card className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 dark:from-primary-900/20 dark:via-card dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-6 w-6 text-primary-600" />
              <span>Task Completion Verification</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-lg text-primary-800 dark:text-primary-200">{task.title}</h4>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">{task.description}</p>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className={cn(
                  'rounded-full px-3 py-1 font-bold',
                  task.priority === 'urgent' && 'bg-error-100 text-error-800',
                  task.priority === 'high' && 'bg-warning-100 text-warning-800',
                  task.priority === 'medium' && 'bg-primary-100 text-primary-800',
                  task.priority === 'low' && 'bg-success-100 text-success-800'
                )}>
                  {task.priority.toUpperCase()} PRIORITY
                </span>
                {task.estimatedHours && (
                  <span className="text-muted-foreground font-semibold flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Est: {task.estimatedHours}h</span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Upload Completion Photos</h3>
          
          <div className="rounded-2xl border-3 border-dashed border-primary-300 p-8 text-center hover:border-primary-400 transition-all duration-300 bg-gradient-to-br from-primary-50/50 to-white dark:from-primary-900/10 dark:to-card hover:shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 shadow-lg">
              <Camera className="h-8 w-8 text-primary-600" />
            </div>
            <p className="mb-2 text-lg font-bold text-primary-800 dark:text-primary-200">Upload Task Photos</p>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              Take photos showing task completion<br />
              <span className="text-xs">JPG, PNG up to 10MB each • Multiple photos supported</span>
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                className="pointer-events-none bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 border-2 border-primary-300 hover:border-primary-400"
              >
                {isUploading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                    <span className="animate-pulse">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Choose Photos
                  </>
                )}
              </Button>
            </label>
          </div>

          {/* Photo Preview Grid */}
          {selectedPhotos.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold flex items-center space-x-2">
                <ImageIcon className="h-5 w-5 text-primary-600" />
                <span>Selected Photos ({selectedPhotos.length})</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Task completion ${index + 1}`}
                      className="h-32 w-full rounded-xl object-cover border-2 border-primary-200 shadow-lg group-hover:shadow-xl transition-all duration-300"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 rounded-full bg-gradient-to-r from-error-600 to-error-700 p-1 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-bold">
                      Photo {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submission Guidelines */}
        <Card className="bg-gradient-to-r from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border-2 border-warning-200 dark:border-warning-800">
          <CardContent className="p-4">
            <h4 className="font-bold text-warning-800 dark:text-warning-200 mb-2 flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Photo Submission Guidelines</span>
            </h4>
            <ul className="text-sm text-warning-700 dark:text-warning-300 space-y-1">
              <li>📸 Take clear, well-lit photos showing completed work</li>
              <li>🔍 Include before/after shots if applicable</li>
              <li>📝 Photos will be reviewed by warden for approval</li>
              <li>✅ Task status updates automatically upon approval</li>
              <li>⚡ Approval typically takes 15-30 minutes</li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitPhotos}
            disabled={selectedPhotos.length === 0 || isSubmitting}
            isLoading={isSubmitting}
            className="bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 shadow-lg hover:shadow-xl"
          >
            <Camera className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Submitting Photos...' : 'Submit for Approval'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}