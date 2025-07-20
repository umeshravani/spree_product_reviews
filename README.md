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
