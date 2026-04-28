# Étape 1 : build Nuxt
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# Étape 2 : serveur de production (Node.js)
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/.output ./.output
COPY package*.json ./

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
