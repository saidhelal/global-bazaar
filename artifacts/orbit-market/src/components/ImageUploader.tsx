import { useRef, useState, useCallback } from 'react';
import { Upload, X, ImagePlus, Loader2, Star } from 'lucide-react';
import { useUploadImage } from '../hooks/useUploadImage';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  images: string[];
  coverImage: string | null;
  onChange: (images: string[], cover: string | null) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, coverImage, onChange, maxImages = 8 }: Props) {
  const { lang } = useLanguage();
  const { uploadImage, isUploading, progress } = useUploadImage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const tx = {
    en: { upload: 'Upload Images', dragDrop: 'Drag & drop or click to add images', uploading: 'Uploading...', setCover: 'Set as cover', cover: 'Cover', remove: 'Remove', max: `Max ${maxImages} images` },
    ar: { upload: 'رفع الصور', dragDrop: 'اسحب وأفلت أو انقر لإضافة صور', uploading: 'جاري الرفع...', setCover: 'تعيين كغلاف', cover: 'غلاف', remove: 'حذف', max: `حد أقصى ${maxImages} صور` },
  }[lang];

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, maxImages - images.length);
    if (!arr.length) return;
    const urls: string[] = [];
    for (const file of arr) {
      try {
        const url = await uploadImage(file);
        urls.push(url);
      } catch {}
    }
    const newImages = [...images, ...urls];
    const newCover = coverImage || newImages[0] || null;
    onChange(newImages, newCover);
  }, [images, coverImage, uploadImage, maxImages, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (url: string) => {
    const newImages = images.filter((i) => i !== url);
    const newCover = coverImage === url ? (newImages[0] || null) : coverImage;
    onChange(newImages, newCover);
  };

  const setCover = (url: string) => onChange(images, url);

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        onClick={() => !isUploading && images.length < maxImages && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          dragOver ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-primary/60 hover:bg-white/5'
        } ${images.length >= maxImages ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-white/60 text-sm">{tx.uploading} {progress}%</p>
            <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full transition-all rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="w-8 h-8 text-white/30" />
            <p className="text-white/50 text-sm">{tx.dragDrop}</p>
            <p className="text-white/30 text-xs">{tx.max}</p>
            <button type="button"
              className="mt-2 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 text-xs px-3 py-1.5 rounded-lg transition-colors">
              <Upload className="w-3.5 h-3.5" />{tx.upload}
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url) => (
            <div key={url} className="relative group rounded-lg overflow-hidden aspect-square bg-[#0A1628]">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                {coverImage !== url && (
                  <button type="button" onClick={() => setCover(url)}
                    className="flex items-center gap-1 bg-primary/90 text-[#0A1628] text-xs font-medium px-2 py-1 rounded">
                    <Star className="w-3 h-3" />{tx.setCover}
                  </button>
                )}
                <button type="button" onClick={() => removeImage(url)}
                  className="flex items-center gap-1 bg-red-500/90 text-white text-xs font-medium px-2 py-1 rounded">
                  <X className="w-3 h-3" />{tx.remove}
                </button>
              </div>
              {coverImage === url && (
                <div className="absolute top-1 left-1 bg-primary text-[#0A1628] text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {tx.cover}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
