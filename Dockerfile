# Override with a reviewed digest for a reproducible production base image.
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app

COPY package.json bun.lock ./
# packageManager is the source of truth for the Bun version.
RUN npm install --global "$(node -p 'require("./package.json").packageManager')"
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
ENV DEPLOY_TARGET=node
RUN bun run prepare && bun run build
# The final image receives production dependencies only, without install hooks.
RUN rm -rf node_modules && bun install --production --frozen-lockfile --ignore-scripts

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/LICENSE ./LICENSE
USER node
EXPOSE 3000
CMD ["node", "build"]
