# nginx config

Example nginx config.
Ratelimiting can be adjusted in `conf.d/1ratelimiters.conf`
Everything that's important is in `includes/canvas.conf`
`sites-available/canvas.conf` is for domains and redirections.
`conf.d/2extiles.conf` is setting the different cache expire times for tile zoomlevels
