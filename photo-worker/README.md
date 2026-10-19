# Southern Comfort Photo Manager

This folder contains the backend for the private Southern Comfort Photo Manager.

## What is already built

- Private admin page at /admin/
- Phone photo selection and preview
- Browser-side image resizing/compression to WebP
- Caption and service category fields
- Publish/hidden option
- Recent upload list
- Delete control
- Public Recent Work gallery on the main site
- Public image delivery from a private R2 bucket
- No API keys or passwords stored in GitHub

## One-time Cloudflare setup

1. Create an R2 bucket named:
   southern-comfort-photos

2. Create a new Worker named:
   southern-comfort-photo-api

3. Use this folder as the Worker project. The example Wrangler file binds the R2 bucket as PHOTOS.

4. Route these production paths to the photo Worker:
   southerncomfortmechanicalllc.cc/api/photos*
   southerncomfortmechanicalllc.cc/photos/*
   southerncomfortmechanicalllc.cc/admin/api/photos*

5. In Cloudflare Zero Trust > Access > Applications, create a self-hosted application protecting:
   southerncomfortmechanicalllc.cc/admin/*

6. Create an Allow policy for the owner:
   souconcom1995@yahoo.com

   Email one-time PIN is sufficient if no other identity provider is configured.

7. Keep /api/photos and /photos/* public. Only /admin/* should require sign-in.

## Security

The admin API refuses writes unless Cloudflare Access authentication headers are present and the authenticated email matches ADMIN_EMAIL.

Do not place Cloudflare API tokens, R2 access keys, passwords, or other secrets in this repository.

## Owner workflow

Open:
https://southerncomfortmechanicalllc.cc/admin/

Sign in with the approved email, choose a photo, add a caption/category, and tap Upload & Publish. Published photos automatically appear in the Recent Work section of the public website.
