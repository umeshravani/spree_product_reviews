# Product Reviews & Ratings for Spree Commerce
Easy Reviews &amp; Ratings integration for Latest Spree Commerce 5
## Installation

1. Add this your Gemfile with this line:

    ```ruby
    gem 'spree_product_reviews', git: 'https://github.com/umeshravani/spree_product_reviews'
    ```

2. Install the Gem using Bundle Install:

    ```ruby
    bundle install
    ```

3. Copy & Run Migrations:

    ```ruby
    bundle exec rails g spree_product_reviews:install
    ```

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
## Admin & Storefront Previews

1. Admin Page Sections (Storefront Theme Editor):
   <img width="998" height="729" alt="Admin Page Sections" src="https://github.com/user-attachments/assets/6f061f63-89aa-4e30-b0c7-5c20a0ff6216" />
2. Product Review Form (Storefront Theme Editor):
   <img width="997" height="727" alt="Product Review Form" src="https://github.com/user-attachments/assets/0b035af9-4d23-410e-b190-1e65bbf87016" />
3. Edit Review from Product (Admin View):
   <img width="995" height="735" alt="Edit Reviews from Admin Panel" src="https://github.com/user-attachments/assets/6cb4aaf3-4bb5-496a-95d2-6ed2b7ec9a48" />
4. Approve/Disapprove Reviews (Admin View):
   <img width="997" height="736" alt="Reviews Approve inside Product Page" src="https://github.com/user-attachments/assets/76e2780d-da25-4874-88f3-ae8474626286" />

## Features & Roadmap
1. Easy integration through Storefront theme editor
2. Customisable from storefront
3. Approve & Disapprove reviews
4. Delete & Unapprove review
5. Ratings visible for non-logged-in users
6. Images support (Not Implemented yet) coming soon in Spree v5.2
