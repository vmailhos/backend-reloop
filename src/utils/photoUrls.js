const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value || "");

const normalizePath = (value) => {
  if (!value) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

const toPublicPhotoUrl = (req, value) => {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const normalized = value.startsWith("/uploads/")
    ? value
    : value.startsWith("uploads/")
    ? `/${value}`
    : normalizePath(value);

  return `${baseUrl}${normalized}`;
};

const normalizePhotos = (req, photos) => {
  if (!Array.isArray(photos)) return photos;
  return photos.map((photo) =>
    photo?.url ? { ...photo, url: toPublicPhotoUrl(req, photo.url) } : photo
  );
};

const normalizeListing = (req, listing) => {
  if (!listing) return listing;

  const normalized = {
    ...listing,
    photos: normalizePhotos(req, listing.photos),
  };

  if (listing.seller?.listings) {
    normalized.seller = {
      ...listing.seller,
      listings: listing.seller.listings.map((l) => ({
        ...l,
        photos: normalizePhotos(req, l.photos),
      })),
    };
  }

  return normalized;
};

module.exports = {
  toPublicPhotoUrl,
  normalizePhotos,
  normalizeListing,
};