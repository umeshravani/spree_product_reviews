# Product Reviews & Ratings for Spree Commerce
Easy Reviews &amp; Ratings integration for Latest Spree Commerce 5.2


<img width="639" height="auto" alt="product-snippet" src="https://github.com/user-attachments/assets/85973ac9-4dc8-4198-85d1-c03b85768875" />


## Installation


1. Add this your Gemfile with this line:

    ```ruby
    bundle add spree_product_reviews
    ```

2. Copy & Run Migrations:

    ```ruby
    bundle exec rails g spree_product_reviews:install
    ```
3. Clone _json_ld.html.erb to Theme directory (Important: Do this Only if you have Separate Theme):<br>
   So With this Product Reviews can generate Schema Validiation in Google Schema Like

    <img width="600" height="auto" alt="Screenshot 2025-08-15 at 1 24 00 PM" src="https://github.com/user-attachments/assets/87b36187-2bc1-4715-97dc-851545da713f" /><br><br>
    
**Note:** This can make product reviews visible and notable to Google search engine, If you are using a separate theme then replace **_json_ld.html.erb** file in the exact directory mentioned for example "app/views/themes/mytheme/spree/products/" to make schema work, always recommend to check product link in [Rich Results Test](https://search.google.com/test/rich-results). or [Schema Markup Validiator](https://validator.schema.org/). to ensure if script is updated in your store.
<br><br>

4. Compile Assests for Proper Images & JS loading:
   
    ```ruby
    RAILS_ENV=development bin/rails assets:precompile
    ```

5. Start Server:

    ```ruby
    foreman start -f Procfile.dev
    ```
    or

    ```ruby
    docker compose up -d
    ```
    <br>

    ## Render Widget in Product Details:

1. Find your Partial file Example: 
    ```
    'app/views/themes/default/spree/page_sections/_product_details.html.erb'
    ```
    Note: If you dont find this file inside your spree's directory, You can [Download](https://github.com/spree/spree/blob/df400d3557c244ec3829f175a27f3990cdeb2452/storefront/app/views/themes/default/spree/page_sections/_product_details.html.erb#L4) this directly from Spree's Github and place it exactly inside your Spree's directory

2. Place this Rendering Code:
   ```
    <% when 'Spree::PageBlocks::Products::Reviews' %>
    <%= block.render(self, product: product) %>
   ```
   Exactly below this part:
   ```
   <% when 'Spree::PageBlocks::Products::Description' %>
   ```

## Admin & Storefront Previews

1. Admin Page Sections (Storefront Theme Editor):
   <br>
   <img width="900" height="auto" alt="Widget config page builder" src="https://github.com/user-attachments/assets/ea71789d-bf01-45ea-86c4-2ca43c79ef1e" /><br>
2. Product Review Form (Storefront Theme Editor):
   <br>
   <img width="900" height="auto" alt="Product Review Form" src="https://github.com/user-attachments/assets/0b035af9-4d23-410e-b190-1e65bbf87016" /><br>
3. Edit Review from Product (Admin View):
   <br>
   <img width="auto" height="600" alt="Screenshot 2025-12-17 at 7 34 11 PM" src="https://github.com/user-attachments/assets/3a1af3f7-dd6f-4a86-b4fb-e174201cdeeb" /><br>
4. Approve/Disapprove Reviews (Admin View):
   <br>
   <img width="900" height="auto" alt="Screenshot 2025-12-17 at 7 33 57 PM" src="https://github.com/user-attachments/assets/49d551ef-7d21-498b-9629-a7ad430cb6e2" /><br>


## Published Review:
 <img width="981" height="440" alt="Screenshot 2025-12-17 at 7 31 18 PM copy" src="https://github.com/user-attachments/assets/0e6585dc-8686-4701-b194-1d7a8eef41ca" />


## Live Google Search Result Preview:
<img width="710" height="208" alt="Screenshot 2025-08-18 at 7 21 06 PM" src="https://github.com/user-attachments/assets/71fce340-b051-4fcf-83ce-e93c74d2fe3a" />


## Features & Roadmap
1. Easy integration through Storefront theme editor
2. Customisable from storefront
3. Approve & Disapprove reviews
4. Delete & Unapprove review
5. Ratings visible for non-logged-in users
6. Images support (Admin side control)

## Troubleshooting

For common issues such as:

   1. Missing PageBlocks

   2. ActiveStorage upload errors

   3. Turbo aborted requests

   4. Docker / NGINX configuration issues

Refer to the dedicated troubleshooting guide:

See [Troubleshooting Guide](https://github.com/umeshravani/spree_product_reviews/blob/main/TROUBLESHOOTING.md)
