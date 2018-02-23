Let's Make NextRes Secure Again
===============================
Why is nextres.mit.edu insecure?! Probably because the SSL certificate expired.

## Automatic Certificate Renewal
There's a cron job that is scheduled to run a script to renew the certificates. If the certificate is expired, something might be wrong with the script. Follow these steps to debug it:
1. Log in as next@nextres.mit.edu.
2. The job is scheduled to run every day at 5 AM EST. Let's see if the job is running successfully. The job should email any results to the root user. Check the root user's mail:
```
sudo tail -n 20 /var/mail/root
```
This should print out the last few lines of the file (aka the most recent email the root user has received). What is the date of the email? Was it today or yesterday? If the latest email is from a while ago, something is wrong with the cron job scheduling. Go to step 3. If the latest email is recent, does it contain an error message? ("Cert not yet due for renewal" errors are fine, it just means that the certificate is up-to-date.) If there is an error message, go to step 4. If there is no error message, go to step 5.
3. Run `sudo crontab -e` to open up the cron job listings in the nano text editor. Is the syntax correct? The job should be running daily at 5 AM.
4. Something went wrong in the installation script. The script itself is in `~/renew-cert/nextres/cert-renew.sh`. Try running it manually:
```
~/renew-cert/nextres/cert-renew.sh
```
It should be a bit more specific about what exactly is going wrong. Debug the problem and fix the installation script. You can check that it's working by running it manually again.
5. The certificates are up-to-date but it's not being used by the server properly. Check whether the .pem files made it to `~/git/nextres/nrd/ssl` and check if the server has been restarted since renewal. (See the manual installation instructions below for more details.) The script is very brittle in the way it restarts the server, so it is quite likely that the server was not properly restarted. You can navigate to nextres.mit.edu in your web browser and click on the Advanced section to see if the certificate is expired. If the certificate is expired, try running `sudo certbot certificates` to see your current certs and get a hint about what might be wrong.

## Manual Installation Instructions
If all else fails, you can install certificates the old-fashioned way.
1. Log in as next@nextres.mit.edu. Move into the `~/git/nextres/nrd/ssl` directory.
2. Run certbot and follow the instructions on-screen (you can create the acme-challenge file in `~/git/nextres/nrd/public/.well-known/acme-challenge`:
```
sudo certbot certonly --manual -d nextres.mit.edu
```
3. This should create several files in `/etc/letsencrypt/live/nextres.mit.edu`. Copy them over like so:
```
sudo cp /etc/letsencrypt/live/nextres.mit.edu/cert.pem cert.pem
sudo cp /etc/letsencrypt/live/nextres.mit.edu/chain.pem intermediate_cert.pem
sudo cp /etc/letsencrypt/live/nextres.mit.edu/privkey.pem key.pem
```
4. Restart the NextRes web server. If you're using tmux, run `tmux a` to attach to the tmux session running nextres, Ctrl-C the running process, run `sudo node app.js -harmony`, and press Ctrl-B and then d to exit.
5. Clean up the challenge file you created in step 2, if you'd like.

Note: The Let's Encrypt SSL cert expires once every 90 days. If all is going well, you should not need to manually renew the certificate; there's a cron job set up to auto-renew the cert. (See the automatic certificate renewal section above.)
