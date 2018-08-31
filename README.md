nextres
=======

The Next House Resident Dashboard System

Web interface for Nexties to edit guest lists, checkout desk items, and reserve rooms.

# Technologies

You will need the following tools to run and develop the NextRes web server on your local machine. Please download and install these if you don't already have them.

1. [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

- Note that OSX and Linux machines typically have this already installed.

2. [Node.js/NPM](https://nodejs.org/en/)

3. finger - user information lookup program, used for guest lists
- This may not be installed by default. If not, run `sudo apt-get install finger`


## Node and NPM installation guide

Suggested methods of installing Node.js/NPM for your OS:

* [Mac OSX](https://changelog.com/install-node-js-with-homebrew-on-os-x/)
* [Windows](http://blog.teamtreehouse.com/install-node-js-npm-windows)
* [Linux](http://blog.teamtreehouse.com/install-node-js-npm-linux)

## Components and Tutorials

[**Node.js**](https://nodejs.org/dist/latest-v4.x/docs/api/) is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications.

[**ExpressJS**](http://expressjs.com/en/3x/api.html) - a flexible Node.js web application framework that provides a robust set of features for web and mobile applications. The best way to understand Express is through its [Official Website](http://expressjs.com/), which has a [Getting Started](http://expressjs.com/starter/installing.html) guide, as well as an [ExpressJS](http://expressjs.com/en/guide/routing.html) guide for general express topics. You can also go through this [StackOverflow Thread](http://stackoverflow.com/questions/8144214/learning-express-for-node-js) for more resources.

## Server Startup
If this is the _first time_ running the NextRes server on your machine, do all steps. Otherwise, just skip to step 5.

1. Open Terminal or Command Prompt. Run ```mkdir git; cd git; git clone "https://github.com/poofytoo/nextres"``` to clone this repository.
2. Run ```npm install -g nodemon``` if you don't already have it.
3. Change into the ```nrd/``` folder (run ```cd nextres/nrd```) and then run ```npm install``` to install the required Node.js dependencies.
4. **Ask a NextRes developer** to send you a collection of configuration files, including the ```config.json``` file. Place these files in the ```nrd/``` folder. You cannot run NextRes without these files.
5. Open Terminal/Command Prompt. Run ```cd git/nextres/nrd```
6. Run ```nodemon app.js```
7. Open your browser and navigate to [http://localhost](http://localhost)
