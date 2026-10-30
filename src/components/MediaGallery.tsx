import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { SquidTeacher } from "./SquidTeacher";

interface MediaItem {
  url: string;
  alt: string;
  source?: "photo" | "ai-generated" | "illustration";
}

interface MediaGalleryProps {
  images: MediaItem[];
  source?: string;
  className?: string;
  fullscreen?: boolean;
  isLoading?: boolean;
}

const sourceLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  "photo": { label: "Photo", icon: <ImageIcon className="w-3 h-3" /> },
  "illustration": { label: "Illustration", icon: <Sparkles className="w-3 h-3" /> },
  "ai-generated": { label: "AI Generated", icon: <Sparkles className="w-3 h-3" /> },
};

export const MediaGallery: React.FC<MediaGalleryProps> = ({ 
  images, 
  source, 
  className, 
  fullscreen = false,
  isLoading = false 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Reset index when images change
  useEffect(() => {
    setCurrentIndex(0);
    setLoadedImages(new Set());
    
    // Diagnostic logging for image loading issues
    if (images.length > 0) {
      console.log("MediaGallery images updated:", {
        count: images.length,
        urls: images.map(img => ({
          url: img.url.substring(0, 80) + (img.url.length > 80 ? '...' : ''),
          source: img.source,
        })),
        browser: navigator.userAgent,
        platform: navigator.platform,
        isChrome: /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent),
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      });
    }
  }, [images]);

  // Auto-carousel every 4 seconds
  useEffect(() => {
    if (images.length <= 1 || isLoading) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [images.length, isLoading]);

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  // Show engaging squid teacher animation when loading
  if (isLoading || (!images || images.length === 0)) {
    if (fullscreen) {
      return (
        <div className={cn("w-full h-full rounded-2xl overflow-hidden bg-earth-sand flex items-center justify-center", className)}>
          <SquidTeacher />
        </div>
      );
    }
    return null;
  }

  const currentImage = images[currentIndex];
  const isCurrentLoaded = loadedImages.has(currentIndex);
  const currentSource = currentImage.source || "ai-generated";
  const sourceInfo = sourceLabels[currentSource] || sourceLabels["ai-generated"];

  if (fullscreen) {
    return (
      <div className={cn("w-full h-full rounded-2xl overflow-hidden shadow-lg bg-earth-sand relative flex items-center justify-center", className)}>
        {/* Placeholder while image loads */}
        {!isCurrentLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-earth-sand animate-pulse z-10">
            <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
        
        <img
          src={currentImage.url}
          alt={currentImage.alt}
          className={cn(
            "max-w-full max-h-full w-auto h-auto object-contain rounded-xl transition-opacity duration-300",
            isCurrentLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="eager"
          decoding="async"
          crossOrigin="anonymous"
          onLoad={() => handleImageLoad(currentIndex)}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            console.error("Image load error:", {
              url: currentImage.url,
              error: e,
              browser: navigator.userAgent,
              platform: navigator.platform,
              crossOrigin: img.crossOrigin,
              complete: img.complete,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            });
            
            // Try without crossOrigin as fallback (for same-origin or CORS-unsupported images)
            if (img.hasAttribute('crossorigin')) {
              console.log("Retrying image load without crossOrigin attribute");
              img.removeAttribute('crossorigin');
              img.src = ''; // Clear src
              setTimeout(() => {
                img.src = currentImage.url;
              }, 100);
            } else {
              // Failed even without crossOrigin - hide the image
              img.style.display = "none";
            }
          }}
        />

        {/* Navigation arrows */}
        {images.length > 1 && isCurrentLoaded && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-background transition-colors z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-background transition-colors z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots indicator */}
        {images.length > 1 && isCurrentLoaded && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  index === currentIndex 
                    ? "bg-primary scale-110" 
                    : "bg-background/60 hover:bg-background/80"
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
        
        {/* Source badge - now using actual source from image */}
        {isCurrentLoaded && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium z-20">
            {sourceInfo.icon}
            <span>{sourceInfo.label}</span>
          </div>
        )}
      </div>
    );
  }

  // Original compact view
  return (
    <div className={cn("animate-fade-in-up space-y-2", className)} style={{ animationDelay: "0.2s" }}>
      <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
        {images.map((image, index) => (
          <div
            key={index}
            className={cn(
              "flex-shrink-0 rounded-xl overflow-hidden shadow-montessori bg-card animate-scale-in",
              image.source === "ai-generated" ? "border-2 border-primary/20" : ""
            )}
            style={{ animationDelay: `${0.1 * index}s` }}
          >
            <img
              src={image.url}
              alt={image.alt}
              className="object-cover w-48 h-36"
              loading="lazy"
              crossOrigin="anonymous"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                console.error("Compact view image load error:", {
                  url: image.url,
                  browser: navigator.userAgent,
                  platform: navigator.platform,
                });
                
                // Try without crossOrigin as fallback
                if (img.hasAttribute('crossorigin')) {
                  img.removeAttribute('crossorigin');
                  img.src = '';
                  setTimeout(() => {
                    img.src = image.url;
                  }, 100);
                } else {
                  img.style.display = "none";
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
