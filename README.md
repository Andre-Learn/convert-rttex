# RTTEX → PNG Vercel Server-Side

This version moves RTTEX decoding to `/api/convert`, so the RTTEX decoding implementation is not shipped to the browser.

## Deploy
1. Push this whole folder to GitHub.
2. Import the repository into Vercel.
3. Framework Preset: Other.
4. Build Command: leave empty.
5. Output Directory: leave empty.
6. Deploy.

Vercel installs `sharp` and `formidable` from package.json.

## Important
- Uploaded RTTEX files are processed by a Vercel Function and temporary files are removed after conversion.
- The frontend still contains the tile editor because it must run in the user's browser. The server-side RTTEX decoder is not exposed there.
- This does not make the whole website source secret; browser-side HTML/CSS/JS can always be inspected.
