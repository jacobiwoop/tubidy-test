# Lessons

- Pour un sous-domaine type `sslip.io` ou `traefik.me`, ne pas supposer qu'il faut installer Traefik. Verifier d'abord si le domaine wildcard DNS pointe vers l'IP, puis utiliser le reverse proxy deja present sur le serveur, ici Nginx.
- Pour un deploiement Render, ne pas proposer `docker-compose`: Render deploye une image/service. Si le user demande un "one shot", integrer les pieces necessaires dans une seule image et lancer les processus via un entrypoint.
