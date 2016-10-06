nextres
=======

The Next House Resident Dashboard System

Web interface for Nexties to edit guest lists, checkout desk items, and reserve rooms.

# Technologies

You will need the following tools to run and develop the NextRes web server on your local machine. Please install these if you don't already have them.

1. [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

2. [Node/npm](https://nodejs.org/en/)

## Node and NPM installation guide

Suggested methods of installing Node.js and NOM for your OS:

* [Mac OSX](https://changelog.com/install-node-js-with-homebrew-on-os-x/)
* [Windows](http://blog.teamtreehouse.com/install-node-js-npm-windows)
* [Linux](http://blog.teamtreehouse.com/install-node-js-npm-linux)

## Server Startup
If this is the _first time_ running the NextRes server on your machine, do all steps. Otherwise, just skip to step 5.

1. Open Terminal or Command Prompt. Run ```mkdir git; cd git; git clone "https://github.com/poofytoo/nextres"``` to clone this repository.
2. Run ```npm install -g nodemon``` if you don't already have it.
3. Change into the ```nrd/``` folder (run ```cd nextres/nrd```) and then run ```npm install``` to install the required Node.js dependencies.
4. **Ask a NextRes developer** to send you a collection of configuration files, including the ```config.json``` file. Place these files in the ```nrd/``` folder. You cannot run NextRes without these files.
5. Open Terminal/Command Prompt. Run ```cd git/nextres/nrd```
6. Run ```nodemon app.js```
7. Open your browser and navigate to [http://localhost](http://localhost)