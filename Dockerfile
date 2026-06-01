FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

RUN npm install -g nodemon

COPY . .

EXPOSE ${PORT}

CMD ["npm", "run", "dev"]
