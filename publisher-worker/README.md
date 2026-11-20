# Protected publisher portal setup

This Worker powers `https://admin.suryaprabhanews.com` (private uploads) and
`https://data.suryaprabhanews.com` (public, read-only newspaper assets).

## Cloudflare dashboard setup

1. Enable R2 billing and create a bucket named `suryaprabha-epaper`.
2. Create a new Git-connected Worker from this repository with root directory
   `publisher-worker`. Cloudflare reads `wrangler.jsonc` and binds the bucket.
3. Add two custom domains to that Worker: `admin.suryaprabhanews.com` and
   `data.suryaprabhanews.com`.
4. In Zero Trust, enable the One-time PIN login method. Create an Access
   application for `admin.suryaprabhanews.com` with an **Allow** policy for
   exactly `dainiklokprashna@gmail.com` and `vilasmuley9@gmail.com`. Require
   the One-time PIN login method. Do not protect `data.suryaprabhanews.com`.

The main website first checks the public `data` address for the latest issue
and falls back to the repository's bundled issue until the portal is live.
