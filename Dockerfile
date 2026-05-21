FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN chown -R node:node /app

# Étape dev : utilisée par docker compose pour le hot reload
FROM deps AS dev

USER node

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Étape build Nuxt
FROM deps AS build

COPY . .

RUN npm run test
RUN npm run build

# Étape 2 : serveur de production (Node.js)
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/.output ./.output
COPY package*.json ./

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
