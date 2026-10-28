# Civic Connect — SEN381

This is my public, sanitized portfolio copy of the Civic Connect community-service application I worked on with Carl during SEN381.

The original team repository is credited here for context: [CarlEls30/SEN381-Project](https://github.com/CarlEls30/SEN381-Project) and [Carl’s GitHub profile](https://github.com/CarlEls30). This copy is maintained under [Roebssie](https://github.com/roebssie) for portfolio and learning purposes.

## What I worked on

- A React/Vite client for citizens, authorised staff, and municipal management.
- An Express and MongoDB API with layered routing, controllers, validation, and role-aware access.
- Authentication with password hashing, signed sessions, rate limiting, and security headers.
- Civic issue creation, filtering, status transitions, history, and management views.
- Automated rules, API, and browser journey tests, plus local staging and performance checks.

## Run locally

This repository is a sanitized source snapshot. It does not include credentials, populated environment files, dependency folders, generated build output, private submission documents, or team-only evidence.

```sh
npm install
npm install --prefix client
npm run check:secrets
npm test
npm run build
```

For a local API, create a private `.env` file with a MongoDB connection string and a random JWT secret of at least 32 characters. Never commit that file. The frontend can be run with `npm run dev --prefix client`.

## Structure

```text
src/       Express API, domain rules, authentication, and Mongoose models
client/    React/Vite interface
tests/     Unit, API, and browser journey coverage
```

## Portfolio note

This public copy exists to document my contribution and the skills I developed while working on Civic Connect. It is intentionally separated from the original private/team repository and does not claim ownership of the full team history.
