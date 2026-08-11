import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/platform";

export function SignedImage({
  bucket,
  path,
  alt,
  className,
}: {
  bucket: string;
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    void signedUrl(bucket, path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [bucket, path]);

  if (!url) return null;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}

export function SignedLink({
  bucket,
  path,
  label,
}: {
  bucket: string;
  path: string;
  label: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void signedUrl(bucket, path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [bucket, path]);

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-medium text-primary underline underline-offset-2"
    >
      {label}
    </a>
  );
}
