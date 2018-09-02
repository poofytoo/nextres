Let's Make NextRes Secure Again
===============================
Why is res.nextie.us insecure?! Probably because the SSL certificate expired.

The first thing you should try running is `certbot renew`. This might work, maybe not, but I have no idea. If it doesn't do the following process to totally regenerate those keys:

## Create keys from scratch
1. Log in as root@res.nextie.us. Move into the `~/nextres/nrd/ssl` directory.
2. Run certbot and follow the instructions on-screen (you can create the acme-challenge file in `~/nextres/nrd/public/.well-known/acme-challenge`):
```
sudo certbot certonly --manual --manual-public-ip-logging-ok -d res.nextie.us
```
3. This should create several files in `/etc/letsencrypt/live/res.nextie.us`. Depending on how many times we've run it, it might instead be in `/etc/letsencrypt/live/res.nextie.us-000x` or something. Use the one with the highest number in that case. Copy them over like so:
```
sudo cp /etc/letsencrypt/live/res.nextie.us/cert.pem cert.pem
sudo cp /etc/letsencrypt/live/res.nextie.us/chain.pem intermediate_cert.pem
sudo cp /etc/letsencrypt/live/res.nextie.us/privkey.pem key.pem
```
4. Restart the NextRes web server. If you're using tmux, run `tmux a` to attach to the tmux session running nextres, Ctrl-C the running process, run `sudo node app.js -harmony`, and press Ctrl-B and then d to exit.
5. Clean up the challenge file you created in step 2, if you'd like.

todo: make a cron job or something to auto-renew
