# Casting Admin

Admin dashboard for the Casting application, built with React and Vite.

## Requirements

- Node.js 18 or later
- npm

## Setup

Install the project dependencies:

```sh
npm install
```

## Development

Start the Vite development server:

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Admins can register a candidate from the button in the **Dashboard** header.
The form submits basic account and profile details to the same `/auth/register` endpoint used by candidate sign-up. A profile photo is optional; when selected, it is uploaded to `/media/upload` as the `file` field and its returned S3 key or URL is included as `profilePhoto` in the JSON registration request.

## Production

Create an optimized production build:

```sh
npm run build
```

The Vercel build is configured to serve the admin app under `/admin`.

Preview the production build locally:

```sh
npm run preview
```

The preview server is available at [http://localhost:4173](http://localhost:4173).

Deploy : npx vercel deploy --prod


# Created by Vercel CLI
VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS9wcm9saWNpb3VzLXRlYW0iLCJzdWIiOiJvd25lcjpwcm9saWNpb3VzLXRlYW06cHJvamVjdDpjYXN0aW5nLWFkbWluOmVudmlyb25tZW50OmRldmVsb3BtZW50Iiwic2NvcGUiOiJvd25lcjpwcm9saWNpb3VzLXRlYW06cHJvamVjdDpjYXN0aW5nLWFkbWluOmVudmlyb25tZW50OmRldmVsb3BtZW50IiwiYXVkIjoiaHR0cHM6Ly92ZXJjZWwuY29tL3Byb2xpY2lvdXMtdGVhbSIsIm93bmVyIjoicHJvbGljaW91cy10ZWFtIiwib3duZXJfaWQiOiJ0ZWFtX2t1aDRFcWZmRmpSUWhNS1lRdGRIS2xYVSIsInByb2plY3QiOiJjYXN0aW5nLWFkbWluIiwicHJvamVjdF9pZCI6InByal9WaDVUMnh5WDBCb0c2VHZoTTN2OWhkOHZBaGM0IiwiZW52aXJvbm1lbnQiOiJkZXZlbG9wbWVudCIsInBsYW4iOiJob2JieSIsInVzZXJfaWQiOiJSckdpYU5uUVlSdnBVeFBwZUhiVmlDdWsiLCJjbGllbnRfaWQiOiJjbF9IWXlPUEJOdEZNZkhoYVVuOUw0UVBmVFp6NlRQNDdicCIsImFwcF9pZCI6ImNsX0hZeU9QQk50Rk1mSGhhVW45TDRRUGZUWno2VFA0N2JwIiwibmJmIjoxNzk1NTg0ODI0LCJpYXQiOjE3OTU1ODQ4MjQsImV4cCI6MTc5NTYyODAyNH0.BQ7GZ4Z2jsnX7zXiezAJhYHjnRY2whJxgc5BuPHN0NnIBfEtzkrbhMtoag9NLa0s2WWSXCUeoqQ7aFp5GzelmIOX-feyJiD-M8rdoa7h_CWcp8oSC0eFpPyu2QVJGe6zmf9iTH16saSGJG7gxhAdPUbQcA-TZ2cLkbV-RogjLz-MnI-eTQwBzd3ulQNK0YWohWqhlDRXr6zPvE_SSvfthMN5kerl2kYm1jBMOFSYmNBLYv7QDmR8qwa0XY-5rAokc2RHQd8qDMN4En6aX-wIHGfheJieZuRMWAXmQFIKSDR2X9pNoOKcztGm7QG_ktPuLYYNq_bzpwqPUZo7RceXxA"
