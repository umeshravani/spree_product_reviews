module Spree
  class HomeController < Spree::StoreController
    def forbidden
      render plain: "You are not authorized to access this page.", status: :forbidden
    end
  end
end
