FROM docker.m.daocloud.io/library/node:18-bullseye-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p /app/logs /app/uploads \
  && groupadd -g 10001 app \
  && useradd -m -u 10001 -g app app \
  && chown -R app:app /app

USER app
EXPOSE 8081
CMD ["node", "src/server.js"]

