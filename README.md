Copyright (C) 2025 Trustees of Dartmouth College

This project is licensed under the terms of the GNU General Public License (GPL), version 3 or later.

For alternative licensing options, please contact the Dartmouth College OpenAV project team.

# A Web Interface for OpenAV
This repo provides a web interface to control an OpenAV system. This simple static site will parse an OpenAV JSON config file fetched from an Orchestrator API, and render the specified control sets. If you are not yet familiar with OpenAV, you start with the [Orchestrator Quickstart guide](https://github.com/Dartmouth-OpenAV) on the Dartmouth-OpenAV repo directory.

## Getting started
If you are using the [Orchestrator Quickstart](https://github.com/Dartmouth-OpenAV), you can ignore these instructions as the quickstart.sh script will spin up a frontend server for you on port 8080. 

If you want to run a frontend server separately, on a different machine for example, follow this guide:

1. Start by making sure Docker is installed where you will be running the frontend server. Like the orchestrator, the frontend server runs in a Docker container. The image is based on `nginx` and simply serves static files (all the GUI rendering happens client-side).

2. Run a Docker container with the `ghcr.io/dartmouth-openav/frontend-web` image, with port 80 exposed. You may optionally set a HOME_ORCHESTRATOR environment variable in the container (recommended), which will serve as a default for all clients. Example Docker Compose:
```
services:
  nginx:
    image: ghcr.io/dartmouth-openav/frontend-web:latest
    environment:   
      - HOME_ORCHESTRATOR=http://orchestrator.domain.edu
    ports:
      - 8080:80
```
If you don't set the HOME_ORCHESTRATOR variable, clients will have to specify an "orchestrator" URL param to load the GUI.

3. You should now be able to load a GUI in your browser at http://localhost:8080. To tell the frontend server what system interface to load, provide a "system" param in the URL, eg.: http://localhost:8080?system=test-room . The "system" value should correspond to the ID of a configuration file in the config repo you specified for your [Orchestrator(s)](https://github.com/Dartmouth-OpenAV/orchestrator).


## Contributing
If you are forking or developing this project, you will need to install `webpack` as a dev dependency, and use it to compile the source files into ./public: 

1. Run `npm install` to install webpack and other dependencies from package.json
2. While deving, use `npm run dev` to compile source JS in webpack's 'development' mode and watch for changes
3. To see the compiled JS in production mode, run `npm run build`
4. Run the Docker container and expose port 80. Example Docker Compose:
```
services:
  nginx:
    build: .
    volumes: 
      - ./public/:/usr/share/nginx/html
    environment:   
      - HOME_ORCHESTRATOR=http://localhost:81
    ports:
      - 8080:80
```