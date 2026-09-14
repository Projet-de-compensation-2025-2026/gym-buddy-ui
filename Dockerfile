# Local laptop image only. GitHub Pages stays the production UI.
# Build with gym-buddy-service/compose.yaml (sibling checkout).
FROM node:22.22.3-bookworm AS build
WORKDIR /src

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates findutils \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.22.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm generate:api \
    && pnpm exec ng build gym-buddy-ui --configuration development --base-href / \
    && pnpm exec ng build gym-buddy-admin --configuration development --base-href /admin/

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
COPY --from=build /src/dist-admin /usr/share/nginx/html/admin
EXPOSE 80
