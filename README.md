Copyright (C) 2025 Trustees of Dartmouth College

This project is licensed under the terms of the GNU General Public License (GPL), version 3 or later.

For alternative licensing options, please contact the Dartmouth College OpenAV project team.

# A Web Interface for OpenAV
This repo provides a web interface to control an OpenAV system. This simple static site will parse an OpenAV JSON config file fetched from an Orchestrator API, and render the specified control sets. 

## Getting started
1. Run a container using Docker.
2. Set your default Orchestrator. There are two options:
    - Set the HOME_ORCHESTRATOR environment variable in your Docker container.
    - Provide the "orchestrator" param in the URL when loading the GUI.
3. Provide the "system" param in the URL to point to the configuration file that you want to load.

## Contributing
If you are forking or developing this project, you will need to install webpack as a dev dependency, and use it to compile the source Javascript files into /public/js/index.js: 

1. Run `npm install` to install webpack
2. Run `npm run build` to compile source js files into public/js/index.js
3. Use Docker to start the nginx server.