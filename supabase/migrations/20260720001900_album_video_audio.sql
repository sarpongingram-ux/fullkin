-- Fullkin — Album: video en audio erbij (sectie album, "volgt snel daarna")
--
-- Dezelfde privébucket, nu ook voor video en spraak/geluid. Video mag groter
-- zijn dan een foto, dus de bovengrens gaat naar 200MB.

update storage.buckets
set file_size_limit = 209715200,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-m4a',
      'audio/ogg', 'audio/webm'
    ]
where id = 'family-album';
