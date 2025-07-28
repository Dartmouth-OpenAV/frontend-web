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
### Basic setup
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
### Adding a module
If you want to add a feature the first thing to do is consider whether it should be an addition to the **core functions** of frontend-web or if it should be contained in a new **optional module**. 

**Core functions:**
The core functionality of frontend-web includes:
- Rendering the system interface from the config
- Behavior of controls
- Updating control states 
- Polling the state of the system from the orchestrator (every 5 seconds)
- Direct requests to the orchestrator (updateStatus function is exported for modules to use as request wrapper)

**Optional modules:**
If you need to add user feedback or inputs that aren't available in the Core functions, eg. a form to send a help request, or to join a web conference, a module is probably the right choice. 

Module source directories should be added to `/source/optional_modules/<your_plugin>`. Within your module directory your code can be organized any way you want, but you can use the zoom_room module as a model.

Modules can add functions to the interface through:
1. **Custom HTML Modals**

  The content of your modals is not restricted but should follow style guidelines, and use standard controls/inputs when possible.
  When injecting your custom modal HTML into the DOM, insert it into the `<div id="plugin-modals-container"></div>` element. Do NOT overwrite the innerHTML of that element as other modules will be inserting HTML there. Example javascript:
```
import myModalHTML from './components/my_modal.html'

document.getElementById('plugin-modals-container').insertAdjacentHTML('beforeend', myModalHTML) ;
```

2. **Custom HTML Banners**

  If you need to convey state or feedback to the user that cannot be expressed with the basic button highlighting from the core functions, you should use a banner. Your banner can have any inner content but the outermost containing div should have the class `banner` (and you should not overwrite styles for that class) eg. `<div id="my-alert" class="banner warning hidden">My custom alert message</div>`. It should be inserted into the `<div id="banners-container"></div>`, eg:
```
import myAlertHTML from './components/my_alert.html'

document.getElementById('plugin-modals-container').insertAdjacentHTML('beforeend', myAlertHTML) ;
```  

3. **Custom CSS**

  To style custom HTML elements added by the module (not to overwrite core styles!). Any .css file in your module will be automatically picked up and bundled by webpack.

4. **Javascript event listeners on controls**

  To add a data-* attribute to a control for your javascript to hook into, add your tag to the `data_attributes` option in the config. For example, here is the config for a display source input that the Zoom Room module hooks into:
```
"zoom": {
  "name": "Zoom",
  "icon": "zoom",
  "data_attributes": [
    "zoom-room-input"
  ],
  "value": { ... }
}
```

Your javascript needs to wait for the main entrypoint script to render the controls and add your data-* attribute to the configured control(s). When the controls are ready for your script to hook into, the main js will emit a `ui_ready` event. It will also set `globals.uiReady` to `true` in case your module code loads asynchronously and runs after the ui_ready event fires. Here is an example of how to listen for `ui_ready`:
```
function addMyEventListeners() {
  // Ok to attach event listeners to controls rendered by main.js
  document.querySelectorAll('[data-my-tag]').forEach(input => {
    input.addEventListener('click', openCustomModal)
  });
}

window.addEventListener("ui_ready", addMyEventListeners);

```
If your module needs to react to state updates from the main refershState loop, your code can listen for the custom `new_state` event emitted by refreshState, which caches the state data in the event detail:
```
function updateBanner(e) {
  const state = e.detail ;
  const message = state.my_endpoint.status ;
  // ...
}

window.addEventListener("new_state", updateBanner) ;
```


**Important:** Don't assign window.onload directly. eg `window.onload = () => { ... }` <-- NO!!! We are using multiple entrypoints and each one needs to be able to add its own window load listener. So the correct way to do this is: `window.addEventListener('load', myCustomHandler)` <-- YES!

**Important:** Don't set globals in any of your code. Treat globals as read only. 


#### Adding to the webpack build
To get your module code bundled and sent to the client you need to add it to the webpack build. Modify both `webpack.config.js` and `webpack.config.dev.js` to add a new import to the entrypoint:
```
entry: { 
  index: {
    import: [
      './source/js/globals.js',
      './source/js/main.js',
      './source/optional_modules/zoom_room/index.js',
      './source/optional_modules/my_plugin/index.js' // <- Entrypoint file for your plugin
    ]
  }
},
```



