# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./

ENV PORT=19290
ENV WS_DATA_FILE=/data/ws-store.json
# Zeitzone für korrekte Lagerwarn-Uhrzeiten (anpassbar)
ENV TZ=Europe/Berlin

# Persistenter Speicher für die JSON-Datenbank
VOLUME ["/data"]

EXPOSE 19290
CMD ["node", "server.js"]
