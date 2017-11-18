Let's Make NextRes Secure Again
===============================
Why is nextres.mit.edu insecure?! Probably because the SSL certificate expired. If that's the case, follow these steps to renew the certificate:
1. Log in as next@nextres.mit.edu. Move into the `~/git/nextres/nrd/ssl` directory.
2. Run certbot:
```
sudo certbot certonly --manual -d nextres.mit.edu
```
3. This should create several files in `/etc/letsencrypt/live/nextres.mit.edu`. Copy them over like so:
```
sudo cp /etc/letsencrypt/live/nextres.mit.edu/cert.pem cert.pem
sudo cp /etc/letsencrypt/live/nextres.mit.edu/chain.pem intermediate_cert.pem
sudo cp /etc/letsencrypt/live/nextres.mit.edu/privkey.pem key.pem
```
4. Restart the NextRes web server.

Note: The Let's Encrypt SSL cert expires once every 90 days. If all is going well, you should not need to manually renew the certificate; there should be a cron job set up to auto-renew the cert.
