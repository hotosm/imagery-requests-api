FROM node:6.7
ENV NPM_CONFIG_LOGLEVEL warn

# Create app directory
RUN mkdir -p /usr/src
WORKDIR /usr/src

# Install app dependencies
COPY package.json /usr/src/
RUN npm install

# Bundle app source
COPY . /usr/src

EXPOSE 4000
CMD [ "npm", "start" ]
