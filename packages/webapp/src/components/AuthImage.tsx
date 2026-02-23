import { useEffect, useRef, useState } from "react";
import { fetchImageBlobUrl } from "../lib/api";

interface AuthImageProps {
  path: string | null;
  alt: string;
  className?: string;
}

export function AuthImage({ path, alt, className }: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    fetchImageBlobUrl(path)
      .then((url) => {
        if (!cancelled) {
          blobUrlRef.current = url;
          setSrc(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [path]);

  if (!path) return null;
  if (!src) return <div className={className} style={{ background: "var(--color-border)", minHeight: 64 }} />;
  return <img src={src} alt={alt} className={className} />;
}
