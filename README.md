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
The form submits basic account and profile details to the same `/auth/register` endpoint used by candidate sign-up.

## Production

Create an optimized production build:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

The preview server is available at [http://localhost:4173](http://localhost:4173).
