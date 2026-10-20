const META_KEY = "_meta/photos.json";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/webp","image/jpeg","image/png"]);

function json(data, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store",
      ...extraHeaders
    }
  });
}

async function readIndex(bucket) {
  const object = await bucket.get(META_KEY);
  if (!object) return [];
  try {
    const data = await object.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeIndex(bucket, photos) {
  await bucket.put(META_KEY, JSON.stringify(photos), {
    httpMetadata:{contentType:"application/json"}
  });
}

function publicPhoto(photo) {
  return {
    id:photo.id,
    caption:photo.caption,
    category:photo.category,
    published:Boolean(photo.published),
    createdAt:photo.createdAt,
    url:"/photos/" + encodeURIComponent(photo.filename)
  };
}

function validOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    return new URL(origin).hostname === "southerncomfortmechanicalllc.cc";
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {status:204});
    }

    // Public list of published photos.
    if (request.method === "GET" && path === "/api/photos") {
      const photos = await readIndex(env.PHOTOS);
      const published = photos
        .filter(photo => photo.published)
        .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(publicPhoto);
      return json({photos:published});
    }

    // Public image delivery. The R2 bucket itself can remain private.
    if (request.method === "GET" && path.startsWith("/photos/")) {
      const filename = decodeURIComponent(path.slice("/photos/".length));
      if (!filename || filename.includes("/") || filename.includes("..")) {
        return new Response("Not found", {status:404});
      }

      const object = await env.PHOTOS.get("images/" + filename);
      if (!object) return new Response("Not found", {status:404});

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("x-content-type-options", "nosniff");
      return new Response(object.body, {headers});
    }

    // Everything below this point must be protected by Cloudflare Access
    // on southerncomfortmechanicalllc.cc/admin/*.
    if (path.startsWith("/admin/api/")) {
      // Authentication is enforced by the Cloudflare Access self-hosted
      // application protecting southerncomfortmechanicalllc.cc/admin/*.
      // The Access policy allows only souconcom1995@yahoo.com before this
      // Worker route is invoked.
      if (!validOrigin(request)) {
        return json({error:"Invalid request origin."}, 403);
      }

      if (request.method === "GET" && path === "/admin/api/photos") {
        const photos = (await readIndex(env.PHOTOS))
          .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .map(publicPhoto);
        return json({photos});
      }

      if (request.method === "POST" && path === "/admin/api/photos") {
        const form = await request.formData();
        const file = form.get("photo");
        const caption = String(form.get("caption") || "").trim().slice(0,180);
        const category = String(form.get("category") || "Other").trim().slice(0,50);
        const published = String(form.get("published") || "true") === "true";

        if (!(file instanceof File)) return json({error:"A photo is required."},400);
        if (!ALLOWED_TYPES.has(file.type)) return json({error:"Upload a JPG, PNG, or WebP image."},400);
        if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) return json({error:"Photo must be smaller than 8 MB after optimization."},400);
        if (!caption) return json({error:"Add a short caption."},400);

        const id = crypto.randomUUID();
        const extension = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
        const filename = id + "." + extension;
        const createdAt = new Date().toISOString();

        await env.PHOTOS.put("images/" + filename, file.stream(), {
          httpMetadata:{contentType:file.type},
          customMetadata:{caption,category,createdAt}
        });

        const photos = await readIndex(env.PHOTOS);
        const record = {id,filename,caption,category,published,createdAt};
        photos.unshift(record);
        await writeIndex(env.PHOTOS, photos);

        return json({photo:publicPhoto(record)},201);
      }

      if (request.method === "DELETE" && path.startsWith("/admin/api/photos/")) {
        const id = decodeURIComponent(path.slice("/admin/api/photos/".length));
        const photos = await readIndex(env.PHOTOS);
        const target = photos.find(photo => photo.id === id);
        if (!target) return json({error:"Photo not found."},404);

        await env.PHOTOS.delete("images/" + target.filename);
        await writeIndex(env.PHOTOS, photos.filter(photo => photo.id !== id));
        return json({ok:true});
      }

      return json({error:"Not found."},404);
    }

    return new Response("Not found", {status:404});
  }
};
