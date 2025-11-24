# Deployment Configuration Summary
- Please check this file for deployment instructions and environment variables.

## Files Modified

### Server
- ✅ `server/index.js` - Added environment variables, CORS, health check
- ✅ `server/.env.example` - Created with all required variables
- ✅ `server/.gitignore` - Created to exclude sensitive files

### Client
- ✅ `client/src/App.jsx` - Updated to use VITE_BACKEND_URL
- ✅ `client/.env.example` - Created with backend URL variable
- ✅ `client/vercel.json` - Created Vercel configuration

### Root
- ✅ `.gitignore` - Created root gitignore
- ✅ `README.md` - Completely rewritten with deployment instructions

## Environment Variables

### Server (.env)
```
PORT=4000
RTSP_URL_PRIMARY=rtsp://13.60.76.79:8554/live2
RTSP_URL_FALLBACK=rtsp://170.93.143.139/rtplive/470011e600ef003a004ee33696235daa
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_BACKEND_URL=http://localhost:4000
```

## Ready for Deployment

Your codebase is now ready to:
1. Push to GitHub
2. Deploy server to Render
3. Deploy client to Vercel

See README.md for detailed deployment instructions.
