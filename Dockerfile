FROM node:19-alpine AS builder
WORKDIR /app

# update tsc
RUN npm install -g pnpm typescript@latest

COPY package*.json pnpm* ./

RUN pnpm i --frozen-lockfile

COPY index.html .
COPY *.config.ts .
COPY *.config.js .
COPY src src
COPY public public
COPY .env.production .

RUN pnpm vite build

# RUN pnpm run build

# FROM node:19-alpine
# ENV NODE_ENV=production
# RUN apk add --no-cache tini
# WORKDIR /app

# COPY --from=builder /app/dist .
# COPY --from=builder /app/package*.json ./

# # this is needed to prevent error: cannot find module 'ejs' or 'express'
# # RUN npm install ejs express

# RUN chown node:node .
# USER node

# ENV PORT=5000
# EXPOSE 5000

# ENTRYPOINT [ "/sbin/tini","--", "node", "index.mjs" ]

FROM caddy:alpine

EXPOSE 8997

COPY --from=builder /app/dist /app/dist

COPY Caddyfile /etc/caddy/Caddyfile

ENTRYPOINT [ "caddy", "run", "--config", "/etc/caddy/Caddyfile"]
