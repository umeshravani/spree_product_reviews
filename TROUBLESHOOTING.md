# Troubleshooting Guide

This guide covers common issues and solutions when using **Spree Product Reviews & Ratings** with Spree 5.


<br>

## 1. ActiveStorage JavaScript Issues

### Problem:
`window.ActiveStorage` is `undefined` or import errors like:

Uncaught TypeError: Failed to resolve module specifier "@rails/activestorage".

#### Solution:

Precompile assets in production:

```
RAILS_ENV=production bin/rails assets:precompile
```
Clear browser cache if scripts are cached.


<br>


## 2. Turbo Form Errors

### Problem:
`Uncaught (in promise) AbortError: The user aborted a request.`

#### Solution:

1. Usually harmless if a Turbo request is canceled when navigating away.

2. Ensure all form_with or AJAX forms have correct data-controller and data-target attributes.

3. Check console for failed network requests and ensure server responds with 200/204 status codes.


<br>


## 3. Nginx Upload Limits

### Problem:

`Large images or files fail to upload.`

#### Solution:

1. Update nginx.conf:
```
server {
    listen 443 ssl http2;
    server_name example.com;

    client_max_body_size 25M; # Add/Modify This to use 25MB

    location / {
        proxy_pass http://spree_app;
        ...
    }
}
```
2. Reload Nginx:
```
docker compose exec nginx nginx -s reload
```


<br>


## 4. PageBlock Not Appearing

### Problem:

After installing spree_product_reviews, the Review block does not show in Product Details.

#### Solution:

1. Ensure PageSection has the Reviews block:
```
Spree::PageSection
  .where(type: "Spree::PageSections::ProductDetails")
  .find_each do |section|
    unless section.blocks.where(type: "Spree::PageBlocks::Products::Reviews").exists?
      section.blocks.create!(
        type: "Spree::PageBlocks::Products::Reviews",
        position: section.blocks.maximum(:position).to_i + 1
      )
    end
  end
```
2. Clear cache and restart the server.


<br>


## 5. Schema/JSON-LD Not Showing

### Problem:

Product reviews not reflected in Google Rich Results.

#### Solution:

1. Ensure _json_ld.html.erb is copied to your active theme:
   ```
   app/views/themes/<your_theme>/spree/products/_json_ld.html.erb
   ```
2. Check your product page in:

    [Rich Results Test](https://search.google.com/test/rich-results)

    [Schema Markup Validator](https://validator.schema.org/)


<br>


## 6. Docker/Foreman Asset Issues

### Problem:

JavaScript or images not loading correctly.

#### Solution:

1. Recompile assets:
   ```
   RAILS_ENV=development bin/rails assets:precompile
   ```
2. Restart containers or Foreman:
   ```
   foreman start -f Procfile.dev
   # or
   docker compose up -d
   ```
   

<br>


## 7. Miscellaneous Tips

   1. Always restart Rails server after migrations or asset precompilation.

   2. Use rails c to verify blocks and sections:
       ```
       Spree::PageSection.first.blocks.pluck(:type, :position)
       ```
   3. Clear caches in production:
       ```
       bin/rails tmp:cache:clear
       ```
   4. Monitor log/production.log or docker logs <container> for errors.


<br>


### If you encounter an issue not listed here, please open a [GitHub issue](https://github.com/umeshravani/spree_product_reviews/issues/new) or contact me for furthur resolutions.
