<h1 align="center">Imagery Coordination API</h1>

## Installation and Usage

The steps below will walk you through setting up your own instance of the imagery-request-api.

### Install Project Dependencies
To set up the development environment for this website, you'll need to install the following on your system:

- [Node](http://nodejs.org/) v6.7 (To manage multiple node versions we recommend [nvm](https://github.com/creationix/nvm))
- [MongoDB](https://www.mongodb.org/) v3

### Install Application Dependencies

If you use [`nvm`](https://github.com/creationix/nvm), activate the desired Node version:

```
nvm install
```

Install Node modules:

```
npm install
```

### Usage

#### Config files
All the config files can be found in `app/assets/scripts/config`.
After installing the projects there will be 3 main files:
  - `local.js` - Used only for local development. On production this file should not exist or be empty.
  - `staging.js`
  - `production.js`

The `production.js` file serves as base and the other 2 will override it as needed:
  - `staging.js` will be loaded whenever the env variable `DS_ENV` is set to staging.
  - `local.js` will be loaded if it exists.

Some of the following options are overridable by environment variables, expressed between [].
The following options must be set: (The used file will depend on the context)
  - `connection.host` - The host. (mostly cosmetic. Default to 0.0.0.0). [PORT]
  - `connection.port` - The port where the app runs. (Default 4000). [HOST]
  - `mongo.uri` - The uri to connect to the mongo database. [MONGODB_URI]
  - `mongo.testUri` - The uri to connect to the mongo database for testing. The database is wiped after every test. [MONGODB_TESTURI]
  - `auth0` - See the section below for an in-depth explanation.
  - `auth0.secret` - [AUTH0_SECRET]
  - `auth0.clientId` - [AUTH0_CLIENT_ID]
  - `auth0.api` - [AUTH0_API]

Example:
``` 
module.exports = {
  connection: {
    host: '0.0.0.0',
    port: 4000
  },
  mongo: {
    uri: 'mongodb://localhost/imagery-request',
    testUri: 'mongodb://localhost/imagery-request-test'
  },
  auth0: {
    secret: 'some string to keep secret',
    clientId: 'qTQW5L362p0DWpuNAcx5SHggOY1p65bG',
    api: 'https://danielfdsilva.eu.auth0.com'
  }
};
```

#### Starting the app
```
npm run nodemon
```
This will start the app at `http://localhost:4000`.
This command starts the server with `nodemon` which watches files and restarts when there's a change.

```
npm start
```
Starts the app without file watching

# Auth0 setup

1. Create a new [auth0](https://auth0.com/) account.
2. Create a `Non Interactive Client`.
3. Open the settings tab.
4. Fill in the Name, Client type (Non Interactive Client), and the Allowed Callback URLs.
  - At this point setup your app's config file before continuing. (Check section below).
5. Go to your `account settings` (top-right corner) and then click Advanced. Scroll down and enable `Enable APIs Section`.
6. Go to `APIs` and select `Auth0 Management API`
7. Go to `Non Interactive Client`, authorize your client, and select `read:users` scope.
8. Click `Update` and it's all set.

### Config

Copy the `Client ID` and `Client Secret` to the appropriate config file. The api will be the `Domain`.

```
  auth0: {
    secret: '',
    clientId: '',
    api: ''
  }
```
Or the corresponding environment variables `AUTH0_SECRET`, `AUTH0_CLIENT_ID`, `AUTH0_URL`

### Users
Users are authenticated through tokens and created through the [auth0 interface](https://manage.auth0.com/#/users).

After creating a user some metadata must be added:
On the `user_metadata` add:
```
{
  "name": "John Doe"
}
```
On the `app_metadata` add:
```
{
  "roles": [
    "coordinator or surveyor"
  ]
}
```

---

### Development data
There are 2 tokens below that can be used for testing purposes. Note that these tokens are only valid using the appropriate auth0 secret. (used internally during development)

To see the content of the JWT use https://jwt.io/

### Coordinator
Has the `coordinator` role. Note that coordinators, can work as surveyors as well.
- u: `coordinator`
- p: `coordinator`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYXV0aDB8NTgyZDhkYzE3ODgyYjI5NzAyNTNiYjE1Iiwicm9sZXMiOlsiY29vcmRpbmF0b3IiXSwiaWF0IjoxNDc5NzI0OTE5LCJleHAiOjE3OTUzMDA5MTksImF1ZCI6InFUUVc1TDM2MnAwRFdwdU5BY3g1U0hnZ09ZMXA2NWJHIiwiaXNzIjoiaHR0cHM6Ly9kYW5pZWxmZHNpbHZhLmV1LmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw1ODJkOGRjMTc4ODJiMjk3MDI1M2JiMTUifQ.rY_ykvkYh1WcMBFTmna8RxVdg5Xk40jVtcjuevvcEU8
```

### Surveyor
Has the `surveyor` role.
- u: `surveyor`
- p: `surveyor`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYXV0aDB8NTgzMmQwMDhkMjM2ZTkwZTI3Mzk0MzdmIiwicm9sZXMiOlsic3VydmV5b3IiXSwiaWF0IjoxNDc5NzI1MzAwLCJleHAiOjE3OTUzMDEzMDAsImF1ZCI6InFUUVc1TDM2MnAwRFdwdU5BY3g1U0hnZ09ZMXA2NWJHIiwiaXNzIjoiaHR0cHM6Ly9kYW5pZWxmZHNpbHZhLmV1LmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw1ODMyZDAwOGQyMzZlOTBlMjczOTQzN2YifQ.29tNiF2L6HaklYConcZU4sDflb095tI14hD0i-OK9KY
```

## Fixtures
To setup the database with dummy data run:

```
npm run setupdb
```

Note: This will remove the database and import the dummy data again.

# Deployment
This app can be run on any server with Node.js 6.7 and a mongo database
The deployment instructions are the same as listed above.
