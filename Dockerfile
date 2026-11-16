# Para rodar em qualquer servidor/VPS no futuro:  docker build -t party-game .  &&  docker run -p 3001:3001 party-game
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm install --include=dev
COPY . .
RUN npm run build
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "start"]
