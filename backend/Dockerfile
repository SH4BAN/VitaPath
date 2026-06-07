FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-progress

COPY backend ./backend

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "backend/src/server.js"]
