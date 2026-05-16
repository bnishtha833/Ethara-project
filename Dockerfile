FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY backend/package*.json ./backend/

WORKDIR /usr/src/app/backend
RUN npm install --production

# Bundle app source
WORKDIR /usr/src/app
COPY backend ./backend
COPY frontend ./frontend

WORKDIR /usr/src/app/backend

# Create a volume for the database to persist data across restarts
VOLUME [ "/usr/src/app/backend/data" ]

# Tell the app to use the data folder for SQLite
ENV DB_PATH=/usr/src/app/backend/data/taskmanager.db

EXPOSE 3000
CMD [ "npm", "start" ]
