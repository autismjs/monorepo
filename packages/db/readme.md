# autism-db

autism-db is a universal database adapter (leveldb and postgres) for Autism.

It store all `autism-message` types and indexes them to provide optimized query for:
- reading a user profile
- getting all posts
- getting a user's feed
- getting all replies to a post
- getting all moderations to a post
- getting all connections related to a user


## Install as NPM Package

```
npm install @autismjs/db
```

## Development

```
npm install
npm run lint
npm test
```

## Build

```
npm install
npm run build
```