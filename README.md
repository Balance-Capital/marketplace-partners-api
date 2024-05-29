# Marketplace Partners API 
It is one of the 3 parts of the marketplace software. The main task of this application is communication with affiliate networks (offers, reports) and their management.

[demo](https://clevrpay.com)

## Setup
Create .env

The configuration for handling offer updates is located in the database
dumps are located in the directory:
- database/config

The changes you need to make are marked with <mark> XXX</mark>
- constants/enviroments.js
- services/imageFix.js -> IMAGE_HOST
- services/googleIndexinApi.js -> MAIN_URL
- services/googleIndexinApi.js -> configFile -> resources/private/google_service_account_XXX.json <- put changes to this file from your google account
- service/cronSiteMap.js
- services/storesUpdate.js

## Server installation and configuration

### Partners API
Deployment and Installation on Linux Ubuntu using github runner

After logging in to Linux
Create a user `sudo adduser github`
Add the user to sudo `sudo adduser github sudo`
Switch user `su github`
Change the directory to the home directory of user `cd ~`

Installing Node
- https://joshtronic.com/how-to-install-nodejs-18-on-ubuntu-2004-lts/

Chromium installation
- https://linuxhint.com/install-chromium-ubuntu-22-04/

```
snap 
sudo apt install snapd
sudo snap install chromium
```

Installing missing libraries
```
sudo apt-get update
sudo apt-get install libatk1.0-0
sudo apt-get install libatk-bridge2.0-0
sudo apt-get install libcups2
sudo apt-get install libxcomposite-dev
sudo apt-get install libxdamage1
sudo apt-get install libxrandr2
sudo apt-get install libgbm-dev
sudo apt install libxkbcommon-x11-0
sudo apt-get install libpangocairo-1.0-0
sudo apt-get install libasound2
```

Chromium removal
```
sudo snap remove chromium
```

### How to install github runner?

https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/configuring-the-self-hosted-runner-application-as-a-service

How to restart?

After login switch to github user su github then cd ~ [enter]
Next go to marketplace-partners-api folder and 

```
start yarn pm2 list

yarn pm2 start “yarn server”
yarn pm2 start “yarn app”
yarn pm2 start “yarn jobs:start”
yarn pm2 start “yarn cron:start”
```

## Docker mongo - How to?
Go to docker/mongodb folder and type in console: `docker-compose up`

### Create mondoDB user
Go to docker mongodb console and type:

`mongo -u "root" -p "example"`

after login

`use your_db_name`

and now create user for your_db_name

`db.createUser({ user: "typeYourUserName", pwd: "typeYourPassword", roles: [ { role: "readWrite", db: "your_db_name" }] })`

### How to start project?

`cp env.example .env`

`yarn`

`yarn start-prod`

### How to login?

You have to send POST request to API url with endpoint /login.
Data to send is `username and secret` all coding x-www-form-urlencoded
If login went ok, you should get response with `token` json format.
Your token is valid 10 minutes if you don't do nothing.
For all request you have to add header with token as key and token data which you received in previous request.

## To do
- unification of sales reports downloaded from affiliate networks
- collective withdrawal of funds to user wallets

## Contributors
- ub
- malek
- pwntrOn