### Requirements
These dependencies are needed to build the app.

- Node (v6.7.x) & Npm ([nvm](https://github.com/creationix/nvm) usage is advised)
- MongoDB (v3)

> The versions mentioned are the ones used during development. It could work with newer ones.
  Run `nvm use` to activate the correct version.

### Setup
Install dependencies:
```
$ npm install
```

### Running the App
```
npm run nodemon
```
This will start the app at `http://localhost:4000`.
This command starts the server with `nodemon` which watches files and restarts when there's a change.

```
npm start
```
Starts the app without file watching
